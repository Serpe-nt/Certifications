// bank.json: the course outline and every question, for the islands (src/lib/bank.ts).
import { getCollection } from 'astro:content';
import type { Bank } from '../lib/bank.ts';
import { loadCourse } from '../lib/course.ts';
import { inlineMarkup } from '../lib/markup.ts';

export async function GET(): Promise<Response> {
  const { modules, steps } = await loadCourse();
  const questions = (await getCollection('questions')).map((e) => e.data).sort((a, b) => (a.id < b.id ? -1 : 1));
  const bank: Bank = {
    modules: modules.map((m) => ({
      id: m.id,
      title: m.title,
      quiz: m.quiz,
      exams: m.exams,
      steps: m.steps.map((s) => ({ id: s.id, title: s.title, tags: s.tags })),
    })),
    questions: questions.map((q) => ({
      id: q.id,
      pool: q.id.slice(2, q.id.lastIndexOf('-')),
      tags: q.tags,
      cert: q.exam.cert,
      domain: q.exam.domain ?? '',
      n: q.options.length,
      a: q.answer,
      q: inlineMarkup(q.q),
      o: q.options.map((o) => ({ t: inlineMarkup(o.text), w: inlineMarkup(o.why) })),
      competency: q.exam.competency ?? '',
      source: q.source,
    })),
    cards: steps.map((s) => {
      const ref = s.data.exam.find((e) => e.cert !== 'none') ?? s.data.exam[0];
      return { id: `q-${s.data.id}`, step: s.data.id, cert: ref.cert, domain: ref.domain ?? '' };
    }),
  };
  return new Response(JSON.stringify(bank), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
