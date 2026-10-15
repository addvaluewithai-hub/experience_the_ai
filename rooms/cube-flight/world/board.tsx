import { useEffect, useState, useSyncExternalStore, type FormEvent } from 'react';
import type { SurfaceViewProps } from '@experience/room-runtime';
import { newRecordId } from '@experience/room-runtime';
import { dateOf, hintFor, recordAttempt, sessionPlan, type Question } from './memory';
import type { CubeModel } from './model';
import { NumberPad } from './pad';
import { GameIntro, GameFinish } from './landing';

type Outcome = 'memory' | 'helped' | 'shown' | null;
type Props = SurfaceViewProps & { model: CubeModel };

export function GameBoard({ spec, data, edit, model }: Props) {
  const [plan, setPlan] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [entry, setEntry] = useState('');
  const [hinted, setHinted] = useState(false);
  const [wrong, setWrong] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [array, setArray] = useState(false);
  const [independent, setIndependent] = useState(0);
  const command = useSyncExternalStore(model.subscribeCommand, model.getCommand, model.getCommand);
  const current = plan[index];
  const complete = plan.length > 0 && index === plan.length;

  const begin = () => {
    const nextPlan = sessionPlan(data, dateOf(new Date()));
    setPlan(nextPlan);
    setIndex(0);
    setEntry('');
    setOutcome(null);
    setWrong(false);
    setHinted(false);
    setArray(false);
    setIndependent(0);
    const first = nextPlan[0];
    if (first) model.emit({ kind: 'start', detail: { a: first.a, b: first.b } });
  };

  const next = () => {
    if (!outcome) return;
    setIndex((i) => i + 1);
    setEntry('');
    setOutcome(null);
    setWrong(false);
    setHinted(false);
    setArray(false);
  };

  const hint = (showArray = false) => {
    if (!current || outcome) return;
    setHinted(true);
    if (showArray) setArray(true);
    model.hint();
    model.emit({
      kind: 'hint',
      detail: { a: current.a, b: current.b, strategy: hintFor(current.a, current.b) },
    });
  };

  useEffect(() => {
    if (!current) return;
    model.prompt(current.a, current.b);
    model.emit({
      kind: 'question',
      detail: { a: current.a, b: current.b, revisit: current.revisit },
    });
  }, [current, model]);

  useEffect(() => {
    if (!complete) return;
    model.emit({ kind: 'round_complete', detail: { independent, total: plan.length } });
    // React to finishing the round, not to every counter update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complete, model]);

  useEffect(() => {
    if (!current || outcome || !entry) return;
    const timer = setTimeout(
      () =>
        model.emit({
          kind: 'selection',
          detail: { digits: entry },
        }),
      600,
    );
    const pause = setTimeout(() => {
      model.peek();
      model.emit({ kind: 'pause', detail: { a: current.a, b: current.b, digits: entry } });
    }, 1900);
    return () => { clearTimeout(timer); clearTimeout(pause); };
  }, [current, entry, model, outcome]);

  // AI actions request safe UI changes. They never submit an answer or forge a success.
  useEffect(() => {
    if (!command) return;
    if (command.action === 'hint' && current && !outcome) {
      setHinted(true);
      model.hint();
    } else if (command.action === 'array' && current && !outcome) {
      setHinted(true);
      setArray(true);
      model.hint();
    } else if (command.action === 'advance') {
      if (!plan.length || complete) begin();
      else if (outcome) next();
    }
    // A new command id, not a game rerender, is what dispatches it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [command]);

  const reveal = () => {
    if (!current || outcome) return;
    edit((d) =>
      recordAttempt(
        spec,
        d,
        current.a,
        current.b,
        { correct: false, helped: true },
        dateOf(new Date()),
        newRecordId,
      ),
    );
    setOutcome('shown');
    model.answer(false, true);
    model.emit({
      kind: 'answer',
      detail: {
        a: current.a,
        b: current.b,
        revealed: true,
        answer: current.a * current.b,
        expected: current.a * current.b,
        correct: false,
        independent: false,
        strategy: hintFor(current.a, current.b),
      },
    });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!current || outcome || !entry) return;
    if (Number(entry) !== current.a * current.b) {
      setEntry('');
      setWrong(true);
      setHinted(true);
      model.hint();
      model.emit({
        kind: 'answer',
        detail: {
          a: current.a,
          b: current.b,
          answer: Number(entry),
          expected: current.a * current.b,
          correct: false,
          independent: false,
          strategy: hintFor(current.a, current.b),
        },
      });
      return;
    }
    const unassisted = !hinted && !wrong;
    edit((d) =>
      recordAttempt(
        spec,
        d,
        current.a,
        current.b,
        { correct: true, helped: !unassisted },
        dateOf(new Date()),
        newRecordId,
      ),
    );
    setOutcome(unassisted ? 'memory' : 'helped');
    if (unassisted) setIndependent((n) => n + 1);
    model.answer(true, !unassisted);
    model.emit({
      kind: 'answer',
      detail: {
        a: current.a,
        b: current.b,
        answer: Number(entry),
        expected: current.a * current.b,
        correct: true,
        independent: unassisted,
        strategy: hintFor(current.a, current.b),
      },
    });
  };

  const result = current ? current.a * current.b : 0;

  return (
    <main className="cf-arena" dir="rtl" aria-label="Cube Flight multiplication game">
      {plan.length > 0 && !complete && (
        <div
          className="cf-progress-pips"
          role="progressbar"
          aria-label="تقدم اللعب"
          aria-valuenow={index}
          aria-valuemin={0}
          aria-valuemax={plan.length}
        >
          {plan.map((_, i) => (
            <i key={i} className={i < index ? 'lit' : ''} />
          ))}
        </div>
      )}

      {!plan.length ? (
        <GameIntro begin={begin} />
      ) : complete ? (
        <GameFinish begin={begin} independent={independent} total={plan.length} />
      ) : current ? (
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
                {index === plan.length - 1 ? 'شوفي النتيجة' : 'التحدي اللي بعده'} <span>➜</span>
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
      ) : null}

      <div className="cf-floor" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </main>
  );
}
