import { useEffect, useState } from 'react';
import type { CubeModel, GameCommand } from './model';

/** Explicit function cleanup avoids relying on model subscription internals in React. */
export function useCubeCommand(model: CubeModel) {
  const [command, setCommand] = useState<GameCommand | null>(null);
  useEffect(() => {
    const unsubscribe = model.subscribeCommand(() => setCommand(model.getCommand()));
    return () => { unsubscribe(); };
  }, [model]);
  return command;
}
