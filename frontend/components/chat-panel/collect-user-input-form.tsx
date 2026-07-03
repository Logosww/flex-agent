'use client';

import { useForm } from '@tanstack/react-form';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { useSubmitCollectUserInputMutation } from '@/lib/queries/collect-user-input';
import type { FormUIDescription } from '@/types/form-ui-schema';
import {
  buildCollectFormZodSchema,
  collectFormDefaultValues,
  normalizedSelectOptions,
} from '@/types/form-ui-schema';

export type CollectUserInputFormProps = {
  toolCallId: string;
  description: FormUIDescription;
};

function formatValidationError(error: { issues: { message?: string }[] }) {
  const messages: string[] = [];
  for (const issue of error.issues) {
    if (issue.message) messages.push(issue.message);
  }
  return messages.join('；') || '校验未通过';
}

function CollectUserInputFormInner({ toolCallId, description }: CollectUserInputFormProps) {
  const [locked, setLocked] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submitMutation = useSubmitCollectUserInputMutation();
  const schema = buildCollectFormZodSchema(description);
  const defaults = collectFormDefaultValues(description);
  const isSubmitting = submitMutation.isPending;
  const disabled = locked || isSubmitting;

  const form = useForm({
    defaultValues: defaults as Record<string, string | number | boolean | undefined>,
    onSubmit: async ({ value }) => {
      if (disabled) return;
      setSubmitError(null);
      const parsed = schema.safeParse(value);
      if (!parsed.success) {
        setSubmitError(formatValidationError(parsed.error));
        return;
      }
      try {
        await submitMutation.mutateAsync({
          toolCallId,
          values: parsed.data as Record<string, string | number | boolean>,
        });
        setLocked(true);
      } catch (e) {
        setSubmitError(e instanceof Error ? e.message : '提交失败，请重试');
      }
    },
  });

  return (
    <Card className="gap-0 data-[size=sm]:gap-0 border-border py-0" size="sm">
      <CardHeader className="border-b px-3 py-2.5">
        <CardTitle>{description.title}</CardTitle>
        {description.description ? (
          <CardDescription>{description.description}</CardDescription>
        ) : null}
      </CardHeader>
      <form
        autoComplete="off"
        onSubmit={(e) => {
          e.preventDefault();
          void form.handleSubmit();
        }}
      >
        <fieldset disabled={disabled} className="m-0 min-w-0 border-0 p-0">
          <CardContent className="flex flex-col gap-3 px-3 py-3">
            <FieldGroup className="gap-3">
              {description.fields.map((fieldDef) => {
                if (fieldDef.type === 'checkbox') {
                  return (
                    <form.Field key={fieldDef.name} name={fieldDef.name}>
                      {(field) => (
                        <Field
                          data-invalid={
                            field.state.meta.isTouched && !field.state.meta.isValid
                              ? true
                              : undefined
                          }
                          orientation="horizontal"
                        >
                          <Checkbox
                            name={fieldDef.name}
                            id={`${toolCallId}-${fieldDef.name}`}
                            checked={!!field.state.value}
                            onCheckedChange={(v) => field.handleChange(!!v)}
                            onBlur={field.handleBlur}
                            aria-invalid={field.state.meta.isTouched && !field.state.meta.isValid}
                          />
                          <FieldContent>
                            <FieldLabel
                              htmlFor={`${toolCallId}-${fieldDef.name}`}
                              className="font-normal"
                            >
                              {fieldDef.label}
                            </FieldLabel>
                            <FieldError errors={field.state.meta.errors} />
                          </FieldContent>
                        </Field>
                      )}
                    </form.Field>
                  );
                }

                if (fieldDef.type === 'textarea') {
                  return (
                    <form.Field key={fieldDef.name} name={fieldDef.name}>
                      {(field) => (
                        <Field
                          data-invalid={
                            field.state.meta.isTouched && !field.state.meta.isValid
                              ? true
                              : undefined
                          }
                        >
                          <FieldLabel htmlFor={`${toolCallId}-${fieldDef.name}`}>
                            {fieldDef.label}
                          </FieldLabel>
                          <Textarea
                            name={fieldDef.name}
                            id={`${toolCallId}-${fieldDef.name}`}
                            placeholder={fieldDef.placeholder}
                            value={String(field.state.value ?? '')}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            aria-invalid={field.state.meta.isTouched && !field.state.meta.isValid}
                            rows={4}
                          />
                          <FieldError errors={field.state.meta.errors} />
                        </Field>
                      )}
                    </form.Field>
                  );
                }

                if (fieldDef.type === 'select') {
                  const opts = normalizedSelectOptions(fieldDef);
                  return (
                    <form.Field key={fieldDef.name} name={fieldDef.name}>
                      {(field) => (
                        <Field
                          data-invalid={
                            field.state.meta.isTouched && !field.state.meta.isValid
                              ? true
                              : undefined
                          }
                        >
                          <FieldLabel htmlFor={`${toolCallId}-${fieldDef.name}`}>
                            {fieldDef.label}
                          </FieldLabel>
                          <Select
                            name={fieldDef.name}
                            value={String(field.state.value ?? '')}
                            onValueChange={(v) => field.handleChange(v ?? '')}
                          >
                            <SelectTrigger
                              id={`${toolCallId}-${fieldDef.name}`}
                              className="w-full min-w-0"
                              aria-invalid={field.state.meta.isTouched && !field.state.meta.isValid}
                            >
                              <SelectValue placeholder="选择一项" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                {opts.map((o) => (
                                  <SelectItem key={o.value} value={o.value}>
                                    {o.label}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                          <FieldError errors={field.state.meta.errors} />
                        </Field>
                      )}
                    </form.Field>
                  );
                }

                if (fieldDef.type === 'number') {
                  return (
                    <form.Field key={fieldDef.name} name={fieldDef.name}>
                      {(field) => (
                        <Field
                          data-invalid={
                            field.state.meta.isTouched && !field.state.meta.isValid
                              ? true
                              : undefined
                          }
                        >
                          <FieldLabel htmlFor={`${toolCallId}-${fieldDef.name}`}>
                            {fieldDef.label}
                          </FieldLabel>
                          <Input
                            name={fieldDef.name}
                            id={`${toolCallId}-${fieldDef.name}`}
                            type="number"
                            min={fieldDef.min}
                            max={fieldDef.max}
                            step={fieldDef.step}
                            value={
                              field.state.value === undefined ||
                              (typeof field.state.value === 'number' &&
                                Number.isNaN(field.state.value))
                                ? ''
                                : String(field.state.value)
                            }
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (raw === '') {
                                field.handleChange(undefined);
                                return;
                              }
                              const n = e.target.valueAsNumber;
                              field.handleChange(Number.isNaN(n) ? undefined : n);
                            }}
                            onBlur={field.handleBlur}
                            aria-invalid={field.state.meta.isTouched && !field.state.meta.isValid}
                          />
                          <FieldError errors={field.state.meta.errors} />
                        </Field>
                      )}
                    </form.Field>
                  );
                }

                return (
                  <form.Field key={fieldDef.name} name={fieldDef.name}>
                    {(field) => (
                      <Field
                        data-invalid={
                          field.state.meta.isTouched && !field.state.meta.isValid ? true : undefined
                        }
                      >
                        <FieldLabel htmlFor={`${toolCallId}-${fieldDef.name}`}>
                          {fieldDef.label}
                        </FieldLabel>
                        <Input
                          name={fieldDef.name}
                          id={`${toolCallId}-${fieldDef.name}`}
                          type={fieldDef.type === 'date' ? 'date' : 'text'}
                          placeholder={fieldDef.type === 'text' ? fieldDef.placeholder : undefined}
                          min={fieldDef.type === 'date' ? fieldDef.min : undefined}
                          max={fieldDef.type === 'date' ? fieldDef.max : undefined}
                          value={String(field.state.value ?? '')}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                          aria-invalid={field.state.meta.isTouched && !field.state.meta.isValid}
                        />
                        <FieldError errors={field.state.meta.errors} />
                      </Field>
                    )}
                  </form.Field>
                );
              })}
            </FieldGroup>
            {submitError ? (
              <p className="text-sm text-destructive" role="alert" aria-live="polite">
                {submitError}
              </p>
            ) : null}
          </CardContent>
          <CardFooter className="flex justify-end border-t bg-transparent px-3 py-2.5">
            <Button type="submit" disabled={disabled}>
              {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
              {isSubmitting ? '提交中…' : locked ? '已提交' : (description.submitLabel ?? '提交')}
            </Button>
          </CardFooter>
        </fieldset>
      </form>
    </Card>
  );
}

export function CollectUserInputForm({ toolCallId, description }: CollectUserInputFormProps) {
  return (
    <CollectUserInputFormInner key={toolCallId} toolCallId={toolCallId} description={description} />
  );
}
