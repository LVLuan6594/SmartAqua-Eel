import { afterEach, describe, expect, it, vi } from 'vitest';
import { createId } from '../src/utils/createId';

describe('createId', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('creates unique IDs when crypto.randomUUID is unavailable', () => {
    vi.stubGlobal('crypto', {});

    const first = createId('cycle');
    const second = createId('cycle');

    expect(first).toMatch(/^cycle-/);
    expect(second).toMatch(/^cycle-/);
    expect(second).not.toBe(first);
  });
});
