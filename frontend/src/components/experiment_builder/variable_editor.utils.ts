import {
  validateVariableValue,
  parseVariableValue,
} from '@deliberation-lab/utils';
import {Type, type TSchema, type TObject, type TArray} from '@sinclair/typebox';

type TProperties = Record<string, TSchema>;

// ===== Schema Utilities =====

export function createSchemaForType(type: string): TSchema {
  switch (type) {
    case 'string':
      return Type.String();
    case 'number':
      return Type.Number();
    case 'boolean':
      return Type.Boolean();
    case 'object':
      return Type.Object({});
    case 'array':
      return Type.Array(Type.String());
    default:
      return Type.String();
  }
}

export function getDefaultValue(schema: TSchema): unknown {
  const type = schema.type as string;
  switch (type) {
    case 'string':
      return '';
    case 'number':
      return 0;
    case 'boolean':
      return false;
    case 'object':
      return {};
    case 'array':
      return [];
    default:
      return null;
  }
}

export function addPropertyToSchema(
  props: Record<string, TSchema>,
  name: string,
): TSchema | null {
  if (name in props) return null;
  return Type.Object({...props, [name]: Type.String()});
}

export function removePropertyFromSchema(
  props: Record<string, TSchema>,
  name: string,
): TSchema {
  const newProps = {...props};
  delete newProps[name];
  return Type.Object(newProps);
}

export function updatePropertyInSchema(
  props: Record<string, TSchema>,
  name: string,
  schema: TSchema,
): TSchema {
  return Type.Object({...props, [name]: schema});
}

/**
 * Updates a schema at a specific nested path.
 * Uses the schema structure to navigate - when encountering an array, navigates into its items.
 * Path is a dot-separated string like "charities.name" where charities might be an array.
 * Returns a new schema with the update applied at that path.
 */
export function updateSchemaAtPath(
  schema: TSchema,
  path: string,
  newValue: TSchema,
): TSchema {
  const pathParts = path ? path.split('.').filter((p) => p) : [];

  if (pathParts.length === 0) return newValue;

  const [first, ...rest] = pathParts;

  // Check if schema is an object schema
  if ('type' in schema && schema.type === 'object') {
    const objSchema = schema as TObject<TProperties>;

    if (objSchema.properties && first in objSchema.properties) {
      const propSchema = objSchema.properties[first];

      // Check if this property is an array schema and we need to navigate deeper
      if (
        'type' in propSchema &&
        propSchema.type === 'array' &&
        rest.length > 0
      ) {
        const arrayPropSchema = propSchema as TArray;
        // Navigate deeper into the items schema
        const itemsSchema = arrayPropSchema.items || Type.String();
        const updatedItems = updateSchemaAtPath(
          itemsSchema,
          rest.join('.'),
          newValue,
        );
        return Type.Object({
          ...objSchema.properties,
          [first]: Type.Array(updatedItems),
        }) as TSchema;
      }

      // Regular property update (non-array)
      const updatedProp =
        rest.length > 0
          ? updateSchemaAtPath(propSchema, rest.join('.'), newValue)
          : newValue;

      return Type.Object({
        ...objSchema.properties,
        [first]: updatedProp,
      }) as TSchema;
    }
  }

  return schema;
}

// ===== Value Parsing and Serialization =====

export function serializeForInput(schema: TSchema, value: unknown): string {
  const type = schema.type as string;
  if (type === 'string') return String(value ?? '');
  if (type === 'number') return String(value ?? 0);
  if (type === 'boolean') return String(value ?? false);
  return value ? JSON.stringify(value) : '';
}

export function safeParseJson<T>(value: string, fallback: T): T {
  try {
    return value === '' ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}

// ===== Value Manipulation =====

export function updateObjectProperty(
  obj: Record<string, unknown>,
  propName: string,
  newValue: string,
  propSchema: TSchema,
): string {
  const parsed = parseVariableValue(propSchema, newValue);
  return JSON.stringify({...obj, [propName]: parsed});
}

export function updateArrayItem(
  arr: unknown[],
  index: number,
  newValue: string,
  itemSchema: TSchema,
): string {
  const parsed = parseVariableValue(itemSchema, newValue);
  const updated = [...arr];
  updated[index] = parsed;
  return JSON.stringify(updated);
}

/**
 * Sets a property at a specific path to a new value.
 * Uses the schema to navigate and know when to map over arrays.
 * Only affects the property at the path - all other properties are preserved.
 */
export function setValueAtPath(
  obj: unknown,
  schema: TSchema,
  path: string,
  newValue: unknown,
): unknown {
  const pathParts = path.split('.').filter((p) => p);

  const setAtLevel = (obj: unknown, s: TSchema, parts: string[]): unknown => {
    if (!obj || typeof obj !== 'object') return obj;

    if (parts.length === 0) {
      // We've reached the target - return the new value
      return newValue;
    }

    const o = obj as Record<string, unknown>;
    const nextKey = parts[0];

    // Check if schema is an object schema
    if ('type' in s && s.type === 'object') {
      const objSchema = s as TObject<TProperties>;

      if (objSchema.properties && nextKey in objSchema.properties) {
        const propSchema = objSchema.properties[nextKey];

        // Check if this property is an array schema
        if (
          'type' in propSchema &&
          propSchema.type === 'array' &&
          Array.isArray(o[nextKey])
        ) {
          const arrayPropSchema = propSchema as TArray;
          // Map over array items using the items schema
          const itemsSchema = arrayPropSchema.items || Type.String();
          return {
            ...o,
            [nextKey]: (o[nextKey] as unknown[]).map((item: unknown) =>
              setAtLevel(item, itemsSchema, parts.slice(1)),
            ),
          };
        } else if (nextKey in o) {
          // Regular object navigation
          return {
            ...o,
            [nextKey]: setAtLevel(o[nextKey], propSchema, parts.slice(1)),
          };
        }
      }
    }

    return obj;
  };

  return setAtLevel(obj, schema, pathParts);
}

/**
 * Renames a property in a JSON object at a specific nested path.
 * Uses the schema to know when to map over array items vs navigate into objects.
 * Path is a dot-separated string like "charities.name" where charities might be an array.
 * Returns a new object with the property renamed, preserving property order.
 */
export function renamePropertyInObject(
  obj: unknown,
  schema: TSchema,
  path: string,
  newName: string,
): unknown {
  const pathParts = path.split('.').filter((p) => p);
  const oldName = pathParts[pathParts.length - 1];
  const parentPath = pathParts.slice(0, -1);

  const renameAtLevel = (
    obj: unknown,
    s: TSchema,
    parts: string[],
  ): unknown => {
    if (!obj || typeof obj !== 'object') return obj;

    const o = obj as Record<string, unknown>;

    if (parts.length === 0) {
      // Rename at this level
      if (oldName in o) {
        const result: Record<string, unknown> = {};
        for (const key of Object.keys(o)) {
          result[key === oldName ? newName : key] = o[key];
        }
        return result;
      }
      return obj;
    }

    // Navigate deeper using schema to guide us
    const nextKey = parts[0];

    // Check if schema is an object schema
    if ('type' in s && s.type === 'object') {
      const objSchema = s as TObject<TProperties>;

      if (objSchema.properties && nextKey in objSchema.properties) {
        const propSchema = objSchema.properties[nextKey];

        // Check if this property is an array schema
        if (
          'type' in propSchema &&
          propSchema.type === 'array' &&
          Array.isArray(o[nextKey])
        ) {
          const arrayPropSchema = propSchema as TArray;
          // Map over array items using the items schema
          const itemsSchema = arrayPropSchema.items || Type.String();
          return {
            ...o,
            [nextKey]: (o[nextKey] as unknown[]).map((item: unknown) =>
              renameAtLevel(item, itemsSchema, parts.slice(1)),
            ),
          };
        } else if (nextKey in o) {
          // Regular object navigation
          return {
            ...o,
            [nextKey]: renameAtLevel(o[nextKey], propSchema, parts.slice(1)),
          };
        }
      }
    }

    return obj;
  };

  return renameAtLevel(obj, schema, parentPath);
}
