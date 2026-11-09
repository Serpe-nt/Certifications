// A small scanner for step bodies. It finds the contract's components, their attributes
// and their text, so scripts/check-content.ts can enforce the rules a schema cannot express.
// It is not a full MDX parser: it only needs to read files written to the content contract.

export interface Tag {
  name: string;
  attrs: Record<string, string>;
  /** Text between the opening and the closing tag ('' for a self-closing tag). */
  inner: string;
  /** Nesting depth among components: 0 for top-level blocks. */
  depth: number;
  line: number;
}

export interface ScanResult {
  tags: Tag[];
  /** Lower-case HTML tags found outside code, which the contract forbids. */
  rawHtml: { tag: string; line: number }[];
}

/** Blanks out fenced code blocks and inline code, keeping line numbers and offsets. */
export function maskCode(body: string): string {
  const blank = (s: string) => s.replace(/[^\n]/g, ' ');
  let out = body.replace(/^([ \t]*)(```|~~~)[^\n]*\n[\s\S]*?^\1\2[ \t]*$/gm, blank);
  out = out.replace(/`[^`\n]*`/g, blank);
  return out;
}

const ATTR = /([A-Za-z][\w-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|\{([^}]*)\})/g;

function parseAttrs(src: string): Record<string, string> {
  const attrs: Record<string, string> = Object.create(null);
  for (const m of src.matchAll(ATTR)) attrs[m[1]] = m[2] ?? m[3] ?? m[4] ?? '';
  return attrs;
}

function lineAt(text: string, index: number): number {
  let n = 1;
  for (let i = 0; i < index; i++) if (text.charCodeAt(i) === 10) n++;
  return n;
}

export function scanBody(body: string): ScanResult {
  const masked = maskCode(body);
  const tags: Tag[] = [];
  const rawHtml: ScanResult['rawHtml'] = [];
  const stack: { name: string; attrs: Record<string, string>; start: number; line: number }[] = [];
  // Attribute values may contain > inside quotes or braces.
  const re = /<(\/?)([A-Za-z][\w.]*)((?:\s(?:[^<>"'{}/]|\/(?!>)|"[^"]*"|'[^']*'|\{[^}]*\})*)?)(\/?)>/g;
  for (const m of masked.matchAll(re)) {
    const [whole, closing, name, attrSrc, selfClosing] = m;
    const at = m.index ?? 0;
    const line = lineAt(masked, at);
    if (/^[a-z]/.test(name)) {
      if (!closing) rawHtml.push({ tag: name, line });
      continue;
    }
    if (closing) {
      // Close the nearest open tag of this name; anything above it was left unclosed.
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].name === name) {
          const open = stack[i];
          tags.push({ name, attrs: open.attrs, inner: body.slice(open.start, at), depth: i, line: open.line });
          stack.length = i;
          break;
        }
      }
    } else if (selfClosing) {
      tags.push({ name, attrs: parseAttrs(attrSrc), inner: '', depth: stack.length, line });
    } else {
      stack.push({ name, attrs: parseAttrs(attrSrc), start: at + whole.length, line });
    }
  }
  tags.sort((a, b) => a.line - b.line);
  return { tags, rawHtml };
}

/** Plain text of a fragment: tags and Markdown markers removed, whitespace collapsed. */
export function plainText(fragment: string): string {
  return fragment
    .replace(/<[^>]+>/g, ' ')
    .replace(/[*_`#>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface QuestionParts {
  stem: string;
  options: { text: string; why: string }[];
}

/**
 * Splits the inside of a <Question> block: the stem, then a list of options where each
 * item holds the option text, a blank line, and the explanation indented under it.
 */
export function splitQuestion(inner: string): QuestionParts {
  const lines = inner.replace(/\r\n/g, '\n').split('\n');
  const stem: string[] = [];
  const items: string[][] = [];
  for (const line of lines) {
    if (/^\s{0,3}[-*+]\s+/.test(line)) items.push([line.replace(/^\s{0,3}[-*+]\s+/, '')]);
    else if (items.length) items[items.length - 1].push(line);
    else stem.push(line);
  }
  return {
    stem: stem.join('\n').trim(),
    options: items.map((item) => {
      const paras = item
        .join('\n')
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean);
      return { text: paras[0] ?? '', why: paras.slice(1).join('\n\n') };
    }),
  };
}
