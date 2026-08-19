export type ProgramBanKey = 'meals' | 'shower' | 'laundry' | 'bicycle';

export interface ProgramBanInfo {
    key: ProgramBanKey;
    label: string;
    isBanned: boolean;
}

export interface GuestBanInput {
    isBanned?: boolean;
    bannedUntil?: string | null;
    banReason?: string | null;
    bannedFromMeals?: boolean;
    bannedFromShower?: boolean;
    bannedFromLaundry?: boolean;
    bannedFromBicycle?: boolean;
}

export interface GuestBanDetails {
    isBanned: boolean;
    isAllProgramsBanned: boolean;
    hasSpecificBans: boolean;
    bannedPrograms: ProgramBanInfo[];
    allowedPrograms: ProgramBanInfo[];
    programs: ProgramBanInfo[];
    bannedSummary: string;
}

export function getGuestBanDetails(guest?: GuestBanInput | null): GuestBanDetails {
    if (!guest || !guest.isBanned) {
        const defaultPrograms: ProgramBanInfo[] = [
            { key: 'meals', label: 'Meals', isBanned: false },
            { key: 'shower', label: 'Showers', isBanned: false },
            { key: 'laundry', label: 'Laundry', isBanned: false },
            { key: 'bicycle', label: 'Bicycles', isBanned: false },
        ];
        return {
            isBanned: false,
            isAllProgramsBanned: false,
            hasSpecificBans: false,
            bannedPrograms: [],
            allowedPrograms: defaultPrograms,
            programs: defaultPrograms,
            bannedSummary: '',
        };
    }

    const hasAnyFlag = Boolean(
        guest.bannedFromMeals ||
        guest.bannedFromShower ||
        guest.bannedFromLaundry ||
        guest.bannedFromBicycle
    );

    const mealsBanned = hasAnyFlag ? Boolean(guest.bannedFromMeals) : true;
    const showerBanned = hasAnyFlag ? Boolean(guest.bannedFromShower) : true;
    const laundryBanned = hasAnyFlag ? Boolean(guest.bannedFromLaundry) : true;
    const bicycleBanned = hasAnyFlag ? Boolean(guest.bannedFromBicycle) : true;

    const programs: ProgramBanInfo[] = [
        { key: 'meals', label: 'Meals', isBanned: mealsBanned },
        { key: 'shower', label: 'Showers', isBanned: showerBanned },
        { key: 'laundry', label: 'Laundry', isBanned: laundryBanned },
        { key: 'bicycle', label: 'Bicycles', isBanned: bicycleBanned },
    ];

    const bannedPrograms = programs.filter((p) => p.isBanned);
    const allowedPrograms = programs.filter((p) => !p.isBanned);
    const isAllProgramsBanned = bannedPrograms.length === programs.length;

    let bannedSummary = 'All Programs';
    if (!isAllProgramsBanned) {
        bannedSummary = bannedPrograms.map((p) => p.label).join(', ');
    }

    return {
        isBanned: true,
        isAllProgramsBanned,
        hasSpecificBans: hasAnyFlag,
        bannedPrograms,
        allowedPrograms,
        programs,
        bannedSummary,
    };
}
