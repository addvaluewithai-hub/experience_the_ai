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
