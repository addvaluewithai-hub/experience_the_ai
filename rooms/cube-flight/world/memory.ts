import {
  addRecord,
  updateRecord,
  type RoomData,
  type RoomRecord,
  type RoomSpec,
} from '@experience/room-spec';

export type Fact = { a: number; b: number };
export type Question = Fact & { revisit: number };

/** Commutative multiplication is one memory, although prompts may swap the order. */
export const canonical = (a: number, b: number): Fact =>
  a <= b ? { a, b } : { a: b, b: a };
export const factKey = (a: number, b: number) => {
  const f = canonical(a, b);
  return `${f.a}x${f.b}`;
};
const PRIORITY: Fact[] = [
  [6, 7],
  [8, 9],
  [7, 12],
  [7, 8],
  [6, 9],
  [8, 12],
  [6, 8],
  [9, 12],
  [7, 9],
  [6, 12],
  [8, 8],
  [7, 7],
  [12, 12],
  [9, 9],
].map(([a, b]) => canonical(a, b));
const ALL: Fact[] = Array.from({ length: 11 }, (_, i) => i + 2).flatMap((a) =>
  Array.from({ length: 13 - a }, (_, j) => ({ a, b: a + j })),
);
export const dateOf = (date: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};
const addDays = (day: string, days: number) => {
  const [year, month, date] = day.split('-').map(Number);
  return dateOf(new Date(year, month - 1, date + days));
};
const number = (v: unknown, fallback = 0) =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback;
const sameFact = (row: RoomRecord, a: number, b: number) =>
  factKey(number(row.values.a), number(row.values.b)) === factKey(a, b);
export const findFact = (data: RoomData, a: number, b: number) =>
  (data.facts ?? []).find((r) => sameFact(r, a, b));

/** Due memories first, then unseen facts; harder ones appear earlier in this first edition. */
export function pickTargets(data: RoomData, today: string, count = 4): Fact[] {
  const existing = data.facts ?? [];
  const due = existing
    .filter((r) => typeof r.values.due === 'string' && r.values.due <= today)
    .sort((x, y) => String(x.values.due).localeCompare(String(y.values.due)))
    .map((r) => canonical(number(r.values.a), number(r.values.b)))
    .filter((f) => f.a >= 2 && f.b <= 12);
  const seen = new Set(existing.map((r) => factKey(number(r.values.a), number(r.values.b))));
  const unseen = [...PRIORITY, ...ALL].filter((f) => !seen.has(factKey(f.a, f.b)));
  const candidates = [...due, ...unseen];
  const chosen: Fact[] = [];
  const used = new Set<string>();
  // Prefer a spread of factors where possible, but never hide a due memory.
  for (const group of [due, unseen]) {
    for (const fact of group) {
      const key = factKey(fact.a, fact.b);
      if (used.has(key) || chosen.length === count) continue;
      if (
        group === unseen &&
        chosen.length < count - 1 &&
        group.some(
          (other) =>
            !used.has(factKey(other.a, other.b)) &&
            !chosen.some((c) => c.a === other.a || c.b === other.b) &&
            !chosen.some((c) => c.a === other.b || c.b === other.a),
        ) &&
        chosen.some(
          (c) => c.a === fact.a || c.a === fact.b || c.b === fact.a || c.b === fact.b,
        )
      )
        continue;
      chosen.push(fact);
      used.add(key);
    }
  }
  // Backstop: if the diversity pass skipped something, fill all slots deterministically.
  for (const fact of candidates) {
    if (chosen.length >= count) break;
    const key = factKey(fact.a, fact.b);
    if (used.has(key)) continue;
    chosen.push(fact);
    used.add(key);
  }
  return chosen;
}

/** Three spaced appearances per fact; other prompts always come between repeats. */
export function sessionPlan(data: RoomData, day: string): Question[] {
  const targets = pickTargets(data, day, 4);
  const order = [0, 1, 2, 3, 1, 0, 2, 3, 0, 1, 3, 2];
  const visits = new Map<string, number>();
  return order.flatMap((slot) => {
    const fact = targets[slot];
    if (!fact) return [];
    const key = factKey(fact.a, fact.b);
    const revisit = visits.get(key) ?? 0;
    visits.set(key, revisit + 1);
    return [
      revisit % 2 === 0
        ? { ...fact, revisit }
        : { a: fact.b, b: fact.a, revisit },
    ];
  });
}

export type Attempt = {
  correct: boolean;
  /** An offered hint, shown solution or earlier wrong answer is NOT independent recall. */
  helped: boolean;
};

/**
 * Only an independent success on a NEW calendar day increases the spaced-review streak.
 * Same-session repetition can reinforce a memory but never manufactures multi-day mastery.
 */
export function recordAttempt(
  spec: RoomSpec,
  data: RoomData,
  a: number,
  b: number,
  attempt: Attempt,
  today: string,
  id: () => string,
): RoomData {
  const fact = canonical(a, b);
  const previous = findFact(data, a, b);
  const before = previous?.values ?? {};
  const independent = attempt.correct && !attempt.helped;
  const earlier = number(before.streak);
  const streak = independent
    ? before.last === today
      ? Math.max(1, earlier)
      : earlier + 1
    : Math.max(0, earlier - 1);
  const intervals = [0, 1, 3, 7, 14, 30];
  const due = independent ? addDays(today, intervals[Math.min(streak, 5)]) : today;
  const change = {
    attempts: number(before.attempts) + 1,
    independent: number(before.independent) + (independent ? 1 : 0),
    streak,
    last: today,
    due,
    stage: streak >= 3 ? 'strong' : streak >= 1 ? 'review' : 'learning',
  };
  return previous
    ? updateRecord(spec, data, 'facts', previous.id, change)
    : addRecord(spec, data, 'facts', { ...fact, ...change }, id());
}

/** A small scaffold, not a permanent counting aid. It only appears by request. */
export function hintFor(a: number, b: number): string {
  const fact = canonical(a, b);
  const x = fact.a;
  const y = fact.b;
  if (y === 12) return `${x} × 10 = ${x * 10}، وبعدها زوّدي مجموعتين من ${x}.`;
  if (y === 9) return `${x} × 10 = ${x * 10}، شِيلي مجموعة واحدة من ${x}.`;
  if (y === 8 && x === 7) return 'افتكري: 5، 6، 7، 8 ... 56 = 7 × 8.';
  if (x === y) return `ده مربع ${x}: ${x} صفوف، في كل صف ${x} مكعبات.`;
  return `${x} × ${y - 1}، وبعدها زوّدي مجموعة من ${x}.`;
}
