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

export const formUIDescriptionJsonSchema = z.toJSONSchema(formUIDescriptionSchema);

export type FormUIDescription = z.infer<typeof formUIDescriptionSchema>;
export type FormSubmitOutput = z.infer<typeof formSubmitOutputSchema>;
