import { Type, type Static } from '@sinclair/typebox';

/** Shorthand for strict TypeBox object validation */
const strict = { additionalProperties: false } as const;

// ************************************************************************* //
// getExperimentDownload endpoint                                            //
// ************************************************************************* //

export const ExperimentDownloadData = Type.Object(
  {
    experimentId: Type.String({ minLength: 1 }),
  },
  strict
);

export type ExperimentDownloadData = Static<typeof ExperimentDownloadData>;