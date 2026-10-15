/** Teaching feedback and multiple representations, sized for children on mobile. */
export const learningStyle = String.raw`
.cf-lesson-explanation { display:grid; justify-items:center; gap:6px; }
.cf-lesson-explanation p { margin:0; color:#55478d; line-height:1.5; font-weight:800; font-size:clamp(14px,1.6vw,19px); }
.cf-lesson-explanation p:last-child { font-size:clamp(13px,1.4vw,17px); font-weight:650; }
.cf-lesson-row.removed i {
  opacity:.35; background:repeating-linear-gradient(-45deg,#bba9e0,#bba9e0 4px,#ede5fb 4px,#ede5fb 8px);
  border-color:#aa96be; border-bottom-color:#9e89b8;
}
.cf-bridge,.cf-lesson-recall,.cf-lesson-success {
  width:min(100%,720px); box-sizing:border-box; display:grid; justify-items:center;
  gap:12px; padding:12px clamp(10px,3vw,26px);
  background:#ffffffbd; border:2px solid white; border-radius:24px;
  box-shadow:0 8px 20px #8878bb30; color:#433779;
}
.cf-bridge p,.cf-lesson-recall p,.cf-lesson-success p {
  font-size:clamp(17px,2.1vw,25px); text-align:center;
  font-weight:900; line-height:1.45; margin:0;
}
.cf-bridge-choices {
  display:flex; align-items:center; justify-content:center; gap:clamp(12px,3vw,27px);
  direction:ltr; padding:5px 0 10px; width:100%;
}
.cf-bridge-choices button {
  display:grid; place-items:center; width:clamp(70px,9vw,105px);
  height:clamp(66px,8vw,94px); border:3px solid #b8a9ff; border-bottom:9px solid #8572cb;
  border-radius:21px; color:#5440af; background:linear-gradient(155deg,#fff,#e5dffe);
  font-size:clamp(35px,4vw,51px); font-weight:1000;
  box-shadow:3px 8px 0 #b1a4e77a,8px 15px 19px #7569ab3d;
}
.cf-bridge-choices button:active {
  transform:translateY(5px); border-bottom-width:4px;
}
.cf-lesson-recall { width:min(100%,820px); background:#fff8; }
.cf-lesson-recall .cf-controls { width:min(100%,740px); margin:0; }
.cf-lesson-recall .cf-show-array { margin-top:5px; }
.cf-lesson-success { background:linear-gradient(135deg,#fffffff1,#ddfff1e9); }
.cf-lesson-feedback {
  max-width:610px; padding:7px 18px; margin:0;
  border:2px solid #fff; border-radius:18px; color:#7346a1;
  background:#fff7cc; font-size:clamp(14px,1.8vw,20px); font-weight:850;
  box-shadow:0 5px 14px #6f5f9a28;
}
@media(max-width:540px) {
  .cf-lesson { padding-top:175px; padding-bottom:22px; }
  .cf-lesson-demo { gap:9px; }
  .cf-bridge,.cf-lesson-recall,.cf-lesson-success { width:100%; padding:10px 6px; border-radius:18px; gap:9px; }
  .cf-bridge p,.cf-lesson-recall p,.cf-lesson-success p { font-size:16px; }
  .cf-bridge-choices button { width:75px; height:72px; font-size:36px; border-radius:16px; }
  .cf-lesson-recall .cf-controls { width:min(100%,370px); }
  .cf-lesson-feedback { font-size:14px; padding:8px; }
  .cf-lesson-explanation p { font-size:14px; }
}
@media(prefers-reduced-motion:reduce) {
  .cf-bridge-choices button { transition:none; }
}
`;
