import type { Transition, Variant } from 'framer-motion';

/**
 * Returns framer-motion animation props that respect reduced motion preferences.
 * When reduced motion is active, animations become instant (duration: 0).
 *
 * Usage:
 *   const rm = useReducedMotion();
 *   <motion.div {...getMotionProps(rm, { initial: { opacity: 0 }, animate: { opacity: 1 } })} />
 */
export function getMotionProps(
  prefersReduced: boolean,
  props: {
    initial?: Variant | boolean;
    animate?: Variant;
    exit?: Variant;
    transition?: Transition;
  }
) {
  if (prefersReduced) {
    return {
      initial: false as const,
      animate: props.animate,
      exit: props.exit,
      transition: { duration: 0 },
    };
  }
  return props;
}

/** Instant transition object for conditionally disabling animations */
export const instantTransition: Transition = { duration: 0 };
