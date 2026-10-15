/** The quiet playground lets PixiLive's Lumi hold the attention, not the decorations. */
export const cubeStyle = String.raw`
.cf-stage {
  position: relative;
  display: grid;
  grid-template-rows: minmax(98px, 29%) minmax(0, 1fr);
  height: 100%;
  width: 100%;
  overflow: hidden;
  background:
    radial-gradient(circle at 14% 23%, rgba(199,190,255,.45), transparent 28%),
    radial-gradient(circle at 88% 13%, rgba(187,240,226,.65), transparent 30%),
    linear-gradient(160deg, #f1f4ff, #fcf5ff 70%, #eefbf7);
  font-family: 'Readex Pro', system-ui, sans-serif;
  color: #3d3468;
}
.cf-avatar {
  position: relative;
  z-index: 1;
  height: 100%;
  grid-row: 1;
  pointer-events: none;
  overflow: hidden;
}
.cf-card {
  position: relative;
  z-index: 2;
  box-sizing: border-box;
  grid-row: 2;
  overflow-y: auto;
  justify-self: center;
  width: min(94%, 670px);
  min-height: 0;
  margin: 0 auto 12px;
  padding: 12px clamp(12px, 3vw, 24px) 16px;
  border: 1px solid #ded8ff;
  border-radius: 25px;
  background: rgba(255,255,255,.94);
  box-shadow: 0 12px 38px rgba(85,67,167,.13);
  color: #3d3468;
  text-align: center;
}
.cf-card button { cursor: pointer; touch-action: manipulation; font: inherit; }
.cf-card button:disabled { opacity: .42; cursor: default; }
.cf-card button:focus-visible, .cf-card input:focus-visible { outline: 3px solid #8874e7; outline-offset: 2px; }
.cf-intro {
  align-self: center;
  display: grid;
  justify-items: center;
  gap: 12px;
  padding: clamp(18px, 4vw, 32px);
}
.cf-intro h2 { font-size: clamp(21px, 3vw, 29px); margin: 0; }
.cf-intro p { max-width: 520px; margin: 0; line-height: 1.85; }
.cf-intro small { color: #7c739d; }
.cf-eyebrow { font-weight: 800; letter-spacing: .11em; color: #7866d4; font-size: 12px; }
.cf-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 14px; }
.cf-head span { color: #8277a2; }
.cf-progress { height: 6px; margin: 12px 0; border-radius: 99px; background: #ece9ff; overflow: hidden; }
.cf-progress span { display: block; height: 100%; background: #9282f2; transition: width .2s ease; }
.cf-equation { display: flex; direction: ltr; justify-content: center; align-items: center; gap: clamp(5px, 2.5vw, 20px); }
.cf-equation b { font-size: 23px; }
.cf-cube {
  display: grid;
  place-items: center;
  min-width: clamp(45px, 8vw, 67px);
  height: clamp(48px, 8vw, 66px);
  padding: 0 4px;
  border: 2px solid #c5b9ff;
  border-bottom-width: 5px;
  border-radius: 12px;
  background: #f2efff;
  color: #4d3db1;
  font-size: clamp(24px, 4vw, 35px);
  font-weight: 900;
}
.cf-mystery { border-color: #99d9c9; background: #e7faf2; color: #278b73; }
.cf-feedback { margin: 10px auto; min-height: 22px; line-height: 1.4; color: #5b4a99; font-size: 13px; }
.cf-answer { display: grid; justify-items: center; gap: 9px; }
.cf-answer label { font-size: 12px; color: #786e99; }
.cf-answer input {
  box-sizing: border-box;
  width: 128px;
  padding: 6px 12px;
  border: 2px solid #beb3f6;
  border-radius: 12px;
  background: #faf9ff;
  text-align: center;
  color: #3d3468;
  font: 800 25px system-ui, sans-serif;
}
.cf-keys { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 6px; width: min(100%, 430px); }
.cf-key, .cf-check {
  min-height: 41px;
  border: 1px solid #dcd5fd;
  border-bottom-width: 3px;
  border-radius: 11px;
  background: #f7f5ff;
  color: #423781;
  font-weight: 750;
}
.cf-key:active { background: #e7e0ff; }
.cf-erase { background: #fff3f2; }
.cf-check { grid-column: span 1; border-color: #a296ef; background: #806bd6; color: white; font-size: 12px; }
.cf-help { display: flex; justify-content: center; gap: 10px; }
.cf-help button, .cf-link { border: none; background: transparent; color: #6f58cf; text-decoration: underline; padding: 5px; font-size: 12px; }
.cf-hint { padding: 8px 10px; margin: 6px auto 10px; border-radius: 13px; background: #eefbf4; font-size: 13px; }
.cf-hint p { margin: 4px 0; line-height: 1.5; }
.cf-array {
  display: grid;
  width: fit-content;
  max-width: 100%;
  gap: 3px;
  justify-content: center;
  margin: 8px auto;
}
.cf-array i { width: clamp(8px, 1.7vw, 13px); aspect-ratio: 1; border-radius: 3px; background: #8d7be2; }
.cf-primary {
  width: min(100%, 310px);
  min-height: 44px;
  padding: 10px 20px;
  border: 0;
  border-radius: 14px;
  background: #7865d4;
  color: white;
  font-weight: 800;
}
.cf-foot { display: block; margin-top: 12px; color: #887f9e; font-size: 10px; }
@media(max-width: 760px) {
  .cf-stage { grid-template-rows: minmax(72px, 21%) minmax(0, 1fr); }
  .cf-card { width: 96%; margin-bottom: 4px; padding: 10px; border-radius: 15px; }
  .cf-equation { gap: 5px; }
  .cf-head { font-size: 12px; }
  .cf-feedback { font-size: 12px; margin: 6px 0; }
  .cf-keys { gap: 4px; }
  .cf-key, .cf-check { min-height: 36px; }
}
@media (prefers-reduced-motion: reduce) {
  .cf-progress span { transition: none; }
}
`;
