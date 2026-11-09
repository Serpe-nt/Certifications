// Question files are YAML whose strings may use only <b> and <code> (content contract,
// "Writing rules"). This turns such a string into safe HTML at build time: everything is
// escaped, then exactly those four tags are let through again.
const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

export function inlineMarkup(text: string): string {
  return escapeHtml(text).replace(/&lt;(\/?)(b|code)&gt;/g, '<$1$2>');
}
