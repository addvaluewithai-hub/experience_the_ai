import { useState, type FormEvent } from 'react';
import { addRecord, removeRecord, updateRecord, type RoomRecord } from '@experience/room-spec';
import { newRecordId } from '../store';
import { wordsFor } from '../words';
import type { PanelProps } from './types';

/** Records of one collection. The quick-add line appears only when one text field is enough. */
export function ListPanel({ spec, panel, collection, data, edit }: PanelProps) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  if (!collection) return null;
  const words = wordsFor(spec.language);
  const records = data[collection.id] ?? [];
  const main = collection.fields.find((f) => f.type === 'text');
  const quickAdd =
    main && collection.fields.every((f) => f === main || !f.required) ? main : undefined;
  const detail = (record: RoomRecord) =>
    collection.fields
      .filter((f) => f !== main && f.id !== panel.field && f.type !== 'boolean')
      .map((f) => record.values[f.id])
      .filter((v) => v !== undefined)
      .join(' · ');

  const change = (run: () => void) => {
    try {
      run();
      setError('');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    }
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!quickAdd || !draft.trim()) return;
    change(() => {
      const values = { [quickAdd.id]: draft };
      edit((current) => addRecord(spec, current, collection.id, values, newRecordId()));
      setDraft('');
    });
  };

  return (
    <>
      {records.length ? (
        <ul className="room-list">
          {records.map((record) => (
            <li key={record.id}>
              {panel.field ? (
                <input
                  type="checkbox"
                  aria-label={String(record.values[main?.id ?? ''] ?? record.id)}
                  checked={record.values[panel.field] === true}
                  onChange={(event) => {
                    const checked = event.currentTarget.checked;
                    change(() =>
                      edit((current) =>
                        updateRecord(spec, current, collection.id, record.id, {
                          [panel.field!]: checked,
                        }),
                      ),
                    );
                  }}
                />
              ) : null}
              <span className="room-list-text">
                <span>{String(record.values[main?.id ?? ''] ?? record.id)}</span>
                {detail(record) ? <small>{detail(record)}</small> : null}
              </span>
              <button
                type="button"
                className="room-icon-button"
                aria-label={`${words.remove}: ${String(record.values[main?.id ?? ''] ?? '')}`}
                onClick={() =>
                  change(() =>
                    edit((current) => removeRecord(spec, current, collection.id, record.id)),
                  )
                }
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="room-muted">{words.empty}</p>
      )}
      {quickAdd ? (
        <form className="room-add" onSubmit={submit}>
          <input
            value={draft}
            maxLength={600}
            placeholder={`${words.newItem}: ${quickAdd.label}`}
            aria-label={`${words.newItem}: ${quickAdd.label}`}
            onChange={(event) => setDraft(event.currentTarget.value)}
          />
          <button type="submit">{words.add}</button>
        </form>
      ) : null}
      {error ? (
        <p className="room-error" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}
