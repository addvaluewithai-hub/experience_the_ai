import type { RoomData, RoomSpec } from '@experience/room-spec';
import { updateRecord } from '@experience/room-spec';
import { addDays, dayOf, mealsOn } from './day';

type Edit = (change: (data: RoomData) => RoomData) => void;

const dayName = (d: Date, i: number) =>
  i === 0 ? 'النهارده' : i === 1 ? 'بكرة' : d.toLocaleDateString('ar-EG', { weekday: 'long' });

/** Today and the next six days, each with the meals the character planned; a tap marks one done. */
export function Week(props: { spec: RoomSpec; data: RoomData; edit: Edit; now: Date }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(props.now, i));
  const planned = days.some((d) => mealsOn(props.data, dayOf(d)).length);
  return (
    <>
      {!planned && (
        <p className="board-empty">هالة تقدر تخطط الأسبوع من لستة الأكل، وتطلّع منه المشتريات.</p>
      )}
      <ol className="week">
        {days.map((d, i) => (
          <li key={dayOf(d)} className={i === 0 ? 'week-today' : undefined}>
            <h3>{dayName(d, i)}</h3>
            {mealsOn(props.data, dayOf(d)).map((m) => (
              <button
                key={m.id}
                type="button"
                className="meal"
                aria-pressed={Boolean(m.values.done)}
                onClick={() =>
                  props.edit((data) =>
                    updateRecord(props.spec, data, 'meals', m.id, { done: !m.values.done }),
                  )
                }
              >
                <small>{String(m.values.meal)}</small> {String(m.values.dish)}
              </button>
            ))}
          </li>
        ))}
      </ol>
    </>
  );
}

/** The shopping list on a notepad; a tap crosses an item off. */
export function Shopping(props: { spec: RoomSpec; data: RoomData; edit: Edit }) {
  const items = props.data.shopping ?? [];
  if (!items.length) return <p className="board-empty">المشتريات بتطلع من خطة الأسبوع.</p>;
  return (
    <ul className="notepad">
      {items.map((s) => (
        <li key={s.id}>
          <button
            type="button"
            aria-pressed={Boolean(s.values.bought)}
            onClick={() =>
              props.edit((data) =>
                updateRecord(props.spec, data, 'shopping', s.id, { bought: !s.values.bought }),
              )
            }
          >
            {String(s.values.item)}
          </button>
        </li>
      ))}
    </ul>
  );
}
