import {DocumentData, QuerySnapshot} from 'firebase/firestore';

/**
 * Generic wrapper type for constructors, used in the DI system.
 */
// tslint:disable-next-line:interface-over-type-literal
export type Constructor<T> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  new (...args: any[]): T;
};

/* Snapshot for Firebase calls. */
export type Snapshot = QuerySnapshot<DocumentData, DocumentData>;

/** Color modes. */
export enum ColorMode {
  LIGHT = 'light',
  DARK = 'dark',
  DEFAULT = 'default',
}

/** Gallery item (rendered as card). */
export interface GalleryItem {
  title: string;
  description: string;
  creator: string;
  date: string;
  version: number;
  isPublic: boolean;
  isStarred: boolean;
  tags: string[];
}
