import { useEffect, useRef, useState } from 'react';
import type { SurfaceViewProps } from '@experience/room-runtime';
import { newRecordId } from '@experience/room-runtime';
import { dayOf, GYM, KITCHEN_CLOSES, setToday, todayOf } from './day';
import { Glass } from './Glass';
import { Shopping, Week } from './Lists';
import { boardStyle } from './style';

/** Which part Noor brought forward, shared between the surface and its view. */
export type Spotlight = { section: string | null; listeners: Set<() => void> };

/** The clock the board lives by: it moves on each minute, across 9 pm and midnight. */
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

/** The section Noor shows lights up for a moment and comes into view. */
function useSpotlight(spotlight: Spotlight) {
  const [lit, setLit] = useState<string | null>(null);
  const refs = useRef(new Map<string, HTMLElement>());
  useEffect(() => {
    let timer = 0;
    const listener = () => {
      const section = spotlight.section;
      setLit(section);
      if (section)
        refs.current.get(section)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      clearTimeout(timer);
      timer = window.setTimeout(() => setLit(null), 2600);
    };
    spotlight.listeners.add(listener);
    return () => {
      spotlight.listeners.delete(listener);
      clearTimeout(timer);
    };
  }, [spotlight]);
  const mark = (id: string) => ({
    'data-lit': lit === id,
    ref: (el: HTMLElement | null) => {
      if (el) refs.current.set(id, el);
    },
  });
  return mark;
}

/** Esraa's day on a fridge door: today's habits, the week's meals and the shopping list. */
export function Board(props: SurfaceViewProps & { spotlight: Spotlight }) {
  const { spec, data, edit } = props;
  const now = useNow();
  const day = dayOf(now);
  const today = todayOf(data, day)?.values ?? {};
  const set = (change: Record<string, unknown>) =>
    edit((d) => setToday(spec, d, day, change, newRecordId));
  const mark = useSpotlight(props.spotlight);
  const night = now.getHours() >= KITCHEN_CLOSES;
  const toggle = (field: string, label: string, done: string, hint?: string) => (
    <li className={`habit habit-${field}`}>
      <span className="magnet" aria-hidden="true" />
      <span className="habit-name">
        {label}
        {hint && <small>{hint}</small>}
      </span>
      <button
        type="button"
        aria-pressed={Boolean(today[field])}
        onClick={() => set({ [field]: !today[field] })}
      >
        {today[field] ? done : 'لسه'}
      </button>
    </li>
  );
  return (
    <div className="board" data-frame={props.frame} data-night={night}>
      <style>{boardStyle}</style>
      <header className="board-head">
        <h2>
          {now.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}
        </h2>
        <p>{night ? 'المطبخ قفل 🌙' : 'المطبخ بيقفل ٩ بليل'}</p>
      </header>
      <section className="today" aria-label="النهارده" {...mark('today')}>
        <Glass
          glasses={typeof today.water === 'number' ? today.water : 0}
          change={(water) => set({ water: Math.max(0, water) })}
        />
        <ul className="habits">
          {toggle('vitamins', 'الفيتامينات', 'اتاخدت')}
          {toggle('breakfast', 'فطار سهل متجهز', 'متجهز', 'زي البطاطس المهروسة')}
          <li className="habit habit-gym">
            <span className="magnet" aria-hidden="true" />
            <span className="habit-name">
              الجيم<small>التفكير نفسه خطوة</small>
            </span>
            <span className="steps" role="group" aria-label="الجيم">
              {GYM.map((step) => (
                <button
                  key={step}
                  type="button"
                  aria-pressed={today.gym === step}
                  onClick={() => set({ gym: step })}
                >
                  {step}
                </button>
              ))}
            </span>
          </li>
          {toggle(
            'kitchen',
            'مفيش أكل بعد العشا',
            'اتقفل',
            night ? 'المطبخ قفل النهارده؟' : 'بيقفل ٩ بليل',
          )}
        </ul>
      </section>
      <section className="plan" aria-label="خطة الأسبوع" {...mark('week')}>
        <h2>خطة الأسبوع</h2>
        <Week spec={spec} data={data} edit={edit} now={now} />
      </section>
      <section className="shopping" aria-label="المشتريات" {...mark('shopping')}>
        <h2>المشتريات</h2>
        <Shopping spec={spec} data={data} edit={edit} />
      </section>
    </div>
  );
}
