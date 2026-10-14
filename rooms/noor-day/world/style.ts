/** The board's own style, carried as text so the room needs no stylesheet loader. */
export const boardStyle = String.raw`
@import url('https://fonts.googleapis.com/css2?family=Readex+Pro:wght@300;400;600&display=swap');

/* Esraa's day on a fridge door: pale enamel, pine ink, the colours of her vegetables. */
.board {
  --enamel: #e3ece7;
  --ink: #1f3a33;
  --leaf: #2f7d5b;
  --carrot: #ef8a2b;
  --pepper: #d4473a;
  --water: #3d8fd1;
  --paper: #fffdf6;
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(220px, 0.8fr);
  grid-template-areas: 'head head' 'today shopping' 'plan plan';
  gap: 22px 28px;
  min-height: 100%;
  padding: clamp(16px, 4vw, 44px);
  background:
    linear-gradient(90deg, transparent 0 calc(100% - 14px), rgb(0 0 0 / 0.05) calc(100% - 14px)),
    var(--enamel);
  color: var(--ink);
  font-family: 'Readex Pro', system-ui, sans-serif;
  font-weight: 300;
}
.board[data-frame='panel'] {
  border-radius: 18px;
}
.board h2 {
  margin: 0 0 12px;
  font-size: 18px;
  font-weight: 600;
}
.board-head {
  grid-area: head;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 4px 16px;
  padding-top: 6px;
}
.board-head h2 {
  margin: 0;
  font-size: clamp(28px, 5vw, 44px);
  font-weight: 600;
  letter-spacing: -0.01em;
}
.board-head p {
  margin: 0;
  opacity: 0.75;
}
.today {
  grid-area: today;
  display: flex;
  gap: 24px;
  align-items: flex-start;
}
.plan {
  grid-area: plan;
}
.shopping {
  grid-area: shopping;
}
.board section {
  border-radius: 6px;
  transition: box-shadow 0.4s;
}
.board section[data-lit='true'] {
  box-shadow: 0 0 0 4px rgb(47 125 91 / 0.35);
}
.board button {
  font: inherit;
  color: inherit;
  cursor: pointer;
}
.board button:focus-visible {
  outline: 3px solid var(--water);
  outline-offset: 2px;
}

/* The glass: the one bold thing. */
.glass {
  display: grid;
  justify-items: center;
  gap: 8px;
  margin: 0;
}
.glass svg {
  width: clamp(96px, 16vw, 130px);
  overflow: visible;
}
.glass-water {
  fill: var(--water);
  opacity: 0.85;
  transition: transform 0.9s cubic-bezier(0.3, 1.3, 0.5, 1);
}
.glass-rim {
  fill: rgb(255 255 255 / 0.35);
  stroke: var(--ink);
  stroke-width: 2.5;
}
.glass line {
  stroke: var(--ink);
  stroke-width: 1.5;
  opacity: 0.35;
}
.glass figcaption strong {
  font-size: 26px;
  font-weight: 600;
  color: var(--water);
}
.glass-buttons {
  display: flex;
  gap: 6px;
}
.glass-buttons button {
  padding: 8px 14px;
  border: 0;
  border-radius: 999px;
  background: var(--water);
  color: #fff;
}
.glass-buttons .glass-less {
  background: transparent;
  color: var(--ink);
  border: 1px solid rgb(31 58 51 / 0.3);
}

/* Habits: notes held by magnets, each magnet a vegetable colour. */
.habits {
  display: grid;
  flex: 1;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.habit {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 14px;
  padding: 12px 16px 12px 14px;
  background: var(--paper);
  box-shadow: 0 1px 0 rgb(31 58 51 / 0.12);
}
.habit:nth-child(2) {
  margin-inline-start: 18px;
}
.habit:nth-child(4) {
  margin-inline-start: 8px;
}
.magnet {
  position: absolute;
  top: -7px;
  inset-inline-start: 16px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--leaf);
  box-shadow: inset -2px -3px 0 rgb(0 0 0 / 0.18);
}
.habit-breakfast .magnet {
  background: var(--carrot);
}
.habit-gym .magnet {
  background: var(--pepper);
}
.habit-kitchen .magnet {
  background: var(--ink);
}
.habit-name {
  display: grid;
  flex: 1;
  min-width: 9em;
  font-weight: 400;
}
.habit-name small {
  font-weight: 300;
  opacity: 0.65;
}
.habit > button,
.steps button {
  padding: 6px 14px;
  border: 1px solid rgb(31 58 51 / 0.25);
  border-radius: 999px;
  background: transparent;
}
.habit button[aria-pressed='true'],
.steps button[aria-pressed='true'] {
  background: var(--leaf);
  border-color: var(--leaf);
  color: #fff;
}
.steps {
  display: flex;
  gap: 4px;
}

/* The week: a strip of seven days along the bottom of the door. */
.week {
  display: grid;
  grid-template-columns: repeat(7, minmax(120px, 1fr));
  gap: 8px;
  margin: 0;
  padding: 0 0 6px;
  overflow-x: auto;
  list-style: none;
}
.week li {
  display: grid;
  align-content: start;
  gap: 6px;
  min-height: 96px;
  padding: 10px;
  border-top: 3px solid rgb(31 58 51 / 0.18);
  background: rgb(255 253 246 / 0.6);
}
.week .week-today {
  border-top-color: var(--carrot);
  background: var(--paper);
}
.week h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}
.meal {
  display: grid;
  padding: 4px 0;
  border: 0;
  background: none;
  text-align: start;
}
.meal small {
  opacity: 0.6;
}
.meal[aria-pressed='true'] {
  text-decoration: line-through;
  opacity: 0.55;
}

/* Shopping: a lined notepad. */
.notepad {
  margin: 0;
  padding: 8px 16px;
  list-style: none;
  background:
    repeating-linear-gradient(var(--paper) 0 35px, rgb(61 143 209 / 0.25) 35px 36px), var(--paper);
}
.notepad button {
  width: 100%;
  min-height: 36px;
  border: 0;
  background: none;
  text-align: start;
}
.notepad button[aria-pressed='true'] {
  text-decoration: line-through;
  opacity: 0.5;
}
.board-empty {
  margin: 0 0 10px;
  opacity: 0.7;
}

@media (max-width: 760px) {
  .board {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas: 'head' 'today' 'plan' 'shopping';
  }
  .today {
    flex-direction: column;
    align-items: stretch;
  }
  .habit:nth-child(n) {
    margin-inline-start: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .glass-water,
  .board section {
    transition: none;
  }
}
`;
