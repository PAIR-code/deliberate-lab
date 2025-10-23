import {Type} from '@sinclair/typebox';
import {Index} from '@deliberation-lab/utils';
import {ValueError} from '@sinclair/typebox/build/cjs/errors';
import {
  accessNestedValue,
  checkUnionErrorOnPath,
  isUnionError,
  prettyPrintError,
  prettyPrintErrors,
} from './validation';

describe('validation utils', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('pretty prints individual validation errors', () => {
    const error = {
      message: 'Invalid value',
      path: '/config/value',
      value: 'bad',
    } as unknown as ValueError;

    prettyPrintError(error);

    expect(console.error).toHaveBeenCalledWith(
      'Invalid value for key "config.value" (received value bad)',
    );
  });

  it('pretty prints iterables of validation errors', () => {
    const errors = [
      {
        message: 'Invalid value',
        path: '/config/value',
        value: 'bad',
      },
      {
        message: 'Missing field',
        path: '/config/other',
        value: undefined,
      },
    ] as unknown as ValueError[];

    prettyPrintErrors(errors);

    expect((console.error as jest.Mock).mock.calls).toHaveLength(2);
  });

  it('accesses nested values using slash separated paths', () => {
    const value = accessNestedValue({config: {value: 42}}, '/config/value');
    expect(value).toBe(42);
  });

  it('accesses nested values using custom separator', () => {
    const value = accessNestedValue({config: {value: 42}}, 'config.value', '.');
    expect(value).toBe(42);
  });

  it('detects union validation errors by type', () => {
    expect(isUnionError({type: 62} as ValueError)).toBe(true);
    expect(isUnionError({type: 10} as ValueError)).toBe(false);
  });

  it('performs deep union validation based on kind', () => {
    const unionValidators = {
      foo: Type.Object({
        kind: Type.Literal('foo'),
        value: Type.Number(),
      }),
    } as unknown as Record<Index, ReturnType<typeof Type.Object>>;

    const data = {payload: {kind: 'foo', value: 'wrong'}};
    const iterator = checkUnionErrorOnPath(data, '/payload', unionValidators);
    const errors = Array.from(iterator);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('throws when union validation path lacks kind discriminator', () => {
    const unionValidators = {
      foo: Type.Object({
        kind: Type.Literal('foo'),
        value: Type.Number(),
      }),
    } as unknown as Record<Index, ReturnType<typeof Type.Object>>;

    expect(() =>
      checkUnionErrorOnPath({payload: {}}, '/payload', unionValidators),
    ).toThrow('Union error path must point to a value with a "kind" property');
  });
});
