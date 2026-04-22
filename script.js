const DATA_URL = './data/friendship_wrapped_data.json';
const ACTUAL_WRMS_DONE = 86;
const BIRTHDAY_NAME = 'Julian';

const state = {
  data: null,
  stories: [],
  activeStoryIndex: 0,
  activeSlideIndex: 0,
  prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  touchStartX: 0,
  quizSelections: {},
};

const els = {};

document.addEventListener('DOMContentLoaded', init);

async function init() {
  cacheElements();
  bindUI();
  updateOrientationGuard();

  try {
    const response = await fetch(DATA_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    state.data = data;
    state.stories = buildStories(data);
    renderHome();
    els.loadingScreen.classList.add('hidden');
    els.app.classList.remove('app--loading');
  } catch (error) {
    console.error(error);
    els.loadingScreen.classList.add('hidden');
    els.errorScreen.classList.remove('hidden');
  }
}

function cacheElements() {
  els.app = document.getElementById('app');
  els.homeScreen = document.getElementById('homeScreen');
  els.storyGrid = document.getElementById('storyGrid');
  els.storyPlayer = document.getElementById('storyPlayer');
  els.progressBars = document.getElementById('progressBars');
  els.playerEyebrow = document.getElementById('playerEyebrow');
  els.playerTitle = document.getElementById('playerTitle');
  els.playerCounter = document.getElementById('playerCounter');
  els.closePlayerButton = document.getElementById('closePlayerButton');
  els.storyFrame = document.getElementById('storyFrame');
  els.storySlide = document.getElementById('storySlide');
  els.orientationGuard = document.getElementById('orientationGuard');
  els.loadingScreen = document.getElementById('loadingScreen');
  els.errorScreen = document.getElementById('errorScreen');
}

function bindUI() {
  els.storyGrid.addEventListener('click', onStoryGridClick);
  els.closePlayerButton.addEventListener('click', closeStoryPlayer);
  els.storyFrame.addEventListener('click', onStoryFrameClick);
  els.storySlide.addEventListener('click', onSlideInteraction);

  els.storyFrame.addEventListener('touchstart', (event) => {
    state.touchStartX = event.changedTouches[0].clientX;
  }, { passive: true });

  els.storyFrame.addEventListener('touchend', (event) => {
    const endX = event.changedTouches[0].clientX;
    const delta = endX - state.touchStartX;
    if (Math.abs(delta) < 44) return;
    if (delta < 0) nextSlide();
    else previousSlide();
  }, { passive: true });

  document.addEventListener('keydown', (event) => {
    if (els.storyPlayer.classList.contains('hidden')) return;
    if (event.key === 'ArrowRight') nextSlide();
    if (event.key === 'ArrowLeft') previousSlide();
    if (event.key === 'Escape') closeStoryPlayer();
  });

  window.addEventListener('resize', updateOrientationGuard);
  window.addEventListener('orientationchange', updateOrientationGuard);
}

function updateOrientationGuard() {
  const isLandscape = window.innerWidth > window.innerHeight;
  const isTouchLike = window.innerWidth < 1180;
  els.orientationGuard.style.display = isLandscape && isTouchLike ? 'grid' : 'none';
}

function onStoryGridClick(event) {
  const bubble = event.target.closest('.story-bubble');
  if (!bubble) return;
  const storyIndex = Number(bubble.dataset.storyIndex);
  if (Number.isNaN(storyIndex)) return;
  openStory(storyIndex, 0);
}

function onStoryFrameClick(event) {
  if (event.target.closest('[data-no-nav]')) return;
  const rect = els.storyFrame.getBoundingClientRect();
  const x = event.clientX - rect.left;
  if (x < rect.width * 0.34) {
    previousSlide();
  } else if (x > rect.width * 0.66) {
    nextSlide();
  }
}

function onSlideInteraction(event) {
  const quizChoice = event.target.closest('[data-quiz-choice]');
  if (quizChoice) {
    event.stopPropagation();
    handleQuizChoice(quizChoice);
  }
}

function openStory(storyIndex, slideIndex = 0) {
  state.activeStoryIndex = clamp(storyIndex, 0, state.stories.length - 1);
  state.activeSlideIndex = clamp(slideIndex, 0, getActiveStory().slides.length - 1);
  els.homeScreen.classList.add('hidden');
  els.storyPlayer.classList.remove('hidden');
  renderActiveStory();
}

function closeStoryPlayer() {
  els.storyPlayer.classList.add('hidden');
  els.homeScreen.classList.remove('hidden');
}

function nextStory() {
  const next = state.activeStoryIndex + 1;
  if (next >= state.stories.length) {
    closeStoryPlayer();
    return;
  }
  openStory(next, 0);
}

function previousStory() {
  const previous = state.activeStoryIndex - 1;
  if (previous < 0) {
    closeStoryPlayer();
    return;
  }
  openStory(previous, state.stories[previous].slides.length - 1);
}

function nextSlide() {
  const story = getActiveStory();
  if (state.activeSlideIndex >= story.slides.length - 1) {
    nextStory();
    return;
  }
  state.activeSlideIndex += 1;
  renderActiveStory();
}

function previousSlide() {
  if (state.activeSlideIndex <= 0) {
    previousStory();
    return;
  }
  state.activeSlideIndex -= 1;
  renderActiveStory();
}

function getActiveStory() {
  return state.stories[state.activeStoryIndex];
}

function renderHome() {
  els.storyGrid.innerHTML = state.stories.map((story, index) => `
    <button class="story-bubble theme-${story.theme}" data-story-index="${index}" type="button" aria-label="${escapeHtml(story.title)} öffnen">
      <span class="story-bubble__glow"></span>
      <span class="story-bubble__ring"></span>
      <span class="story-bubble__inner">
        <span class="story-bubble__orb">${escapeHtml(story.orb)}</span>
        <span class="story-bubble__label">${escapeHtml(story.title)}</span>
      </span>
    </button>
  `).join('');
}

function renderActiveStory() {
  const story = getActiveStory();
  const slide = story.slides[state.activeSlideIndex];

  els.storyPlayer.className = `story-player theme-${story.theme}`;
  els.playerEyebrow.textContent = story.kicker;
  els.playerTitle.textContent = story.title;
  els.playerCounter.textContent = `${state.activeSlideIndex + 1} / ${story.slides.length}`;

  els.progressBars.innerHTML = story.slides.map((_, index) => `
    <button class="progress-segment ${index === state.activeSlideIndex ? 'is-active' : ''}" data-progress-jump="${index}" aria-label="Zur Karte ${index + 1} springen">
      <span class="progress-segment__fill" style="transform:scaleX(${index < state.activeSlideIndex || index === state.activeSlideIndex ? 1 : 0})"></span>
    </button>
  `).join('');
  els.progressBars.querySelectorAll('[data-progress-jump]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      state.activeSlideIndex = Number(button.dataset.progressJump);
      renderActiveStory();
    }, { once: true });
  });

  els.storySlide.className = `story-slide story-slide--${slide.kind || 'default'} theme-${story.theme}`;
  els.storySlide.innerHTML = typeof slide.render === 'function' ? slide.render() : slide.html;

  triggerReveal(els.storySlide);
}

function triggerReveal(scope) {
  if (state.prefersReducedMotion) {
    scope.querySelectorAll('.reveal').forEach((node) => node.classList.add('is-visible'));
    return;
  }
  const nodes = [...scope.querySelectorAll('.reveal')];
  nodes.forEach((node) => node.classList.remove('is-visible'));
  requestAnimationFrame(() => {
    nodes.forEach((node, index) => {
      const delay = Number(node.dataset.delay || 0) || (index * 90);
      window.setTimeout(() => node.classList.add('is-visible'), delay);
    });
  });
}

function handleQuizChoice(button) {
  const group = button.dataset.quizGroup;
  const correct = button.dataset.quizCorrect === 'true';
  const wrapper = button.closest('.quiz-card');
  if (!wrapper) return;

  state.quizSelections[group] = button.dataset.quizChoice;

  wrapper.querySelectorAll('.quiz-option').forEach((option) => {
    const isCorrect = option.dataset.quizCorrect === 'true';
    option.classList.remove('is-correct', 'is-wrong');
    if (isCorrect) option.classList.add('is-correct');
    if (option === button && !correct) option.classList.add('is-wrong');
    option.setAttribute('aria-pressed', option === button ? 'true' : 'false');
  });

  const feedback = wrapper.querySelector('.quiz-feedback');
  if (feedback) {
    feedback.classList.add('is-visible');
  }
}

function buildStories(data) {
  const summary = data.summary;
  const totalMessages = summary.total_messages;
  const activeDays = summary.active_days;
  const primeWindow = summary.avg_daily_peak_2h_window_label || '18:18–20:18';
  const messageBalance = summary.message_balance || [];
  const firstShare = messageBalance[0];
  const secondShare = messageBalance[1];
  const splitLabel = `${Math.round((firstShare?.share_pct || 0.5) * 100)} / ${Math.round((secondShare?.share_pct || 0.5) * 100)}`;
  const splitDetail = `${formatNumber(firstShare?.messages || 0)} vs. ${formatNumber(secondShare?.messages || 0)}`;

  const biggestDay = data.top_chat_days?.[0];
  const biggestDayDate = biggestDay ? formatDate(biggestDay.date) : '17.10.2025';
  const biggestDayCount = biggestDay?.messages || 220;

  const quickReply = data.response_time_summary?.find((row) => row.scope === '<= 3h') || data.response_time_summary?.[0];
  const voiceTotal = sum((data.voice_notes?.by_sender || []).map((row) => row.voice_notes));
  const mediaImages = (data.media_breakdown || []).find((row) => row.msg_type === 'image_omitted')?.total || 0;
  const mediaDocs = (data.media_breakdown || []).find((row) => row.msg_type === 'document_omitted')?.total || 0;
  const strongestWeekday = data.weekday_activity_extended?.[0];
  const topSession = data.session_highlights?.[0];
  const secondSession = data.session_highlights?.[1];

  const topWords = (data.top_words_curated || []).slice(0, 5);
  const topWord = topWords[0];
  const topEmojis = (data.emojis || []).slice(0, 5);
  const topReactions = (data.reactions || []).slice(0, 5);

  const topicRace = buildTopicRace(data.topic_superlatives || []);
  const eraRace = buildEraRace(data.friendship_eras || []);

  const flashbacks = ['FB1', 'FB3', 'FB4', 'FB5', 'FB6']
    .map((id) => buildFlashbackScene(data, id))
    .filter(Boolean);

  const quizSlides = buildQuizSlides(data);
  const wrmDivisions = buildDivisionCounts(data.wrm_division_life || []);
  const wrmCoreJohann = pickCoreTasks(data.wrm_core_tasks || [], 'Johann');
  const wrmCoreJulian = pickCoreTasks(data.wrm_core_tasks || [], 'Julian');
  const wrmTaskLowerBound = extractTaskLowerBound(data.wrm_creative_ideas || [], data.wrm_overview || []);
  const wrmAlignment = (data.wrm_topic_alignment || []).slice(0, 4);

  return [
    {
      id: 'auftakt',
      title: 'Auftakt',
      kicker: 'Euer Wrapped',
      orb: '01',
      theme: 'pulse',
      slides: [
        heroStatSlide('Auftakt', 'Nachrichten insgesamt', formatNumber(totalMessages), 'Alles zusammengezählt.'),
        heroStatSlide('Auftakt', 'Aktive Tage', String(activeDays), 'Tage mit echtem Kontakt.'),
        heroStatSlide('Auftakt', 'Prime-Fenster', primeWindow, 'Hier war euer Chat im Schnitt am dichtesten.'),
        heroStatSlide('Auftakt', 'Verteilung', splitLabel, splitDetail),
        boardSlide('Auftakt', 'Fünf Dinge, die sofort hängenbleiben', [
          { label: 'Nachrichten', value: formatNumber(totalMessages), hint: 'insgesamt' },
          { label: 'Aktive Tage', value: String(activeDays), hint: 'mit Kontakt' },
          { label: 'Prime-Fenster', value: primeWindow, hint: 'im Schnitt' },
          { label: 'Verteilung', value: splitLabel, hint: splitDetail },
          { label: 'Größter Tag', value: String(biggestDayCount), hint: biggestDayDate },
        ]),
      ],
    },
    {
      id: 'chat',
      title: 'Chat',
      kicker: 'Wie ihr geschrieben habt',
      orb: '26K',
      theme: 'sky',
      slides: [
        heroStatSlide('Chat', 'Größter Tag', String(biggestDayCount), `${biggestDayDate} · erstes Signal: ${shorten(biggestDay?.first_message || 'Test', 42)}`),
        heroStatSlide('Chat', 'Antworttempo', `${formatMin(quickReply?.median_response_min || 1)}`, 'Median-Antwortzeit im schnellen Bereich.'),
        heroStatSlide('Chat', 'Sprachnachrichten', formatNumber(voiceTotal), `${formatNumber(mediaImages)} Bilder und ${formatNumber(mediaDocs)} Dokumente kamen auch noch dazu.`),
        claimSlide('Chat', 'Wochentag mit dem meisten Druck', weekdayDe(strongestWeekday?.weekday || 'Monday'), `${formatNumber(strongestWeekday?.messages || 4411)} Nachrichten insgesamt — genau da lief es am stärksten.`),
        sessionSpotlightSlide('Chat', 'Session-Moment', topSession, 'Der längste zusammenhängende Marathon im Datensatz.'),
        sessionSpotlightSlide('Chat', 'Noch ein Moment', secondSession, 'Eine dieser Nächte, in denen plötzlich alles gleichzeitig wichtig war.'),
        ...flashbacks.map((scene) => flashbackSceneSlide(scene)),
      ],
    },
    {
      id: 'woerter',
      title: 'Wörter',
      kicker: 'Eure Sprache',
      orb: '#1',
      theme: 'rose',
      slides: [
        heroStatSlide('Wörter', 'Euer Top-Wort', deWord(topWord?.word || 'wrm'), `${formatNumber(topWord?.count || 145)} Treffer im Datensatz.`),
        leaderboardSlide('Wörter', 'Top Wörter', topWords.map((row) => ({
          label: deWord(row.word),
          value: formatNumber(row.count),
        }))),
        heroStatSlide('Wörter', 'Top-Emoji', topEmojis[0]?.emoji || '💪', `${formatNumber(topEmojis[0]?.count || 122)} Mal benutzt.`),
        leaderboardSlide('Wörter', 'Top Emojis', topEmojis.map((row) => ({
          label: row.emoji,
          value: formatNumber(row.count),
        }))),
        heroStatSlide('Wörter', 'Top-Reaktion', topReactions[0]?.reaction_family || 'hahaha', `${formatNumber(topReactions[0]?.count || 655)} Treffer im Chat.`),
        leaderboardSlide('Wörter', 'Top Reaktionen', topReactions.map((row) => ({
          label: row.reaction_family,
          value: formatNumber(row.count),
        }))),
      ],
    },
    {
      id: 'phasen',
      title: 'Phasen',
      kicker: 'Themen im Rennen',
      orb: 'ERAS',
      theme: 'lime',
      slides: [
        claimSlide('Phasen', 'Die Themen liefen wirklich gegeneinander.', 'Nicht nebeneinander. Sondern als echtes Wettrennen.', 'Abitur, Schülersprecher, Gärtnerbot, WRM, Workout, Bildungsbrücke und mehr haben sich immer wieder abgewechselt.'),
        raceSlide('Phasen', 'Themen-Rennen', 'Wer wie stark vorne lag', topicRace),
        raceSlide('Phasen', 'Große Eras', 'Auch die großen Abschnitte hatten ihr eigenes Tempo', eraRace),
        claimSlide('Phasen', 'Der eigentliche Shift', 'Aus Chat wurde ein System.', 'Genau da beginnt der nächste Layer: WRM, Notion, Tasks und ein eigener Wochenrhythmus.'),
      ],
    },
    {
      id: 'quiz',
      title: 'Quiz',
      kicker: 'Wer war das?',
      orb: 'QUIZ',
      theme: 'violet',
      slides: quizSlides,
    },
    {
      id: 'wrm',
      title: 'WRM',
      kicker: 'Das Betriebssystem',
      orb: '86',
      theme: 'aqua',
      slides: [
        claimSlide('WRM', 'Ab hier war es mehr als ein Chat.', `${ACTUAL_WRMS_DONE} Weekly Refreshing Meetings`, 'Nicht nur Nachrichten. Sondern ein festes System mit Planung, Review und echten Folgen.'),
        heroStatSlide('WRM', 'Gemacht', String(ACTUAL_WRMS_DONE), 'Tatsächlich erledigte WRMs — nicht die schon vorgeplanten.'),
        heroStatSlide('WRM', 'Sichtbare Task-Masse', wrmTaskLowerBound, 'Öffentlich erkennbar als große Task-Welt im Notion-System.'),
        divisionSlide('WRM', 'Lebensbereiche', wrmDivisions),
        coreTasksSlide('WRM', 'Johann-Core', wrmCoreJohann),
        coreTasksSlide('WRM', 'Julian-Core', wrmCoreJulian),
        alignmentSlide('WRM', 'Was im WRM dann groß wurde', wrmAlignment),
        boardSlide('WRM', 'Ein klareres Bild vom WRM', [
          { label: 'WRMs gemacht', value: String(ACTUAL_WRMS_DONE), hint: 'wirklich abgeschlossen' },
          { label: 'Tasks sichtbar', value: wrmTaskLowerBound, hint: 'öffentliche Untergrenze' },
          { label: 'Hauptwelt', value: 'Schule', hint: 'Aufgaben und Vorbereitung' },
          { label: 'Zweitwelt', value: 'Organisation', hint: 'WRM, Notion, Systeme' },
          { label: 'Später dazu', value: 'Verein / Karriere', hint: 'Bildungsbrücke und Zukunft' },
        ]),
      ],
    },
    {
      id: 'schluss',
      title: 'Schluss',
      kicker: 'Zum Geburtstag',
      orb: '18',
      theme: 'gold',
      slides: [
        birthdaySlide(`Herzlichen Glückwunsch zum 18. Geburtstag, ${BIRTHDAY_NAME}.`, 'Dieses Wrapped gehört dir.'),
        heroStatSlide('Zum Schluss', '1,0', 'geschafft', 'Das große Ziel nicht nur geplant, sondern wirklich gehalten.'),
        heroStatSlide('Zum Schluss', 'WRMs gemacht', String(ACTUAL_WRMS_DONE), 'Ein komplett eigenes System — Woche für Woche.'),
      ],
    },
  ];
}

function heroStatSlide(kicker, title, value, support) {
  return {
    kind: 'hero',
    html: `
      <article class="slide-layout slide-layout--hero" data-no-nav>
        ${fxLayer()}
        <p class="kicker reveal" data-delay="80">${escapeHtml(kicker)}</p>
        <p class="slide-title reveal" data-delay="170">${escapeHtml(title)}</p>
        <div class="hero-value reveal" data-delay="310">${escapeHtml(value)}</div>
        <p class="support-copy reveal" data-delay="470">${escapeHtml(support)}</p>
      </article>
    `,
  };
}

function claimSlide(kicker, title, claim, support) {
  return {
    kind: 'claim',
    html: `
      <article class="slide-layout slide-layout--claim" data-no-nav>
        ${fxLayer()}
        <p class="kicker reveal" data-delay="80">${escapeHtml(kicker)}</p>
        <p class="slide-title reveal" data-delay="160">${escapeHtml(title)}</p>
        <div class="claim-value reveal" data-delay="310">${escapeHtml(claim)}</div>
        <p class="support-copy reveal" data-delay="470">${escapeHtml(support)}</p>
      </article>
    `,
  };
}

function boardSlide(kicker, title, stats) {
  return {
    kind: 'board',
    html: `
      <article class="slide-layout slide-layout--board" data-no-nav>
        ${fxLayer()}
        <p class="kicker reveal" data-delay="80">${escapeHtml(kicker)}</p>
        <p class="slide-title reveal" data-delay="160">${escapeHtml(title)}</p>
        <div class="board-grid">
          ${stats.map((stat, index) => `
            <div class="board-card reveal" data-delay="${260 + index * 85}">
              <div class="board-card__value">${escapeHtml(stat.value)}</div>
              <div class="board-card__label">${escapeHtml(stat.label)}</div>
              <div class="board-card__hint">${escapeHtml(stat.hint || '')}</div>
            </div>
          `).join('')}
        </div>
      </article>
    `,
  };
}

function leaderboardSlide(kicker, title, items) {
  return {
    kind: 'leaderboard',
    html: `
      <article class="slide-layout slide-layout--leaderboard" data-no-nav>
        ${fxLayer()}
        <p class="kicker reveal" data-delay="80">${escapeHtml(kicker)}</p>
        <p class="slide-title reveal" data-delay="160">${escapeHtml(title)}</p>
        <ol class="leaderboard">
          ${items.slice(0, 5).map((item, index) => `
            <li class="leaderboard__item leaderboard__item--${index + 1} reveal" data-delay="${260 + index * 95}">
              <span class="leaderboard__place">#${index + 1}</span>
              <span class="leaderboard__label">${escapeHtml(item.label)}</span>
              <span class="leaderboard__value">${escapeHtml(item.value)}</span>
            </li>
          `).join('')}
        </ol>
      </article>
    `,
  };
}

function raceSlide(kicker, title, intro, items) {
  return {
    kind: 'race',
    html: `
      <article class="slide-layout slide-layout--race" data-no-nav>
        ${fxLayer()}
        <p class="kicker reveal" data-delay="80">${escapeHtml(kicker)}</p>
        <p class="slide-title reveal" data-delay="160">${escapeHtml(title)}</p>
        <p class="support-copy support-copy--tight reveal" data-delay="240">${escapeHtml(intro)}</p>
        <div class="race-list">
          ${items.map((item, index) => `
            <div class="race-row reveal" data-delay="${320 + index * 90}">
              <div class="race-row__head">
                <span class="race-row__place">${index + 1}</span>
                <span class="race-row__label">${escapeHtml(item.label)}</span>
                <span class="race-row__meta">${escapeHtml(item.meta)}</span>
              </div>
              <div class="race-row__track">
                <div class="race-row__fill" style="--progress:${Math.max(0.12, item.progress)}"></div>
              </div>
              <div class="race-row__value">${escapeHtml(item.value)}</div>
            </div>
          `).join('')}
        </div>
      </article>
    `,
  };
}

function sessionSpotlightSlide(kicker, title, session, note) {
  if (!session) return claimSlide(kicker, title, 'Keine Session gefunden', '');
  return {
    kind: 'session',
    html: `
      <article class="slide-layout slide-layout--session" data-no-nav>
        ${fxLayer()}
        <p class="kicker reveal" data-delay="80">${escapeHtml(kicker)}</p>
        <p class="slide-title reveal" data-delay="160">${escapeHtml(title)}</p>
        <div class="session-card reveal" data-delay="290">
          <div class="session-card__line">
            <span>${escapeHtml(formatDate(session.start.split(' ')[0]))}</span>
            <strong>${escapeHtml(formatNumber(session.messages))} Nachrichten</strong>
          </div>
          <div class="session-card__line">
            <span>Dominantes Thema</span>
            <strong>${escapeHtml(deTopic(session.dominant_topic))}</strong>
          </div>
          <div class="session-card__line">
            <span>Spanne</span>
            <strong>${escapeHtml(session.duration_min ? `${Math.round(session.duration_min)} Min.` : 'lang')}</strong>
          </div>
          <div class="session-card__quote">„${escapeHtml(shorten(session.first_message || '', 72))}“</div>
          <div class="session-card__quote session-card__quote--end">„${escapeHtml(shorten(session.last_message || '', 86))}“</div>
        </div>
        <p class="support-copy reveal" data-delay="470">${escapeHtml(note)}</p>
      </article>
    `,
  };
}

function flashbackSceneSlide(scene) {
  return {
    kind: 'flashback',
    html: `
      <article class="slide-layout slide-layout--flashback" data-no-nav>
        ${fxLayer()}
        <p class="kicker reveal" data-delay="80">${escapeHtml(scene.date)}</p>
        <div class="flashback-chat">
          ${scene.messages.map((message, index) => `
            <div class="chat-bubble ${message.own ? 'chat-bubble--own' : ''} reveal" data-delay="${180 + index * 120}">
              <span class="chat-bubble__sender">${escapeHtml(message.sender)}</span>
              <span class="chat-bubble__text">${escapeHtml(message.text)}</span>
            </div>
          `).join('')}
        </div>
        <p class="support-copy reveal" data-delay="${240 + scene.messages.length * 120}">${escapeHtml(scene.note)}</p>
      </article>
    `,
  };
}

function coreTasksSlide(kicker, title, tasks) {
  return {
    kind: 'core',
    html: `
      <article class="slide-layout slide-layout--core" data-no-nav>
        ${fxLayer()}
        <p class="kicker reveal" data-delay="80">${escapeHtml(kicker)}</p>
        <p class="slide-title reveal" data-delay="160">${escapeHtml(title)}</p>
        <div class="core-stack">
          ${tasks.slice(0, 3).map((task, index) => `
            <div class="core-card reveal" data-delay="${260 + index * 90}">
              <div class="core-card__title">${escapeHtml(task.title)}</div>
              <div class="core-card__text">${escapeHtml(task.text)}</div>
            </div>
          `).join('')}
        </div>
      </article>
    `,
  };
}

function divisionSlide(kicker, title, divisions) {
  const maxValue = Math.max(...divisions.map((row) => row.count), 1);
  return {
    kind: 'division',
    html: `
      <article class="slide-layout slide-layout--division" data-no-nav>
        ${fxLayer()}
        <p class="kicker reveal" data-delay="80">${escapeHtml(kicker)}</p>
        <p class="slide-title reveal" data-delay="160">${escapeHtml(title)}</p>
        <div class="division-list">
          ${divisions.map((row, index) => `
            <div class="division-row reveal" data-delay="${260 + index * 90}">
              <div class="division-row__head">
                <span>${escapeHtml(row.label)}</span>
                <strong>${row.count} Tasks</strong>
              </div>
              <div class="division-row__track">
                <div class="division-row__fill" style="--progress:${Math.max(0.14, row.count / maxValue)}"></div>
              </div>
              <div class="division-row__hint">${escapeHtml(row.note)}</div>
            </div>
          `).join('')}
        </div>
      </article>
    `,
  };
}

function alignmentSlide(kicker, title, rows) {
  return {
    kind: 'alignment',
    html: `
      <article class="slide-layout slide-layout--alignment" data-no-nav>
        ${fxLayer()}
        <p class="kicker reveal" data-delay="80">${escapeHtml(kicker)}</p>
        <p class="slide-title reveal" data-delay="160">${escapeHtml(title)}</p>
        <div class="alignment-list">
          ${rows.map((row, index) => `
            <div class="alignment-card reveal" data-delay="${260 + index * 95}">
              <div class="alignment-card__title">${escapeHtml(row[0])}</div>
              <div class="alignment-card__range">${escapeHtml(row[1])}</div>
              <div class="alignment-card__text">${escapeHtml(row[2])}</div>
            </div>
          `).join('')}
        </div>
      </article>
    `,
  };
}

function birthdaySlide(title, support) {
  return {
    kind: 'birthday',
    html: `
      <article class="slide-layout slide-layout--birthday" data-no-nav>
        ${fxLayer()}
        <div class="confetti-layer" aria-hidden="true">
          ${Array.from({ length: 26 }).map((_, index) => `<span class="confetti confetti--${(index % 5) + 1}" style="--x:${(index * 13) % 100}; --delay:${(index * 0.07).toFixed(2)}s; --dur:${(3.8 + (index % 6) * 0.22).toFixed(2)}s;"></span>`).join('')}
        </div>
        <p class="kicker reveal" data-delay="80">Geburtstag</p>
        <div class="claim-value reveal" data-delay="220">18</div>
        <p class="slide-title slide-title--center reveal" data-delay="330">${escapeHtml(title)}</p>
        <p class="support-copy support-copy--center reveal" data-delay="470">${escapeHtml(support)}</p>
      </article>
    `,
  };
}

function quizQuestionSlide(question) {
  return {
    kind: 'quiz',
    html: `
      <article class="slide-layout slide-layout--quiz quiz-card" data-no-nav>
        ${fxLayer()}
        <p class="kicker reveal" data-delay="80">QUIZ</p>
        <p class="slide-title reveal" data-delay="150">${escapeHtml(question.title)}</p>
        <div class="quiz-prompt reveal" data-delay="240">${escapeHtml(question.prompt)}</div>
        <div class="quiz-options">
          ${question.options.map((option, index) => `
            <button
              class="quiz-option reveal"
              type="button"
              data-delay="${320 + index * 80}"
              data-quiz-group="${escapeHtml(question.id)}"
              data-quiz-choice="${escapeHtml(option.label)}"
              data-quiz-correct="${String(option.correct)}"
              aria-pressed="false"
            >
              ${escapeHtml(option.label)}
            </button>
          `).join('')}
        </div>
        <div class="quiz-feedback">
          <div class="quiz-feedback__headline">${escapeHtml(question.answer)}</div>
          <div class="quiz-feedback__text">${escapeHtml(question.note)}</div>
        </div>
      </article>
    `,
  };
}

function buildQuizSlides(data) {
  const quotes = (data.quote_answers || []).filter((row) => ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q7', 'Q10'].includes(row.quote_id));
  const quoteSlides = quotes.map((row) => quizQuestionSlide({
    id: row.quote_id,
    title: 'Wer hat das geschrieben?',
    prompt: row.quote,
    options: [
      { label: 'Julian', correct: row.true_sender === 'Julian RR' },
      { label: 'Johann', correct: row.true_sender === 'johann' },
    ],
    answer: row.true_sender === 'Julian RR' ? 'Richtig: Julian' : 'Richtig: Johann',
    note: translateQuizNote(row.note),
  }));

  const wrmRows = (data.wrm_notes_quiz || []).slice(0, 3);
  const wrmAnswers = new Map((data.wrm_notes_quiz_answers || []).map((row) => [row[0], row]));
  const wrmSlides = wrmRows.map((row, index) => {
    const correct = wrmAnswers.get(row[0])?.[1] || row[4];
    const allOptions = ['WRM 23', 'WRM 51', 'WRM 75'];
    const options = allOptions.map((label) => ({ label, correct: label === correct }));
    return quizQuestionSlide({
      id: `wrm-${index + 1}`,
      title: 'Welche WRM-Nummer war das?',
      prompt: `${row[1]} · ${row[2]} · ${row[3]}`,
      options,
      answer: `Richtig: ${correct}`,
      note: wrmAnswers.get(row[0])?.[3] || 'Diese Notes-before-Kombi war ziemlich eindeutig.',
    });
  });

  return [...quoteSlides, ...wrmSlides];
}

function buildTopicRace(rows) {
  const filtered = rows
    .filter((row) => row.total_hits > 0)
    .sort((a, b) => b.total_hits - a.total_hits);
  const max = filtered[0]?.total_hits || 1;
  return filtered.map((row) => ({
    label: deTopic(row.topic),
    value: `${formatNumber(row.total_hits)}`,
    meta: `Peak: ${monthName(row.peak_month)}`,
    progress: row.total_hits / max,
  }));
}

function buildEraRace(rows) {
  const mainRows = rows
    .filter((row) => row.era_type === 'main')
    .sort((a, b) => b.messages_in_era - a.messages_in_era);
  const max = mainRows[0]?.messages_in_era || 1;
  return mainRows.map((row) => ({
    label: row.era_label,
    value: `${formatNumber(row.messages_in_era)}`,
    meta: `${monthName(row.start_month)} – ${monthName(row.end_month)}`,
    progress: row.messages_in_era / max,
  }));
}

function buildDivisionCounts(rows) {
  const labels = {
    'Organise': 'Organisation',
    'School': 'Schule',
    'Personal': 'Persönlich',
    'Selfcare': 'Selfcare',
    'CV & Career': 'Karriere',
    'Sport': 'Sport',
  };
  return rows
    .filter((row) => row[0] === 'Current visible week snapshot' && row[1] !== 'Unlabeled / context tasks')
    .map((row) => ({
      label: labels[row[1]] || row[1],
      count: Number(row[2]) || 0,
      note: shorten(row[3] || '', 52),
    }))
    .sort((a, b) => b.count - a.count);
}

function pickCoreTasks(rows, person) {
  return rows
    .filter((row) => String(row[0]) === person)
    .slice(0, 3)
    .map((row) => ({
      title: translateCoreTask(row[1]),
      text: shorten(row[2], 96),
    }));
}

function extractTaskLowerBound(creativeIdeas, overview) {
  const creativeHit = creativeIdeas.find((row) => String(row[0]).includes('630+') || String(row[1]).includes('630+'));
  if (creativeHit) return '630+';
  const overviewHit = overview.find((row) => String(row[0]).includes('Tasks') && /\d/.test(String(row[1])));
  return overviewHit?.[1] || '630+';
}

function buildFlashbackScene(data, flashbackId) {
  const meta = (data.flashbacks || []).find((row) => row.flashback_id === flashbackId);
  if (!meta) return null;

  const selectionMap = {
    'FB1': [1, 2, 3, 4],
    'FB3': [0, 4, 5],
    'FB4': [0, 2, 3, 5],
    'FB5': [0, 1, 4, 5],
    'FB6': [1, 2, 4, 5],
  };

  const rawMessages = (data.flashback_messages || [])
    .filter((row) => row.flashback_id === flashbackId && row.msg_type === 'text');

  const picks = selectionMap[flashbackId] || [0, 1, 2, 3];
  const messages = picks
    .map((index) => rawMessages[index])
    .filter(Boolean)
    .map((row) => ({
      sender: deSender(row.sender),
      text: row.message,
      own: row.sender === 'johann',
    }));

  if (!messages.length) return null;

  return {
    date: formatDateTime(meta.date_start),
    note: meta.why_it_is_fun,
    messages,
  };
}

function fxLayer() {
  return `
    <div class="fx fx--halo reveal" data-delay="0"></div>
    <div class="fx fx--ribbon reveal" data-delay="40"></div>
    <div class="fx fx--grain reveal" data-delay="20"></div>
  `;
}

function deTopic(topic) {
  const map = {
    'Schuelersprecher': 'Schülersprecher',
    'Abitur': 'Abitur',
    'Gaertnerbot': 'Gärtnerbot',
    'Bildungsbruecke': 'Bildungsbrücke',
    'WRM_Notion': 'WRM / Notion',
    'Workout_Schwimmen': 'Workout & Schwimmen',
    'Australien': 'Australien',
    'Schnelligkeit': 'Schnelligkeit',
    '(kein klares Oberthema)': 'kein klares Thema',
  };
  return map[topic] || topic || 'Thema';
}

function deWord(word) {
  const map = {
    'wrm': 'WRM',
    'gsv': 'GSV',
    'notion': 'Notion',
  };
  return map[word?.toLowerCase?.()] || word;
}

function deSender(sender) {
  if (sender === 'johann') return 'Johann';
  if (sender === 'Julian RR') return 'Julian';
  return sender || 'Unbekannt';
}

function translateCoreTask(text) {
  const map = [
    ['Sleep / sleeping schedule / selfcare discipline', 'Schlaf & Selbstdisziplin'],
    ['Exam prep / school prep / old exams', 'Klausuren & Vorbereitung'],
    ['Organisation systems', 'Systeme & Organisation'],
    ['Applications / career steps', 'Bewerbungen & Karriere'],
    ['Sport / movement / body', 'Sport & Bewegung'],
    ['Plan / organise / review', 'Planen & Reviewen'],
    ['Networking / relationships / communication', 'Netzwerk & Kommunikation'],
    ['Projects / association / website', 'Projekte & Verein'],
  ];
  const hit = map.find(([key]) => text.includes(key));
  return hit ? hit[1] : text;
}

function translateQuizNote(text) {
  const map = {
    'Playful insult / Projektfrust': 'Leichte Beleidigung mit Projektfrust.',
    'Gaming/Trash Talk': 'Komplett klassischer Trash Talk.',
    'Australien-Folge / Running Joke': 'Australien-Rückblick plus Running Joke.',
    'Eis-/Workout-Motivation': 'Kälte- und Workout-Motivation in Reinform.',
    'Legendärer Fail': 'Einer dieser Fails, die sofort legendär wurden.',
    'Komplett absurde Freundschaftszeile': 'Absolut absurder Satz, genau deshalb gut.',
  };
  return map[text] || text;
}

function formatMin(value) {
  return `${Number(value).toFixed(1).replace('.', ',')} Min.`;
}

function formatNumber(value) {
  const number = Number(value) || 0;
  return new Intl.NumberFormat('de-DE').format(number);
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value.replace(' ', 'T'));
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function weekdayDe(weekday) {
  const map = {
    Monday: 'Montag',
    Tuesday: 'Dienstag',
    Wednesday: 'Mittwoch',
    Thursday: 'Donnerstag',
    Friday: 'Freitag',
    Saturday: 'Samstag',
    Sunday: 'Sonntag',
  };
  return map[weekday] || weekday || '';
}

function monthName(value) {
  if (!value) return '';
  const [year, month] = String(value).split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return new Intl.DateTimeFormat('de-DE', { month: 'short', year: '2-digit' }).format(date);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function sum(values) {
  return values.reduce((acc, value) => acc + (Number(value) || 0), 0);
}

function shorten(text, length = 64) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  if (value.length <= length) return value;
  return `${value.slice(0, length - 1).trim()}…`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
