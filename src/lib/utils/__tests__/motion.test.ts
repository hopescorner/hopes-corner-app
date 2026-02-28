import { describe, it, expect } from 'vitest';
import { getMotionProps, instantTransition } from '../motion';

describe('motion utilities', () => {
    describe('getMotionProps', () => {
        const baseProps = {
            initial: { opacity: 0, y: 10 },
            animate: { opacity: 1, y: 0 },
            exit: { opacity: 0, y: -10 },
            transition: { duration: 0.3, ease: 'easeOut' },
        };

        it('returns original props when reduced motion is off', () => {
            const result = getMotionProps(false, baseProps);
            expect(result).toBe(baseProps);
        });

        it('disables initial animation when reduced motion is on', () => {
            const result = getMotionProps(true, baseProps);
            expect(result.initial).toBe(false);
        });

        it('sets duration to 0 when reduced motion is on', () => {
            const result = getMotionProps(true, baseProps);
            expect(result.transition).toEqual({ duration: 0 });
        });

        it('preserves animate and exit values when reduced motion is on', () => {
            const result = getMotionProps(true, baseProps);
            expect(result.animate).toEqual(baseProps.animate);
            expect(result.exit).toEqual(baseProps.exit);
        });

        it('handles props without exit', () => {
            const props = { initial: { opacity: 0 }, animate: { opacity: 1 } };
            const result = getMotionProps(true, props);
            expect(result.exit).toBeUndefined();
            expect(result.initial).toBe(false);
        });

        it('handles props without transition', () => {
            const props = { initial: { opacity: 0 }, animate: { opacity: 1 } };
            const result = getMotionProps(false, props);
            expect(result.transition).toBeUndefined();
        });

        it('handles initial as boolean', () => {
            const props = { initial: false as const, animate: { opacity: 1 } };
            const result = getMotionProps(false, props);
            expect(result.initial).toBe(false);
        });
    });

    describe('instantTransition', () => {
        it('has duration of 0', () => {
            expect(instantTransition.duration).toBe(0);
        });
    });
});
