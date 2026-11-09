// Content collections: modules, steps and questions, validated against the content contract.
// A file that breaks a schema fails `astro build`; scripts/check-content.ts checks the rest
// and runs before every build. The folder is src/content, or tests/fixtures/content for the
// sample build (LGTM_CONTENT=sample).
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import YAML from 'yaml';
import { contentRoot } from './lib/build-env.ts';
import { moduleSchema, questionFileSchema, questionSchema, stepSchema } from './lib/schema.ts';

const root = contentRoot();

const modules = defineCollection({
  loader: glob({ base: pathToFileURL(path.join(root, 'modules')), pattern: '*.yaml', generateId: ({ data }) => String(data.id) }),
  schema: moduleSchema,
});

const steps = defineCollection({
  loader: glob({ base: pathToFileURL(path.join(root, 'steps')), pattern: '**/*.mdx', generateId: ({ data }) => String(data.id) }),
  schema: stepSchema,
});

// A question file holds a list, so each question becomes its own entry.
const questions = defineCollection({
  loader: {
    name: 'question-files',
    load: async ({ store, parseData }) => {
      store.clear();
      const dir = path.join(root, 'questions');
      const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.yaml')).sort() : [];
      for (const file of files) {
        const parsed = questionFileSchema.safeParse(YAML.parse(fs.readFileSync(path.join(dir, file), 'utf8')) ?? []);
        if (!parsed.success) throw new Error(`questions/${file}: schema: ${parsed.error.message}`);
        const list = parsed.data;
        for (const q of list) {
          const data = await parseData({ id: q.id, data: { ...q }, filePath: path.join(dir, file) });
          store.set({ id: q.id, data });
        }
      }
    },
  },
  schema: questionSchema,
});

export const collections = { modules, steps, questions };
