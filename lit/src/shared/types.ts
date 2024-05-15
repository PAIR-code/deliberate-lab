/**
 * Generic wrapper type for constructors, used in the DI system.
 */
// tslint:disable-next-line:interface-over-type-literal
export type Constructor<T> = {
  // tslint:disable-next-line:no-any
  new (...args: any[]): T;
};

/** Color modes. */
export enum ColorMode {
  LIGHT = "light",
  DARK = "dark",
  DEFAULT = "default",
}

/** Color themes. */
export enum ColorTheme {
  KAMINO = "kamino",
}

/** Text sizes. */
export enum TextSize {
  SMALL = "small",
  MEDIUM = "medium",
  LARGE = "large",
}
