type JsonSchemaTypeToTS<T extends string> = T extends 'string'
  ? string
  : T extends 'number' | 'integer'
    ? number
    : T extends 'boolean'
      ? boolean
      : unknown;

type SchemaPropertyObject = { type: string } & Record<string, unknown>;

type RequiredKeys<P extends Record<string, unknown>, R extends readonly string[]> = Extract<
  keyof P & string,
  R[number]
>;

type OptionalKeys<P extends Record<string, unknown>, R extends readonly string[]> = Exclude<
  keyof P & string,
  R[number]
>;

export type ObjectParameterSchema = {
  type: 'object';
  properties: Record<string, SchemaPropertyObject>;
  required: readonly string[];
};

export type InferObjectParameters<S extends ObjectParameterSchema> = {
  [K in RequiredKeys<S['properties'], S['required']>]: JsonSchemaTypeToTS<
    S['properties'][K]['type']
  >;
} & {
  [K in OptionalKeys<S['properties'], S['required']>]?: JsonSchemaTypeToTS<
    S['properties'][K]['type']
  >;
};
