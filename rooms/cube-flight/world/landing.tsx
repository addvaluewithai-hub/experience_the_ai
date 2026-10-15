export function GameIntro({
  begin,
  selectedTable,
  selectTable,
  recommended,
}: {
  begin: (table: number) => void;
  selectedTable: number;
  selectTable: (table: number) => void;
  recommended: number;
}) {
  return (
    <section className="cf-intro">
      <div className="cf-supra">CUBE FLIGHT</div>
      <h2>
        الأرقام دي
        <br />
        <span>في دماغك!</span>
      </h2>
      <p>النهارده هنكتشف روابط صغيرة في جدول واحد، وبعدين نلعب من الذاكرة.</p>
      <div className="cf-tables" role="group" aria-label="اختاري جدول النهارده">
        <div className="cf-table-heading">
          جدول النهارده <small>لومي بترشّح {recommended}</small>
        </div>
        <div className="cf-table-picker">
          {Array.from({ length: 11 }, (_, i) => i + 2).map((table) => (
            <button
              key={table}
              type="button"
              aria-pressed={table === selectedTable}
              className={table === selectedTable ? 'cf-table-tile selected' : 'cf-table-tile'}
              onClick={() => selectTable(table)}
            >
              {table}
            </button>
          ))}
        </div>
      </div>
      <button className="cf-go" type="button" onClick={() => begin(selectedTable)}>
        ابدئي مع لومي <span>➜</span>
      </button>
      <small>اتعلمي 3 روابط بالمكعبات، وبعدها جرّبي تفتكريهم.</small>
    </section>
  );
}

export function GameFinish({
  begin,
  independent,
  total,
  table,
}: {
  begin: () => void;
  independent: number;
  total: number;
  table: number;
}) {
  return (
    <section className="cf-finish" aria-live="polite">
      <div className="cf-medal">✦</div>
      <div className="cf-supra">CUBE FLIGHT</div>
      <h2>جدول {table} ✨</h2>
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
