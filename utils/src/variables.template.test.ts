import {
  resolveTemplate,
  extractVariableReferences,
  validateTemplateVariables,
} from './variables.template';
import {VariableDefinition} from './variables';

describe('Mustache Template Resolution', () => {
  describe('resolveTemplate', () => {
    it('should substitute simple variables', () => {
      const template = 'Hello {{name}}, welcome to {{place}}!';
      const variables = {name: 'Alice', place: 'Wonderland'};
      const result = resolveTemplate(template, variables);
      expect(result).toBe('Hello Alice, welcome to Wonderland!');
    });

    it('should handle nested object properties', () => {
      const template = 'Policy: {{policy.name}} costs ${{policy.cost}}';
      const variables = {
        policy: {
          name: 'Universal Healthcare',
          cost: 1000000,
        },
      };
      const result = resolveTemplate(template, variables);
      expect(result).toBe('Policy: Universal Healthcare costs $1000000');
    });

    it('should escape HTML by default', () => {
      const template = 'Message: {{message}}';
      const variables = {message: '<script>alert("XSS")</script>'};
      const result = resolveTemplate(template, variables);
      // Mustache escapes forward slash as &#x2F;
      expect(result).toBe(
        'Message: &lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;',
      );
    });

    it('should allow unescaped HTML with triple mustache', () => {
      const template = 'HTML: {{{htmlContent}}}';
      const variables = {htmlContent: '<b>Bold Text</b>'};
      const result = resolveTemplate(template, variables);
      expect(result).toBe('HTML: <b>Bold Text</b>');
    });

    it('should use default values for missing variables', () => {
      const template = 'Color: {{color}}, Size: {{size}}';
      const variables = {color: 'blue'};
      const defaults = {color: 'red', size: 'medium'};
      const result = resolveTemplate(template, variables, defaults);
      expect(result).toBe('Color: blue, Size: medium');
    });

    it('should handle conditional sections', () => {
      const template = '{{#showMessage}}Important: {{message}}{{/showMessage}}';
      const variables = {showMessage: true, message: 'Hello'};
      const result = resolveTemplate(template, variables);
      expect(result).toBe('Important: Hello');
    });

    it('should handle inverted sections', () => {
      const template = '{{^hasData}}No data available{{/hasData}}';
      const variables = {hasData: false};
      const result = resolveTemplate(template, variables);
      expect(result).toBe('No data available');
    });

    it('should handle lists/arrays', () => {
      const template = 'Items: {{#items}}- {{name}} {{/items}}';
      const variables = {
        items: [{name: 'Item 1'}, {name: 'Item 2'}, {name: 'Item 3'}],
      };
      const result = resolveTemplate(template, variables);
      expect(result).toBe('Items: - Item 1 - Item 2 - Item 3 ');
    });
  });

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
    const definitions: Record<string, VariableDefinition> = {
      name: {type: 'string'},
      age: {type: 'number'},
      policy: {
        type: 'object',
        schema: {
          name: {type: 'string'},
          cost: {type: 'number'},
        },
      },
    };

    it('should validate defined variables', () => {
      const template = 'Hello {{name}}, you are {{age}} years old';
      const result = validateTemplateVariables(template, definitions);
      expect(result.valid).toBe(true);
      expect(result.missingVariables).toEqual([]);
      expect(result.syntaxError).toBeUndefined();
    });

    it('should detect missing variables', () => {
      const template = 'Hello {{name}}, from {{location}}';
      const result = validateTemplateVariables(template, definitions);
      expect(result.valid).toBe(false);
      expect(result.missingVariables).toEqual(['location']);
      expect(result.syntaxError).toBeUndefined();
    });

    it('should validate nested properties', () => {
      const template = 'Policy: {{policy.name}}';
      const result = validateTemplateVariables(template, definitions);
      expect(result.valid).toBe(true);
      expect(result.missingVariables).toEqual([]);
      expect(result.syntaxError).toBeUndefined();
    });

    it('should detect syntax errors', () => {
      const template = 'Unclosed {{#section}} without closing';
      const result = validateTemplateVariables(template, definitions);
      expect(result.valid).toBe(false);
      expect(result.syntaxError).toBeDefined();
    });
  });
});
