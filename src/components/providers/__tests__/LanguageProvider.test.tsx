import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LanguageProvider, useLanguage } from '../LanguageProvider';

function TestConsumer() {
    const { t, language, setLanguage } = useLanguage();
    return (
        <div>
            <span data-testid="current-lang">{language}</span>
            <span data-testid="title">{t.findOrAddGuests}</span>
            <button onClick={() => setLanguage('es')}>Switch to Spanish</button>
            <button onClick={() => setLanguage('en')}>Switch to English</button>
        </div>
    );
}

describe('LanguageProvider', () => {
    it('defaults to English and allows switching to Spanish', () => {
        render(
            <LanguageProvider>
                <TestConsumer />
            </LanguageProvider>
        );

        expect(screen.getByTestId('current-lang')).toHaveTextContent('en');
        expect(screen.getByTestId('title')).toHaveTextContent('Find or Add Guests');

        fireEvent.click(screen.getByText('Switch to Spanish'));

        expect(screen.getByTestId('current-lang')).toHaveTextContent('es');
        expect(screen.getByTestId('title')).toHaveTextContent('Buscar o Agregar Huéspedes');

        fireEvent.click(screen.getByText('Switch to English'));
        expect(screen.getByTestId('current-lang')).toHaveTextContent('en');
        expect(screen.getByTestId('title')).toHaveTextContent('Find or Add Guests');
    });
});
