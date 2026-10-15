import { useEffect, useRef } from 'react';
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

/** PixiLive source modules are browser-only IIFEs; load them after mount, in dependency order. */
async function loadPixiLive() {
  // @ts-ignore PixiLive ships original JavaScript globals, not a typed ES module.
  await import('../character/geometry.js');
  // @ts-ignore PixiLive ships original JavaScript globals, not a typed ES module.
  await import('../character/engine.js');
  // @ts-ignore PixiLive ships original JavaScript globals, not a typed ES module.
  await import('../character/flight.js');
  // @ts-ignore PixiLive ships original JavaScript globals, not a typed ES module.
  await import('../character/motion.js');
  const { default: master } = await import('../character/master.svg?raw');
  return master;
}

/**
 * Lumi is rendered and animated by the original PixiLive SVG recipe + rig.
 * No new mascot art or motion loop is introduced for the maths room.
 */
export function LumiAvatar({ model }: { model: CubeModel }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let gone = false;
    let rig: SpriteRig | null = null;
    void loadPixiLive()
      .then((master) => {
        if (gone) return;
        const engine = window.CharacterEngine.createEngine(master);
        const recipe = engine.normalize({
          species: 'sprite',
          name: 'لومي',
          accent: '#A080E8',
        });
        // Markup comes only from the committed SVG master and a fixed local recipe.
        el.innerHTML = engine.render(recipe);
        const svg = el.querySelector('svg');
        if (svg) {
          svg.setAttribute('aria-label', 'لومي، الرفيقة الطايرة');
          svg.style.width = '100%';
          svg.style.height = '100%';
          svg.style.display = 'block';
        }
        rig = window.CharacterMotion.createRig(el, {
          keyboard: false,
          externalControl: true,
          speechMotionScale: 0.4,
          appearance: () => engine.metrics(recipe),
        });
        model.bindAvatar(rig);
      })
      .catch((error) => {
        if (!gone) console.error('Could not mount the PixiLive avatar:', error);
      });
    return () => {
      gone = true;
      model.bindAvatar(null);
      rig?.destroy();
      el.replaceChildren();
    };
  }, [model]);

  return <div className="cf-avatar" aria-label="لومي الرفيقة الطايرة" ref={host} />;
}
