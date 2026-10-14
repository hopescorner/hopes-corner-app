'use client';

import React, { createContext, useContext, useSyncExternalStore, useCallback, useMemo } from 'react';

export type SupportedLanguage = 'en' | 'es';

export interface CheckInTranslations {
    findOrAddGuests: string;
    searchSubtitle: string;
    searchPlaceholder: string;
    newGuest: string;
    clearSearch: string;
    readyForSearch: string;
    noMatchesFor: string;
    searchingFor: string;
    didYouMean: string;
    checkIn: string;
    language: string;
    english: string;
    spanish: string;
}

export const CHECKIN_DICTIONARIES: Record<SupportedLanguage, CheckInTranslations> = {
    en: {
        findOrAddGuests: 'Find or Add Guests',
        searchSubtitle: 'Type a name to search or click New Guest to register',
        searchPlaceholder: "Start typing a name (e.g. 'John' or 'JS')",
        newGuest: 'New Guest',
        clearSearch: 'Clear search',
        readyForSearch: 'Ready for Search',
        noMatchesFor: 'No matches for',
        searchingFor: 'Searching for',
        didYouMean: 'Did you mean:',
        checkIn: 'Check In',
        language: 'Language',
        english: 'English',
        spanish: 'Español',
    },
    es: {
        findOrAddGuests: 'Buscar o Agregar Huéspedes',
        searchSubtitle: 'Escriba un nombre para buscar o Nuevo Huésped para registrarse',
        searchPlaceholder: "Escriba un nombre (ej. 'Juan' o 'JS')",
        newGuest: 'Nuevo Huésped',
        clearSearch: 'Borrar búsqueda',
        readyForSearch: 'Listo para buscar',
        noMatchesFor: 'No hay coincidencias para',
        searchingFor: 'Buscando',
        didYouMean: '¿Quiso decir:',
        checkIn: 'Registrar',
        language: 'Idioma',
        english: 'English',
        spanish: 'Español',
    },
};

interface LanguageContextType {
    language: SupportedLanguage;
    setLanguage: (lang: SupportedLanguage) => void;
    t: CheckInTranslations;
}

const LanguageContext = createContext<LanguageContextType>({
    language: 'en',
    setLanguage: () => {},
    t: CHECKIN_DICTIONARIES.en,
});

const STORAGE_KEY = 'hopes-corner-lang';

const subscribe = (callback: () => void) => {
    if (typeof window === 'undefined') return () => {};
    window.addEventListener('storage', callback);
    window.addEventListener(`local_${STORAGE_KEY}`, callback);
    return () => {
        window.removeEventListener('storage', callback);
        window.removeEventListener(`local_${STORAGE_KEY}`, callback);
    };
};

const getSnapshot = (): SupportedLanguage => {
    if (typeof window === 'undefined') return 'en';
    try {
        const val = localStorage.getItem(STORAGE_KEY);
        if (val === 'es') return 'es';
    } catch {}
    return 'en';
};

const getServerSnapshot = (): SupportedLanguage => 'en';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const language = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

    const setLanguage = useCallback((lang: SupportedLanguage) => {
        try {
            localStorage.setItem(STORAGE_KEY, lang);
            window.dispatchEvent(new Event(`local_${STORAGE_KEY}`));
        } catch {}
    }, []);

    const value = useMemo(
        () => ({
            language,
            setLanguage,
            t: CHECKIN_DICTIONARIES[language],
        }),
        [language, setLanguage]
    );

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
}


export function useLanguage() {
    return useContext(LanguageContext);
}
