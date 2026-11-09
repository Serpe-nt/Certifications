// Build-time settings shared by astro.config.mjs, the content collections and the scripts.
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/** Replaced with BASE_PATH (or nothing) by the server in every text file it serves. */
export const BASE_PLACEHOLDER = '/__lgtm_base__';

const projectRoot = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../..');

/** True when the build or dev server uses the sample module from tests/fixtures. */
export function sampleMode(): boolean {
  return process.env.LGTM_CONTENT === 'sample';
}

/** The folder that holds modules/, steps/ and questions/. */
export function contentRoot(): string {
  if (process.env.LGTM_CONTENT_DIR) return path.resolve(process.env.LGTM_CONTENT_DIR);
  return path.join(projectRoot, sampleMode() ? 'tests/fixtures/content' : 'src/content');
}

export { projectRoot };
