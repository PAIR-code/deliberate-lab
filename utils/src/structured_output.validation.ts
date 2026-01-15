/**
 * Structured output validation schemas.
 *
 * These TypeBox schemas define the structure of structured output configs
 * for JSON Schema export and Python type generation.
 */
import {Type} from '@sinclair/typebox';

/** Shorthand for strict TypeBox object validation */
const strict = {additionalProperties: false} as const;

// ****************************************************************************
// Enums
// ****************************************************************************

/** Structured output type enum */
export const StructuredOutputTypeData = Type.Union(
  [
    Type.Literal('NONE'),
    Type.Literal('JSON_FORMAT'),
    Type.Literal('JSON_SCHEMA'),
  ],
  {$id: 'StructuredOutputType'},
);

/** Structured output data type enum */
export const StructuredOutputDataTypeData = Type.Union(
  [
    Type.Literal('STRING'),
    Type.Literal('NUMBER'),
    Type.Literal('INTEGER'),
    Type.Literal('BOOLEAN'),
    Type.Literal('ARRAY'),
    Type.Literal('OBJECT'),
    Type.Literal('ENUM'),
  ],
  {$id: 'StructuredOutputDataType'},
);

// ****************************************************************************
// Schemas
// ****************************************************************************

/** Structured output schema (recursive).
 * Uses Type.Recursive to properly handle self-references in:
 * - properties[].schema (nested object properties)
 * - arrayItems (array element type)
 */
export const StructuredOutputSchemaData = Type.Recursive(
  (This) =>
    Type.Object(
      {
        type: StructuredOutputDataTypeData,
        description: Type.Optional(Type.String()),
        properties: Type.Optional(
          Type.Array(
            Type.Object(
              {
                name: Type.String(),
                schema: This,
              },
              {$id: 'StructuredOutputSchemaProperty', ...strict},
            ),
          ),
        ),
        arrayItems: Type.Optional(This),
        enumItems: Type.Optional(Type.Array(Type.String())),
      },
      strict,
    ),
  {$id: 'StructuredOutputSchema'},
);

/** Generic structured output config.
 * Defines a schema for the model to return JSON, which can be extracted as needed.
 * Use this for general-purpose structured output or when structured output is disabled.
 */
export const StructuredOutputConfigData = Type.Object(
  {
    enabled: Type.Boolean(),
    type: StructuredOutputTypeData,
    schema: Type.Optional(StructuredOutputSchemaData),
    appendToPrompt: Type.Boolean(),
  },
  {$id: 'StructuredOutputConfig', ...strict},
);

/** Specialized structured output config for chat mediators.
 * Extends base config with pre-baked field mappings that the chat agent code
 * uses to control mediator behavior:
 * - shouldRespondField: which JSON field indicates if the mediator wants to respond
 * - messageField: which JSON field contains the message content
 * - explanationField: which JSON field contains the decision explanation
 * - readyToEndField: which JSON field indicates if the mediator is done
 *
 * See extractChatMediatorStructuredFields() in structured_output.ts for usage.
 */
export const ChatMediatorStructuredOutputConfigData = Type.Object(
  {
    enabled: Type.Boolean(),
    type: StructuredOutputTypeData,
    schema: Type.Optional(StructuredOutputSchemaData),
    appendToPrompt: Type.Boolean(),
    shouldRespondField: Type.String(),
    messageField: Type.String(),
    explanationField: Type.String(),
    readyToEndField: Type.String(),
  },
  {$id: 'ChatMediatorStructuredOutputConfig', ...strict},
);
