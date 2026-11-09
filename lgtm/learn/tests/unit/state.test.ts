import { describe, expect, it } from 'vitest';
import { LIMITS, STATE_VERSION, defaultState, mergeStates, parseState } from '../../src/lib/state.ts';

describe('parseState', () => {
  it('returns the default state for anything that is not a document', () => {
    for (const raw of [null, undefined, 42, 'not json', '[]', [], true]) {
      expect(parseState(raw)).toEqual(defaultState());
    }
  });

  it('reads a JSON string', () => {
    const s = parseState(JSON.stringify({ v: 1, done: { 'm04-s07': 5 } }));
    expect(s.done['m04-s07']).toBe(5);
  });

  it('migrates a document without a version', () => {
    const s = parseState({ done: { 'm01-s01': 1 } });
    expect(s.v).toBe(STATE_VERSION);
    expect(s.done['m01-s01']).toBe(1);
  });

  it('drops hostile keys and values', () => {
    const hostile = JSON.parse(
      '{"v":1,"done":{"__proto__":1,"constructor":2,"<img src=x onerror=alert(1)>":3,"m01-s01":"7","m01-s02":-1,"m01-s03":1e400,"m01-s04":4},' +
        '"__proto__":{"polluted":true},"settings":{"labDomain":"evil.com/<script>","labSeed":"zz","theme":"neon","effects":"yes"},' +
        '"answers":{"q-m01-s01":{"right":"yes"},"q-m01-s02":{"right":true,"n":1e9,"at":-5}}}',
    );
    const s = parseState(hostile);
    expect(Object.keys(s.done)).toEqual(['m01-s04']);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.getPrototypeOf(s.done)).toBeNull();
    expect(s.settings).toEqual(defaultState().settings);
    expect(s.answers['q-m01-s01']).toBeUndefined();
    expect(s.answers['q-m01-s02']).toEqual({ right: true, n: 100_000, at: 0 });
  });

  it('bounds the number of entries and the size of times', () => {
    const done: Record<string, number> = {};
    for (let i = 0; i < LIMITS.ids + 50; i++) done[`m01-s${i}`] = Number.MAX_SAFE_INTEGER;
    const s = parseState({ v: 1, done });
    expect(Object.keys(s.done).length).toBe(LIMITS.ids);
    expect(Object.values(s.done)[0]).toBe(LIMITS.time);
  });

  it('keeps settings that are valid', () => {
    const s = parseState({ settings: { labDomain: 'Lab.Example.TEST.', labSeed: '0123456789ABCDEF', theme: 'dark', effects: false, sound: false } });
    expect(s.settings).toEqual({ labDomain: 'lab.example.test', labSeed: '0123456789abcdef', theme: 'dark', effects: false, sound: false });
  });

  it('keeps fields written by a newer version, and never their prototype keys', () => {
    const s = parseState(JSON.parse('{"v":2,"quiz":{"m04":{"best":0.9}},"__proto__":{"x":1}}'));
    expect(s.quiz).toEqual({ m04: { best: 0.9 } });
    expect(s.v).toBe(STATE_VERSION);
    expect(Object.prototype.hasOwnProperty.call(s, '__proto__')).toBe(false);
  });
});

describe('mergeStates', () => {
  it('unions completed steps and passed checks, earliest time wins, the rest from the server', () => {
    const local = parseState({ savedAt: 50, done: { a: 10, b: 20 }, checks: { a: 11 }, settings: { theme: 'light' }, answers: { q: { right: false, n: 1, at: 1 } } });
    const server = parseState({ savedAt: 40, done: { b: 15, c: 30 }, checks: { c: 31 }, settings: { theme: 'dark' } });
    const m = mergeStates(local, server);
    expect({ ...m.done }).toEqual({ a: 10, b: 15, c: 30 });
    expect({ ...m.checks }).toEqual({ a: 11, c: 31 });
    expect(m.settings.theme).toBe('dark');
    expect(m.answers.q).toBeUndefined();
    expect(m.savedAt).toBe(50);
  });

  it('never loses a completed step from either side', () => {
    const local = parseState({ done: { x: 1 } });
    const server = parseState({ done: { y: 2 } });
    const m = mergeStates(local, server);
    expect(Object.keys(m.done).sort()).toEqual(['x', 'y']);
  });
});
