import { useEffect, useRef } from 'react';
import type { ComponentType } from 'react';
import master from '../character/master.svg?raw';
import '../character/geometry.js';
import '../character/engine.js';
import '../character/flight.js';
import '../character/motion.js';
import type { CubeModel, SpriteRig } from './model';

interface CharacterRecipe {
  species: string;
  name: string;
  [key: string]: unknown;
}
interface CharacterRecipeEngine {
  normalize(recipe: CharacterRecipe): CharacterRecipe;
  render(recipe: CharacterRecipe): string;
  metrics(recipe: CharacterRecipe): Record<string, unknown>;
}
declare global {
  interface Window {
    CharacterEngine: { createEngine(svg: string): CharacterRecipeEngine };
    CharacterMotion: {
      createRig(root: HTMLElement, options: Record<string, unknown>): SpriteRig;
    };
  }
}

/**
 * PixiLive's original Lumi sprite art, flight, facial poses and visemes.
 * Scripts and master SVG are copied from feat/character-engine, not recreated in the game.
 */
export function LumiAvatar({ model }: { model: CubeModel }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const engine = window.CharacterEngine.createEngine(master);
    const recipe = engine.normalize({
      species: 'sprite',
      name: 'لومي',
      accent: '#A080E8',
    });
    // This markup comes from a committed, reviewed SVG master and a fixed local recipe.
    el.innerHTML = engine.render(recipe);
    const svg = el.querySelector('svg');
    if (svg) {
      svg.setAttribute('aria-label', 'لومي، الرفيقة الطايرة');
      svg.style.width = '100%';
      svg.style.height = '100%';
      svg.style.display = 'block';
    }
    const rig = window.CharacterMotion.createRig(el, {
      keyboard: false,
      externalControl: true,
      speechMotionScale: 0.4,
      appearance: () => engine.metrics(recipe),
    });
    model.bindAvatar(rig);
    return () => {
      model.bindAvatar(null);
      rig.destroy();
      el.replaceChildren();
    };
  }, [model]);

  return <div className="cf-avatar" aria-label="لومي الرفيقة الطايرة" ref={host} />;
}
