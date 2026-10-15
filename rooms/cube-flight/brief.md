# 🧊 رحلة المكعبات — Cube Flight

## اتفقنا على

- **الطفلة:** 8 سنين، فاهمة الـ arrays وبتعرف تحسب حتى 12×12؛ محتاجة تتحول من الحساب لاسترجاع الناتج فورًا.
- **الشكل:** لعبة immersive fullscreen بأسلوب toy/arcade، مكعبات شبه 3D كبيرة بإضاءات وأعماق وتفاعل واضح. لومي تطير جوا عالم اللعب. لا شات جانبي ولا dashboard ولا نبرة أصغر من عمر الطفلة.
- **الهدف:** الاسترجاع من الذاكرة بعد فاصل وبعد أيام، مش مجرد نجاح في سؤال سريع.
- **لومي:** رفيقة لعب مصرية لطيفة، تحييها، تطير وتحتفل بعد الإجابة، تسمعها لو الصوت متاح. لا تمتحنها ولا تدّعي إنها قيمت الإجابة.
- **اللعب:** أربعة حقائق ضرب مختلفة، ثلاث محاولات لكل حقيقة متداخلة بأسئلة فاصلة. الإدخال بمكعبات رقمية، وتلميح تدريجي باستخدام عمليات معروفة، وإظهار الإجابة عند الحاجة.
- **التقييم:** كل إجابة غير مساعدة تتسجل بشكل منفصل. مراجعة نفس اليوم لا تُرفع مستوى الإتقان عبر أيام؛ الصحيح بمساعدة لا يُحسب استرجاعًا مستقلًا.
- **الذاكرة:** سجل لكل عملية غير مرتبة (8×9 و9×8 نفس الحقيقة)، يحفظ آخر يوم، الموعد القادم، مستوى المراجعة، ومحاولات مستقلة.
- **حدود:** مفيش عقوبة أو مؤقت قسري؛ الصوت اختياري عشان ما يعطلش اللعب. لا جمع لبيانات شخصية.

## قرارات وليه

- Room مستقلة بدل ما ندخل على وادي قوس قزح ونغيّر عالم ليلى؛ نقدر نربطها بعدين لو احتجنا.
- تجربة immersive بلا `dock`، والصوت/الكتابة الاختيارية يظهروا في Overlay صغير فوق عالم اللعب لا في عمود جانبي.
- التصحيح والجدولة حتميين في كود الغرفة، مش في النموذج.
- شخصية لومي كاملة من `pixilive` (`feat/character-engine`): SVG master، recipe engine، geometry، flight وmotion. كل الملفات متجمعة محليًا في `rooms/cube-flight/character/` ومش مربوطة بواجهات PixiLive أو بمكالمتها.
- المقارنة بين `a×b` و`b×a` للتنوع، لكن تقدم الذاكرة واحد.
- أدوات لومي داخل الـ World: `fly_to`, `cheer`, `show_hint`, `reveal_array`, `advance`. تتصل بحالة اللعبة بأحداث آمنة ولا تستطيع إرسال ناتج نيابة عن الطفلة أو تجاوز التقييم.
- واجهة اللعب بأرقام ضخمة ومكعبات مزودة بظلال وحواف وإحساس ضغط حقيقي، وتبقى المفاهيم التعليمية في الخلفية؛ بدون card dashboard.

## حدود النسخة الأولى

- الغرفة بتستخدم **localStorage فقط** لأسماء الدلع المختارة طوعًا وسجل حقائق الضرب؛ التقدم يبقى بعد Refresh في نفس المتصفح والجهاز، لكن مش متزامن بين الأجهزة، وممكن يتمسح مع بيانات المتصفح. الحفظ السحابي والحسابات غير موجودين.
- المواعيد `1 / 3 / 7 / 14` يوم فرضية أولية قابلة للاختبار وليست معيارًا مضمونًا.
- تأخير الشبكة أو تعطل Gemini لا يوقف اللعبة؛ لومي بتتحرك بدون صوت.
- لا إشعارات أو حسابات أو analytics عن الأطفال.

## طلبات للمحرك

1. **حفظ دائم وبصلاحيات واضحة** لسجلات `facts` كي تعمل المراجعة في أيام لاحقة، واختبارها في نفس المتصفح وعلى جهاز آخر بعد تسجيل الدخول.
2. **اتنفذ:** سطح الـ Room يقدر يصدر `onGameEvent` لأحداث بدأ اللعب، اختيار الأرقام، الحل، التلميح، والأسئلة الراجعة. التطبيق يوصل الحدث بجلسة Gemini Live المفتوحة ويعطي لومي context بعد تصحيح الكود، مع إبقاء الميكروفون اختياريًا؛ لازم اختبار الكلام الحقيقي بمفتاح Live.

## فحوص مطلوبة

- `npm run rooms` و`npm run check` و`npm test` و`npm run build`.
- اختبار متصفح حقيقي على شاشة موبايل مع صوت مقفول، ثم Gemini متصل إن توفر المفتاح.
- القياس مع الأب: قبل وبعد أسبوعين، من غير تلميح وبعد أيام مختلفة.

## الجلسات

- 2026-10-15: نسخة أولى من التعلم، ثم تجربة متصفح كشفت مشكلة runtime في الشكل السابق.
- 2026-10-15: مراجعة UI بناءً على تعليق الأب: استبدال الـ dock بساحة لعب immersive، إعادة تصميم مكعبات 3D، توصيل world tools بلومي، وتحسين نبرة الكلام. اختبار المتصفح وإكمال الحفظ الدائم مطلوبان.

## مصدر الشخصية

- المصدر: https://github.com/addvaluewithai-hub/pixilive/tree/feat/character-engine
- تم نسخ `master.svg`, `geometry.js`, `engine.js`, `flight.js`, `motion.js` من نفس البرانش في 2026-10-15، لا نسخ للشخصيات الأخرى ولا للخادم.
- المشروعان ضمن مستودعات المالك الخاصة؛ إعادة استخدام داخلية. لو هننشر كمكتبة عامة لازم مراجعة الحقوق والترخيص أولًا.

## مراجعة تجربة لومي والصوت — 2026-10-15

- **زرار واحد:** «ابدئي مع لومي» يبدأ جولة المكعبات ويفتح Gemini Live من نفس الـ tap إن كان متاحًا؛ عند رفض المايك تفضل اللعبة شغالة وتظهر محاولة إعادة وصل صغيرة.
- **شخصية مش شات:** مفيش chat dock، caption/transcript، Home icon، NEW CUBE أو CHALLENGE badges. الـ progress دوائر صغيرة، والصوت عناصر تحكم بسيطة بعد بداية اللعب.
- **فهم حقيقي:** اللعبة تبعت اختيار المكعبات بشكل صامت، وترسل الإجابة المتحقق منها لومي لتعلّق بصوت مصري قصير. في الخطأ تطرح رابطة حسابية بدل قول الناتج فورًا. التصحيح والإتقان مش متاح تعديلهم عن طريق AI.
- **أدوات فعلية:** fly_to, cheer, show_hint, reveal_array, advance, remember_player, name_companion. الأسماء اختيارية وتتحفظ في localStorage، واسم لومي المتغير يظهر بخفة تحت الشخصية الأصلية.
- **خصوصية:** ما بنتطلبش عنوان أو مدرسة أو اسم قانوني. أسماء الدلع اختياريّة؛ أي بيانات صوتية في جلسة Gemini Live تُرسل لموفر الصوت فقط عند بدء المكالمة. لا analytics للأطفال.
- **موبايل:** شاشة لمس 390 × 844 ممتحنة في اختبار المتصفح، مع قياس overflow وحجم المكعبات والأزرار؛ يجب تأكيد نتيجة CI قبل الدمج.

## Daily Table — Learn → Recall → Mix → Revisit

- الطفل يختار جدول اليوم من 2–12 على شاشة البداية؛ المحرك يرشح جدول 2 في أول مرة، ثم الجدول التالي بعد 3 حقائق متدربة، مع حرية اختيار أي جدول يدويًا.
- قبل السؤال، لومي تعرّف **3 عمليات** من جدول اليوم: أرقام كبيرة والناتج مكشوف والمجموعات مرسومة بالمكعبات، مع رابط ×5/×10 أو مجموعة زيادة/نقص.
- كل خطوة تعليم لها زر انتقال ولا تسجل نجاحًا أو محاولة محفوظة. أول زر «ابدئي مع لومي» يبدأ اللعب والصوت معًا؛ لا شات على جنب.
- بعد 3 خطوات يختفي الناتج والمجموعات وتبدأ اختبارات الاسترجاع المتداخلة؛ 3 محاولات متباعدة لكل حقيقة. لو جدول سابق فيه مراجعة مستحقة تدخل حقيقة واحدة في الخلط.
- الإجابة المستقلة الموثوقة من كود اللعبة فقط هي التي تزود progress؛ التعلم/التلميح لا يحتسبا إتقانًا.
- العالم يرسل أحداث `teach` و`lesson_complete` و`question` للشخصية؛ لومي تحكي الرابط قبل السؤال، ثم تتوقف عن كشف النتيجة وقت اللعب.
- موبايل: جدول اليوم في شريط مكعبات أفقي قابل للتمرير، ومجموعات الدرس داخل صندوق صغير قابل للتمرير، مع لوحة الأرقام الكبيرة المعتادة.

## Learning upgrade: no more skipping after viewing worked examples

Based on the IES What Works Clearinghouse practice guides on explicit representations,
interleaving guided and independent work, retrieval practice, and spaced reviews:

- **Model / See:** Lumi shows a true multiplication fact and physically grouped cubes.
  Where helpful, link it to x5, x10, or one extra/subtracted group.
- **Connect / Think:** the child answers an independent _group-count_ question (for
  example, from 3×5 to 3×7, how many groups do we add?). The app, not Gemini,
  verifies the choice. Wrong answer => show which groups matter, retry; no Next.
- **Cover / Recall:** both array and result are hidden; the child uses the big
  number pad to recall the product. A wrong answer or optional help returns
  safely to the model explanation, rather than rushing into the next fact.
- **Celebrate / Pause:** after a verified right answer in the teaching phase,
  Lumi celebrates, then the child presses Next herself. Gemini tools cannot
  skip the teaching stages or submit the answer.
- **Practice / Mix / Revisit:** only later unassisted verified recall updates
  the saved memory record. Facts recur between others in the session and
  are scheduled across days.
- The **suggested** next multiplication table now waits until all 11
  associated products (2..12) have demonstrated independent recall on
  two distinct calendar dates. The child can still manually choose any table.
- Short, meaningful natural Egyptian-Arabic AI coaching is triggered by
  each trusted learning-stage outcome. The core learning process still works
  without the live voice connection.
- Avoid timers and punishment. Mistakes trigger instruction, not shame.
- This remains a design for practicing fluency, not an empirically validated
  claim that the child has mastered every multiplication fact.
