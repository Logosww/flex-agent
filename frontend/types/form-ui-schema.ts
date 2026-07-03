import { z } from 'zod';

const formFieldSchema = z.discriminatedUnion('type', [
  z.object({
    name: z.string(),
    label: z.string(),
    type: z.literal('text'),
    required: z.boolean().optional(),
    placeholder: z.string().optional(),
    default: z.string().optional(),
  }),
  z.object({
    name: z.string(),
    label: z.string(),
    type: z.literal('textarea'),
    required: z.boolean().optional(),
    placeholder: z.string().optional(),
    default: z.string().optional(),
  }),
  z.object({
    name: z.string(),
    label: z.string(),
    type: z.literal('number'),
    required: z.boolean().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    step: z.number().optional(),
    default: z.number().optional(),
  }),
  z.object({
    name: z.string(),
    label: z.string(),
    type: z.literal('select'),
    required: z.boolean().optional(),
    options: z.array(z.union([z.string(), z.object({ value: z.string(), label: z.string() })])),
  }),
  z.object({
    name: z.string(),
    label: z.string(),
    type: z.literal('checkbox'),
    default: z.boolean().optional(),
  }),
  z.object({
    name: z.string(),
    label: z.string(),
    type: z.literal('date'),
    required: z.boolean().optional(),
    min: z.string().optional(),
    max: z.string().optional(),
  }),
]);

export const formUIDescriptionSchema = z.object({
  id: z.string().optional(),
  type: z.literal('form').catch('form'),
  title: z.string(),
  description: z.string().optional(),
  submitLabel: z.string().optional(),
  fields: z.array(formFieldSchema),
});

export const formSubmitOutputSchema = z.object({
  values: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
});

export type FormUIDescription = z.infer<typeof formUIDescriptionSchema>;
export type FormFieldConfig = FormUIDescription['fields'][number];
export type FormSubmitOutput = z.infer<typeof formSubmitOutputSchema>;

function optionValue(o: string | { value: string; label: string }): string {
  return typeof o === 'string' ? o : o.value;
}

function optionLabel(o: string | { value: string; label: string }): string {
  return typeof o === 'string' ? o : o.label;
}

export function normalizedSelectOptions(field: {
  options: Array<string | { value: string; label: string }>;
}): { value: string; label: string }[] {
  return field.options.map((o) => ({ value: optionValue(o), label: optionLabel(o) }));
}

export function collectFormDefaultValues(
  desc: FormUIDescription,
): Record<string, string | number | boolean | undefined> {
  const d: Record<string, string | number | boolean | undefined> = {};
  for (const f of desc.fields) {
    if (f.type === 'checkbox') {
      d[f.name] = f.default ?? false;
    } else if (f.type === 'number') {
      d[f.name] = f.default;
    } else if (f.type === 'select') {
      d[f.name] = f.required ? (normalizedSelectOptions(f)[0]?.value ?? '') : '';
    } else if (f.type === 'text' || f.type === 'textarea') {
      d[f.name] = f.default ?? '';
    } else if (f.type === 'date') {
      d[f.name] = '';
    }
  }
  return d;
}

export function buildCollectFormZodSchema(desc: FormUIDescription) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of desc.fields) {
    if (field.type === 'text' || field.type === 'textarea' || field.type === 'date') {
      const s = z.string();
      shape[field.name] = field.required ? s.min(1) : s.optional();
    } else if (field.type === 'number') {
      const min = field.min;
      const max = field.max;
      let inner = z.coerce.number();
      if (min != null) inner = inner.min(min);
      if (max != null) inner = inner.max(max);
      shape[field.name] = field.required
        ? inner.refine((n) => !Number.isNaN(n))
        : z.preprocess(
            (v) => (typeof v === 'number' && Number.isNaN(v) ? undefined : v),
            inner.optional(),
          );
    } else if (field.type === 'select') {
      const opts = normalizedSelectOptions(field).map((o) => o.value);
      const e = opts.length ? z.enum(opts as [string, ...string[]]) : z.string();
      shape[field.name] = field.required ? e : e.optional();
    } else if (field.type === 'checkbox') {
      shape[field.name] = z.boolean();
    }
  }
  return z.object(shape);
}
