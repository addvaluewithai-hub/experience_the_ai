/** Fullscreen toy-arcade stage. The blocks ARE the game, not dashboard widgets. */
export const cubeStyle = String.raw`
.cf-stage {
  position: relative; width: 100%; height: 100%; overflow: hidden; isolation: isolate;
  font-family: 'Readex Pro', system-ui, sans-serif; color: #382558;
  background: radial-gradient(ellipse 60% 45% at 70% 13%, #fff2d3 0, transparent 78%),
    radial-gradient(ellipse 48% 48% at 12% 20%, #d5ceff 0, transparent 82%),
    radial-gradient(ellipse 62% 60% at 95% 70%, #b5e9de 0, transparent 76%),
    linear-gradient(140deg, #eef4ff 10%, #e8e2ff 59%, #aee4dc 100%);
}
.cf-stage::before {
  content: ''; position: absolute; inset: 0; z-index: 0; pointer-events: none;
  background-image: radial-gradient(#fff 1.8px, transparent 2px);
  background-size: 64px 64px; opacity: .55;
  mask-image: linear-gradient(#000a, transparent 85%);
}
.cf-stage::after {
  content:''; position:absolute; width:56vw; height:56vw; max-width:800px;
  max-height:800px; left:-18vw; bottom:-35vw; border-radius:50%; z-index:0;
  background:radial-gradient(circle,#fff9 4%,#dccbff44 60%,transparent 70%);
  pointer-events:none;
}
.cf-avatar {
  position:absolute; top:7%; right:-1%; width:clamp(270px,39vw,570px);
  height:clamp(240px,56vh,570px); z-index:1; pointer-events:none;
  filter:drop-shadow(0 30px 38px #897acb33);
}
.cf-avatar svg { width:100%; height:100%; display:block; }
.cf-arena {
  position:absolute; inset:0; z-index:2; overflow-y:auto; overflow-x:hidden;
  display:flex; flex-direction:column; align-items:center;
  padding:24px clamp(18px,4.5vw,70px) 22px; box-sizing:border-box;
}
.cf-arena button { cursor:pointer; touch-action:manipulation; font:inherit; }
.cf-arena button:disabled { cursor:default; opacity:.45; }
.cf-arena button:focus-visible, .cf-arena input:focus-visible { outline:4px solid #29b8b5; outline-offset:4px; }
.cf-hud {
  position:relative; z-index:4; display:flex; justify-content:space-between;
  align-items:center; width:100%; max-width:1450px; min-height:45px; gap:20px;
  padding-inline-start:58px; padding-inline-end:120px; direction:ltr;
}
.cf-logo { display:flex; gap:9px; align-items:center; font-weight:1000; letter-spacing:.07em; color:#45328b; font-size:clamp(16px,1.8vw,22px); }
.cf-logo-icon {
  display:grid; place-items:center; width:40px; height:40px; border-radius:14px;
  background:#8064e9; box-shadow:inset 0 3px #fff7, 0 6px #4c3992, 0 9px 20px #493b8970;
  color:#fff; font-size:28px;
}
.cf-hud-right { display:flex; gap:18px; align-items:center; direction:rtl; }
.cf-stats { font-weight:900; color:#4f35a9; font-size:24px; white-space:nowrap; }
.cf-stats small { display:block; font-weight:600; color:#786b9f; font-size:11px; }
.cf-round {
  border:2px solid #fff; background:#ffffffa6; box-shadow:0 6px 20px #6b55ac24;
  border-radius:999px; padding:9px 18px; font-weight:800; color:#7355c3;
}
.cf-intro,.cf-finish {
  z-index:3; align-self:flex-start; margin:auto auto auto 4%; width:min(66%,800px);
  padding:15px 4% 35px; text-align:center;
}
.cf-supra { font-size:clamp(14px,1.7vw,21px); font-weight:900; letter-spacing:.03em; color:#8d56cc; }
.cf-intro h2,.cf-finish h2 {
  font-size:clamp(44px,6.6vw,108px); letter-spacing:-.05em; line-height:1.15;
  font-weight:1000; color:#32206f; margin:14px auto; text-shadow:0 5px 0 #fff8;
}
.cf-intro h2 span { color:#8065e7; text-shadow:0 7px #b7a8fb9e; }
.cf-intro p,.cf-finish p { margin:18px auto 26px; font-size:clamp(17px,1.8vw,24px); line-height:1.6; max-width:640px; font-weight:650; }
.cf-intro small { display:block; margin:18px auto; font-size:15px; font-weight:600; color:#6d5c99; }
.cf-go {
  display:inline-flex; align-items:center; justify-content:center; gap:16px;
  min-width:240px; min-height:62px; padding:14px 30px; border:2px solid #a18aff;
  border-bottom:8px solid #4b3f9e; border-radius:20px; color:white;
  background:linear-gradient(155deg,#a78bfa,#6d4bdd);
  box-shadow:inset 0 3px 1px #fff8, 0 12px 28px #6d50d25c;
  font-size:clamp(19px,2.1vw,28px); font-weight:1000; transition:transform .12s;
}
.cf-go:active { transform:translateY(5px); border-bottom-width:3px; }
.cf-go span { font-size:30px; }
.cf-play {
  position:relative; width:min(100%,1070px); display:flex; flex-direction:column;
  align-items:center; gap:10px; padding-top:clamp(55px,15vh,130px);
  padding-bottom:38px; margin:auto 0 0; z-index:3;
}
.cf-status { width:min(100%,790px); display:flex; justify-content:space-between; direction:ltr; font-size:13px; font-weight:900; color:#7162b3; letter-spacing:.09em; }
.cf-equation {
  display:flex; justify-content:center; align-items:center; gap:clamp(10px,1.7vw,26px);
  width:100%; direction:ltr; perspective:1100px; padding:19px 10px 22px;
}
.cf-big-cube {
  position:relative; display:grid; place-items:center; flex:none;
  width:clamp(70px,9.5vw,135px); height:clamp(76px,10vw,146px);
  border:3px solid #ad9bff; border-bottom:9px solid #7c66c9;
  border-radius:24px; box-sizing:border-box;
  color:#5635b4; background:linear-gradient(135deg,#fff,#e7e1ff 70%,#d0c2ff);
  font:1000 clamp(40px,6vw,89px)/1 system-ui, sans-serif;
  text-shadow:0 3px 0 #fff;
  box-shadow:inset 3px 4px 0 #fff9, inset -7px -8px 0 #aa94fd24,
    4px 9px 0 #a596e1, 7px 16px 0 #8072b8, 13px 26px 30px #54428d55;
  transform:rotateY(-8deg) rotateX(5deg) rotateZ(-3deg);
}
.cf-second { transform:rotateY(6deg) rotateX(6deg) rotateZ(3deg); }
.cf-answer-cube {
  color:#24967f; background:linear-gradient(145deg,#fff,#e0fff6 75%,#acf1d9);
  border-color:#74d8c5; border-bottom-color:#34a897;
  box-shadow:inset 3px 4px 0 #fff9, 4px 9px 0 #7bc9b6, 7px 16px 0 #4c9e93, 13px 26px 30px #357f7b55;
}
.cf-revealed { animation:cf-pop .35s ease-out; }
.cf-operator { font:1000 clamp(30px,4.6vw,60px)/1 system-ui; color:#504198; text-shadow:2px 4px 1px #fff; }
.cf-reaction {
  min-height:30px; margin:0 auto 4px; text-align:center; font-size:clamp(16px,1.8vw,22px);
  color:#59499f; font-weight:900; text-shadow:0 2px 1px #fff;
}
.cf-controls {
  width:min(100%,770px); display:grid; grid-template-columns:140px minmax(310px,1fr) 124px;
  gap:18px; align-items:center; justify-items:center; direction:rtl; margin-top:4px;
}
.cf-input-label { display:none; }
.cf-number-input {
  box-sizing:border-box; grid-column:1; width:132px; height:104px; text-align:center;
  border:3px solid #fff; border-bottom:9px solid #9179d7; border-radius:24px;
  color:#553db8; background:linear-gradient(140deg,#fff,#f4efff);
  box-shadow:inset 0 4px #fff, 4px 9px 0 #b7a7e6, 8px 18px 22px #7765b543;
  font:1000 57px system-ui; outline:0;
}
.cf-number-input::placeholder { color:#a595dc; }
.cf-keypad {
  grid-column:2; display:grid; grid-template-columns:repeat(5,minmax(0,1fr));
  width:100%; gap:9px; direction:ltr;
}
.cf-key {
  height:clamp(55px,7.5vh,73px); border:2px solid #c6bafd; border-bottom:7px solid #a195df;
  border-radius:16px; background:linear-gradient(155deg,#fff,#edeaff);
  box-shadow:inset 1px 3px #fff, 2px 5px 0 #d1c8ef, 4px 9px 9px #7668af2f;
  color:#5542a6; font:900 clamp(24px,3vw,36px) system-ui; transition:transform .12s;
}
.cf-key:active { transform:translateY(4px); border-bottom-width:3px; }
.cf-entry-actions { grid-column:3; display:flex; flex-direction:column; gap:12px; width:100%; }
.cf-backspace,.cf-submit {
  min-height:69px; padding:8px; border-radius:17px; border:2px solid #fff;
  font-size:18px; font-weight:900; box-shadow:0 7px 0 #a89bd7,0 12px 20px #7770ab42;
}
.cf-backspace { color:#6958af; background:#f6f1ff; }
.cf-submit { color:white; background:linear-gradient(160deg,#8bd8cb,#36ab9b); box-shadow:0 7px 0 #318b80,0 13px 24px #368f8954; }
.cf-backspace span,.cf-submit span { display:block; font-size:12px; }
.cf-help-actions { display:flex; gap:20px; align-items:center; justify-content:center; }
.cf-help-actions button,.cf-show-array {
  border:0; border-radius:999px; padding:10px 20px; color:#6552ad; font-size:15px; font-weight:800;
  background:#ffffffaa; box-shadow:0 5px 13px #7968bb29;
}
.cf-help-actions button:first-child { background:#fff2b8; color:#72542a; }
.cf-help-panel {
  width:min(100%,640px); box-sizing:border-box; padding:13px 22px; border:2px solid #fff;
  border-radius:24px; background:linear-gradient(145deg,#ffffffec,#e7fdf3f0);
  box-shadow:0 9px 0 #80c1b57a, 0 17px 36px #4d8f8950;
  text-align:center; color:#255c60; animation:cf-pop .25s ease-out;
}
.cf-hint-title { font-weight:1000; font-size:17px; }
.cf-help-panel p { font-weight:850; font-size:clamp(16px,1.8vw,21px); line-height:1.5; margin:5px auto; }
.cf-show-array { color:#2c756f; font-size:14px; background:#d6fff0; }
.cf-array { display:grid; gap:4px; width:fit-content; margin:10px auto; }
.cf-array i { display:block; width:clamp(10px,1.2vw,16px); aspect-ratio:1; border-radius:5px; border-bottom:3px solid #7762b9; background:#b7a8ef; box-shadow:1px 2px #fff inset; }
.cf-done-actions { margin:28px auto 20px; }
.cf-finish .cf-medal { width:120px; height:120px; display:grid; place-items:center; font-size:84px; color:#fff; background:linear-gradient(#ffe89c,#ffb865); border:7px solid #fff; border-radius:50%; margin:0 auto; box-shadow:0 13px 0 #da9f5b,0 23px 38px #a1735270; }
.cf-finish strong { display:block; color:#5b43c6; font-size:clamp(55px,8vw,110px); line-height:1; }
.cf-finish strong small { font-size:36px; color:#8d7dba; }
.cf-floor { position:absolute; width:85%; height:15%; bottom:-10%; left:8%; border-radius:50%; background:radial-gradient(ellipse,#8b79dc57,transparent 70%); pointer-events:none; }
.cf-floor span { position:absolute; width:12%; height:25%; border-radius:50%; background:#fff7; filter:blur(20px); }
.cf-floor span:nth-child(1){left:12%;top:10%} .cf-floor span:nth-child(2){left:50%;top:-40%} .cf-floor span:nth-child(3){right:8%;top:10%}
.immersive:has([data-world="cube-flight"]) .immersive-bottom {
  bottom:auto; top:14px; left:18px; right:auto; padding:0; width:auto;
  align-items:flex-start; gap:8px; z-index:10;
}
.immersive:has([data-world="cube-flight"]) .immersive-controls { gap:6px; }
.immersive:has([data-world="cube-flight"]) .immersive-begin {
  padding:9px 13px; border-radius:14px; font-size:13px; box-shadow:none;
  animation:none; background:#ffffffd9; color:#6e59b8;
}
.immersive:has([data-world="cube-flight"]) .round { width:42px; height:42px; font-size:17px; color:#6251a3; background:#ffffffd9; }
.immersive:has([data-world="cube-flight"]) .caption { background:#ffffffee; color:#47358c; text-shadow:none; font-size:14px; }
.immersive:has([data-world="cube-flight"]) .immersive-captions {
  position:absolute; left:0; top:52px; width:min(330px,75vw); max-height:110px; overflow:auto;
}
@keyframes cf-pop { from{opacity:.4;transform:scale(.88)} to{opacity:1;transform:scale(1)} }
@media(max-width:850px) {
  .cf-avatar { top:6%; right:-15%; width:clamp(220px,54vw,460px); height:38vh; }
  .cf-hud { padding-inline-start:60px; padding-inline-end:60px; gap:8px; }
  .cf-stats small { display:none; }
  .cf-logo { font-size:15px; } .cf-logo-icon { width:31px;height:31px;font-size:22px; }
  .cf-intro,.cf-finish { align-self:center; width:min(94%,630px); padding-top:17vh; margin:auto; }
  .cf-play { padding-top:clamp(90px,19vh,160px); }
  .cf-controls { grid-template-columns:110px minmax(250px,1fr) 90px; gap:9px; }
  .cf-number-input { width:100px; height:88px; font-size:45px; }
  .cf-backspace,.cf-submit { min-height:65px;font-size:14px; }
}
@media(max-width:540px) {
  .cf-arena { padding:12px 8px 16px; }
  .cf-hud { padding-inline-start:58px; padding-inline-end:54px; min-height:37px; }
  .cf-logo { font-size:12px; gap:5px; } .cf-logo-icon { width:27px;height:27px;font-size:18px;border-radius:8px; }
  .cf-round { padding:6px 9px;font-size:12px; }
  .cf-stats { font-size:17px; }
  .cf-avatar { width:260px; height:235px; right:-45px; top:38px; opacity:.96; }
  .cf-intro,.cf-finish { width:96%; padding:200px 8px 40px; margin:0 auto; }
  .cf-intro h2,.cf-finish h2 { font-size:clamp(40px,10vw,64px); }
  .cf-intro p,.cf-finish p { font-size:18px; }
  .cf-play { padding-top:195px; margin:0 auto; gap:8px; padding-bottom:80px; }
  .cf-status { font-size:11px; padding:0 8px; box-sizing:border-box; }
  .cf-equation { gap:8px; padding:14px 4px 18px; box-sizing:border-box; }
  .cf-big-cube { width:clamp(60px,17vw,83px); height:clamp(68px,19vw,87px);
    border-radius:15px; border-bottom-width:6px; font-size:clamp(37px,10vw,52px);
    box-shadow:inset 2px 3px #fff9,3px 5px #a596e1,5px 11px 13px #54428d4d; }
  .cf-answer-cube { box-shadow:inset 2px 3px #fff9,3px 5px #7bc9b6,5px 11px 13px #357f7b55; }
  .cf-operator { font-size:26px; }
  .cf-reaction { font-size:16px; min-height:26px; }
  .cf-controls { width:min(100%,380px); grid-template-columns:86px 1fr; gap:9px; }
  .cf-number-input { grid-column:1; grid-row:1; width:82px; height:76px; font-size:40px; border-radius:14px; }
  .cf-keypad { grid-column:1 / -1; grid-row:2; gap:7px; }
  .cf-key { height:53px; border-radius:12px;font-size:27px; }
  .cf-entry-actions { grid-column:2;grid-row:1;flex-direction:row;gap:10px; }
  .cf-backspace,.cf-submit { width:50%;min-height:65px;font-size:19px;border-radius:14px; }
  .cf-help-actions button { padding:10px 16px; }
  .cf-help-panel { padding:10px;border-radius:15px; }
  .cf-hint-title { font-size:14px; } .cf-help-panel p { font-size:15px; }
  .immersive:has([data-world="cube-flight"]) .immersive-bottom { top:58px;left:12px; }
  .immersive:has([data-world="cube-flight"]) .immersive-begin { font-size:12px; padding:8px; }
  .immersive:has([data-world="cube-flight"]) .round { width:34px;height:34px; }
}
@media(prefers-reduced-motion:reduce) {
  .cf-go,.cf-key,.cf-revealed,.cf-help-panel { animation:none;transition:none; }
}
`;
