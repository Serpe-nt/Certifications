// Check tokens, as defined in lgtm/docs/plan/02-lab-contract.md, "Check tokens".
// token = first 8 hex characters of HMAC-SHA256(key = seed as UTF-8, message = slot id).
// For the metric channel: those 8 hex characters read as a number, modulo 1,000,000, in decimal.
// Computed with Web Crypto, so it runs the same in the browser and in Node.

export const SEED_PATTERN = /^[0-9a-f]{16}$/;

const encoder = new TextEncoder();

function hex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** The token the beacon publishes for this slot, as the learner will find it. */
export async function tokenFor(seed: string, slot: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(seed), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const first8 = hex(await crypto.subtle.sign('HMAC', key, encoder.encode(slot))).slice(0, 8);
  if (slot.startsWith('metric-')) return String(parseInt(first8, 16) % 1_000_000);
  return first8;
}

/** Normalises the seed the learner typed: trimmed, lower case. */
export function normaliseSeed(raw: string): string {
  return raw.trim().toLowerCase();
}
