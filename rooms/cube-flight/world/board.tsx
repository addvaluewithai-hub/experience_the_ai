import { useEffect, useState, type FormEvent } from 'react';
import type { SurfaceViewProps } from '@experience/room-runtime';
import { newRecordId } from '@experience/room-runtime';
import { dateOf, hintFor, recordAttempt, sessionPlan, type Question } from './memory';
import type { CubeModel } from './model';

type Result = 'independent' | 'helped' | 'shown' | null;
type Props = SurfaceViewProps & { model: CubeModel };
const numberKeys = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];

export function GameBoard({ spec, data, edit, model }: Props) {
  const [plan, setPlan] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [entry, setEntry] = useState('');
  const [hinted, setHinted] = useState(false);
  const [wrong, setWrong] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const [showArray, setShowArray] = useState(false);
  const [independent, setIndependent] = useState(0);
  const [solved, setSolved] = useState(0);
  const current = plan[index];
  const done = plan.length > 0 && index >= plan.length;

  useEffect(() => {
    if (current) model.prompt(current.a, current.b);
  }, [current, model]);

  const begin = () => {
    const questions = sessionPlan(data, dateOf(new Date()));
    setPlan(questions);
    setIndex(0);
    setEntry('');
    setResult(null);
    setWrong(false);
    setHinted(false);
    setShowArray(false);
    setSolved(0);
    setIndependent(0);
  };

  const showHint = () => {
    if (!current || result) return;
    setHinted(true);
    model.hint();
  };

  const reveal = () => {
    if (!current || result) return;
    edit((d) =>
      recordAttempt(
        spec,
        d,
        current.a,
        current.b,
        {
          correct: false,
          helped: true,
        },
        dateOf(new Date()),
        newRecordId,
      ),
    );
    setResult('shown');
    model.answer(false, true);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!current || result || !entry) return;
    if (Number(entry) !== current.a * current.b) {
      setWrong(true);
      setHinted(true);
      setEntry('');
      model.hint();
      return;
    }
    const unassisted = !hinted && !wrong;
    edit((d) =>
      recordAttempt(
        spec,
        d,
        current.a,
        current.b,
        {
          correct: true,
          helped: !unassisted,
        },
        dateOf(new Date()),
        newRecordId,
      ),
    );
    setResult(unassisted ? 'independent' : 'helped');
    setSolved((n) => n + 1);
    if (unassisted) setIndependent((n) => n + 1);
    model.answer(true, !unassisted);
  };

  const next = () => {
    setIndex((n) => n + 1);
    setEntry('');
    setWrong(false);
    setHinted(false);
    setResult(null);
    setShowArray(false);
  };

  if (!plan.length)
    return (
      <section className="cf-card cf-intro" dir="rtl">
        <p className="cf-eyebrow">🧊 CUBE FLIGHT</p>
        <h2>رحلة المكعبات مع لومي</h2>
        <p>
          ٤ عمليات ضرب هنلعب بيهم كذا مرة وسط أسئلة مختلفة. لو محتاجة تحسبي، عادي! هدفنا نخلي الناتج
          ييجي من الذاكرة مع التدريب.
        </p>
        <button className="cf-primary" onClick={begin} type="button">
          يلا نطير ونلعب! 🪽
        </button>
        <small>من غير عداد وقت، ومن غير عقاب على الخطأ.</small>
      </section>
    );

  if (done)
    return (
      <section className="cf-card cf-intro" dir="rtl" aria-live="polite">
        <p className="cf-eyebrow">✨ الجولة خلصت!</p>
        <h2>برافو على المحاولة!</h2>
        <p>
          {solved} من {plan.length} إجابات صح، منهم {independent} من غير تلميح.
        </p>
        <p>
          مش بنعتبر العملية اتحفظت من يوم واحد. في الجولة الجاية هنراجع اللي محتاج تثبيت ونضيف
          عمليات جديدة.
        </p>
        <button className="cf-primary" onClick={begin} type="button">
          جولة مكعبات جديدة
        </button>
      </section>
    );

  if (!current) return null;
  const correct = current.a * current.b;
  const feedback =
    result === 'independent'
      ? 'يا سلام! الإجابة طلعت من غير مساعدة! ✨'
      : result === 'helped'
        ? 'ممتاز! نجحنا بالتلميح، وهنقابلها تاني.'
        : result === 'shown'
          ? 'دي الإجابة. شوفي الرابط، وهنرجع نجربها بعد شوية.'
          : wrong
            ? 'مش هي دي؛ بصّي للتلميح وجربي مرة تانية.'
            : 'جربي تفتكري الناتج. مفيش استعجال.';

  return (
    <section className="cf-card" dir="rtl" aria-label="لعبة جدول الضرب">
      <header className="cf-head">
        <strong>🧊 مكعبات الذاكرة</strong>
        <span>
          سؤال {index + 1} / {plan.length}
        </span>
      </header>
      <div
        className="cf-progress"
        role="progressbar"
        aria-label="تقدم الجولة"
        aria-valuenow={index}
        aria-valuemin={0}
        aria-valuemax={plan.length}
      >
        <span style={{ width: `${(index / plan.length) * 100}%` }} />
      </div>

      <div className="cf-equation" aria-label={`${current.a} في ${current.b}`}>
        <span className="cf-cube">{current.a}</span>
        <b>×</b>
        <span className="cf-cube">{current.b}</span>
        <b>=</b>
        <span className="cf-cube cf-mystery">{result ? correct : '؟'}</span>
      </div>

      <p className="cf-feedback" aria-live="polite">
        {feedback}
      </p>

      {(hinted || result === 'shown') && (
        <aside className="cf-hint">
          <b>💡 رابط للذاكرة</b>
          <p>{hintFor(current.a, current.b)}</p>
          <button type="button" className="cf-link" onClick={() => setShowArray((v) => !v)}>
            {showArray ? 'خبّي الـ Array' : 'ورّيني الـ Array'}
          </button>
          {showArray && (
            <div
              className="cf-array"
              role="img"
              aria-label={`${current.a} مجموعات، كل واحدة فيها ${current.b} مكعبات`}
              style={{ gridTemplateColumns: `repeat(${current.b}, 1fr)` }}
            >
              {Array.from({ length: correct }, (_, i) => (
                <i key={i} />
              ))}
            </div>
          )}
        </aside>
      )}

      {result ? (
        <button type="button" className="cf-primary" onClick={next}>
          {index === plan.length - 1 ? 'شوفي الجولة ✨' : 'السؤال اللي بعده ←'}
        </button>
      ) : (
        <form onSubmit={submit} className="cf-answer">
          <label htmlFor="cf-answer-input">ركّبي الناتج بالمكعبات</label>
          <input
            id="cf-answer-input"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            pattern="[0-9]*"
            value={entry}
            onChange={(e) => setEntry(e.target.value.replace(/\D/g, '').slice(0, 3))}
            placeholder="؟"
            aria-label="الناتج"
          />
          <div className="cf-keys">
            {numberKeys.map((n) => (
              <button
                type="button"
                className="cf-key"
                key={n}
                onClick={() => setEntry((s) => (s + n).slice(0, 3))}
                disabled={entry.length >= 3}
              >
                {n}
              </button>
            ))}
            <button
              className="cf-key cf-erase"
              type="button"
              onClick={() => setEntry((s) => s.slice(0, -1))}
              aria-label="امسحي آخر رقم"
            >
              ⌫
            </button>
            <button type="submit" className="cf-check" disabled={!entry}>
              اتأكدّي ✓
            </button>
          </div>
          <div className="cf-help">
            {!hinted && (
              <button type="button" onClick={showHint}>
                💡 تلميح
              </button>
            )}
            <button type="button" onClick={reveal}>
              ورّيني الحل
            </button>
          </div>
        </form>
      )}
      <small className="cf-foot">
        الصح من غير مساعدة حاجة، والصح بالتلميح حاجة تانية. الاتنين خطوة لقدّام.
      </small>
    </section>
  );
}
