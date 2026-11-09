// Splits the rendered HTML of a <Question> block into its stem and its options.
// The HTML comes from the course's own MDX at build time (never from saved state).
// Expected shape: stem paragraphs, then one <ul> whose items hold <p>option</p><p>explanation</p>.

export interface RenderedOption {
  html: string;
  whyHtml: string;
}

export function splitRenderedQuestion(html: string): { stem: string; options: RenderedOption[] } {
  const start = html.search(/<ul[\s>]/);
  const end = html.lastIndexOf('</ul>');
  if (start < 0 || end < start) return { stem: html.trim(), options: [] };
  const stem = html.slice(0, start).trim();
  const list = html.slice(html.indexOf('>', start) + 1, end);
  const options = list
    .split(/<li[^>]*>/)
    .slice(1)
    .map((item) => {
      const body = item.replace(/<\/li>\s*$/, '').trim();
      const first = /^<p>([\s\S]*?)<\/p>/.exec(body);
      if (!first) return { html: body, whyHtml: '' };
      return { html: first[1].trim(), whyHtml: body.slice(first[0].length).trim() };
    });
  return { stem, options };
}
