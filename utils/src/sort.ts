/* Sort types and functions. */

import {Experiment} from './experiment';

export enum SortMode {
  NEWEST = 'newest',
  OLDEST = 'oldest',
  ALPHA_ASC = 'alpha_asc',
  ALPHA_DESC = 'alpha_desc',
}

export function sortLabel(mode: SortMode) {
  switch (mode) {
    case SortMode.NEWEST:
      return 'Newest first';
    case SortMode.OLDEST:
      return 'Oldest first';
    case SortMode.ALPHA_ASC:
      return 'A–Z';
    case SortMode.ALPHA_DESC:
      return 'Z–A';
  }
}

export function sortExperiments(experiments: Experiment[], sortMode: SortMode) {
  switch (sortMode) {
    case SortMode.ALPHA_ASC:
      return experiments
        .slice()
        .sort((a, b) => a.metadata.name.localeCompare(b.metadata.name));
    case SortMode.ALPHA_DESC:
      return experiments
        .slice()
        .sort((a, b) => b.metadata.name.localeCompare(a.metadata.name));
    case SortMode.OLDEST:
      return experiments
        .slice()
        .sort(
          (a, b) =>
            a.metadata.dateModified.seconds - b.metadata.dateModified.seconds,
        );
    case SortMode.NEWEST:
    default:
      return experiments
        .slice()
        .sort(
          (a, b) =>
            b.metadata.dateModified.seconds - a.metadata.dateModified.seconds,
        );
  }
}
