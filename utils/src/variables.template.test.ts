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
    const variableMap: Record<string, string> = {
      name: 'Helly R',
    };

    it('should validate defined variables', () => {
      const template = 'Hello, {{name}}!';
      const result = validateTemplateVariables(template, variableMap);
      expect(result.valid).toBe(true);
      expect(result.missingVariables).toEqual([]);
      expect(result.syntaxError).toBeUndefined();
    });

    it('should detect missing variables', () => {
      const template = 'Hello, {{name}} from {{department}}!';
      const result = validateTemplateVariables(template, variableMap);
      expect(result.valid).toBe(false);
      expect(result.missingVariables).toEqual(['department']);
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
