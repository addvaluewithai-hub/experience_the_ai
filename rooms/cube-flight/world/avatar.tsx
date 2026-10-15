import { useCallback, useEffect, useState } from 'react';
import type { CubeModel, PlayerProfile, SpriteRig } from './model';

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

/** Load the original browser scripts as classic scripts, not ES modules.
 * The original PixiLive IIFEs publish CharacterGeometry / Engine / Flight / Motion on window.
 * ?url copies source bytes into versioned same-origin assets without bundler rewriting.
 */
let loader: Promise<string> | null = null;
function script(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const element = document.createElement('script');
    element.src = url;
    element.async = false;
    element.onload = () => resolve();
    element.onerror = () => {
      element.remove();
      reject(new Error('Could not load local PixiLive character script.'));
    };
    document.head.append(element);
  });
}
function loadPixiLive(): Promise<string> {
  loader ??= (async () => {
    const [geometry, engine, flight, motion] = await Promise.all([
      import('../character/geometry.js?url'),
      import('../character/engine.js?url'),
      import('../character/flight.js?url'),
      import('../character/motion.js?url'),
    ]);
    for (const url of [geometry.default, engine.default, flight.default, motion.default])
      await script(url);
    if (!window.CharacterEngine || !window.CharacterMotion)
      throw new Error('Original PixiLive character globals did not initialize.');
    const { default: master } = await import('../character/master.svg?raw');
    return master;
  })().catch((error) => {
    loader = null;
    throw error;
  });
  return loader;
}

/**
 * Lumi is rendered and animated by the original PixiLive SVG recipe + rig.
 * No new mascot art or motion loop is introduced for the maths room.
 */
export function LumiAvatar({ model }: { model: CubeModel }) {
  const [profile, setProfile] = useState<PlayerProfile>(() => model.getProfile());
  useEffect(() => {
    const unsubscribe = model.subscribeProfile(() => setProfile(model.getProfile()));
    return () => { unsubscribe(); };
  }, [model]);
  const attach = useCallback(
    (el: HTMLDivElement | null) => {
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
    },
    [model],
  );

  return (
    <div className="cf-avatar" aria-label="الرفيقة الطايرة">
      <div className="cf-sprite-host" ref={attach} />
      <span className="cf-name-tag">{profile.companion}</span>
    </div>
  );
}
