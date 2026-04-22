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
  els.homeLead = document.getElementById('homeLead');
  els.storyGrid = document.getElementById('storyGrid');
  els.storyPlayer = document.getElementById('storyPlayer');
  els.progressBars = document.getElementById('progressBars');
  els.playerEyebrow = document.getElementById('playerEyebrow');
  els.playerTitle = document.getElementById('playerTitle');
  els.playerCounter = document.getElementById('playerCounter');
  els.closePlayerButton = document.getElementById('closePlayerButton');
  els.storyFrame = document.getElementById('storyFrame');
  els.storySlide = document.getElementById('storySlide');
  els.tapLeft = document.getElementById('tapLeft');
  els.tapRight = document.getElementById('tapRight');
  els.orientationGuard = document.getElementById('orientationGuard');
  els.loadingScreen = document.getElementById('loadingScreen');
  els.errorScreen = document.getElementById('errorScreen');
}

function bindUI() {
  els.storyGrid.addEventListener('click', onStoryGridClick);
  els.closePlayerButton.addEventListener('click', closeStoryPlayer);
  els.tapLeft.addEventListener('click', previousSlide);
  els.tapRight.addEventListener('click', nextSlide);
  els.storySlide.addEventListener('click', onSlideInteraction);

  els.storyFrame.addEventListener('touchstart', (event) => {
    state.touchStartX = event.changedTouches[0].clientX;
  }, { passive: true });

  els.storyFrame.addEventListener('touchend', (event) => {
    const endX = event.changedTouches[0].clientX;
    const delta = endX - state.touchStartX;
    if (Math.abs(delta) < 40) return;
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

function onSlideInteraction(event) {
  const quizChoice = event.target.closest('[data-quiz-choice]');
  if (quizChoice) {
    event.stopPropagation();
    handleQuizChoice(quizChoice);
    return;
  }

  const jumpButton = event.target.closest('[data-jump]');
  if (jumpButton) {
    event.stopPropagation();
    const dir = jumpButton.dataset.jump;
    if (dir === 'next') nextSlide();
    if (dir === 'prev') previousSlide();
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
  const previousStoryData = state.stories[previous];
  openStory(previous, previousStoryData.slides.length - 1);
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
  els.homeLead.textContent = 'Von Nachrichten zu WRMs, von Phasen zu Projekten — einmal durch die ganze Geschichte.';

  els.storyGrid.innerHTML = state.stories.map((story, index) => `
    <button class="story-bubble theme-${story.theme}" data-story-index="${index}" type="button" aria-label="${escapeHtml(story.title)} öffnen">
      <span class="story-bubble__orbit"></span>
      <span class="story-bubble__ring"></span>
      <span class="story-bubble__core">
        <span class="story-bubble__orb-text">${escapeHtml(story.orbText)}</span>
      </span>
      <span class="story-bubble__title">${escapeHtml(story.title)}</span>
      <span class="story-bubble__caption">${escapeHtml(story.caption)}</span>
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
    <div class="progress-segment ${index === state.activeSlideIndex ? 'is-active' : ''}">
      <div class="progress-segment__fill" style="width:${index < state.activeSlideIndex ? 100 : index === state.activeSlideIndex ? 100 : 0}%"></div>
    </div>
  `).join('');

  els.storySlide.className = `story-slide story-slide--${slide.kind || 'default'} theme-${story.theme}`;
  els.storySlide.innerHTML = typeof slide.render === 'function' ? slide.render() : slide.html;

  requestAnimationFrame(() => {
    els.storySlide.classList.add('is-visible');
  });
}

function handleQuizChoice(button) {
  const group = button.dataset.quizGroup;
  const value = button.dataset.quizChoice;
  state.quizSelections[group] = value;
  button.closest('.quiz-options')?.querySelectorAll('.quiz-choice').forEach((choice) => {
    choice.classList.toggle('is-selected', choice === button);
  });
  window.setTimeout(() => {
    nextSlide();
  }, 260);
}

function buildStories(data) {
  const summary = data.summary;
  const totalMessages = summary.total_messages;
  const activeDays = summary.active_days;
  const primeWindow = summary.avg_daily_peak_2h_window_label || '18:18–20:18';
  const messageBalance = data.summary.message_balance || [];
  const shareA = messageBalance[0]?.share_pct ?? 0.5;
  const shareB = messageBalance[1]?.share_pct ?? 0.5;
  const splitText = `${Math.round(shareA * 100)} / ${Math.round(shareB * 100)}`;
  const biggestDay = data.top_chat_days?.[0];
  const biggestDayDate = biggestDay ? formatDate(biggestDay.date) : '17.10.2025';
  const biggestDayCount = biggestDay?.messages ?? 220;

  const strongestWeekday = data.weekday_activity_extended?.[0];
  const quickReply = data.response_time_summary?.find((row) => row.scope === '<= 3h') || data.response_time_summary?.[1] || data.response_time_summary?.[0];
  const voiceTotal = sum((data.voice_notes?.by_sender || []).map((row) => row.voice_notes));
  const mediaImage = (data.media_breakdown || []).find((row) => row.msg_type === 'image_omitted')?.total || 0;
  const mediaAudio = (data.media_breakdown || []).find((row) => row.msg_type === 'audio_omitted')?.total || 0;
  const topDaySecond = data.top_chat_days?.[1];

  const topWords = (data.top_words_curated || []).slice(0, 5);
  const topWord = topWords[0]?.word || 'WRM';
  const topEmojis = (data.emojis || []).slice(0, 5);
  const topReactions = (data.reactions || []).slice(0, 5);
  const signatureJulian = (data.sender_signatures || []).find((row) => row[0] === 'Julian RR' || row.sender === 'Julian RR') || data.sender_signatures?.[0];
  const iconicQuote = data.quote_answers?.find((row) => row.quote?.toLowerCase().includes('vogel')) || data.quote_answers?.[0];

  const phaseTopics = buildPhaseRace(data);
  const mainEras = (data.friendship_eras || []).filter((row) => row.era_type === 'main');
  const wrmCoreJohann = pickCoreTasks(data.wrm_core_tasks, 'Johann');
  const wrmCoreJulian = pickCoreTasks(data.wrm_core_tasks, 'Julian');
  const wrmDivisions = buildDivisionSummary(data.wrm_division_life);
  const wrmTasksLowerBound = extractTaskLowerBound(data.wrm_creative_ideas, data.wrm_overview);

  const flashbackIds = ['FB1', 'FB3', 'FB4', 'FB5', 'FB6'];
  const flashbackSlides = flashbackIds
    .map((id) => buildFlashbackScene(data, id))
    .filter(Boolean)
    .map((scene) => ({ kind: 'flashback', html: renderFlashbackSlide(scene) }));

  const quoteA = data.quote_answers?.find((row) => row.quote_id === 'Q1') || data.quote_answers?.[0];
  const quoteB = data.quote_answers?.find((row) => row.quote_id === 'Q2') || data.quote_answers?.[1];
  const wrmQuiz = data.wrm_notes_quiz?.[0];
  const wrmQuizAnswer = data.wrm_notes_quiz_answers?.[0];

  const stories = [
    {
      id: 'auftakt',
      theme: 'pulse',
      kicker: 'Auftakt',
      title: 'Der Anfang',
      orbText: 'LOS',
      caption: 'große Zahlen',
      slides: [
        heroStatSlide('Auftakt', 'Insgesamt', formatNumber(totalMessages), 'Nachrichten über die ganze Freundschaft hinweg.'),
        heroStatSlide('Auftakt', 'Aktiv gewesen an', String(activeDays), 'Tagen mit echtem Kontakt.'),
        heroStatSlide('Auftakt', 'Prime-Fenster', primeWindow, 'Im Schnitt lag euer intensivstes Zwei-Stunden-Fenster genau hier.'),
        heroStatSlide('Auftakt', 'Verteilung', splitText, 'Fast exakt fifty-fifty zwischen euch beiden.'),
        summaryBoardSlide('Auftakt', 'Alles auf einen Blick', [
          { label: 'Nachrichten', value: formatNumber(totalMessages) },
          { label: 'Aktive Tage', value: String(activeDays) },
          { label: 'Prime-Fenster', value: primeWindow },
          { label: 'Verteilung', value: splitText },
          { label: 'Stärkster Tag', value: `${biggestDayCount}` },
        ], `Stärkster Einzeltag: ${biggestDayDate} mit ${biggestDayCount} Nachrichten.`),
      ],
    },
    {
      id: 'chat',
      theme: 'sky',
      kicker: 'Chat',
      title: 'Wie ihr geschrieben habt',
      orbText: '26.260',
      caption: 'Nachrichten',
      slides: [
        heroStatSlide('Chat', 'Stärkster Tag', `${biggestDayCount}`, `${biggestDayDate} · von ${timeOnly(biggestDay?.first_time)} bis ${timeOnly(biggestDay?.last_time)} · Hauptthema: ${deTopic(biggestDay?.dominant_topic)}`),
        heroStatSlide('Chat', 'Schnell zurück', `${quickReply?.median_response_min?.toFixed(1).replace('.', ',') || '1,0'} Min.`, 'Median-Antwortzeit innerhalb von drei Stunden.'),
        heroStatSlide('Chat', 'Sprachnachrichten', formatNumber(voiceTotal), `Dazu kamen ${formatNumber(mediaImage)} Bilder und ${formatNumber(mediaAudio)} Audios im Export.`),
        claimSlide('Chat', 'Noch ein Peak', `${formatDate(topDaySecond?.date)} war fast genauso dicht.`, `${topDaySecond?.messages || 192} Nachrichten an einem Tag — ein echter Endspurt-Moment.`),
        summaryBoardSlide('Chat', 'Chat-Überblick', [
          { label: 'Stärkster Tag', value: `${biggestDayCount}` },
          { label: 'Schnellste Mitte', value: `${quickReply?.median_response_min?.toFixed(1).replace('.', ',') || '1,0'} Min.` },
          { label: 'Sprachnachrichten', value: formatNumber(voiceTotal) },
          { label: 'Stärkster Wochentag', value: weekdayDe(strongestWeekday?.weekday) },
          { label: 'Peak-Monat', value: monthName((data.media_peaks || []).find((row) => row.msg_type === 'audio_omitted' && row.rank === 1)?.month) || 'Okt 2025' },
        ], 'Im Chat wart ihr schnell, dicht und über lange Strecken fast täglich verbunden.'),
      ],
    },
    {
      id: 'woerter',
      theme: 'rose',
      kicker: 'Wörter',
      title: 'Eure Sprache',
      orbText: '#1',
      caption: 'Top-Wort',
      slides: [
        heroStatSlide('Wörter', 'Euer Top-Wort', deWord(topWord), 'Das Wort kam immer wieder — und sagt über eure Freundschaft ziemlich viel.'),
        leaderboardSlide('Wörter', 'Top 5 Wörter', topWords.map((row) => ({ label: deWord(row.word), value: formatNumber(row.count) }))),
        dualLeaderboardSlide('Wörter', 'Emojis & Reaktionen', {
          leftTitle: 'Top Emojis',
          leftItems: topEmojis.map((row) => ({ label: row.emoji, value: formatNumber(row.count) })),
          rightTitle: 'Top Reaktionen',
          rightItems: topReactions.map((row) => ({ label: row.reaction_family, value: formatNumber(row.count) })),
        }),
        quoteHeroSlide('WhatsApp', iconicQuote?.quote || 'Dario ist so ein Vogel', `Geschrieben von ${deSender(iconicQuote?.true_sender || 'Julian RR')} — einer dieser Sätze, die sofort hängenbleiben.`),
        summaryBoardSlide('Wörter', 'Sprach-Überblick', [
          { label: 'Top-Wort', value: deWord(topWord) },
          { label: 'Top-Emoji', value: topEmojis[0]?.emoji || '💪' },
          { label: 'Top-Reaktion', value: topReactions[0]?.reaction_family || 'hahaha' },
          { label: 'Signatur', value: deWord(signatureJulian?.token || 'auf jeden fall') },
          { label: 'Zitat', value: 'Vogel' },
        ], 'Euer Chat hatte eine eigene Sprache: kurz, direkt, wiedererkennbar.'),
      ],
    },
    {
      id: 'phasen',
      theme: 'lime',
      kicker: 'Phasen',
      title: 'Das Wettrennen der Themen',
      orbText: 'RENN',
      caption: 'Phasen',
      slides: [
        claimSlide('Phasen', 'Mit der Zeit wurde alles größer.', 'Erst Schule. Dann Workout. Dann WRM. Dann Schülersprecher. Dann Bildungsbrücke.', 'Die Themen liefen nicht nebeneinander — sie haben sich regelrecht gegenseitig abgelöst.'),
        raceSlide('Phasen', 'Themen-Rennen', phaseTopics),
        eraCardsSlide('Phasen', 'Große Eras', mainEras.slice(0, 5).map((era) => ({
          title: era.era_label,
          value: formatNumber(era.messages_in_era),
          text: `${monthName(era.start_month)} bis ${monthName(era.end_month)}`,
        }))),
        claimSlide('Phasen', 'Der eigentliche Shift', 'Aus Chat wurde WRM.', 'Ab 2024 lief eure Freundschaft nicht mehr nur über Nachrichten, sondern über ein eigenes System.'),
        summaryBoardSlide('Phasen', 'Phasen-Überblick', [
          { label: 'Größtes Thema', value: deTopic(phaseTopics[0]?.topic) },
          { label: 'Peak Abitur', value: peakMonthForTopic(data.topic_superlatives, 'Abitur') },
          { label: 'Peak WRM', value: peakMonthForTopic(data.topic_superlatives, 'WRM_Notion') },
          { label: 'Peak Schülerspr.', value: peakMonthForTopic(data.topic_superlatives, 'Schuelersprecher') },
          { label: 'Launch', value: 'Bildungsbrücke' },
        ], 'Die Geschichte bestand aus klaren Etappen — und fast jede hatte ihr eigenes Leitmotiv.'),
      ],
    },
    {
      id: 'flashbacks',
      theme: 'amber',
      kicker: 'Rückblicke',
      title: 'Zurück in einzelne Momente',
      orbText: 'RÜCK',
      caption: 'Erinnerungen',
      slides: [
        ...flashbackSlides,
        summaryBoardSlide('Rückblicke', 'Was hängen bleibt', [
          { label: 'Kälte-Hype', value: 'Neujahr' },
          { label: 'Gärtnerbot', value: 'Build-Phase' },
          { label: 'Lithium', value: 'Rettungsaktion' },
          { label: 'Schach', value: 'Trash Talk' },
          { label: 'Australien', value: 'Reef-Lore' },
        ], 'Nicht jeder große Moment war lang. Manche waren einfach sofort ikonisch.'),
      ],
    },
    {
      id: 'quiz',
      theme: 'violet',
      kicker: 'Quiz',
      title: 'Erraten statt nur anschauen',
      orbText: 'QUIZ',
      caption: 'Mitspielen',
      slides: [
        quizQuestionSlide('Quiz', 'Wer hat das geschrieben?', quoteA?.quote || 'Dario ist so ein Vogel', ['Julian RR', 'johann'], 'quote-1'),
        quizRevealSlide('Quiz', 'Auflösung', deSender(quoteA?.true_sender || 'Julian RR'), () => stateText('quote-1', quoteA?.true_sender || 'Julian RR'), quoteA?.note || 'Projektfrust mit Stil.'),
        quizQuestionSlide('Quiz', 'Wer hat das geschrieben?', quoteB?.quote || 'Ich zieh dich so ab du loser', ['Julian RR', 'johann'], 'quote-2'),
        quizRevealSlide('Quiz', 'Auflösung', deSender(quoteB?.true_sender || 'Julian RR'), () => stateText('quote-2', quoteB?.true_sender || 'Julian RR'), quoteB?.note || 'Trash Talk gehört dazu.'),
        quizQuestionSlide('Quiz', 'Welche WRM-Nummer war das?', [wrmQuiz?.[1], wrmQuiz?.[2], wrmQuiz?.[3]].filter(Boolean).join(' · '), ['WRM 23', 'WRM 51', 'WRM 75'], 'wrm-1'),
        quizRevealSlide('Quiz', 'Auflösung', wrmQuizAnswer?.[1] || 'WRM 23', () => stateText('wrm-1', wrmQuizAnswer?.[1] || 'WRM 23'), wrmQuizAnswer?.[3] || 'Frühe Abi-Optimierung mit 1,0-Logik und 5. PK-Fokus.'),
      ],
    },
    {
      id: 'wrm',
      theme: 'aqua',
      kicker: 'WRM',
      title: 'Das Betriebssystem',
      orbText: String(ACTUAL_WRMS_DONE),
      caption: 'WRMs',
      slides: [
        claimSlide('WRM', 'Ab hier war es ein System.', `${ACTUAL_WRMS_DONE} Weekly Refreshing Meetings`, 'Nicht einfach nur Pläne, sondern ein eigenes Ritual mit Rhythmus, Aufgaben und Review.'),
        heroStatSlide('WRM', 'Sichtbar in der Datenbank', wrmTasksLowerBound, 'Öffentlich sichtbar als große Task-Masse im Notion-System.'),
        divisionSlide('WRM', 'Division of Life', wrmDivisions),
        identitySlide('WRM', 'Johann-Core', wrmCoreJohann),
        identitySlide('WRM', 'Julian-Core', wrmCoreJulian),
        summaryBoardSlide('WRM', 'WRM-Überblick', [
          { label: 'Gemacht', value: String(ACTUAL_WRMS_DONE) },
          { label: 'Tasks', value: wrmTasksLowerBound },
          { label: 'Leitwelt', value: 'Schule' },
          { label: 'Zweitwelt', value: 'Organisation' },
          { label: 'Langfristig', value: 'Karriere / Verein' },
        ], 'Das WRM war die Stelle, an der aus Ehrgeiz ein echtes System wurde.'),
      ],
    },
    {
      id: 'geburtstag',
      theme: 'gold',
      kicker: 'Zum Schluss',
      title: 'Zum 18. Geburtstag',
      orbText: '18',
      caption: 'Julian',
      slides: [
        claimSlide('Geburtstag', 'Herzlichen Glückwunsch zum 18. Geburtstag, Julian.', 'Das hier ist dein Wrapped.', 'Und es zeigt ziemlich klar, was in den letzten Jahren schon alles drinsteckte.'),
        heroStatSlide('Geburtstag', 'Schon geschafft', '1,0', 'Als Schnitt gehalten — und damit das große Ziel wirklich erreicht.'),
        heroStatSlide('Geburtstag', 'Zusammen gebaut', String(ACTUAL_WRMS_DONE), 'WRMs, die nicht nur geplant, sondern wirklich gemacht wurden.'),
        summaryBoardSlide('Geburtstag', 'Was bleibt', [
          { label: 'Geburtstag', value: '18' },
          { label: 'Schnitt', value: '1,0' },
          { label: 'WRMs', value: String(ACTUAL_WRMS_DONE) },
          { label: 'Nachrichten', value: formatNumber(totalMessages) },
          { label: 'System', value: 'gebaut' },
        ], 'Von Nachrichten zu WRMs, von Phasen zu Projekten — ziemlich gutes Timing für einen 18. Geburtstag.'),
      ],
    },
  ];

  return stories;
}

function buildPhaseRace(data) {
  const rows = (data.topic_superlatives || []).map((row) => ({
    topic: row.topic,
    label: deTopic(row.topic),
    total: row.total_hits,
    peakMonth: monthName(row.peak_month),
  }));
  return rows
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 7)
    .map((row, index, arr) => ({
      ...row,
      place: index + 1,
      progress: row.total / arr[0].total,
    }));
}

function pickCoreTasks(rows, personPrefix) {
  return (rows || [])
    .filter((row) => String(row[0] || '').startsWith(personPrefix))
    .slice(0, 3)
    .map((row) => ({
      title: translateCoreTask(row[1]),
      text: row[2],
    }));
}

function buildDivisionSummary(rows) {
  const picked = [];
  for (const row of rows || []) {
    if (row[0] === 'Current visible week snapshot' && row[1] !== 'Unlabeled / context tasks') {
      picked.push({
        label: translateDivision(row[1]),
        value: row[2],
      });
    }
  }
  return picked.slice(0, 5);
}

function extractTaskLowerBound(creativeIdeas, overview) {
  const hit = (creativeIdeas || []).find((row) => String(row[0]).includes('630+'));
  if (hit) return '630+';
  const overviewHit = (overview || []).find((row) => String(row[0]).includes('Tasks') || String(row[1]).includes('630'));
  return overviewHit?.[1] || '630+';
}

function buildFlashbackScene(data, flashbackId) {
  const meta = (data.flashbacks || []).find((row) => row.flashback_id === flashbackId);
  const messages = (data.flashback_messages || [])
    .filter((row) => row.flashback_id === flashbackId && row.msg_type === 'text')
    .slice(0, flashbackId === 'FB3' ? 4 : 3)
    .map((row) => ({
      sender: deSender(row.sender),
      text: row.message,
      own: row.sender === 'johann',
    }));
  if (!meta || !messages.length) return null;
  return {
    date: formatDateTime(meta.date_start),
    note: meta.why_it_is_fun,
    messages,
  };
}

function heroStatSlide(kicker, title, value, text) {
  return {
    kind: 'hero',
    html: `
      <article class="slide-layout slide-layout--hero">
        ${fxLayer()}
        <p class="kicker reveal reveal--1">${escapeHtml(kicker)}</p>
        <p class="micro-title reveal reveal--2">${escapeHtml(title)}</p>
        <div class="hero-value reveal reveal--3">${escapeHtml(value)}</div>
        <p class="support-copy reveal reveal--4">${escapeHtml(text)}</p>
      </article>
    `,
  };
}

function claimSlide(kicker, title, claim, text) {
  return {
    kind: 'claim',
    html: `
      <article class="slide-layout slide-layout--claim">
        ${fxLayer()}
        <p class="kicker reveal reveal--1">${escapeHtml(kicker)}</p>
        <p class="micro-title reveal reveal--2">${escapeHtml(title)}</p>
        <div class="claim-value reveal reveal--3">${escapeHtml(claim)}</div>
        <p class="support-copy reveal reveal--4">${escapeHtml(text)}</p>
      </article>
    `,
  };
}

function summaryBoardSlide(kicker, title, stats, text) {
  return {
    kind: 'summary',
    html: `
      <article class="slide-layout slide-layout--summary">
        ${fxLayer()}
        <p class="kicker reveal reveal--1">${escapeHtml(kicker)}</p>
        <p class="micro-title reveal reveal--2">${escapeHtml(title)}</p>
        <div class="metric-board reveal-group reveal--3">
          ${stats.map((stat, index) => `
            <div class="metric-card reveal reveal--${Math.min(index + 3, 6)}">
              <div class="metric-card__value">${escapeHtml(stat.value)}</div>
              <div class="metric-card__label">${escapeHtml(stat.label)}</div>
            </div>
          `).join('')}
        </div>
        <p class="support-copy reveal reveal--6">${escapeHtml(text)}</p>
      </article>
    `,
  };
}

function leaderboardSlide(kicker, title, items) {
  return {
    kind: 'rank',
    html: `
      <article class="slide-layout slide-layout--rank">
        ${fxLayer()}
        <p class="kicker reveal reveal--1">${escapeHtml(kicker)}</p>
        <p class="micro-title reveal reveal--2">${escapeHtml(title)}</p>
        <ol class="rank-list reveal-group reveal--3">
          ${items.map((item, index) => `
            <li class="rank-item rank-item--${index + 1} reveal reveal--${Math.min(index + 3, 6)}">
              <span class="rank-item__place">#${index + 1}</span>
              <span class="rank-item__label">${escapeHtml(item.label)}</span>
              <span class="rank-item__value">${escapeHtml(item.value)}</span>
            </li>
          `).join('')}
        </ol>
      </article>
    `,
  };
}

function dualLeaderboardSlide(kicker, title, payload) {
  return {
    kind: 'dual-rank',
    html: `
      <article class="slide-layout slide-layout--dual-rank">
        ${fxLayer()}
        <p class="kicker reveal reveal--1">${escapeHtml(kicker)}</p>
        <p class="micro-title reveal reveal--2">${escapeHtml(title)}</p>
        <div class="dual-rank-grid reveal-group reveal--3">
          <section class="mini-rank reveal reveal--3">
            <h3>${escapeHtml(payload.leftTitle)}</h3>
            ${payload.leftItems.slice(0, 4).map((item, index) => `
              <div class="mini-rank__item reveal reveal--${Math.min(index + 3, 6)}"><span>#${index + 1}</span><strong>${escapeHtml(item.label)}</strong><em>${escapeHtml(item.value)}</em></div>
            `).join('')}
          </section>
          <section class="mini-rank reveal reveal--4">
            <h3>${escapeHtml(payload.rightTitle)}</h3>
            ${payload.rightItems.slice(0, 4).map((item, index) => `
              <div class="mini-rank__item reveal reveal--${Math.min(index + 4, 6)}"><span>#${index + 1}</span><strong>${escapeHtml(item.label)}</strong><em>${escapeHtml(item.value)}</em></div>
            `).join('')}
          </section>
        </div>
      </article>
    `,
  };
}

function quoteHeroSlide(kicker, quote, text) {
  return {
    kind: 'quote',
    html: `
      <article class="slide-layout slide-layout--quote">
        ${fxLayer()}
        <p class="kicker reveal reveal--1">${escapeHtml(kicker)}</p>
        <blockquote class="quote-hero reveal reveal--3">„${escapeHtml(quote)}“</blockquote>
        <p class="support-copy reveal reveal--4">${escapeHtml(text)}</p>
      </article>
    `,
  };
}

function raceSlide(kicker, title, racers) {
  return {
    kind: 'race',
    html: `
      <article class="slide-layout slide-layout--race">
        ${fxLayer()}
        <p class="kicker reveal reveal--1">${escapeHtml(kicker)}</p>
        <p class="micro-title reveal reveal--2">${escapeHtml(title)}</p>
        <div class="race-track reveal-group reveal--3">
          ${racers.map((racer, index) => `
            <div class="race-row reveal reveal--${Math.min(index + 3, 6)}" style="--race-progress:${racer.progress.toFixed(3)}">
              <div class="race-row__place">${racer.place}</div>
              <div class="race-row__body">
                <div class="race-row__meta"><strong>${escapeHtml(racer.label)}</strong><span>${escapeHtml(racer.peakMonth)}</span></div>
                <div class="race-row__lane"><span class="race-row__run"></span><span class="race-row__dot"></span></div>
              </div>
              <div class="race-row__value">${formatNumber(racer.total)}</div>
            </div>
          `).join('')}
        </div>
      </article>
    `,
  };
}

function eraCardsSlide(kicker, title, cards) {
  return {
    kind: 'eras',
    html: `
      <article class="slide-layout slide-layout--eras">
        ${fxLayer()}
        <p class="kicker reveal reveal--1">${escapeHtml(kicker)}</p>
        <p class="micro-title reveal reveal--2">${escapeHtml(title)}</p>
        <div class="era-grid reveal-group reveal--3">
          ${cards.map((card, index) => `
            <div class="era-card reveal reveal--${Math.min(index + 3, 6)}">
              <div class="era-card__title">${escapeHtml(card.title)}</div>
              <div class="era-card__value">${escapeHtml(card.value)}</div>
              <div class="era-card__text">${escapeHtml(card.text)}</div>
            </div>
          `).join('')}
        </div>
      </article>
    `,
  };
}

function renderFlashbackSlide(scene) {
  return `
    <article class="slide-layout slide-layout--flashback">
      ${fxLayer()}
      <p class="kicker reveal reveal--1">Rückblick · ${escapeHtml(scene.date)}</p>
      <div class="flashback-scene reveal-group reveal--2">
        ${scene.messages.map((message, index) => `
          <div class="chat-bubble ${message.own ? 'chat-bubble--own' : 'chat-bubble--other'} reveal reveal--${Math.min(index + 2, 6)}">
            <span class="chat-bubble__sender">${escapeHtml(message.sender)}</span>
            <p>${escapeHtml(message.text)}</p>
          </div>
        `).join('')}
      </div>
      <p class="support-copy reveal reveal--6">${escapeHtml(scene.note)}</p>
    </article>
  `;
}

function quizQuestionSlide(kicker, title, question, options, group) {
  return {
    kind: 'quiz',
    interactive: true,
    html: `
      <article class="slide-layout slide-layout--quiz">
        ${fxLayer()}
        <p class="quiz-tag reveal reveal--1">QUIZ</p>
        <p class="micro-title reveal reveal--2">${escapeHtml(title)}</p>
        <div class="quiz-question reveal reveal--3">${escapeHtml(question)}</div>
        <div class="quiz-options reveal-group reveal--4">
          ${options.map((option, index) => `
            <button class="quiz-choice reveal reveal--${Math.min(index + 4, 6)}" type="button" data-quiz-group="${group}" data-quiz-choice="${escapeHtml(option)}">${escapeHtml(deSender(option))}</button>
          `).join('')}
        </div>
      </article>
    `,
  };
}

function quizRevealSlide(kicker, title, result, selectedText, note) {
  return {
    kind: 'quiz-reveal',
    render: () => `
      <article class="slide-layout slide-layout--quiz-reveal">
        ${fxLayer()}
        <p class="quiz-tag reveal reveal--1">${escapeHtml(kicker)}</p>
        <p class="micro-title reveal reveal--2">${escapeHtml(title)}</p>
        <div class="hero-value reveal reveal--3">${escapeHtml(result)}</div>
        <p class="quiz-result reveal reveal--4">${escapeHtml(selectedText())}</p>
        <p class="support-copy reveal reveal--5">${escapeHtml(note)}</p>
      </article>
    `,
  };
}

function divisionSlide(kicker, title, divisions) {
  return {
    kind: 'division',
    html: `
      <article class="slide-layout slide-layout--division">
        ${fxLayer()}
        <p class="kicker reveal reveal--1">${escapeHtml(kicker)}</p>
        <p class="micro-title reveal reveal--2">${escapeHtml(title)}</p>
        <div class="division-stack reveal-group reveal--3">
          ${divisions.map((item, index) => `
            <div class="division-row reveal reveal--${Math.min(index + 3, 6)}">
              <span>${escapeHtml(item.label)}</span>
              <strong>${escapeHtml(item.value)}</strong>
            </div>
          `).join('')}
        </div>
      </article>
    `,
  };
}

function identitySlide(kicker, title, items) {
  return {
    kind: 'identity',
    html: `
      <article class="slide-layout slide-layout--identity">
        ${fxLayer()}
        <p class="kicker reveal reveal--1">${escapeHtml(kicker)}</p>
        <p class="micro-title reveal reveal--2">${escapeHtml(title)}</p>
        <div class="identity-list reveal-group reveal--3">
          ${items.map((item, index) => `
            <div class="identity-card reveal reveal--${Math.min(index + 3, 6)}">
              <h3>${escapeHtml(item.title)}</h3>
              <p>${escapeHtml(item.text)}</p>
            </div>
          `).join('')}
        </div>
      </article>
    `,
  };
}

function fxLayer() {
  return `
    <div class="fx fx--halo reveal reveal--1"></div>
    <div class="fx fx--ribbon reveal reveal--2"></div>
    <div class="fx fx--grain"></div>
  `;
}

function stateText(group, truth) {
  const selected = state.quizSelections[group];
  if (!selected) return `Richtig ist: ${deSender(truth)}`;
  return selected === truth ? 'Richtig geraten.' : `Du hattest ${deSender(selected)} getippt.`;
}

function formatNumber(value) {
  return new Intl.NumberFormat('de-DE').format(Number(value) || 0);
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value.replace(' ', 'T'));
  return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

function monthName(value) {
  if (!value) return '';
  const date = new Date(`${value}-01T00:00:00`);
  return new Intl.DateTimeFormat('de-DE', { month: 'short', year: '2-digit' }).format(date).replace('.', '');
}

function timeOnly(value) {
  if (!value) return '';
  const match = String(value).match(/(\d{2}:\d{2})/);
  return match ? match[1] : '';
}

function weekdayDe(value) {
  const map = {
    Monday: 'Montag',
    Tuesday: 'Dienstag',
    Wednesday: 'Mittwoch',
    Thursday: 'Donnerstag',
    Friday: 'Freitag',
    Saturday: 'Samstag',
    Sunday: 'Sonntag',
  };
  return map[value] || value || '';
}

function deTopic(topic) {
  const map = {
    Schuelersprecher: 'Schülersprecher',
    Abitur: 'Abitur',
    Gaertnerbot: 'Gärtnerbot',
    Bildungsbruecke: 'Bildungsbrücke',
    WRM_Notion: 'WRM / Notion',
    Workout_Schwimmen: 'Workout / Schwimmen',
    Australien: 'Australien',
    Schnelligkeit: 'Schnelligkeit',
  };
  return map[topic] || topic || '';
}

function deSender(sender) {
  if (sender === 'johann') return 'Johann';
  if (sender === 'Julian RR') return 'Julian';
  return sender || '';
}

function deWord(word) {
  if (!word) return '';
  if (String(word).toLowerCase() === 'wrm') return 'WRM';
  return String(word);
}

function translateCoreTask(value) {
  const map = {
    'Sleep / sleeping schedule / selfcare discipline': 'Schlaf & Selbstdisziplin',
    'Exam prep / school prep / old exams': 'Klausuren & Vorbereitung',
    'Organisation systems': 'Systeme & Organisation',
    'Music / clarinet': 'Musik & Klarinette',
    'Website / association / project push': 'Website & Verein',
    'School excellence / oral grades / exam pressure': 'Schule & Leistung',
    'Football / sport / conditions': 'Fußball & Sport',
    'Career / internship / applications': 'Karriere & Bewerbungen',
    'Contacts / networking / databases': 'Kontakte & Netzwerke',
    'Selfcare / theory app / sleep': 'Selbstpflege & Routinen',
  };
  return map[value] || value;
}

function translateDivision(value) {
  const map = {
    Organise: 'Organisation',
    School: 'Schule',
    Personal: 'Persönlich',
    Selfcare: 'Selfcare',
    'CV & Career': 'CV & Karriere',
    Sport: 'Sport',
  };
  return map[value] || value;
}

function peakMonthForTopic(rows, topic) {
  const row = (rows || []).find((item) => item.topic === topic);
  return monthName(row?.peak_month) || '—';
}

function sum(values) {
  return values.reduce((acc, value) => acc + Number(value || 0), 0);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
