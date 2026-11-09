// Content contract version 0 (lgtm/docs/plan/03-content-contract.md) as Zod schemas.
// Used by src/content.config.ts (so `astro build` fails on a bad file) and by scripts/check-content.ts.
import { z } from 'zod';
import { DOMAINS } from './exams.ts';

export const MODULE_ID = /^m\d\d$/;
export const STEP_ID = /^(m\d\d)-s\d\d$/;
export const QUESTION_ID = /^q-(m\d\d|mock-otca|mock-pca)-\d{3}$/;
export const SLOT_ID = /^(log|metric|span)-(m\d\d)-[1-9]$/;
const TAG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const https = z.url({ protocol: /^https$/, message: 'must be an https URL' });

export const moduleSchema = z.strictObject({
  id: z.string().regex(MODULE_ID, 'module id must look like m04'),
  title: z.string().min(1),
  goal: z.string().min(1),
  order: z.number().int().min(0),
  quiz: z.boolean(),
  exams: z.array(z.enum(['otca', 'pca'])),
});

export const examRefSchema = z
  .strictObject({
    cert: z.enum(['pca', 'otca', 'none']),
    domain: z.string().optional(),
    competency: z.string().optional(),
  })
  .superRefine((e, ctx) => {
    if (e.cert === 'none') {
      if (e.domain || e.competency) ctx.addIssue({ code: 'custom', message: 'cert "none" takes no domain or competency' });
      return;
    }
    const d = e.domain ? DOMAINS[e.domain] : undefined;
    if (!d || d.cert !== e.cert) {
      ctx.addIssue({ code: 'custom', path: ['domain'], message: `domain "${e.domain ?? ''}" is not a ${e.cert} domain` });
      return;
    }
    if (!e.competency || !d.competencies.includes(e.competency)) {
      ctx.addIssue({
        code: 'custom',
        path: ['competency'],
        message: `competency "${e.competency ?? ''}" is not in ${e.domain} (${d.competencies.join('; ')})`,
      });
    }
  });

const prompt = z.string().min(1);

export const checkSchema = z.discriminatedUnion('kind', [
  z
    .strictObject({
      kind: z.literal('exact'),
      prompt,
      answer: z.string().min(1).optional(),
      answers: z.array(z.string().min(1)).min(1).optional(),
    })
    .refine((c) => !!c.answer !== !!c.answers, { message: 'an exact check needs either answer or answers, not both' }),
  z.strictObject({
    kind: z.literal('regex'),
    prompt,
    pattern: z
      .string()
      .min(1)
      .refine((p) => {
        try {
          new RegExp(p);
          return true;
        } catch {
          return false;
        }
      }, 'pattern is not a valid regular expression'),
  }),
  z
    .strictObject({ kind: z.literal('range'), prompt, min: z.number(), max: z.number() })
    .refine((c) => c.min <= c.max, { message: 'min must not be above max' }),
  z
    .strictObject({
      kind: z.literal('choice'),
      prompt,
      options: z.array(z.string().min(1)).min(2).max(6),
      answer: z.union([z.number().int().min(0), z.string().min(1)]),
    })
    .refine((c) => (typeof c.answer === 'number' ? c.answer < c.options.length : c.options.includes(c.answer)), {
      message: 'answer must be an index into options or the text of one option',
    }),
  z.strictObject({ kind: z.literal('token'), prompt, slot: z.string().regex(SLOT_ID, 'slot must look like log-m12-3') }),
]);

export const stepSchema = z
  .strictObject({
    id: z.string().regex(STEP_ID, 'step id must look like m04-s07'),
    title: z.string().min(1),
    kind: z.enum(['concept', 'lab', 'drill', 'recap']),
    minutes: z.number().int().min(1).max(240),
    order: z.number().int().min(0),
    exam: z.array(examRefSchema).min(1),
    tags: z.array(z.string().regex(TAG, 'tags are lower-case words joined by hyphens')).min(1).max(3),
    flags: z.array(z.string().min(1)).default([]),
    check: checkSchema.optional(),
    sources: z
      .array(
        z.strictObject({
          title: z.string().min(1),
          url: https,
          // YAML turns an unquoted 2026-11-20 into a date; both forms are accepted.
          checked: z.union([z.iso.date(), z.date()]),
        }),
      )
      .default([]),
  })
  .superRefine((s, ctx) => {
    if ((s.kind === 'lab' || s.kind === 'drill') && !s.check) {
      ctx.addIssue({ code: 'custom', path: ['check'], message: `a ${s.kind} step needs a check` });
    }
  });

export const questionSchema = z.strictObject({
  id: z.string().regex(QUESTION_ID, 'question id must look like q-m04-017'),
  tags: z.array(z.string().regex(TAG)).min(1).max(2),
  exam: examRefSchema,
  q: z.string().min(1),
  options: z.array(z.strictObject({ text: z.string().min(1), why: z.string().min(1) })).min(4).max(5),
  answer: z.array(z.number().int().min(0)).min(1).max(2),
  source: https,
});

export const questionFileSchema = z.array(questionSchema);

export type ModuleData = z.infer<typeof moduleSchema>;
export type StepData = z.infer<typeof stepSchema>;
export type CheckData = z.infer<typeof checkSchema>;
export type QuestionData = z.infer<typeof questionSchema>;
export type ExamRef = z.infer<typeof examRefSchema>;
