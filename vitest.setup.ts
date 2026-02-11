import "@testing-library/jest-dom";
import React from "react";

// Mock window.matchMedia for useReducedMotion and other media query hooks
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock react-hot-toast
vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
  Toaster: () => null,
}));

// Mock next-auth
vi.mock("next-auth", () => ({
  default: vi.fn(() => ({
    handlers: { GET: vi.fn(), POST: vi.fn() },
    auth: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  })),
}));

// Mock next-auth/react
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(() => ({
    data: {
      user: { id: "test-user", email: "test@example.com", role: "admin" },
      expires: "2099-01-01",
    },
    status: "authenticated",
  })),
  signIn: vi.fn(),
  signOut: vi.fn(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock next-auth/providers/credentials
vi.mock("next-auth/providers/credentials", () => ({
  default: vi.fn(() => ({})),
}));

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: "div",
    span: "span",
    button: "button",
    ul: "ul",
    li: "li",
    p: "p",
    h1: "h1",
    h2: "h2",
    h3: "h3",
    section: "section",
    article: "article",
    nav: "nav",
    form: "form",
    input: "input",
    label: "label",
    a: "a",
    img: "img",
    svg: "svg",
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  useAnimation: () => ({
    start: vi.fn(),
    stop: vi.fn(),
    set: vi.fn(),
  }),
  useMotionValue: (initial: number) => ({
    get: () => initial,
    set: vi.fn(),
    onChange: vi.fn(),
  }),
  useTransform: () => ({
    get: () => 0,
    set: vi.fn(),
  }),
  useSpring: () => ({
    get: () => 0,
    set: vi.fn(),
  }),
  useInView: () => true,
  useScroll: () => ({
    scrollY: { get: () => 0 },
    scrollX: { get: () => 0 },
    scrollYProgress: { get: () => 0 },
    scrollXProgress: { get: () => 0 },
  }),
}));

// Mock Supabase client
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
    auth: {
      getSession: vi.fn(),
      getUser: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
  }),
}));

// Suppress console errors in tests (optional, can be removed if needed)
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("Warning: ReactDOM.render is no longer supported")
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
