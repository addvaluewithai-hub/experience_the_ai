import { LIMITS } from './types';

export type Input = Record<string, unknown>;
const ID = /^[a-z][a-z0-9-]{0,39}$/;

/** Collects every problem with its path instead of stopping at the first. */
export class Checker {
  readonly errors: string[] = [];

  at(path: string, message: string) {
    this.errors.push(`${path}: ${message}`);
  }

  object(value: unknown, path: string): Input {
    if (value && typeof value === 'object' && !Array.isArray(value)) return value as Input;
    this.at(path, 'must be an object');
    return {};
  }

  text(value: unknown, path: string, max: number = LIMITS.shortText): string {
    if (typeof value !== 'string' || !value.trim()) this.at(path, 'must be non-empty text');
    else if (value.length > max) this.at(path, `must be at most ${max} characters`);
    return typeof value === 'string' ? value.trim() : '';
  }

  id(value: unknown, path: string): string {
    if (typeof value !== 'string' || !ID.test(value)) this.at(path, 'must be a kebab-case id');
    return typeof value === 'string' ? value : '';
  }

  oneOf<T extends string>(value: unknown, allowed: readonly T[], path: string): T {
    if (!allowed.includes(value as T)) this.at(path, `must be one of ${allowed.join(', ')}`);
    return value as T;
  }

  list(value: unknown, path: string, min: number, max: number): unknown[] {
    if (!Array.isArray(value)) {
      this.at(path, 'must be a list');
      return [];
    }
    if (value.length < min || value.length > max) this.at(path, `must have ${min} to ${max} items`);
    return value.slice(0, max);
  }

  unique(items: { id: string }[], path: string) {
    const seen = new Set<string>();
    for (const item of items) {
      if (seen.has(item.id)) this.at(path, `duplicate id ${item.id}`);
      seen.add(item.id);
    }
  }
}
