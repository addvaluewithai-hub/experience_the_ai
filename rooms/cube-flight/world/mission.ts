import type { RoomData } from '@experience/room-spec';
import { canonical, factKey, findFact, type Fact, type Question } from './memory';

/** Prefer the next table with facts that have not yet been recalled on three separate days. */
export function recommendTable(data: RoomData): number {
  for (let table = 2; table <= 12; table++) {
    const secure = Array.from({ length: 11 }, (_, i) => i + 2).filter(
      (other) => Number(findFact(data, table, other)?.values.streak ?? 0) >= 3,
    );
    if (secure.length < 8) return table;
  }
  return 12;
}

export type Lesson = { a: number; b: number; answer: number; anchor: string };
export type DailyMission = { table: number; lessons: Lesson[]; questions: Question[] };

/** An anchor visibly joins known groups. It is faded before any retrieval question. */
export function learningAnchor(table: number, other: number): string {
  if (other === 2) return `${table} + ${table} = ${table * 2}`;
  if (other <= 5) return `${table} × ${other - 1} = ${table * (other - 1)}، زوّدي ${table}.`;
  if (other === 9) return `${table} × 10 = ${table * 10}، ناقص مجموعة ${table}.`;
  if (other === 10) return `${table} مجموعات من 10 = ${table * 10}.`;
  if (other > 10) return `${table} × 10 = ${table * 10}، وزوّدي ${other - 10} مجموعة من ${table}.`;
  return `${table} × 5 = ${table * 5}، وزوّدي ${other - 5} مجموعة من ${table}.`;
}

/** Three connected facts in one chosen table; due/weak first, unseen next, strong last. */
export function dailyMission(data: RoomData, table: number, today: string): DailyMission {
  if (!Number.isInteger(table) || table < 2 || table > 12) throw new Error('Invalid table');
  const otherFactors = [6, 7, 8, 9, 12, 4, 3, 5, 10, 11, 2];
  const weighted = otherFactors
    .map((other, index) => {
      const record = findFact(data, table, other)?.values;
      const due = typeof record?.due === 'string' && record.due <= today;
      const streak = Number(record?.streak ?? 0);
      const score = due ? -3 : !record ? 0 : 2 + Math.max(0, streak);
      return { other, score, index };
    })
    .sort((a, b) => a.score - b.score || a.index - b.index);
  const selected = weighted.slice(0, 3).map(({ other }) => other);
  const lessons = selected.map((other) => ({
    a: table, b: other, answer: table * other, anchor: learningAnchor(table, other),
  }));

  // Only include a fact outside today's table if it is already known and due.
  const lessonKeys = new Set(lessons.map((f) => factKey(f.a, f.b)));
  const oldDue = (data.facts ?? [])
    .map((row) => row.values)
    .filter((values) => Number.isInteger(values.a) && Number.isInteger(values.b))
    .filter((values) => values.due && String(values.due) <= today)
    .map((values) => canonical(Number(values.a), Number(values.b)))
    .find((fact) =>
      fact.a >= 2 && fact.b <= 12 &&
      fact.a !== table && fact.b !== table && !lessonKeys.has(factKey(fact.a, fact.b)),
    );
  const prompts: Fact[] = lessons.map(({ a, b }) => ({ a, b }));
  if (oldDue) prompts.push(oldDue);
  const order = oldDue
    ? [0, 1, 2, 3, 0, 1, 2, 3, 1, 0, 2]
    : [0, 1, 2, 0, 1, 2, 0, 2, 1];
  const visits = new Map<string, number>();
  const questions = order.map((slot) => {
    const fact = prompts[slot];
    const key = factKey(fact.a, fact.b);
    const revisit = visits.get(key) ?? 0;
    visits.set(key, revisit + 1);
    return revisit % 2 ? { a: fact.b, b: fact.a, revisit } : { ...fact, revisit };
  });
  return { table, lessons, questions };
}
