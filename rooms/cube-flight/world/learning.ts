/** The teaching bridge has a verifiable action, not just a Next button. */
export type TeachingMode = 'explain' | 'connect' | 'recall' | 'success';

export type GroupBridge = {
  base: number;
  change: number;
  subtract: boolean;
  correct: number;
  choices: number[];
  question: string;
  equation: string;
};

export function groupBridge(table: number, other: number): GroupBridge {
  if (
    !Number.isInteger(table) ||
    table < 2 ||
    table > 12 ||
    !Number.isInteger(other) ||
    other < 2 ||
    other > 12
  )
    throw new Error('Invalid multiplication fact');
  const base = other === 9 ? 10 : other === 10 ? 9 : other >= 11 ? 10 : other >= 6 ? 5 : other - 1;
  const change = Math.abs(other - base);
  const subtract = other < base;
  const verb = subtract ? 'نشيل' : 'نزوّد';
  const question = `عندي ${base} مجموعات، عشان أوصل لـ ${other} مجموعات، ${verb} كام مجموعة؟`;
  const equation = `${table} × ${other} = ${table} × ${base} ${subtract ? '−' : '+'} ${table} × ${change}`;
  // A small distractor must still be plausible for mental grouping.
  const choices = [1, 2, 3].includes(change) ? [1, 2, 3] : [change, change + 1, change - 1];
  return { base, change, subtract, correct: change, choices, question, equation };
}

/** A correct supported link unlocks the independent try; it does NOT award fluency. */
export function afterBridgeChoice(
  mode: TeachingMode,
  bridge: GroupBridge,
  choice: number,
): TeachingMode {
  return mode === 'connect' && choice === bridge.correct ? 'recall' : mode;
}

/** No automatic leap from a demonstration to a new fact. */
export function canAdvanceLesson(mode: TeachingMode, answer: number, expected: number): boolean {
  return mode === 'recall' && Number.isInteger(answer) && answer === expected;
}
