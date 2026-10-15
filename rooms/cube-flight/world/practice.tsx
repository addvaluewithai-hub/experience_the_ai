import type { FormEvent } from 'react';
import type { Question } from './memory';
import { hintFor } from './memory';
import { NumberPad } from './pad';

export type Outcome = 'memory' | 'helped' | 'shown' | null;
export type PracticeProps = {
  current: Question;
  index: number;
  total: number;
  outcome: Outcome;
  hinted: boolean;
  wrong: boolean;
  array: boolean;
  setArray: (value: boolean) => void;
  entry: string;
  setEntry: (value: string) => void;
  submit: (event: FormEvent) => void;
  next: () => void;
  hint: () => void;
  reveal: () => void;
};
export function PracticeStage({
  current,
  index,
  total,
  outcome,
  hinted,
  wrong,
  array,
  setArray,
  entry,
  setEntry,
  submit,
  next,
  hint,
  reveal,
}: PracticeProps) {
  const result = current.a * current.b;
  return (
    <section className="cf-play">
      <div className="cf-equation" aria-label={`${current.a} في ${current.b}`}>
        <span className="cf-big-cube">{current.a}</span>
        <span className="cf-operator">×</span>
        <span className="cf-big-cube cf-second">{current.b}</span>
        <span className="cf-operator">=</span>
        <span className={`cf-big-cube cf-answer-cube ${outcome ? 'cf-revealed' : ''}`}>
          {outcome ? result : '?'}
        </span>
      </div>
      <span className="sr-only" aria-live="polite">
        {outcome === 'memory'
          ? 'إجابة صح من الذاكرة'
          : outcome === 'helped'
            ? 'إجابة صح بمساعدة'
            : outcome === 'shown'
              ? 'تم عرض الحل'
              : wrong
                ? 'جرّبي تاني مع التلميح'
                : ''}
      </span>
      {outcome && (
        <div className={`cf-result-flash ${outcome}`} aria-hidden="true">
          {outcome === 'shown' ? '✦' : '✓'}
        </div>
      )}
      {hinted && (
        <aside className="cf-help-panel" aria-label="تلميح">
          <span className="cf-hint-title">✧ مفتاح الذاكرة</span>
          <p>{hintFor(current.a, current.b)}</p>
          <button className="cf-show-array" type="button" onClick={() => setArray(!array)}>
            {array ? 'اخفي المكعبات' : 'شوفي المجموعات'}
          </button>
          {array && (
            <div
              className="cf-array"
              role="img"
              aria-label={`${current.a} مجموعات في كل واحدة ${current.b}`}
              style={{ gridTemplateColumns: `repeat(${current.b}, 1fr)` }}
            >
              {Array.from({ length: result }, (_, i) => (
                <i key={i} />
              ))}
            </div>
          )}
        </aside>
      )}
      {outcome ? (
        <div className="cf-done-actions">
          <button className="cf-go" type="button" onClick={next}>
            {index === total - 1 ? 'شوفي النتيجة' : 'التحدي اللي بعده'} <span>➜</span>
          </button>
        </div>
      ) : (
        <>
          <NumberPad entry={entry} setEntry={setEntry} submit={submit} />
          <div className="cf-help-actions">
            {!hinted && (
              <button type="button" onClick={() => hint()}>
                ✦ تلميح
              </button>
            )}
            <button type="button" onClick={reveal}>
              شوفي الإجابة
            </button>
          </div>
        </>
      )}
    </section>
  );
}
