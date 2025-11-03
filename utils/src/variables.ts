export interface VariableItem {
  name: string;
  description: string;
  type: VariableType;
  // Only set schema if variable item type is OBJECT
  schema?: Record<
    string,
    VariableType.STRING | VariableType.NUMBER | VariableType.BOOLEAN
  >;
}

export enum VariableType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  OBJECT = 'object',
}
