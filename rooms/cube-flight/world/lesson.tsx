import type { FormEvent } from 'react';
import type { Lesson } from './mission';
import type { TeachingMode } from './learning';
import { groupBridge } from './learning';
import { NumberPad } from './pad';

/** See it → finish its number-group connection → recall without blocks → celebrate.
 * Skipping is impossible: each child-owned interaction is checked by deterministic code.
 */
export function LessonStage({
  table,
  lessons,
  step,
  mode,
  entry,
  setEntry,
  feedback,
  explainDone,
  chooseBridge,
  submitRecall,
  moreHelp,
  next,
}: {
  table: number;
  lessons: Lesson[];
  step: number;
  mode: TeachingMode;
  entry: string;
  setEntry: (value: string) => void;
  feedback: string;
  explainDone: () => void;
  chooseBridge: (value: number) => void;
  submitRecall: (event: FormEvent) => void;
  moreHelp: () => void;
  next: () => void;
}) {
  const fact = lessons[step];
  if (!fact) return null;
  const { a, b, answer, anchor } = fact;
  const bridge = groupBridge(a, b);
  const visibleAnswer = mode === 'explain' || mode === 'success';
  const visibleGroups = mode === 'explain' || mode === 'connect';
  return (
    <section className="cf-lesson" aria-label={`تعليم جدول ${table}`}>
      <div className="cf-lesson-kicker">
        {mode === 'explain'
          ? 'لومي بتورّيكي الرابط'
          : mode === 'connect'
            ? 'دورك تكمّلي الرابط'
            : mode === 'recall'
              ? 'غطّينا المكعبات… افتكري!'
              : 'حلو! افتكرتي بنفسك ✨'}
      </div>
      <div className="cf-equation cf-teach-equation" aria-label={`${a} في ${b}`}>
        <span className="cf-big-cube">{a}</span>
        <span className="cf-operator">×</span>
        <span className="cf-big-cube cf-second">{b}</span>
        <span className="cf-operator">=</span>
        <span className="cf-big-cube cf-answer-cube">{visibleAnswer ? answer : '?'}</span>
      </div>
      {visibleGroups && (
        <div className="cf-lesson-demo">
          <div
            className="cf-lesson-grid"
            role="img"
            aria-label={`${b} مجموعات من ${a} مكعبات، مع توضيح ${bridge.subtract ? 'المجموعة اللي هنشيلها' : 'المجموعات الإضافية'}`}
          >
            {Array.from({ length: bridge.subtract ? bridge.base : b }, (_, row) => (
              <div
                key={row}
                className={`cf-lesson-row ${row >= b ? 'removed' : row >= bridge.base ? 'extra' : ''}`}
                style={{ gridTemplateColumns: `repeat(${a}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: a }, (_, col) => (
                  <i key={col} />
                ))}
              </div>
            ))}
          </div>
          {mode === 'explain' && (
            <div className="cf-lesson-explanation">
              <p className="cf-lesson-anchor">{anchor}</p>
              <p>لاحظي المجموعات البنفسجي، وإزاي اللون المختلف بيغيّر الناتج.</p>
            </div>
          )}
        </div>
      )}
      {mode === 'explain' && (
        <button type="button" className="cf-go cf-lesson-next" onClick={explainDone}>
          فهمت المجموعات… أجرب الرابط <span aria-hidden="true">➜</span>
        </button>
      )}
      {mode === 'connect' && (
        <div className="cf-bridge" role="group" aria-label="فهم علاقة المجموعات">
          <p>{bridge.question}</p>
          <div className="cf-bridge-choices">
            {bridge.choices.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => chooseBridge(value)}
                aria-label={`${value} مجموعة`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
      )}
      {mode === 'recall' && (
        <div className="cf-lesson-recall">
          <p>دلوقتي مفيش مكعبات ولا ناتج. إيه اللي فاكره من نفسك؟</p>
          <NumberPad entry={entry} setEntry={setEntry} submit={submitRecall} />
          <button type="button" className="cf-show-array" onClick={moreHelp}>
            محتاجة أشوف الرابط تاني
          </button>
        </div>
      )}
      {mode === 'success' && (
        <div className="cf-lesson-success">
          <p>شوفتي؟ إنتِ اللي افتكرتي الإجابة. هترجعلنا وسط اللعب بعد شوية!</p>
          <button type="button" className="cf-go cf-lesson-next" onClick={next}>
            {step === lessons.length - 1 ? 'يلا نلعب من الذاكرة' : 'اتعلمي الرابط اللي بعده'}
            <span aria-hidden="true">➜</span>
          </button>
        </div>
      )}
      {feedback && (
        <p className="cf-lesson-feedback" role="status">
          {feedback}
        </p>
      )}
    </section>
  );
}
