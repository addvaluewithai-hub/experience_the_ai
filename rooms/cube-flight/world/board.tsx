import { useEffect, useState, useSyncExternalStore, type FormEvent } from 'react';
import type { SurfaceViewProps } from '@experience/room-runtime';
import { newRecordId } from '@experience/room-runtime';
import { dateOf, hintFor, recordAttempt, sessionPlan, type Question } from './memory';
import type { CubeModel } from './model';

type Outcome = 'memory' | 'helped' | 'shown' | null;
type Props = SurfaceViewProps & { model: CubeModel };
const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];

function NumberPad(props: {
  entry: string;
  setEntry: (value: string) => void;
  submit: (e: FormEvent) => void;
}) {
  const { entry, setEntry, submit } = props;
  return (
    <form className="cf-controls" onSubmit={submit} aria-label="اختيار الناتج">
      <label className="cf-input-label" htmlFor="cube-number">
        اختاري الناتج
      </label>
      <input
        id="cube-number"
        className="cf-number-input"
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        aria-label="الناتج"
        value={entry}
        placeholder="?"
        onChange={(e) => setEntry(e.target.value.replace(/\D/g, '').slice(0, 3))}
      />
      <div className="cf-keypad">
        {keys.map((key) => (
          <button
            className="cf-key"
            key={key}
            type="button"
            disabled={entry.length === 3}
            onClick={() => setEntry((entry + key).slice(0, 3))}
          >
            {key}
          </button>
        ))}
      </div>
      <div className="cf-entry-actions">
        <button className="cf-backspace" type="button" onClick={() => setEntry(entry.slice(0, -1))}>
          ⌫ <span>مسح</span>
        </button>
        <button className="cf-submit" type="submit" disabled={!entry}>
          تأكيد <span>↵</span>
        </button>
      </div>
    </form>
  );
}

export function GameBoard({ spec, data, edit, model }: Props) {
  const [plan, setPlan] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [entry, setEntry] = useState('');
  const [hinted, setHinted] = useState(false);
  const [wrong, setWrong] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [array, setArray] = useState(false);
  const [independent, setIndependent] = useState(0);
  const [solved, setSolved] = useState(0);
  const command = useSyncExternalStore(model.subscribeCommand, model.getCommand, model.getCommand);
  const current = plan[index];
  const complete = plan.length > 0 && index === plan.length;

  const begin = () => {
    setPlan(sessionPlan(data, dateOf(new Date())));
    setIndex(0);
    setEntry('');
    setOutcome(null);
    setWrong(false);
    setHinted(false);
    setArray(false);
    setIndependent(0);
    setSolved(0);
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
  };

  useEffect(() => {
    if (current) model.prompt(current.a, current.b);
  }, [current, model]);

  // AI actions request safe UI changes. They never submit an answer or forge a success.
  useEffect(() => {
    if (!command) return;
    if (command.action === 'hint') hint();
    else if (command.action === 'array') hint(true);
    else if (command.action === 'advance') {
      if (!plan.length || complete) begin();
      else if (outcome) next();
    }
    // A new command id, not a game rerender, is what dispatches it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [command]);

  const reveal = () => {
    if (!current || outcome) return;
    edit((d) =>
      recordAttempt(spec, d, current.a, current.b, { correct: false, helped: true },
        dateOf(new Date()), newRecordId),
    );
    setOutcome('shown');
    model.answer(false, true);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!current || outcome || !entry) return;
    if (Number(entry) !== current.a * current.b) {
      setEntry('');
      setWrong(true);
      hint();
      return;
    }
    const unassisted = !hinted && !wrong;
    edit((d) =>
      recordAttempt(spec, d, current.a, current.b, { correct: true, helped: !unassisted },
        dateOf(new Date()), newRecordId),
    );
    setOutcome(unassisted ? 'memory' : 'helped');
    setSolved((n) => n + 1);
    if (unassisted) setIndependent((n) => n + 1);
    model.answer(true, !unassisted);
  };

  const result = current ? current.a * current.b : 0;
  const words = outcome === 'memory'
    ? 'دي طلعت من الذاكرة! ممتاز ✨'
    : outcome === 'helped'
      ? 'وصلتي لها! المرة الجاية نجرب من غير تلميح.'
      : outcome === 'shown'
        ? 'ده الناتج. خليه في بالك لما يرجع تاني.'
        : wrong
          ? 'قريبة! جربي الرابط ده وبعدين حاولي تاني.'
          : 'ركّزي لحظة… فاكرة الناتج؟';

  return (
    <main className="cf-arena" dir="rtl" aria-label="Cube Flight multiplication game">
      <header className="cf-hud">
        <div className="cf-logo"><span className="cf-logo-icon">✦</span><b>CUBE FLIGHT</b></div>
        <div className="cf-hud-right">
          <span className="cf-stats">⚡ {independent} <small>من الذاكرة</small></span>
          <span className="cf-round">{plan.length ? `${Math.min(index + 1, plan.length)} / ${plan.length}` : 'START'}</span>
        </div>
      </header>

      {!plan.length ? (
        <section className="cf-intro">
          <div className="cf-supra">جاهزة للانطلاق؟</div>
          <h2>الأرقام دي<br/><span>في دماغك!</span></h2>
          <p>٤ تحديات. مكعبات. ولومي معاكي في كل حركة.</p>
          <button className="cf-go" type="button" onClick={begin}>ابدئي اللعب <span>➜</span></button>
          <small>من غير عداد وقت. كل محاولة بتقوّي الذاكرة.</small>
        </section>
      ) : complete ? (
        <section className="cf-finish" aria-live="polite">
          <div className="cf-medal">✦</div>
          <div className="cf-supra">RUN COMPLETE</div>
          <h2>مستوى جديد!</h2>
          <strong>{independent} <small>/ {plan.length}</small></strong>
          <p>إجابات من الذاكرة من غير مساعدة. الصح بمساعدة كمان تدريب ممتاز.</p>
          <button className="cf-go" type="button" onClick={begin}>جولة جديدة ↗</button>
        </section>
      ) : current ? (
        <section className="cf-play">
          <div className="cf-status"><span>CHALLENGE {index + 1}</span><span>{current.revisit ? 'MEMORY RECALL' : 'NEW CUBE'}</span></div>
          <div className="cf-equation" aria-label={`${current.a} في ${current.b}`}>
            <span className="cf-big-cube">{current.a}</span>
            <span className="cf-operator">×</span>
            <span className="cf-big-cube cf-second">{current.b}</span>
            <span className="cf-operator">=</span>
            <span className={`cf-big-cube cf-answer-cube ${outcome ? 'cf-revealed' : ''}`}>{outcome ? result : '?'}</span>
          </div>
          <p className="cf-reaction" aria-live="polite">{words}</p>
          {hinted && (
            <aside className="cf-help-panel" aria-label="تلميح">
              <span className="cf-hint-title">✧ مفتاح الذاكرة</span>
              <p>{hintFor(current.a, current.b)}</p>
              <button className="cf-show-array" type="button" onClick={() => setArray(!array)}>
                {array ? 'اخفي المكعبات' : 'شوفي المجموعات'}
              </button>
              {array && (
                <div className="cf-array" role="img"
                  aria-label={`${current.a} مجموعات في كل واحدة ${current.b}`}
                  style={{ gridTemplateColumns: `repeat(${current.b}, 1fr)` }}>
                  {Array.from({ length: result }, (_, i) => <i key={i}/>)}
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
                {!hinted && <button type="button" onClick={() => hint()}>✦ تلميح</button>}
                <button type="button" onClick={reveal}>شوفي الإجابة</button>
              </div>
            </>
          )}
        </section>
      ) : null}

      <div className="cf-floor" aria-hidden="true"><span/><span/><span/></div>
    </main>
  );
}
