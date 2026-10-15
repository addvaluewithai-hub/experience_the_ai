export function GameIntro({ begin }: { begin: () => void }) {
  return (
    <section className="cf-intro">
      <div className="cf-supra">CUBE FLIGHT</div>
      <h2>
        الأرقام دي
        <br />
        <span>في دماغك!</span>
      </h2>
      <p>لومي بتطير معاكي، وتفكري سوا في أصعب الأرقام.</p>
      <button className="cf-go" type="button" onClick={begin}>
        ابدئي مع لومي <span>➜</span>
      </button>
      <small>اسمعي لومي، اختاري اسمك واسمها، وابدئي التحدي.</small>
    </section>
  );
}

export function GameFinish({
  begin,
  independent,
  total,
}: {
  begin: () => void;
  independent: number;
  total: number;
}) {
  return (
    <section className="cf-finish" aria-live="polite">
      <div className="cf-medal">✦</div>
      <div className="cf-supra">CUBE FLIGHT</div>
      <h2>مستوى جديد!</h2>
      <strong>
        {independent} <small>/ {total}</small>
      </strong>
      <p>إجابات من الذاكرة من غير مساعدة. الصح بمساعدة كمان تدريب ممتاز.</p>
      <button className="cf-go" type="button" onClick={begin}>
        جولة جديدة ↗
      </button>
    </section>
  );
}

/** Nonverbal progress indicator — the child sees play, not a quiz dashboard. */
export function ProgressPips({ index, total }: { index: number; total: number }) {
  return (
    <div
      className="cf-progress-pips"
      role="progressbar"
      aria-label="تقدم اللعب"
      aria-valuenow={index}
      aria-valuemin={0}
      aria-valuemax={total}
    >
      {Array.from({ length: total }, (_, i) => (
        <i key={i} className={i < index ? 'lit' : ''} />
      ))}
    </div>
  );
}
