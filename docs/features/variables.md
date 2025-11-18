---
title: Variables
layout: default
---

> Note: This is an alpha feature and is not currently compatible with
agent mediators or agent participants

## Experimenter setup
Deliberate Lab offers variable support within experiments using JSON Schema for type validation.
Variable configs can be defined in the experiment builder; for the currently
available config type ("random permutation"),
experimenters can specify:
- A **schema** defining the variable structure (primitives, objects, or arrays)
- Whether values are assigned at the **cohort level** (every participant in the cohort sees the same value) or **participant level**
- A set of **variable names** to be populated
- A set of **values** to choose from (as JSON strings)

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

### Variable Schemas

Variables use **JSON Schema** (via [TypeBox](https://github.com/sinclairzx81/typebox)) to define their structure. This provides runtime validation and type safety.

#### Primitive Types

```typescript
// String variable
schema: VariableType.STRING

// Number variable
schema: VariableType.NUMBER

// Boolean variable
schema: VariableType.BOOLEAN
```

#### Object Types

For structured data with named fields:

```typescript
schema: VariableType.object({
  name: VariableType.STRING,
  age: VariableType.NUMBER,
  active: VariableType.BOOLEAN,
})
```

Template usage: `{{person.name}}`, `{{person.age}}`

#### Array Types

**Arrays of primitives:**

```typescript
// Array of strings
schema: VariableType.array(VariableType.STRING)

// Array of numbers
schema: VariableType.array(VariableType.NUMBER)
```

Template usage: `{{colors.0}}`, `{{colors.1}}`

**Arrays of objects:**

```typescript
schema: VariableType.array(
  VariableType.object({
    title: VariableType.STRING,
    text: VariableType.STRING,
  })
)
```

Template usage: `{{arguments.0.title}}`, `{{arguments.1.text}}`

#### Nested Structures

Schemas can be nested arbitrarily:

```typescript
schema: VariableType.object({
  policy: VariableType.STRING,
  arguments_pro: VariableType.array(
    VariableType.object({
      title: VariableType.STRING,
      text: VariableType.STRING,
    })
  ),
  arguments_con: VariableType.array(
    VariableType.object({
      title: VariableType.STRING,
      text: VariableType.STRING,
    })
  ),
})
```

#### Runtime Validation

All schemas are validated at runtime when:
- Creating or updating variable configs via the API
- Assigning values to variables
- Resolving templates

Invalid schemas or values will be rejected with detailed error messages.

## Implementation

### Schema Definition (`utils/src/variables.ts`)

Variables use TypeBox to create JSON Schema objects:

```typescript
export namespace VariableType {
  export const STRING = Type.String();
  export const NUMBER = Type.Number();
  export const BOOLEAN = Type.Boolean();
  export const object = (properties: Record<string, TSchema>) =>
    Type.Object(properties);
  export const array = (items: TSchema) =>
    Type.Array(items);
}
```

Each `VariableItem` contains:
- `name`: Variable identifier
- `description`: Human-readable description
- `schema`: TypeBox schema (TSchema) defining the structure

### Schema Validation (`utils/src/variables.validation.ts`)

Runtime validation uses recursive TypeBox schemas to validate incoming JSON Schema objects from API requests:

```typescript
const JSONSchemaData: any = Type.Recursive((Self) =>
  Type.Union([
    Type.Object({type: Type.Literal('string')}, {additionalProperties: true}),
    Type.Object({type: Type.Literal('number')}, {additionalProperties: true}),
    Type.Object({type: Type.Literal('boolean')}, {additionalProperties: true}),
    Type.Object({
      type: Type.Literal('object'),
      properties: Type.Optional(Type.Record(Type.String(), Self)),
    }, {additionalProperties: true}),
    Type.Object({
      type: Type.Literal('array'),
      items: Type.Optional(Self),
    }, {additionalProperties: true}),
  ])
);
```

This ensures malformed schemas are rejected before being stored.

### Value Assignments

When experiments, cohorts, and participants are created (in `functions/`),
the variable configs (from the experiment config) are used to assign relevant
values to a `variableMap`.

For instance, when setting up a cohort, the variable configs are passed into
variable utility functions (`utils/src/variables.utils.ts`) that extract
variable items (as each variable config may contain multiple variables)
that are to be assigned at the cohort level. Values are then generated via
the specified means (e.g., random permutation) and a `variableMap` matching
variable names to values is updated for the cohort config.

Values are type-coerced based on the schema:
- `string`: Used directly
- `number`/`integer`: Parsed from string
- `boolean`: Converted from 'true'/'false' strings
- `object`/`array`: Parsed from JSON strings

(Note that cohort and participant variable value assignment can be verified
in the experiment dashboard via the displayed JSON configs.)

### Template Resolution (`utils/src/variables.template.ts`)

When stages are rendered in the participant view (and for the reveal stage),
the stage config is passed through a `StageHandler` function that
runs specified fields through template resolution.

**Template validation:**
- Extracts all variable references from Mustache templates
- Validates each reference against the schema
- For nested paths (e.g., `{{policy.arguments_pro.0.title}}`):
  - Navigates through object `properties`
  - Navigates through array `items` schemas
  - Skips numeric array indices
  - Validates field existence at each level

**Template rendering:**
- Type-coerces values based on schema type
- Uses Mustache.js for template rendering
- Supports nested object/array access with dot notation

In the base class `StageHandler`, the stage's description (primary text, info
text) fields are resolved (extended classes are encouraged to extend this
functionality).

> NOTE: Not all stages have been migrated to the stage manager/handler setup.
