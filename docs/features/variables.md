---
title: Variables
layout: default
---

> Note: This is an alpha feature and is not currently compatible with
agent participants

## Experimenter setup
Deliberate Lab offers early variable support within experiments.
Variable configs can be defined in the experiment builder; for the currently
available config type ("random permutation"),
experimenters can specify variable type (string or object), whether values are
assigned at the cohort level (every participant in the cohort to see the
same value) or participant level, a set of variables to be populated, and
a set of values to populate with.

> Support for other config types, such as populating variables based on a
weight distribution of values or manually assigning values when creating
a cohort, to be added eventually.

<img src="../assets/images/features/variables/variable-editor-random-permutation.png"
  alt="Screenshot of defining a new variable config that uses random permutation"
/>

The variables use
[Mustache templating](https://mustache.github.io/mustache.5.html)
and are supported in the
following locations:

- Stage descriptions (primary text, info text)
- Info stages (info lines)
- Multi asset allocation stages (stock name and description)

### Object variables
Object variable values are temporarily only assignable via JSON; we will
eventually migrate this to a schema editor where the experimenter can
set up each field and type.

## Implementation

### Value assignments
When experiments, cohorts, and participants are created (in `functions/`),
the variable configs (from the experiment config) are used to assign relevant
values to a `variableMap`.

For instance, when setting up a cohort, the variable configs are passed into
a variable template (`utils/src/variables/template.ts`) function that extracts
variable items (as each variable config may contain multiple variables)
that are to be assigned at the cohort level. Values are then generated via
the specified means (e.g., random permutation) and a `variableMap` matching
variable names to values is updated for the cohort config.

(Note that cohort and participant variable value assignment can be verified
in the experiment dashboard via the displayed JSON configs.)

### Variable resolution
When stages are rendered in the particpant view (and for the reveal stage),
the stage config is passed through a `StageHandler` function that
runs specified fields in the stage through template resolution
(see `utils/src/variables/template.ts`).

In the base class `StageHandler`, the stage's description (primary text, info
text) fields are resolved (extended classes are encouraged to extend this
functionality).

> NOTE: Not all stages have been migrated to the stage manager/handler setup.
