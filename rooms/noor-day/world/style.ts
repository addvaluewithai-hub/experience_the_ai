/** The kitchen's interface style, carried as text so the room needs no stylesheet loader. */
export const kitchenStyle = String.raw`
@import url('https://fonts.googleapis.com/css2?family=Reem+Kufi:wght@500;700&family=Readex+Pro:wght@300;500&display=swap');
.pin { position: absolute; left: 0; top: 0; transform-origin: 0 0; visibility: hidden; direction: rtl; }
.chalkboard { box-sizing: border-box; height: 100%; padding: 14px 18px; color: #f4f1e6; font-family: 'Reem Kufi', system-ui, sans-serif; border-radius: 4px; transition: box-shadow 0.5s; }
.chalkboard[data-lit='true'] { box-shadow: 0 0 0 4px rgb(255 226 138 / 0.8), 0 0 28px rgb(255 226 138 / 0.6); }
.chalkboard h2 { margin: 0 0 8px; font-size: 24px; font-weight: 600; text-decoration: underline wavy rgb(244 241 230 / 0.5); text-underline-offset: 6px; }
.chalkboard ul { display: grid; gap: 7px; margin: 0; padding: 0; list-style: none; font-size: 17px; }
.chalkboard button { font: inherit; color: inherit; cursor: pointer; }
.chalk-check { display: flex; align-items: center; gap: 8px; width: 100%; padding: 2px 0; border: 0; background: none; text-align: start; }
.chalk-check small { margin-inline-start: auto; font-size: 13px; opacity: 0.7; }
.chalk-box { display: grid; place-items: center; width: 20px; height: 20px; border: 2px solid rgb(244 241 230 / 0.85); border-radius: 3px; font-size: 18px; line-height: 1; color: #ffe28a; }
.chalk-water, .chalk-gym { display: grid; gap: 4px; }
.glasses { display: flex; gap: 4px; }
.glasses button { width: 22px; height: 28px; padding: 0; border: 2px solid rgb(244 241 230 / 0.85); border-top-width: 0; border-radius: 0 0 6px 6px; background: none; }
.glasses button[aria-pressed='true'] { background: linear-gradient(transparent 25%, #8fd0ff 25%); }
.chalk-gym span[role='group'] { display: flex; gap: 6px; }
.chalk-gym button { padding: 1px 9px; border: 2px solid rgb(244 241 230 / 0.6); border-radius: 12px; background: none; font-size: 15px; }
.chalk-gym button[aria-pressed='true'] { border-color: #ffe28a; color: #ffe28a; }
.chalkboard button:focus-visible, .fridge-note:focus-visible, .open-note button:focus-visible { outline: 3px solid #8fd0ff; outline-offset: 2px; }
.fridge-note { position: relative; display: grid; align-content: center; gap: 4px; width: 100%; height: 100%; padding: 14px 10px 8px; border: 0; box-shadow: 0 2px 4px rgb(0 0 0 / 0.15); font-family: 'Readex Pro', system-ui, sans-serif; color: #2f3b36; cursor: pointer; }
.note-week { background: #fff3b8; transform: rotate(-2deg); }
.note-shopping { background: repeating-linear-gradient(#fdfdf8 0 21px, #bcd7ee 21px 22px); transform: rotate(2.5deg); }
.fridge-note b { font-size: 17px; font-weight: 500; }
.fridge-note small { font-size: 14px; opacity: 0.75; }
.magnet { position: absolute; top: -8px; left: 50%; width: 18px; height: 18px; margin-left: -9px; border-radius: 50%; background: #d4473a; box-shadow: inset -2px -3px 0 rgb(0 0 0 / 0.2); }
.note-shopping .magnet { background: #2f7d5b; }
.note-backdrop { position: absolute; inset: 0; display: grid; place-items: center; padding: 16px; background: rgb(31 42 38 / 0.35); }
.open-note { width: min(460px, 100%); max-height: 80%; overflow: auto; padding: 22px 22px 16px; font-family: 'Readex Pro', system-ui, sans-serif; color: #2f3b36; box-shadow: 0 18px 40px rgb(0 0 0 / 0.3); }
.open-note.note-week { transform: none; }
.open-note.note-shopping { transform: none; background: repeating-linear-gradient(#fdfdf8 0 39px, #bcd7ee 39px 40px); }
.open-note h2 { margin: 0 0 12px; font-size: 24px; font-weight: 500; }
.open-note ol, .open-note ul { display: grid; gap: 8px; margin: 0 0 14px; padding: 0; list-style: none; }
.note-week li { display: grid; gap: 2px; }
.open-note button[role='checkbox'] { min-height: 40px; padding: 4px 0; border: 0; background: none; font: inherit; color: inherit; text-align: start; cursor: pointer; }
.open-note:not(.note-habits) button[role='checkbox']::before { content: '○ '; color: #2f7d5b; }
.open-note:not(.note-habits) button[aria-checked='true'] { text-decoration: line-through; opacity: 0.55; }
.open-note:not(.note-habits) button[aria-checked='true']::before { content: '● '; }
.note-back { padding: 10px 18px; border: 0; border-radius: 999px; background: #2f7d5b; color: #fff; font: inherit; cursor: pointer; }
/* Narrow screens: Noor fills the frame, so the board and notes open from a strip of magnets. */
.magnets { position: absolute; top: max(66px, calc(env(safe-area-inset-top) + 56px)); left: 50%; display: none; gap: 8px; transform: translateX(-50%); direction: rtl; }
.magnets button { padding: 7px 12px; border: 0; border-radius: 999px; background: rgb(255 253 246 / 0.92); box-shadow: 0 2px 6px rgb(0 0 0 / 0.15); font: 500 14px 'Readex Pro', system-ui, sans-serif; color: #2f3b36; white-space: nowrap; }
.magnets button::before { content: ''; display: inline-block; width: 9px; height: 9px; margin-inline-end: 6px; border-radius: 50%; background: #d4473a; }
.magnets button:nth-child(1)::before { background: #2f7d5b; }
.magnets button:nth-child(3)::before { background: #3d8fd1; }
@media (max-width: 760px) { .magnets { display: flex; } .pin { display: none; } }
.open-note.note-habits { padding: 0; background: #2f3b36; border: 10px solid #a77b52; }
.open-note.note-habits .chalkboard { padding: 18px 20px; }
.open-note.note-habits .note-back { margin: 0 20px 18px; }
@media (prefers-reduced-motion: reduce) { .chalkboard { transition: none; } }
`;
