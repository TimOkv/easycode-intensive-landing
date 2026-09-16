/* =========================================================
   «Ключ к технологиям» — логика лендинга
   Всё, что нужно настроить перед запуском, — в CONFIG.
   ========================================================= */

const CONFIG = {
  // Вебинарная комната платформы. {lesson} заменится номером урока (1–10),
  // если для каждого урока своя комната; иначе оставьте одну ссылку.
  roomUrl: 'https://platform-easycode.ru/webinar-room?room=ROOM_ID', // TODO: реальный id комнаты

  time: '17:00',          // время эфиров, МСК
  tzOffset: '+03:00',     // Москва
  openBeforeMin: 10,      // за сколько минут до начала загорается «В эфире»
  durationMin: 90,        // TODO: длительность урока — уточнить

  // Фраза, которую клиент пишет своему персональному менеджеру.
  // Контакт менеджера на странице не публикуется: у каждого клиента он свой (MAX, ВКонтакте, Telegram).
  enrollText: 'Хочу записаться на интенсив!'
};

/* ---------- Время ---------- */
const params = new URLSearchParams(location.search);
const DEMO = params.get('demo'); // live | progress | finished — чтобы показать состояния до старта

const lessons = [...document.querySelectorAll('[data-lesson]')].map((el) => ({
  el,
  n: Number(el.dataset.lesson),
  date: el.dataset.date,
  title: el.querySelector('.lesson__title').textContent,
  dateText: el.querySelector('.lesson__date').textContent,
  start: new Date(`${el.dataset.date}T${CONFIG.time}:00${CONFIG.tzOffset}`)
}));

const MIN = 60_000;
let demoShift = 0;
if (DEMO === 'live') demoShift = lessons[0].start.getTime() + 5 * MIN - Date.now();
if (DEMO === 'progress') demoShift = lessons[4].start.getTime() - 26 * 60 * MIN - Date.now();
if (DEMO === 'finished') demoShift = lessons[9].start.getTime() + 3 * 60 * MIN - Date.now();
const now = () => new Date(Date.now() + demoShift);

function stateOf(lesson, t = now()) {
  const s = lesson.start.getTime();
  if (t < s - CONFIG.openBeforeMin * MIN) return 'soon';
  if (t < s + CONFIG.durationMin * MIN) return 'live';
  return 'done';
}

function roomLink(n) {
  return CONFIG.roomUrl.replace('{lesson}', String(n));
}

function plural(n, forms) {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b > 1 && b < 5) return forms[1];
  if (b === 1) return forms[0];
  return forms[2];
}

function openTime() {
  const [h, m] = CONFIG.time.split(':').map(Number);
  const total = h * 60 + m - CONFIG.openBeforeMin;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/* ---------- Статусы уроков ---------- */
const STATUS = {
  soon: { cls: 'pill--soon', text: 'Скоро' },
  live: { cls: 'pill--live', text: 'В эфире' },
  done: { cls: 'pill--done', text: 'Запись' }
};

function renderLessons() {
  const t = now();
  let doneCount = 0;
  let liveLesson = null;

  lessons.forEach((l) => {
    const st = stateOf(l, t);
    const pillOld = l.el.querySelector('[data-status]');
    if (pillOld.dataset.state === st) {
      if (st === 'done') doneCount++;
      if (st === 'live') liveLesson = l;
      return;
    }

    let pill;
    if (st === 'live') {
      pill = document.createElement('a');
      pill.href = roomLink(l.n);
      pill.target = '_blank';
      pill.rel = 'noopener';
      pill.innerHTML = '<span class="live-dot"></span>В эфире';
    } else {
      pill = document.createElement('span');
      pill.textContent = STATUS[st].text;
    }
    pill.className = `pill ${STATUS[st].cls}`;
    pill.dataset.status = '';
    pill.dataset.state = st;
    pillOld.replaceWith(pill);
    l.el.classList.toggle('is-live', st === 'live');

    if (st === 'done') doneCount++;
    if (st === 'live') liveLesson = l;
  });

  // Капсулы «прогрузки»
  document.querySelectorAll('[data-load] span').forEach((cap, i) => {
    const st = stateOf(lessons[i], t);
    cap.classList.toggle('is-on', st === 'done');
    cap.classList.toggle('is-live', st === 'live');
  });
  const countEl = document.querySelector('[data-load-count]');
  if (countEl) countEl.textContent = doneCount;

  // Пилюля «В эфире» в шапке
  const headerLive = document.querySelector('[data-live-link]');
  if (headerLive) {
    headerLive.hidden = !liveLesson;
    if (liveLesson) {
      headerLive.href = roomLink(liveLesson.n);
      headerLive.target = '_blank';
      headerLive.rel = 'noopener';
    }
  }
  return { liveLesson, doneCount };
}

/* ---------- Виджет «Ближайший эфир» ---------- */
const nx = {
  pill: document.querySelector('[data-next-pill]'),
  label: document.querySelector('[data-next-label]'),
  title: document.querySelector('[data-next-title]'),
  date: document.querySelector('[data-next-date]'),
  cd: document.querySelector('[data-countdown]'),
  livebox: document.querySelector('[data-next-livebox]'),
  livetext: document.querySelector('[data-next-livetext]'),
  btn: document.querySelector('[data-next-btn]'),
  hint: document.querySelector('[data-next-hint]')
};

function setBtn(btn, { cls, html, href, wait, blank }) {
  btn.className = `btn btn--block ${cls}`;
  btn.innerHTML = html;
  btn.href = href;
  if (wait) btn.setAttribute('aria-disabled', 'true'); else btn.removeAttribute('aria-disabled');
  if (blank) { btn.target = '_blank'; btn.rel = 'noopener'; } else { btn.removeAttribute('target'); }
}

function renderNext() {
  if (!nx.btn) return;
  const t = now();
  const upcoming = lessons.find((l) => stateOf(l, t) !== 'done');
  const num = (n) => String(n).padStart(2, '0');

  if (!upcoming) {
    nx.pill.className = 'pill pill--done';
    nx.pill.textContent = 'Завершён';
    nx.label.textContent = 'Интенсив завершён';
    nx.title.textContent = 'Все 10 уроков в записи';
    nx.date.textContent = 'Записи и материалы — в личном кабинете участника';
    nx.cd.hidden = true;
    nx.livebox.hidden = true;
    if (nx.btn.dataset.mode !== 'finished') {
      setBtn(nx.btn, { cls: 'btn--dark', html: 'Смотреть записи в кабинете', href: 'https://easycode-lab.ru/login' });
      nx.btn.dataset.mode = 'finished';
      nx.hint.textContent = 'Записи доступны участникам интенсива после входа в аккаунт.';
    }
    const ft = document.querySelector('[data-final-timer]');
    if (ft) ft.textContent = 'Интенсив завершён — записи доступны участникам';
    return;
  }

  const st = stateOf(upcoming, t);
  nx.title.textContent = upcoming.title;
  nx.date.textContent = upcoming.dateText;

  if (st === 'live') {
    const mins = Math.round((t - upcoming.start) / MIN);
    nx.pill.className = 'pill pill--live';
    nx.pill.innerHTML = '<span class="live-dot"></span>В эфире';
    nx.label.textContent = `Сейчас · урок ${num(upcoming.n)}`;
    nx.cd.hidden = true;
    nx.livebox.hidden = false;
    const ft = document.querySelector('[data-final-timer]');
    if (ft) ft.innerHTML = `Прямо сейчас идёт <b>урок ${num(upcoming.n)}</b>`;
    nx.livetext.textContent = mins <= 0
      ? `Комната открыта, начало через ${-mins} ${plural(-mins, ['минуту', 'минуты', 'минут'])}`
      : `Урок идёт ${mins} ${plural(mins, ['минуту', 'минуты', 'минут'])}`;
    const mode = `live-${upcoming.n}`;
    if (nx.btn.dataset.mode !== mode) {
      setBtn(nx.btn, {
        cls: 'btn--live btn--lg',
        html: '<span class="live-dot live-dot--white"></span>В эфире — войти',
        href: roomLink(upcoming.n),
        blank: true
      });
      nx.btn.dataset.mode = mode;
      nx.hint.textContent = 'Эфир закрытый: вход по аккаунту участника EasyLab. Не участник — запишитесь через менеджера.';
    }
    return;
  }

  // soon — обратный отсчёт до начала
  const diff = Math.max(0, upcoming.start - t);
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor(diff / 3_600_000) % 24;
  const m = Math.floor(diff / MIN) % 60;
  const s = Math.floor(diff / 1000) % 60;
  nx.pill.className = 'pill pill--soon';
  nx.pill.textContent = 'Скоро';
  nx.label.textContent = upcoming.n === 1 ? 'Старт интенсива · урок 01' : `Ближайший эфир · урок ${num(upcoming.n)}`;
  nx.cd.hidden = false;
  nx.livebox.hidden = true;
  const vals = { d, h, m, s };
  const forms = { d: ['день', 'дня', 'дней'], h: ['час', 'часа', 'часов'], m: ['минута', 'минуты', 'минут'], s: ['секунда', 'секунды', 'секунд'] };
  for (const k of Object.keys(vals)) {
    nx.cd.querySelector(`[data-cd="${k}"]`).textContent = String(vals[k]).padStart(2, '0');
    nx.cd.querySelector(`[data-cdl="${k}"]`).textContent = plural(vals[k], forms[k]);
  }
  if (nx.btn.dataset.mode !== 'wait') {
    setBtn(nx.btn, { cls: 'btn--wait', html: `Эфир откроется в ${openTime()}`, href: '#program', wait: true });
    nx.btn.dataset.mode = 'wait';
    nx.hint.textContent = `Кнопка «В эфире» загорится за ${CONFIG.openBeforeMin} минут до начала. Вход — по аккаунту участника EasyLab.`;
  }

  // Финальный блок
  const ft = document.querySelector('[data-final-timer]');
  if (ft) {
    if (upcoming.n === 1) ft.innerHTML = `До старта — <b>${d} ${plural(d, forms.d)} ${h} ${plural(h, forms.h)}</b>`;
    else ft.innerHTML = `Следующий урок — <b>${upcoming.dateText}</b>`;
  }
}
// Кнопка ожидания не должна прыгать по якорю
nx.btn?.addEventListener('click', (e) => {
  if (nx.btn.getAttribute('aria-disabled') === 'true') {
    e.preventDefault();
    document.getElementById('program')?.scrollIntoView({ behavior: 'smooth' });
  }
});

/* ---------- Календарь ---------- */
const cal = document.querySelector('[data-cal]');
const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const RANGE = [[2026, 8], [2026, 9]]; // сентябрь и октябрь 2026
let calIndex = 0;

function mskToday() {
  const t = new Date(now().getTime() + 3 * 3_600_000);
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`;
}

function renderCal() {
  if (!cal) return;
  const [y, m] = RANGE[calIndex];
  const grid = cal.querySelector('[data-cal-grid]');
  cal.querySelector('[data-cal-title]').textContent = `${MONTHS[m]} ${y}`;
  cal.querySelector('[data-cal-prev]').disabled = calIndex === 0;
  cal.querySelector('[data-cal-next]').disabled = calIndex === RANGE.length - 1;

  const first = new Date(Date.UTC(y, m, 1));
  const lead = (first.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const prevDays = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const today = mskToday();
  const byDate = Object.fromEntries(lessons.map((l) => [l.date, l]));
  const t = now();
  const cells = [];

  for (let i = 0; i < lead; i++) cells.push(`<span class="cal__cell cal__cell--out">${prevDays - lead + 1 + i}</span>`);
  for (let d = 1; d <= days; d++) {
    const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const l = byDate[ds];
    const todayCls = ds === today ? ' cal__cell--today' : '';
    if (l) {
      const st = stateOf(l, t);
      cells.push(`<button type="button" class="cal__cell cal__cell--lesson cal__cell--${st}${todayCls}" data-go="${l.n}" aria-label="${d} ${MONTHS[m].toLowerCase()}: урок ${l.n}, ${l.title}">${d}</button>`);
    } else {
      cells.push(`<span class="cal__cell${todayCls}">${d}</span>`);
    }
  }
  const tail = (7 - (cells.length % 7)) % 7;
  for (let i = 1; i <= tail; i++) cells.push(`<span class="cal__cell cal__cell--out">${i}</span>`);
  grid.innerHTML = cells.join('');
}

if (cal) {
  const upcoming = lessons.find((l) => stateOf(l) !== 'done') || lessons[lessons.length - 1];
  calIndex = upcoming.start.getUTCMonth() === 9 ? 1 : 0;
  cal.querySelector('[data-cal-prev]').addEventListener('click', () => { calIndex = Math.max(0, calIndex - 1); renderCal(); });
  cal.querySelector('[data-cal-next]').addEventListener('click', () => { calIndex = Math.min(RANGE.length - 1, calIndex + 1); renderCal(); });
  cal.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-go]');
    if (!btn) return;
    const target = document.getElementById(`lesson-${btn.dataset.go}`);
    target.open = true;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.classList.remove('is-flash');
    void target.offsetWidth;
    target.classList.add('is-flash');
    setTimeout(() => target.classList.remove('is-flash'), 1800);
  });
}

/* ---------- Прототип карточки урока ---------- */
const proto = document.querySelector('[data-proto]');
const PROTO_CAPTIONS = {
  soon: 'До урока: карточка показывает дату и время, квиз закрыт.',
  live: 'За 10 минут до начала карточка загорается. «В эфире — войти» ведёт в вебинарную комнату платформы.',
  done: 'После эфира: запись урока и материалы в кабинете, квиз открыт — за него начисляются XP и EasyCoins.',
  locked: 'Если зайти без аккаунта участника: платформа не пускает в комнату и предлагает войти или записаться.'
};

function setProto(state) {
  proto.dataset.state = state;
  proto.querySelectorAll('[data-proto-set]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.protoSet === state)));
  proto.querySelectorAll('[data-when]').forEach((el) => { el.hidden = !el.dataset.when.split(' ').includes(state); });
  proto.querySelector('[data-proto-caption]').textContent = PROTO_CAPTIONS[state];
}
if (proto) {
  proto.querySelectorAll('[data-room-link]').forEach((a) => { a.href = roomLink(3); });
  proto.querySelectorAll('[data-proto-set]').forEach((b) => b.addEventListener('click', () => setProto(b.dataset.protoSet)));
  setProto('soon');
}

/* ---------- Мини-квиз ---------- */
const QUIZ = [
  {
    from: 'Урок 03 · Кибербезопасность',
    q: 'Пришло сообщение: «Ваш аккаунт заблокирован! Срочно перейдите по ссылке и введите пароль». Что делать?',
    opts: [
      'Перейти по ссылке и ввести пароль, пока не поздно',
      'Не переходить: зайти в сервис самому — через официальный сайт или приложение',
      'Переслать сообщение друзьям, чтобы предупредить их'
    ],
    ok: 1,
    why: '<b>Это фишинг.</b> Срочность и просьба ввести пароль — главные признаки. Проверяй аккаунт только через официальный сайт или приложение.'
  },
  {
    from: 'Урок 02 · Работа в браузере',
    q: 'Случайно закрыл нужную вкладку. Какое сочетание клавиш её вернёт?',
    opts: ['Ctrl + W', 'Ctrl + Shift + T (на Mac — ⌘ + Shift + T)', 'Ctrl + T'],
    ok: 1,
    why: '<b>Ctrl + Shift + T</b> возвращает закрытые вкладки — можно нажимать несколько раз. Ctrl + W закрывает вкладку, а Ctrl + T открывает новую.'
  },
  {
    from: 'Урок 01 · Архитектура ПК',
    q: 'Какая деталь компьютера отвечает за обработку графики — плавную картинку в играх и быстрый рендер видео?',
    opts: ['Жёсткий диск', 'Блок питания', 'Видеокарта'],
    ok: 2,
    why: '<b>Видеокарта (GPU)</b> обрабатывает графику. Но «узким местом» может стать и процессор — как подобрать их в пару, разберём на первом уроке.'
  }
];
const XP_PER = 25;

const quizCard = document.querySelector('[data-quiz-card]');
const quizXp = document.querySelector('[data-quiz-xp]');
let qi = 0, score = 0, results = [];

function esc(s) { return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

function dots() {
  return QUIZ.map((_, i) => {
    const cls = results[i] === true ? 'is-ok' : results[i] === false ? 'is-bad' : i === qi ? 'is-cur' : '';
    return `<i class="${cls}"></i>`;
  }).join('');
}

function renderQuestion() {
  const item = QUIZ[qi];
  quizCard.innerHTML = `
    <div class="quiz__top"><p class="quiz__step">Вопрос ${qi + 1} из ${QUIZ.length}</p><div class="quiz__dots" aria-hidden="true">${dots()}</div></div>
    <p class="quiz__from">${esc(item.from)}</p>
    <p class="quiz__q">${esc(item.q)}</p>
    <div class="quiz__opts">${item.opts.map((o, i) => `<button type="button" class="quiz__opt" data-opt="${i}"><i>${'АБВ'[i]}</i><span>${esc(o)}</span></button>`).join('')}</div>
    <div data-quiz-after></div>`;
}

function answer(i) {
  const item = QUIZ[qi];
  const correct = i === item.ok;
  results[qi] = correct;
  quizCard.querySelectorAll('[data-opt]').forEach((b) => {
    const n = Number(b.dataset.opt);
    b.disabled = true;
    if (n === item.ok) b.classList.add('is-ok');
    else if (n === i) b.classList.add('is-bad');
    else b.classList.add('is-dim');
  });
  quizCard.querySelector('.quiz__dots').innerHTML = dots();
  if (correct) {
    score += XP_PER;
    quizXp.textContent = score;
    quizXp.classList.remove('is-bump'); void quizXp.offsetWidth; quizXp.classList.add('is-bump');
  }
  const last = qi === QUIZ.length - 1;
  quizCard.querySelector('[data-quiz-after]').innerHTML = `
    <p class="quiz__explain">${item.why}</p>
    <div class="quiz__foot" style="margin-top:14px">
      <span class="quiz__gain">${correct ? `+${XP_PER} XP` : 'Без XP — но теперь ты знаешь'}</span>
      <button type="button" class="btn btn--grad btn--sm" data-quiz-next>${last ? 'Результат' : 'Следующий вопрос'}</button>
    </div>`;
  quizCard.querySelector('[data-quiz-next]').focus({ preventScroll: true });
}

function renderResult() {
  const right = results.filter(Boolean).length;
  const msg = right === 3
    ? 'Отличный старт! На интенсиве таких квизов 10 — и XP уже настоящие.'
    : right === 2
      ? 'Почти идеально. Остальное разберём на эфирах — и закрепим квизом после каждого урока.'
      : 'Самое время прокачаться: всё это — темы первых уроков интенсива.';
  quizCard.innerHTML = `
    <div class="quiz__result">
      <p class="quiz__step">Результат</p>
      <p class="quiz__score">${right} из ${QUIZ.length}</p>
      <p class="chips"><span class="chip chip--xp">${score} XP</span><span class="chip chip--coin">демо-режим</span></p>
      <p>${msg}</p>
      <button type="button" class="btn btn--grad" data-enroll>Записаться на интенсив</button>
      <button type="button" class="quiz__again" data-quiz-again>Пройти ещё раз</button>
    </div>`;
}

if (quizCard) {
  renderQuestion();
  quizCard.addEventListener('click', (e) => {
    const opt = e.target.closest('[data-opt]');
    if (opt && !opt.disabled) return answer(Number(opt.dataset.opt));
    if (e.target.closest('[data-quiz-next]')) {
      if (qi === QUIZ.length - 1) return renderResult();
      qi++; renderQuestion();
      quizCard.querySelector('[data-opt]').focus({ preventScroll: true });
      return;
    }
    if (e.target.closest('[data-quiz-again]')) {
      qi = 0; score = 0; results = []; quizXp.textContent = '0'; renderQuestion();
    }
  });
}

/* ---------- Запись: через персонального менеджера ---------- */
// Ссылки на чат нет: кнопки «Записаться» показывают фразу для менеджера и дают её скопировать.
const dialog = document.getElementById('enroll');
document.querySelectorAll('[data-enroll-text]').forEach((el) => { el.textContent = CONFIG.enrollText; });

function openEnroll() {
  if (typeof dialog?.showModal === 'function') dialog.showModal();
  else document.getElementById('join')?.scrollIntoView({ behavior: 'smooth' });
}

document.addEventListener('click', async (e) => {
  if (e.target.closest('[data-enroll]')) { e.preventDefault(); openEnroll(); return; }

  const btn = e.target.closest('[data-copy]');
  if (!btn || btn.classList.contains('is-done')) return;
  try {
    await navigator.clipboard.writeText(CONFIG.enrollText);
  } catch { return; /* буфер недоступен — фраза и так видна */ }
  const icon = btn.querySelector('use');
  const label = btn.querySelector('[data-copy-label]');
  const text = label.textContent;
  btn.classList.add('is-done');
  icon.setAttribute('href', '#i-check');
  label.textContent = 'Фраза скопирована';
  setTimeout(() => {
    btn.classList.remove('is-done');
    icon.setAttribute('href', '#i-copy');
    label.textContent = text;
  }, 1800);
});
dialog?.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });

/* ---------- Липкая панель и появление блоков ---------- */
const dock = document.querySelector('[data-dock]');
const hero = document.querySelector('.hero');
const finalBlock = document.querySelector('.final');
if ('IntersectionObserver' in window) {
  let heroVisible = true, finalVisible = false;
  const syncDock = () => {
    const on = !heroVisible && !finalVisible;
    dock.classList.toggle('is-on', on);
    dock.setAttribute('aria-hidden', String(!on));
    dock.querySelector('button').tabIndex = on ? 0 : -1;
  };
  new IntersectionObserver(([en]) => { heroVisible = en.isIntersecting; syncDock(); }).observe(hero);
  new IntersectionObserver(([en]) => { finalVisible = en.isIntersecting; syncDock(); }).observe(finalBlock);

  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
  }, { rootMargin: '0px 0px -40px 0px', threshold: 0 });
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
} else {
  document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-in'));
}

/* ---------- Демо-режим ---------- */
if (DEMO) {
  const badge = document.querySelector('[data-demo-badge]');
  badge.hidden = false;
  badge.textContent = `Демо: ${{ live: 'идёт урок 01', progress: 'пройдено 4 урока', finished: 'интенсив завершён' }[DEMO] || DEMO}`;
}

/* ---------- Тик ---------- */
function tick() {
  renderLessons();
  renderNext();
}
tick();
renderCal();
setInterval(tick, 1000);
setInterval(renderCal, 60_000);
