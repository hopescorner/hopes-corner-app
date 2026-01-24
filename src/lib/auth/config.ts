import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { createClient } from '@supabase/supabase-js';
import { inferRole } from './types';

// Extend the built-in session types
declare module 'next-auth' {
    interface Session {
        user: {
            id: string;
            email: string;
            name: string;
            role: string;
        };
    }

    interface User {
        id: string;
        email: string;
        name: string;
        role: string;
    }
}

// JWT type extension
interface ExtendedJWT {
    id?: string;
    role?: string;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
    providers: [
        Credentials({
            name: 'Credentials',
            credentials: {
                email: { label: 'Email', type: 'email', placeholder: 'email@example.com' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                try {
                    // Create Supabase admin client
                    const supabase = createClient(
                        process.env.NEXT_PUBLIC_SUPABASE_URL!,
                        process.env.SUPABASE_SECRET_KEY!,
                        {
                            auth: {
                                persistSession: false,
                            },
                        }
                    );

                    // Authenticate with Supabase Auth
                    const { data, error } = await supabase.auth.signInWithPassword({
                        email: credentials.email as string,
                        password: credentials.password as string,
                    });

                    if (error || !data.user) {
                        console.error('Supabase auth error:', error?.message);
                        return null;
                    }

                    const email = data.user.email || '';
                    const role = inferRole(email);

                    return {
                        id: data.user.id,
                        email: email,
                        name: email.split('@')[0] || 'User',
                        role: role,
                    };
                } catch (error) {
                    console.error('Auth error:', error);
                    return null;
                }
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as string;
            }
            return session;
        },
    },
    pages: {
        signIn: '/login',
        error: '/login',
    },
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    trustHost: true,
});
