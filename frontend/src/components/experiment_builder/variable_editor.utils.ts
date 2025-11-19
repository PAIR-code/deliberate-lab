import {Type, type TSchema} from '@sinclair/typebox';
import {Value} from '@sinclair/typebox/value';

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

// ===== Value Parsing and Serialization =====

export function parseValue(schema: TSchema, value: string): unknown {
  const type = schema.type as string;
  if (type === 'string') return value;
  if (type === 'number') return value === '' ? 0 : Number(value);
  if (type === 'boolean') return value === 'true';
  return value === '' ? null : JSON.parse(value);
}

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

// ===== Validation =====

export function validateValue(schema: TSchema, value: string): string | null {
  try {
    const parsed = parseValue(schema, value);
    if (parsed !== null && !Value.Check(schema, parsed)) {
      const errors = [...Value.Errors(schema, parsed)];
      return errors.map((e) => `${e.path}: ${e.message}`).join(', ');
    }
  } catch (e) {
    return `Invalid: ${e}`;
  }
  return null;
}

// ===== Value Manipulation =====

export function updateObjectProperty(
  obj: Record<string, unknown>,
  propName: string,
  newValue: string,
  propSchema: TSchema,
): string {
  const parsed = parseValue(propSchema, newValue);
  return JSON.stringify({...obj, [propName]: parsed});
}

export function updateArrayItem(
  arr: unknown[],
  index: number,
  newValue: string,
  itemSchema: TSchema,
): string {
  const parsed = parseValue(itemSchema, newValue);
  const updated = [...arr];
  updated[index] = parsed;
  return JSON.stringify(updated);
}
