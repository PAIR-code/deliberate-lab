import {StructuredOutputDataType, printSchema} from './structured_output';

describe('Structured outputs', () => {
  it('print schemas in expected format', () => {
    const structuredOutputSchema = {
      type: StructuredOutputDataType.OBJECT,
      properties: [
        {
          name: 'stringProperty',
          schema: {
            type: StructuredOutputDataType.STRING,
            description: 'A string-valued property',
          },
        },
        {
          name: 'intArrayProperty',
          schema: {
            type: StructuredOutputDataType.ARRAY,
            description: 'An array-valued property',
            arrayItems: {
              type: StructuredOutputDataType.INTEGER,
              description: 'An integer-valued property',
            },
          },
        },
        {
          name: 'enumProperty',
          schema: {
            type: StructuredOutputDataType.ENUM,
            description: 'An enum-valued property',
            enumItems: ['FOO', 'BAR', 'BAZ'],
          },
        },
      ],
    };

    const result = printSchema(structuredOutputSchema);
    const parsedResult = JSON.parse(result);
    const expectedResult = {
      type: 'object',
      properties: {
        stringProperty: {
          description: 'A string-valued property',
          type: 'string',
        },
        intArrayProperty: {
          description: 'An array-valued property',
          type: 'array',
          items: {
            description: 'An integer-valued property',
            type: 'integer',
          },
        },
        enumProperty: {
          description: 'An enum-valued property',
          type: 'enum',
          enum: ['FOO', 'BAR', 'BAZ'],
        },
      },
      required: ['stringProperty', 'intArrayProperty', 'enumProperty'],
    };
    expect(parsedResult).toEqual(expectedResult);
  });
});
