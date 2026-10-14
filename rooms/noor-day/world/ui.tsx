import { useEffect, useSyncExternalStore } from 'react';
import { updateRecord, type RoomData, type RoomSpec } from '@experience/room-spec';
import { newRecordId } from '@experience/room-runtime';
import { addDays, dayOf, GLASSES, GYM, mealsOn, setToday, todayOf } from './day';
import type { KitchenModel, Note } from './model';

type Props = {
  spec: RoomSpec;
  data: RoomData;
  edit: (change: (d: RoomData) => RoomData) => void;
  model: KitchenModel;
};
const ar = (n: number) => n.toLocaleString('ar-EG');
const useModel = <T,>(model: KitchenModel, read: () => T) =>
  useSyncExternalStore(model.subscribe, read, read);

function Check(props: { label: string; on: boolean; toggle: () => void; hint?: string }) {
  return (
    <li>
      <button
        type="button"
        role="checkbox"
        aria-checked={props.on}
        className="chalk-check"
        onClick={props.toggle}
      >
        <span className="chalk-box" aria-hidden="true">
          {props.on ? '✓' : ''}
        </span>
        {props.label}
        {props.hint && <small>{props.hint}</small>}
      </button>
    </li>
  );
}

/** The day's five habits on the chalkboard: tapped by Esraa, or ticked by Noor through her tools. */
export function Chalkboard({ spec, data, edit, model }: Props) {
  const lit = useModel(model, () => model.boardLit);
  const day = dayOf(model.now());
  const today = todayOf(data, day)?.values ?? {};
  const set = (change: Record<string, unknown>) =>
    edit((d) => setToday(spec, d, day, change, newRecordId));
  const water = typeof today.water === 'number' ? today.water : 0;
  return (
    <section className="chalkboard" data-lit={lit} aria-label="عادات النهارده">
      <h2>النهارده</h2>
      <ul>
        <li className="chalk-water">
          <span>المية</span>
          <span
            className="glasses"
            role="group"
            aria-label={`المية: ${ar(water)} من ${ar(GLASSES)}`}
          >
            {Array.from({ length: GLASSES }, (_, i) => (
              <button
                key={i}
                type="button"
                aria-pressed={i < water}
                aria-label={`كوباية ${ar(i + 1)}`}
                onClick={() => set({ water: water === i + 1 ? i : i + 1 })}
              />
            ))}
          </span>
        </li>
        <Check
          label="الفيتامينات"
          on={Boolean(today.vitamins)}
          toggle={() => set({ vitamins: !today.vitamins })}
        />
        <Check
          label="فطار سهل متجهز"
          on={Boolean(today.breakfast)}
          toggle={() => set({ breakfast: !today.breakfast })}
        />
        <li className="chalk-gym">
          <span>الجيم</span>
          <span role="group" aria-label="الجيم">
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
        <Check
          label="مفيش أكل بعد العشا"
          hint="٩ بليل"
          on={Boolean(today.kitchen)}
          toggle={() => set({ kitchen: !today.kitchen })}
        />
      </ul>
    </section>
  );
}

/** On narrow screens: three magnets that open the board and the fridge notes big. */
export function Magnets({ data, model }: { data: RoomData; model: KitchenModel }) {
  const today = todayOf(data, dayOf(model.now()))?.values ?? {};
  const habits = [
    today.water === GLASSES,
    today.vitamins,
    today.breakfast,
    today.gym,
    today.kitchen,
  ];
  return (
    <nav className="magnets" aria-label="السبورة والتلاجة">
      <button type="button" onClick={() => model.open('habits')}>
        النهارده {ar(habits.filter(Boolean).length)}/{ar(5)}
      </button>
      <button type="button" onClick={() => model.open('week')}>
        الأسبوع
      </button>
      <button type="button" onClick={() => model.open('shopping')}>
        المشتريات
      </button>
    </nav>
  );
}

/** A note held on the fridge by a magnet; tapping it takes it down to read. */
export function FridgeNote({
  note,
  data,
  model,
}: {
  note: Note;
  data: RoomData;
  model: KitchenModel;
}) {
  const days = Array.from({ length: 7 }, (_, i) => dayOf(addDays(model.now(), i)));
  const meals = days.flatMap((d) => mealsOn(data, d));
  const items = data.shopping ?? [];
  return (
    <button type="button" className={`fridge-note note-${note}`} onClick={() => model.open(note)}>
      <span className="magnet" aria-hidden="true" />
      <b>{note === 'week' ? 'خطة الأسبوع' : 'المشتريات'}</b>
      <small>
        {note === 'week'
          ? meals.length
            ? `${ar(meals.length)} وجبات`
            : 'لسه فاضية'
          : items.length
            ? `${ar(items.filter((s) => s.values.bought).length)} من ${ar(items.length)}`
            : 'لسه فاضية'}
      </small>
    </button>
  );
}

const dayName = (d: Date, i: number) =>
  i === 0 ? 'النهارده' : i === 1 ? 'بكرة' : d.toLocaleDateString('ar-EG', { weekday: 'long' });

/** The note taken down from the fridge, big enough to read and tick; it goes back with a tap. */
export function OpenNote({ spec, data, edit, model }: Props) {
  const note = useModel(model, () => model.note);
  useEffect(() => {
    const close = (e: KeyboardEvent) => e.key === 'Escape' && model.open(null);
    addEventListener('keydown', close);
    return () => removeEventListener('keydown', close);
  }, [model]);
  if (!note) return null;
  const tick = (collection: string, id: string, field: string, on: boolean) =>
    edit((d) => updateRecord(spec, d, collection, id, { [field]: !on }));
  const now = model.now();
  if (note === 'habits')
    return (
      <div className="note-backdrop" onClick={() => model.open(null)}>
        <article
          className="open-note note-habits"
          onClick={(e) => e.stopPropagation()}
          aria-label="عادات النهارده"
        >
          <Chalkboard spec={spec} data={data} edit={edit} model={model} />
          <button type="button" className="note-back" onClick={() => model.open(null)}>
            رجّعها على السبورة
          </button>
        </article>
      </div>
    );
  return (
    <div className="note-backdrop" onClick={() => model.open(null)}>
      <article
        className={`open-note note-${note}`}
        onClick={(e) => e.stopPropagation()}
        aria-label={note === 'week' ? 'خطة الأسبوع' : 'المشتريات'}
      >
        <h2>{note === 'week' ? 'خطة الأسبوع' : 'المشتريات'}</h2>
        {note === 'week' ? (
          <ol className="note-week">
            {Array.from({ length: 7 }, (_, i) => addDays(now, i)).map((d, i) => (
              <li key={i}>
                <b>{dayName(d, i)}</b>
                {mealsOn(data, dayOf(d)).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    role="checkbox"
                    aria-checked={Boolean(m.values.done)}
                    onClick={() => tick('meals', m.id, 'done', Boolean(m.values.done))}
                  >
                    <small>{String(m.values.meal)}</small> {String(m.values.dish)}
                  </button>
                ))}
              </li>
            ))}
          </ol>
        ) : (
          <ul className="note-shopping">
            {(data.shopping ?? []).map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={Boolean(s.values.bought)}
                  onClick={() => tick('shopping', s.id, 'bought', Boolean(s.values.bought))}
                >
                  {String(s.values.item)}
                </button>
              </li>
            ))}
          </ul>
        )}
        <button type="button" className="note-back" onClick={() => model.open(null)}>
          رجّعها على التلاجة
        </button>
      </article>
    </div>
  );
}
