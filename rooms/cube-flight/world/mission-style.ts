/** Short teach-first mission in the same chunky 3D arcade world. */
export const missionStyle = String.raw`
.cf-tables {
  width:min(100%,640px); display:grid; justify-items:center; gap:10px;
  padding:12px 10px 16px; margin:4px auto;
  background:#ffffffaa; border:2px solid #fff;
  border-radius:24px; box-shadow:0 8px 26px #8b77cd29;
}
.cf-table-heading { font-size:clamp(17px,2vw,24px); font-weight:900; color:#553caa; }
.cf-table-heading small { display:inline-block; font-size:13px; margin-inline-start:12px; color:#3e9a86; }
.cf-table-picker {
  display:flex; gap:9px; max-width:100%; overflow-x:auto;
  overscroll-behavior-inline:contain; padding:8px 12px 15px;
  scrollbar-width:thin; scrollbar-color:#c8b9fa transparent; direction:ltr;
}
.cf-table-tile {
  flex:none; display:grid; place-items:center;
  width:clamp(44px,5vw,64px); height:clamp(50px,5.5vw,69px);
  border:2px solid #bcaeff; border-bottom:7px solid #9d8dd8;
  border-radius:17px; background:linear-gradient(150deg,#fff,#e6e1ff);
  color:#583cad; font-weight:1000; font-size:clamp(22px,2.6vw,34px);
  box-shadow:2px 5px #b5a5e877; transition:transform .16s;
}
.cf-table-tile.selected {
  transform:translateY(-5px); color:white; border-color:#bcb0ff;
  background:linear-gradient(150deg,#ae9af9,#765ce5);
  border-bottom-color:#4e409c; box-shadow:0 10px 24px #7e63d972;
}
.cf-lesson {
  position:relative; z-index:3; display:flex; flex-direction:column;
  align-items:center; justify-content:center; gap:16px;
  width:min(100%,880px); margin:auto 0 0;
  padding:clamp(130px,20vh,220px) 10px 30px;
  box-sizing:border-box; text-align:center;
}
.cf-lesson-kicker {
  color:#6042b0; font-size:clamp(17px,2.3vw,26px); font-weight:1000;
  text-shadow:0 2px 0 white;
}
.cf-teach-equation { padding:5px 12px 16px; }
.cf-lesson-demo {
  width:min(95%,620px); display:grid; justify-items:center; gap:14px;
  padding:16px 20px 19px; border:3px solid white; border-bottom:9px solid #9dc8c4;
  border-radius:28px; box-sizing:border-box;
  background:linear-gradient(148deg,#fffeffed,#e1f9f0ed);
  box-shadow:0 13px 30px #608f9360;
}
.cf-lesson-grid { display:flex; flex-direction:column; gap:5px; align-items:center; max-height:220px; overflow:auto; width:100%; }
.cf-lesson-row {
  display:grid; gap:clamp(2px,.55vw,5px); width:min(95%,320px);
  justify-content:center;
}
.cf-lesson-row i {
  display:block; height:clamp(9px,2.2vw,17px); min-width:0;
  background:linear-gradient(155deg,#dcd6ff,#8d77e9);
  border:1px solid #9c88df; border-bottom:3px solid #6758b0;
  border-radius:5px; box-shadow:1px 2px #fff9 inset;
}
.cf-lesson-row.extra i {
  background:linear-gradient(155deg,#cbfff1,#57c5aa);
  border-color:#66bbaa; border-bottom-color:#2f987c;
}
.cf-lesson-anchor {
  font-size:clamp(16px,2vw,23px); font-weight:900; color:#4b5087;
  line-height:1.5; margin:0;
}
.cf-lesson-next { min-width:min(100%,335px); font-size:clamp(16px,2vw,24px); }
@media(max-width:850px) {
  .cf-intro { padding-top:15vh; }
  .cf-intro h2 { font-size:clamp(38px,5vw,70px); }
  .cf-lesson { padding-top:150px; gap:10px; }
}
@media(max-width:540px) {
  .cf-intro { padding:170px 6px 24px; margin:0 auto; }
  .cf-intro h2 { font-size:clamp(37px,9vw,56px); margin:4px auto; }
  .cf-intro p { margin:8px auto; font-size:16px; line-height:1.45; }
  .cf-intro small { margin:8px auto; font-size:12px; }
  .cf-tables { width:97%; border-radius:17px; gap:5px; padding:8px 5px; }
  .cf-table-heading { font-size:17px; }
  .cf-table-heading small { font-size:11px; }
  .cf-table-picker { gap:6px; padding:6px 7px 10px; }
  .cf-table-tile { width:45px; height:50px; font-size:23px; border-radius:12px; border-bottom-width:5px; }
  .cf-intro .cf-go { min-height:52px; font-size:19px; }
  .cf-lesson { padding-top:170px; margin:0 auto; width:100%; gap:9px; padding-bottom:40px; }
  .cf-lesson-kicker { font-size:18px; }
  .cf-lesson-demo { padding:12px 10px; gap:7px; border-radius:18px; }
  .cf-lesson-grid { max-height:180px; }
  .cf-lesson-row { gap:3px; }
  .cf-lesson-row i { height:10px; border-radius:3px; border-bottom-width:2px; }
  .cf-lesson-anchor { font-size:15px; }
  .cf-lesson-next { min-height:52px; font-size:17px; }
}
@media(prefers-reduced-motion:reduce) { .cf-table-tile { transition:none; } }
`;
