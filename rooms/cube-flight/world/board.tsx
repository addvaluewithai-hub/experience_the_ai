import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from 'react';
import type { SurfaceViewProps } from '@experience/room-runtime';
import { newRecordId } from '@experience/room-runtime';
import { dateOf, hintFor, recordAttempt, type Question } from './memory';
import { dailyMission, recommendTable, type DailyMission } from './mission';
import { LessonStage } from './lesson';
import type { CubeModel } from './model';
import { PracticeStage, type Outcome } from './practice';
import { GameIntro, GameFinish, ProgressPips } from './landing';

type Props = SurfaceViewProps & { model: CubeModel };

export function GameBoard({ spec, data, edit, model }: Props) {
  const [plan, setPlan] = useState<Question[]>([]);
  const [mission, setMission] = useState<DailyMission | null>(null);
  const [selectedTable, setSelectedTable] = useState(() => recommendTable(data));
  const [teaching, setTeaching] = useState<number | null>(null);
  const nudgedAt = useRef(-1);
  const [index, setIndex] = useState(0);
  const [entry, setEntry] = useState('');
  const [hinted, setHinted] = useState(false);
  const [wrong, setWrong] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [array, setArray] = useState(false);
  const [independent, setIndependent] = useState(0);
  const command = useSyncExternalStore(model.subscribeCommand, model.getCommand, model.getCommand);
  const current = plan[index];
  const complete = plan.length > 0 && index === plan.length;

  const begin = (table = selectedTable) => {
    const chosen = dailyMission(data, table, dateOf(new Date()));
    const nextPlan = chosen.questions;
    setSelectedTable(table);
    setMission(chosen);
    setTeaching(0);
    nudgedAt.current = -1;
    setPlan(nextPlan);
    setIndex(0);
    setEntry('');
    setOutcome(null);
    setWrong(false);
    setHinted(false);
    setArray(false);
    setIndependent(0);
    const first = nextPlan[0];
    if (first)
      model.emit({
        kind: 'start',
        detail: {
          table,
          a: chosen.lessons[0].a,
          b: chosen.lessons[0].b,
          answer: chosen.lessons[0].answer,
          strategy: chosen.lessons[0].anchor,
          phase: 'teach',
        },
      });
  };

  const nextLesson = () => {
    if (!mission || teaching === null) return;
    const next = teaching + 1;
    if (next >= mission.lessons.length) {
      setTeaching(null);
      model.emit({ kind: 'lesson_complete', detail: { table: mission.table } });
    } else setTeaching(next);
  };

  useEffect(() => {
    if (!mission || teaching === null) return;
    const lesson = mission.lessons[teaching];
    if (!lesson) return;
    model.go('right');
    model.emit({
      kind: 'teach',
      detail: {
        table: mission.table,
        step: teaching + 1,
        a: lesson.a,
        b: lesson.b,
        answer: lesson.answer,
        strategy: lesson.anchor,
      },
    });
  }, [mission, teaching, model]);

  const next = () => {
    if (!outcome) return;
    setIndex((i) => i + 1);
    setEntry('');
    setOutcome(null);
    setWrong(false);
    setHinted(false);
    setArray(false);
  };

  const hint = (showArray = false) => {
    if (!current || outcome) return;
    setHinted(true);
    if (showArray) setArray(true);
    model.hint();
    model.emit({
      kind: 'hint',
      detail: { a: current.a, b: current.b, strategy: hintFor(current.a, current.b) },
    });
  };

  useEffect(() => {
    if (!current || teaching !== null) return;
    model.prompt(current.a, current.b);
    model.emit({
      kind: 'question',
      detail: { a: current.a, b: current.b, revisit: current.revisit },
    });
  }, [current, teaching, model]);

  useEffect(() => {
    if (!complete) return;
    model.emit({ kind: 'round_complete', detail: { independent, total: plan.length } });
    // React to finishing the round, not to every counter update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complete, model]);

  useEffect(() => {
    if (!current || teaching !== null || outcome || !entry) return;
    const timer = setTimeout(
      () =>
        model.emit({
          kind: 'selection',
          detail: { digits: entry },
        }),
      600,
    );
    const pause = setTimeout(() => {
      if (nudgedAt.current === index) return;
      nudgedAt.current = index;
      model.peek();
      model.emit({ kind: 'pause', detail: { a: current.a, b: current.b, digits: entry } });
    }, 1900);
    return () => {
      clearTimeout(timer);
      clearTimeout(pause);
    };
  }, [current, entry, index, model, outcome, teaching]);

  // AI actions request safe UI changes. They never submit an answer or forge a success.
  useEffect(() => {
    if (!command) return;
    if (command.action === 'hint' && teaching === null && current && !outcome) {
      setHinted(true);
      model.hint();
    } else if (command.action === 'array' && teaching === null && current && !outcome) {
      setHinted(true);
      setArray(true);
      model.hint();
    } else if (command.action === 'advance') {
      if (!plan.length || complete) begin();
      else if (teaching !== null) nextLesson();
      else if (outcome) next();
    }
    // A new command id, not a game rerender, is what dispatches it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [command]);

  const reveal = () => {
    if (!current || teaching !== null || outcome) return;
    edit((d) =>
      recordAttempt(
        spec,
        d,
        current.a,
        current.b,
        { correct: false, helped: true },
        dateOf(new Date()),
        newRecordId,
      ),
    );
    setOutcome('shown');
    model.answer(false, true);
    model.emit({
      kind: 'answer',
      detail: {
        a: current.a,
        b: current.b,
        revealed: true,
        answer: current.a * current.b,
        expected: current.a * current.b,
        correct: false,
        independent: false,
        strategy: hintFor(current.a, current.b),
      },
    });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!current || teaching !== null || outcome || !entry) return;
    if (Number(entry) !== current.a * current.b) {
      setEntry('');
      setWrong(true);
      setHinted(true);
      model.hint();
      model.emit({
        kind: 'answer',
        detail: {
          a: current.a,
          b: current.b,
          answer: Number(entry),
          expected: current.a * current.b,
          correct: false,
          independent: false,
          strategy: hintFor(current.a, current.b),
        },
      });
      return;
    }
    const unassisted = !hinted && !wrong;
    edit((d) =>
      recordAttempt(
        spec,
        d,
        current.a,
        current.b,
        { correct: true, helped: !unassisted },
        dateOf(new Date()),
        newRecordId,
      ),
    );
    setOutcome(unassisted ? 'memory' : 'helped');
    if (unassisted) setIndependent((n) => n + 1);
    model.answer(true, !unassisted);
    model.emit({
      kind: 'answer',
      detail: {
        a: current.a,
        b: current.b,
        answer: Number(entry),
        expected: current.a * current.b,
        correct: true,
        independent: unassisted,
        strategy: hintFor(current.a, current.b),
      },
    });
  };

  return (
    <main className="cf-arena" dir="rtl" aria-label="Cube Flight multiplication game">
      {plan.length > 0 && teaching === null && !complete && (
        <ProgressPips index={index} total={plan.length} />
      )}

      {!plan.length ? (
        <GameIntro
          begin={begin}
          selectedTable={selectedTable}
          selectTable={setSelectedTable}
          recommended={recommendTable(data)}
        />
      ) : teaching !== null && mission ? (
        <LessonStage
          table={mission.table}
          lessons={mission.lessons}
          step={teaching}
          next={nextLesson}
        />
      ) : complete ? (
        <GameFinish
          begin={() => begin()}
          independent={independent}
          total={plan.length}
          table={mission?.table ?? selectedTable}
        />
      ) : current ? (
        <PracticeStage
          current={current}
          index={index}
          total={plan.length}
          outcome={outcome}
          hinted={hinted}
          wrong={wrong}
          array={array}
          setArray={setArray}
          entry={entry}
          setEntry={setEntry}
          submit={submit}
          next={next}
          hint={() => hint()}
          reveal={reveal}
        />
      ) : null}

      <div className="cf-floor" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </main>
  );
}
