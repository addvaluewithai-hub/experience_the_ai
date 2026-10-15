import type { Lesson } from './mission';

/** An actual teach step: the answer is shown WITH a physical group relationship. */
export function LessonStage({
  table, lessons, step, next,
}: {
  table: number;
  lessons: Lesson[];
  step: number;
  next: () => void;
}) {
  const lesson = lessons[step];
  if (!lesson) return null;
  const { a, b, answer, anchor } = lesson;
  return (
    <section className="cf-lesson" aria-label={`تعلم جدول ${table}`}>
      <div className="cf-lesson-kicker">جدول {table} · اكتشفي الرابط</div>
      <div className="cf-equation cf-teach-equation" aria-label={`${a} في ${b} = ${answer}`}>
        <span className="cf-big-cube">{a}</span>
        <span className="cf-operator">×</span>
        <span className="cf-big-cube cf-second">{b}</span>
        <span className="cf-operator">=</span>
        <span className="cf-big-cube cf-answer-cube cf-revealed">{answer}</span>
      </div>
      <div className="cf-lesson-demo" aria-label={`${b} مجموعات من ${a} مكعبات`}>
        <div className="cf-lesson-grid">
          {Array.from({ length: b }, (_, row) => (
            <div className={`cf-lesson-row ${row >= 5 ? 'extra' : ''}`} key={row}
              style={{ gridTemplateColumns: `repeat(${a}, minmax(0, 1fr))` }}>
              {Array.from({ length: a }, (_, col) => <i key={col} />)}
            </div>
          ))}
        </div>
        <p className="cf-lesson-anchor">{anchor}</p>
      </div>
      <button type="button" className="cf-go cf-lesson-next" onClick={next}>
        {step === lessons.length - 1 ? 'يلا أجرب من الذاكرة' : 'ورّيني الرابط اللي بعده'}
        <span aria-hidden="true">➜</span>
      </button>
      <span className="sr-only" aria-live="polite">
        هنا بنشوف الناتج والمكعبات للتعلم. بعدين هنخفيهم ونحاول نفتكر.
      </span>
    </section>
  );
}
