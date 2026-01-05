import {VariableDefinition, VariableType} from './variables';
import {
  findUnusedVariables,
  resolveTemplateVariables,
  validateTemplateVariables,
} from './variables.template';

describe('Mustache Template Resolution', () => {
  const variableDefinitions: Record<string, VariableDefinition> = {
    name: {
      name: 'name',
      description: '',
      schema: VariableType.STRING,
    },
    department: {
      name: 'department',
      description: '',
      schema: VariableType.object({
        name: VariableType.STRING,
        numEmployees: VariableType.NUMBER,
        hasSnacks: VariableType.BOOLEAN,
      }),
    },
    employees: {
      name: 'employees',
      description: '',
      schema: VariableType.array(
        VariableType.object({
          name: VariableType.STRING,
          role: VariableType.STRING,
        }),
      ),
    },
    tasks: {
      name: 'tasks',
      description: '',
      schema: VariableType.array(
        VariableType.object({
          title: VariableType.STRING,
          priority: VariableType.NUMBER,
        }),
      ),
    },
  };
  const valueMap: Record<string, string> = {
    name: 'Helly R',
    age: '42',
    isActive: 'true',
    department: '{"name": "MDR", "numEmployees": "4", "hasSnacks": "true"}',
    employees: JSON.stringify([
      {name: 'Mark', role: 'Team Lead'},
      {name: 'Helly', role: 'New Hire'},
      {name: 'Irving', role: 'Senior'},
    ]),
  };

  describe('resolveTemplateVariables', () => {
    it('should resolve string variable', () => {
      const template = 'Welcome, {{name}}';
      const resolution = resolveTemplateVariables(
        template,
        variableDefinitions,
        valueMap,
      );
      expect(resolution).toEqual('Welcome, Helly R');
    });

    it('should resolve object field', () => {
      const template = 'Welcome to {{department.name}}';
      const resolution = resolveTemplateVariables(
        template,
        variableDefinitions,
        valueMap,
      );
      expect(resolution).toEqual('Welcome to MDR');
    });

    it('should resolve array with iteration', () => {
      const template =
        'Team: {{#employees}}{{name}} ({{role}}), {{/employees}}';
      const resolution = resolveTemplateVariables(
        template,
        variableDefinitions,
        valueMap,
      );
      expect(resolution).toEqual(
        'Team: Mark (Team Lead), Helly (New Hire), Irving (Senior), ',
      );
    });

    it('should resolve nested array fields', () => {
      const template = '{{#employees}}- {{name}}\n{{/employees}}';
      const resolution = resolveTemplateVariables(
        template,
        variableDefinitions,
        valueMap,
      );
      expect(resolution).toEqual('- Mark\n- Helly\n- Irving\n');
    });

    it('should not HTML-escape special characters in values', () => {
      const definitions: Record<string, VariableDefinition> = {
        personality: {
          name: 'personality',
          description: '',
          schema: VariableType.STRING,
        },
      };
      const values: Record<string, string> = {
        personality: '"disappointed"',
      };
      const template = 'Your personality is {{personality}}.';
      const resolution = resolveTemplateVariables(
        template,
        definitions,
        values,
      );
      // Should NOT escape quotes to &quot;
      expect(resolution).toEqual('Your personality is "disappointed".');
      expect(resolution).not.toContain('&quot;');
    });

    it('should preserve HTML-like content in values without escaping', () => {
      const definitions: Record<string, VariableDefinition> = {
        content: {
          name: 'content',
          description: '',
          schema: VariableType.STRING,
        },
      };
      const values: Record<string, string> = {
        content: '<bold> & "quoted"',
      };
      const template = 'Content: {{content}}';
      const resolution = resolveTemplateVariables(
        template,
        definitions,
        values,
      );
      expect(resolution).toEqual('Content: <bold> & "quoted"');
      expect(resolution).not.toContain('&lt;');
      expect(resolution).not.toContain('&amp;');
      expect(resolution).not.toContain('&quot;');
    });
  });

  describe('validateTemplateVariables', () => {
    const variableDefinitions: Record<string, VariableDefinition> = {
      name: {
        name: 'name',
        description: '',
        schema: VariableType.STRING,
      },
      department: {
        name: 'department',
        description: '',
        schema: VariableType.object({
          name: VariableType.STRING,
          floor: VariableType.NUMBER,
        }),
      },
      tasks: {
        name: 'tasks',
        description: '',
        schema: VariableType.array(
          VariableType.object({
            title: VariableType.STRING,
            priority: VariableType.NUMBER,
          }),
        ),
      },
    };

    it('should validate defined variables', () => {
      const template = 'Hello, {{name}}!';
      const result = validateTemplateVariables(template, variableDefinitions);
      expect(result.valid).toBe(true);
      expect(result.invalidVariables).toEqual([]);
    });

    it('should detect missing variables', () => {
      const template = 'Hello, {{name}} from {{city}}!';
      const result = validateTemplateVariables(template, variableDefinitions);
      expect(result.valid).toBe(false);
      expect(result.invalidVariables).toEqual([
        {path: 'city', reason: 'undefined'},
      ]);
    });

    it('should detect if template references a field, but variable is not an object', () => {
      const template = 'Hello, {{name.first}}!';
      const result = validateTemplateVariables(template, variableDefinitions);
      expect(result.valid).toBe(false);
      expect(result.invalidVariables).toEqual([
        {path: 'name.first', reason: 'undefined'},
      ]);
    });

    it('should detect if variable is an object and template references an undefined field', () => {
      const template = 'Hello, {{department.chief}}';
      const result = validateTemplateVariables(template, variableDefinitions);
      expect(result.valid).toBe(false);
      expect(result.invalidVariables).toEqual([
        {path: 'department.chief', reason: 'undefined'},
      ]);
    });

    it('should detect syntax errors', () => {
      const template = 'Unclosed {{#section}} without closing';
      const result = validateTemplateVariables(template, variableDefinitions);
      expect(result.valid).toBe(false);
      expect(result.invalidVariables.length).toBe(1);
      expect(result.invalidVariables[0].reason).toBe('syntax');
      expect(result.invalidVariables[0].path).toBeTruthy();
    });

    it('should validate array element access with numeric indices', () => {
      const template = '{{tasks.0.title}}: {{tasks.1.priority}}';
      const result = validateTemplateVariables(template, variableDefinitions);
      expect(result.valid).toBe(true);
      expect(result.invalidVariables).toEqual([]);
    });

    it('should detect invalid array element field access', () => {
      const template = '{{tasks.0.description}}';
      const result = validateTemplateVariables(template, variableDefinitions);
      expect(result.valid).toBe(false);
      // Reports the full path including numeric index for specificity
      expect(result.invalidVariables).toEqual([
        {path: 'tasks.0.description', reason: 'undefined'},
      ]);
    });

    it('should validate nested object fields', () => {
      const template = '{{department.name}} on floor {{department.floor}}';
      const result = validateTemplateVariables(template, variableDefinitions);
      expect(result.valid).toBe(true);
      expect(result.invalidVariables).toEqual([]);
    });

    it('should detect invalid nested object fields', () => {
      const template = '{{department.building}}';
      const result = validateTemplateVariables(template, variableDefinitions);
      expect(result.valid).toBe(false);
      expect(result.invalidVariables).toEqual([
        {path: 'department.building', reason: 'undefined'},
      ]);
    });

    it('should validate section iteration (array)', () => {
      const template =
        'Tasks: {{#tasks}} - {{title}} (Priority: {{priority}}) {{/tasks}}';
      const result = validateTemplateVariables(template, variableDefinitions);
      expect(result.valid).toBe(true);
      expect(result.invalidVariables).toEqual([]);
    });

    it('should validate section context (object)', () => {
      const template =
        'Dept: {{#department}} {{name}} - Floor {{floor}} {{/department}}';
      const result = validateTemplateVariables(template, variableDefinitions);
      expect(result.valid).toBe(true);
      expect(result.invalidVariables).toEqual([]);
    });

    it('should detect missing variables inside sections', () => {
      const template = 'Tasks: {{#tasks}} - {{description}} {{/tasks}}';
      const result = validateTemplateVariables(template, variableDefinitions);
      expect(result.valid).toBe(false);
      expect(result.invalidVariables).toEqual([
        {path: 'description', reason: 'undefined'},
      ]);
    });

    it('should fallback to outer context if variable not found in section', () => {
      const template = '{{#tasks}} Task for {{name}}: {{title}} {{/tasks}}';
      const result = validateTemplateVariables(template, variableDefinitions);
      expect(result.valid).toBe(true);
      expect(result.invalidVariables).toEqual([]);
    });

    it('should validate deeply nested sections', () => {
      const complexMap: Record<string, VariableDefinition> = {
        ...variableDefinitions,
        company: {
          name: 'company',
          description: '',
          schema: VariableType.object({
            teams: VariableType.array(
              VariableType.object({
                lead: VariableType.STRING,
                members: VariableType.array(
                  VariableType.object({
                    name: VariableType.STRING,
                  }),
                ),
              }),
            ),
          }),
        },
      };

      const template =
        '{{#company.teams}} Lead: {{lead}}, Members: {{#members}} {{name}} {{/members}} {{/company.teams}}';
      const result = validateTemplateVariables(template, complexMap);
      expect(result.valid).toBe(true);
      expect(result.invalidVariables).toEqual([]);
    });

    it('should validate triple mustache and ampersand tags', () => {
      const template = '{{{name}}} is &{{name}}';
      const result = validateTemplateVariables(template, variableDefinitions);
      expect(result.valid).toBe(true);
      expect(result.invalidVariables).toEqual([]);
    });

    it('should detect object variable used directly without property access', () => {
      const template = 'Department: {{department}}';
      const result = validateTemplateVariables(template, variableDefinitions);
      expect(result.valid).toBe(false);
      expect(result.invalidVariables).toEqual([
        {path: 'department', reason: 'object_needs_property'},
      ]);
    });

    it('should not flag object variable used in a section', () => {
      const template =
        'Dept: {{#department}} {{name}} - Floor {{floor}} {{/department}}';
      const result = validateTemplateVariables(template, variableDefinitions);
      expect(result.valid).toBe(true);
      expect(result.invalidVariables).toEqual([]);
    });

    it('should not flag when object property is accessed', () => {
      const template = 'Department: {{department.name}}';
      const result = validateTemplateVariables(template, variableDefinitions);
      expect(result.valid).toBe(true);
      expect(result.invalidVariables).toEqual([]);
    });

    it('should detect triple mustache and ampersand tags with objects', () => {
      const template = '{{{department}}} and &{{department}}';
      const result = validateTemplateVariables(template, variableDefinitions);
      expect(result.valid).toBe(false);
      expect(result.invalidVariables).toEqual([
        {path: 'department', reason: 'object_needs_property'},
      ]);
    });

    it('should not flag primitives used directly', () => {
      const template = '{{name}}';
      const result = validateTemplateVariables(template, variableDefinitions);
      expect(result.valid).toBe(true);
      expect(result.invalidVariables).toEqual([]);
    });

    it('should not flag arrays used directly (they are often iterated)', () => {
      const template = '{{tasks}}';
      const result = validateTemplateVariables(template, variableDefinitions);
      expect(result.valid).toBe(true);
      expect(result.invalidVariables).toEqual([]);
    });
  });

  describe('findUnusedVariables', () => {
    const variableDefinitions: Record<string, VariableDefinition> = {
      name: {
        name: 'name',
        description: '',
        schema: VariableType.STRING,
      },
      city: {
        name: 'city',
        description: '',
        schema: VariableType.STRING,
      },
      department: {
        name: 'department',
        description: '',
        schema: VariableType.object({
          name: VariableType.STRING,
          floor: VariableType.NUMBER,
        }),
      },
    };

    it('should find unused variables', () => {
      const template = 'Hello, {{name}}!';
      const result = findUnusedVariables(template, variableDefinitions);
      expect(result).toEqual(['city', 'department']);
    });

    it('should return empty array when all variables are used', () => {
      const template = '{{name}} from {{city}} works in {{department.name}}';
      const result = findUnusedVariables(template, variableDefinitions);
      expect(result).toEqual([]);
    });

    it('should consider a variable used if any of its fields are accessed', () => {
      const template = 'Floor: {{department.floor}}';
      const result = findUnusedVariables(template, variableDefinitions);
      expect(result).toEqual(['name', 'city']);
    });

    it('should return all variables for templates without variable references', () => {
      const template = 'Just plain text';
      const result = findUnusedVariables(template, variableDefinitions);
      expect(result).toEqual(['name', 'city', 'department']);
    });

    it('should return empty array when no variables are defined', () => {
      const template = '{{name}} {{city}}';
      const result = findUnusedVariables(template, {});
      expect(result).toEqual([]);
    });

    it('should handle JSON stringified content (typical use case)', () => {
      const stages = JSON.stringify({
        stage1: {description: 'Welcome {{name}}'},
        stage2: {description: 'You are in {{department.name}}'},
      });
      const result = findUnusedVariables(stages, variableDefinitions);
      expect(result).toEqual(['city']);
    });
  });
});
