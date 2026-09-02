import { type Guest } from '@/stores/useGuestsStore';

const AVATAR_PALETTES = [
    { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200' },
    { bg: 'bg-sky-100', text: 'text-sky-800', border: 'border-sky-200' },
    { bg: 'bg-violet-100', text: 'text-violet-800', border: 'border-violet-200' },
    { bg: 'bg-amber-100', text: 'text-amber-900', border: 'border-amber-200' },
    { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-200' },
    { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-200' },
    { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-200' },
    { bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-200' },
    { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
    { bg: 'bg-fuchsia-100', text: 'text-fuchsia-800', border: 'border-fuchsia-200' },
];

export function getGuestInitials(guest?: Partial<Guest> | null): string {
    if (!guest) return 'G';
    const first = (guest.preferredName || guest.firstName || '').trim();
    const last = (guest.lastName || '').trim();

    if (first && last) {
        return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
    }
    if (first) {
        const parts = first.split(/\s+/);
        if (parts.length >= 2) {
            return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
        }
        return first.slice(0, 2).toUpperCase();
    }
    if (guest.name) {
        const parts = guest.name.trim().split(/\s+/);
        if (parts.length >= 2) {
            return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
        }
        return parts[0].slice(0, 2).toUpperCase();
    }
    return 'G';
}

export function getGuestAvatarColor(seed?: string | null): { bg: string; text: string; border: string } {
    if (!seed) return AVATAR_PALETTES[0];
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = (hash << 5) - hash + seed.charCodeAt(i);
        hash |= 0;
    }
    const index = Math.abs(hash) % AVATAR_PALETTES.length;
    return AVATAR_PALETTES[index];
}
