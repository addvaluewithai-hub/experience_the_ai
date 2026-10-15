import { useEffect, useState, type FormEvent } from 'react';
import type { CubeModel } from './model';
import type { DailyMission } from './mission';
import { afterBridgeChoice, canAdvanceLesson, groupBridge, type TeachingMode } from './learning';

/** One fact must be understood, reconstructed and recalled before the next one.
 * Lesson attempts NEVER write mastery data. A mistake routes back to explanation.
 */
export function useLesson(
  model: CubeModel,
  mission: DailyMission | null,
  teaching: number | null,
  setTeaching: (step: number | null) => void,
) {
  const [mode, setMode] = useState<TeachingMode>('explain');
  const [entry, setEntry] = useState('');
  const [feedback, setFeedback] = useState('');

  const reset = () => {
    setMode('explain');
    setEntry('');
    setFeedback('');
  };
  const fact = mission && teaching !== null ? mission.lessons[teaching] : null;
  useEffect(() => {
    if (!mission || teaching === null) return;
    const example = mission.lessons[teaching];
    if (!example) return;
    model.go('right');
    model.emit({
      kind: 'teach',
      detail: {
        table: mission.table, step: teaching + 1, phase: 'explain',
        a: example.a, b: example.b,
        answer: example.answer, strategy: example.anchor,
      },
    });
  }, [mission, teaching, model]);

  const explainDone = () => {
    if (!fact || mode !== 'explain') return;
    setFeedback('');
    setMode('connect');
    model.emit({
      kind: 'bridge_question',
      detail: { a: fact.a, b: fact.b, question: groupBridge(fact.a, fact.b).question },
    });
  };

  const chooseBridge = (choice: number) => {
    if (!fact || mode !== 'connect') return;
    const next = afterBridgeChoice(mode, groupBridge(fact.a, fact.b), choice);
    if (next === 'recall') {
      setMode('recall');
      setFeedback('');
      setEntry('');
      model.emit({ kind: 'bridge_result', detail: { a: fact.a, b: fact.b, correct: true } });
    } else {
      setFeedback('قريبة! بصّي للمجموعات الملونة، وجرّبي تاني.');
      model.emit({ kind: 'bridge_result', detail: { a: fact.a, b: fact.b, correct: false } });
    }
  };

  const submitRecall = (event: FormEvent) => {
    event.preventDefault();
    if (!fact || mode !== 'recall' || !entry) return;
    const correct = canAdvanceLesson(mode, Number(entry), fact.answer);
    model.emit({
      kind: 'lesson_recall',
      detail: { a: fact.a, b: fact.b, correct, attempt: Number(entry) },
    });
    setEntry('');
    if (correct) {
      setMode('success');
      setFeedback('');
      model.act('lumi', 'cheer', {});
    } else {
      setMode('explain');
      setFeedback('تعالي نشوف المجموعات والرابط تاني، وبعدها نجرب من الذاكرة.');
    }
  };

  const moreHelp = () => {
    if (!fact || mode !== 'recall') return;
    setMode('explain');
    setEntry('');
    setFeedback('رجعنا للمكعبات. المساعدة تدريب مش غلطة.');
    model.emit({ kind: 'lesson_help', detail: { a: fact.a, b: fact.b } });
  };

  const next = () => {
    if (!mission || teaching === null || mode !== 'success') return;
    const step = teaching + 1;
    reset();
    if (step >= mission.lessons.length) {
      setTeaching(null);
      model.emit({ kind: 'lesson_complete', detail: { table: mission.table } });
    } else setTeaching(step);
  };

  return { mode, entry, setEntry, feedback, reset,
    explainDone, chooseBridge, submitRecall, moreHelp, next };
}
