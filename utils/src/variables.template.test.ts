import {VariableItem, VariableType} from './variables';
import {
  extractVariableReferences,
  validateTemplateVariables,
} from './variables.template';

describe('Mustache Template Resolution', () => {
  describe('extractVariableReferences', () => {
    it('should extract simple variable names', () => {
      const template = 'Hello {{name}}, you are {{age}} years old';
      const refs = extractVariableReferences(template);
      expect(refs).toEqual(['name', 'age']);
    });

    it('should extract nested properties', () => {
      const template = '{{user.name}} lives in {{user.address.city}}';
      const refs = extractVariableReferences(template);
      expect(refs).toEqual(['user.name', 'user.address.city']);
    });

    it('should extract from sections', () => {
      const template = '{{#section}}{{variable}}{{/section}}';
      const refs = extractVariableReferences(template);
      expect(refs).toEqual(['section', 'variable']);
    });

    it('should extract from triple mustache', () => {
      const template = '{{{unescapedHtml}}} and {{normalVar}}';
      const refs = extractVariableReferences(template);
      expect(refs).toEqual(['unescapedHtml', 'normalVar']);
    });

    it('should remove duplicates', () => {
      const template = '{{name}} and {{name}} again, plus {{age}}';
      const refs = extractVariableReferences(template);
      expect(refs).toEqual(['name', 'age']);
    });
  });

  describe('validateTemplateVariables', () => {
    const variableMap: Record<string, VariableItem> = {
      name: {
        name: 'name',
        description: '',
        type: VariableType.STRING,
      },
      department: {
        name: 'department',
        description: '',
        type: VariableType.OBJECT,
        schema: {
          name: VariableType.STRING,
          floor: VariableType.NUMBER,
        },
      },
    };

    it('should validate defined variables', () => {
      const template = 'Hello, {{name}}!';
      const result = validateTemplateVariables(template, variableMap);
      expect(result.valid).toBe(true);
      expect(result.missingVariables).toEqual([]);
      expect(result.syntaxError).toBeUndefined();
    });

    it('should detect missing variables', () => {
      const template = 'Hello, {{name}} from {{city}}!';
      const result = validateTemplateVariables(template, variableMap);
      expect(result.valid).toBe(false);
      expect(result.missingVariables).toEqual(['city']);
      expect(result.syntaxError).toBeUndefined();
    });

    it('should detect if template references a field, but variable is not an object', () => {
      const template = 'Hello, {{name.first}}!';
      const result = validateTemplateVariables(template, variableMap);
      expect(result.valid).toBe(false);
      expect(result.missingVariables).toEqual(['name.first']);
      expect(result.syntaxError).toBeUndefined();
    });

    it('should detect if variable is an object and template references an undefined field', () => {
      const template = 'Hello, {{department.chief}}';
      const result = validateTemplateVariables(template, variableMap);
      expect(result.valid).toBe(false);
      expect(result.missingVariables).toEqual(['department.chief']);
      expect(result.syntaxError).toBeUndefined();
    });

    it('should detect syntax errors', () => {
      const template = 'Unclosed {{#section}} without closing';
      const result = validateTemplateVariables(template, variableMap);
      expect(result.valid).toBe(false);
      expect(result.syntaxError).toBeDefined();
    });
  });
});
