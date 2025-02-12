/**
 *
 * @fileoverview Shared utils for UI Components
 */

/** Appends custom property name to base CSS class name.
 */
export function getComponentClassName(
  classBase: string,
  customPropertyName: string,
): string {
  return `${classBase}-${customPropertyName}`;
}
