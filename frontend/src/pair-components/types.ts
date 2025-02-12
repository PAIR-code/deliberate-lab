/**
 * @fileoverview Defines shared types for UI components
 */

/** Component sizes. */
export const COMPONENT_SIZES = ['small', 'medium', 'large'] as const;

/** Size of component. */
export type ComponentSize = (typeof COMPONENT_SIZES)[number];

/** Component variants (background/outline options). */
export const COMPONENT_VARIANTS = ['default', 'filled', 'tonal', 'outlined'];

/** Background/outline of component. */
export type ComponentVariant = (typeof COMPONENT_VARIANTS)[number];

/** Component color palette options. */
export const COMPONENT_COLORS = [
  'primary',
  'secondary',
  'tertiary',
  'neutral',
  'error',
  'success',
] as const;

/** Color of component. */
export type ComponentColor = (typeof COMPONENT_COLORS)[number];
