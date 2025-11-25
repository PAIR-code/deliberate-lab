import {VariableDefinition, VariableType} from './variables';
import {
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
      expect(result.missingVariables).toEqual([]);
      expect(result.syntaxError).toBeUndefined();
    });

    it('should detect missing variables', () => {
      const template = 'Hello, {{name}} from {{city}}!';
      const result = validateTemplateVariables(template, variableDefinitions);
      expect(result.valid).toBe(false);
      expect(result.missingVariables).toEqual(['city']);
      expect(result.syntaxError).toBeUndefined();
    });

    it('should detect if template references a field, but variable is not an object', () => {
      const template = 'Hello, {{name.first}}!';
      const result = validateTemplateVariables(template, variableDefinitions);
      expect(result.valid).toBe(false);
      expect(result.missingVariables).toEqual(['name.first']);
      expect(result.syntaxError).toBeUndefined();
    });

    it('should detect if variable is an object and template references an undefined field', () => {
      const template = 'Hello, {{department.chief}}';
      const result = validateTemplateVariables(template, variableDefinitions);
      expect(result.valid).toBe(false);
      expect(result.missingVariables).toEqual(['department.chief']);
      expect(result.syntaxError).toBeUndefined();
    });

    it('should detect syntax errors', () => {
      const template = 'Unclosed {{#section}} without closing';
      const result = validateTemplateVariables(template, variableDefinitions);
      expect(result.valid).toBe(false);
      expect(result.syntaxError).toBeDefined();
    });

    it('should validate array element access with numeric indices', () => {
      const template = '{{tasks.0.title}}: {{tasks.1.priority}}';
      const result = validateTemplateVariables(template, variableDefinitions);
      expect(result.valid).toBe(true);
      expect(result.missingVariables).toEqual([]);
    });

    it('should detect invalid array element field access', () => {
      const template = '{{tasks.0.description}}';
      const result = validateTemplateVariables(template, variableDefinitions);
      expect(result.valid).toBe(false);
      // Reports the full path including numeric index for specificity
      expect(result.missingVariables).toEqual(['tasks.0.description']);
    });

    it('should validate nested object fields', () => {
      const template = '{{department.name}} on floor {{department.floor}}';
      const result = validateTemplateVariables(template, variableDefinitions);
      expect(result.valid).toBe(true);
      expect(result.missingVariables).toEqual([]);
    });

    it('should detect invalid nested object fields', () => {
      const template = '{{department.building}}';
      const result = validateTemplateVariables(template, variableDefinitions);
      expect(result.valid).toBe(false);
      expect(result.missingVariables).toEqual(['department.building']);
    });

    it('should validate section iteration (array)', () => {
      const template =
        'Tasks: {{#tasks}} - {{title}} (Priority: {{priority}}) {{/tasks}}';
      const result = validateTemplateVariables(template, variableDefinitions);
      expect(result.valid).toBe(true);
      expect(result.missingVariables).toEqual([]);
    });

    it('should validate section context (object)', () => {
      const template =
        'Dept: {{#department}} {{name}} - Floor {{floor}} {{/department}}';
      const result = validateTemplateVariables(template, variableDefinitions);
      expect(result.valid).toBe(true);
      expect(result.missingVariables).toEqual([]);
    });

    it('should detect missing variables inside sections', () => {
      const template = 'Tasks: {{#tasks}} - {{description}} {{/tasks}}';
      const result = validateTemplateVariables(template, variableDefinitions);
      expect(result.valid).toBe(false);
      expect(result.missingVariables).toEqual(['description']);
    });

    it('should fallback to outer context if variable not found in section', () => {
      const template = '{{#tasks}} Task for {{name}}: {{title}} {{/tasks}}';
      const result = validateTemplateVariables(template, variableDefinitions);
      expect(result.valid).toBe(true);
      expect(result.missingVariables).toEqual([]);
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
      expect(result.missingVariables).toEqual([]);
    });

    it('should validate triple mustache and ampersand tags', () => {
      const template = '{{{name}}} is &{{name}}';
      const result = validateTemplateVariables(template, variableDefinitions);
      expect(result.valid).toBe(true);
      expect(result.missingVariables).toEqual([]);
    });
  });
});
