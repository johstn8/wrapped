const DATA_URL = './data/friendship_wrapped_data.json';

const state = {
  data: null,
  stories: [],
  activeStoryIndex: 0,
  activeSlideIndex: 0,
  autoplay: true,
  autoplayRaf: null,
  autoplayStart: 0,
  progress: 0,
  prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  flashbackPointer: {},
  quizSelections: {},
  touchStartX: 0,
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
    document.getElementById('loadingScreen').classList.add('hidden');
    document.getElementById('app').classList.remove('app--loading');
  } catch (error) {
    console.error(error);
    document.getElementById('loadingScreen').classList.add('hidden');
    document.getElementById('errorScreen').classList.remove('hidden');
  }
}

function cacheElements() {
  els.app = document.getElementById('app');
  els.homeScreen = document.getElementById('homeScreen');
  els.homeSummary = document.getElementById('homeSummary');
  els.storyGrid = document.getElementById('storyGrid');
  els.playAllButton = document.getElementById('playAllButton');
  els.storyPlayer = document.getElementById('storyPlayer');
  els.progressBars = document.getElementById('progressBars');
  els.playerTitle = document.getElementById('playerTitle');
  els.playerEyebrow = document.getElementById('playerEyebrow');
  els.playerCounter = document.getElementById('playerCounter');
  els.storySlide = document.getElementById('storySlide');
  els.closePlayerButton = document.getElementById('closePlayerButton');
  els.pauseButton = document.getElementById('pauseButton');
  els.tapLeft = document.getElementById('tapLeft');
  els.tapRight = document.getElementById('tapRight');
  els.prevStoryButton = document.getElementById('prevStoryButton');
  els.nextStoryButton = document.getElementById('nextStoryButton');
  els.orientationGuard = document.getElementById('orientationGuard');
  els.storyFrame = document.getElementById('storyFrame');
}

function bindUI() {
  els.playAllButton.addEventListener('click', () => openStory(0, 0));
  els.closePlayerButton.addEventListener('click', closeStoryPlayer);
  els.pauseButton.addEventListener('click', toggleAutoplay);
  els.tapLeft.addEventListener('click', previousSlide);
  els.tapRight.addEventListener('click', nextSlide);
  els.prevStoryButton.addEventListener('click', previousStory);
  els.nextStoryButton.addEventListener('click', nextStory);
  els.storyGrid.addEventListener('click', onStoryGridClick);
  els.storySlide.addEventListener('click', onSlideInteraction);

  window.addEventListener('resize', updateOrientationGuard);
  window.addEventListener('orientationchange', updateOrientationGuard);

  els.storyFrame.addEventListener('touchstart', (event) => {
    state.touchStartX = event.changedTouches[0].clientX;
  }, { passive: true });

  els.storyFrame.addEventListener('touchend', (event) => {
    const endX = event.changedTouches[0].clientX;
    const delta = endX - state.touchStartX;
    if (Math.abs(delta) < 45) return;
    if (delta < 0) nextSlide();
    else previousSlide();
  }, { passive: true });
}

function updateOrientationGuard() {
  const isLandscape = window.innerWidth > window.innerHeight;
  const isTouchLike = window.innerWidth < 1100;
  els.orientationGuard.style.display = isLandscape && isTouchLike ? 'grid' : 'none';
}

function onStoryGridClick(event) {
  const button = event.target.closest('.story-bubble');
  if (!button) return;
  const storyId = button.dataset.storyId;
  const storyIndex = state.stories.findIndex((story) => story.id === storyId);
  if (storyIndex >= 0) openStory(storyIndex, 0);
}

function toggleAutoplay() {
  state.autoplay = !state.autoplay;
  els.pauseButton.textContent = state.autoplay ? '❚❚' : '▶';
  if (state.autoplay) startAutoplay();
  else stopAutoplay();
}

function closeStoryPlayer() {
  stopAutoplay();
  els.storyPlayer.classList.add('hidden');
  els.homeScreen.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function openStory(storyIndex, slideIndex = 0) {
  state.activeStoryIndex = clamp(storyIndex, 0, state.stories.length - 1);
  state.activeSlideIndex = clamp(slideIndex, 0, getActiveStory().slides.length - 1);
  els.homeScreen.classList.add('hidden');
  els.storyPlayer.classList.remove('hidden');
  renderActiveStory();
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
  openStory(previous, 0);
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
  const data = state.data;
  const balance = data.summary.message_balance || [];
  const messageA = balance[0] || { sender: 'Johann', share_pct: 0.5 };
  const messageB = balance[1] || { sender: 'Julian RR', share_pct: 0.5 };
  els.homeSummary.textContent = `${formatNumber(data.summary.total_messages)} Nachrichten, ${data.summary.active_days} aktive Tage, ${data.wrm_overview?.[1]?.[1] || '91'} WRMs — und irgendwo dazwischen wurde aus Chat ein Betriebssystem.`;

  els.storyGrid.innerHTML = state.stories.map((story, index) => `
    <button class="story-bubble" data-story-id="${story.id}" data-theme="${story.theme}" type="button" aria-label="${story.title} öffnen">
      <div class="story-bubble__ring">
        <div class="story-bubble__inner">
          <div class="story-bubble__icon">${story.icon}</div>
          <div class="story-bubble__count">${String(story.slides.length).padStart(2, '0')} Slides</div>
        </div>
      </div>
      <div class="story-bubble__title">${story.title}</div>
      <div class="story-bubble__meta">${story.homeLabel}</div>
    </button>
  `).join('');
}

function renderActiveStory() {
  const story = getActiveStory();
  const slide = story.slides[state.activeSlideIndex];
  stopAutoplay();

  els.storyPlayer.className = `story-player theme-${story.theme}`;
  els.playerTitle.textContent = story.title;
  els.playerEyebrow.textContent = story.kicker;
  els.playerCounter.textContent = `${state.activeSlideIndex + 1} / ${story.slides.length}`;

  els.progressBars.innerHTML = story.slides.map((_, index) => `
    <div class="progress-segment ${index === state.activeSlideIndex ? 'is-active' : ''}">
      <div class="progress-segment__fill" data-progress-index="${index}"></div>
    </div>
  `).join('');

  els.storySlide.innerHTML = slide.html;
  syncProgressBars(0);
  if (!state.prefersReducedMotion && state.autoplay && !slide.interactive) {
    startAutoplay(slide.duration || 6800);
  } else {
    syncProgressBars(1);
  }
}

function startAutoplay(duration = 6800) {
  stopAutoplay();
  state.autoplayStart = performance.now();
  const currentStory = state.activeStoryIndex;
  const currentSlide = state.activeSlideIndex;

  const step = (now) => {
    if (currentStory !== state.activeStoryIndex || currentSlide !== state.activeSlideIndex) return;
    const progress = clamp((now - state.autoplayStart) / duration, 0, 1);
    syncProgressBars(progress);
    if (progress >= 1) {
      nextSlide();
      return;
    }
    state.autoplayRaf = requestAnimationFrame(step);
  };

  state.autoplayRaf = requestAnimationFrame(step);
}

function stopAutoplay() {
  if (state.autoplayRaf) cancelAnimationFrame(state.autoplayRaf);
  state.autoplayRaf = null;
}

function syncProgressBars(currentProgress = 0) {
  [...els.progressBars.querySelectorAll('.progress-segment__fill')].forEach((bar, index) => {
    let width = 0;
    if (index < state.activeSlideIndex) width = 100;
    else if (index === state.activeSlideIndex) width = Math.round(currentProgress * 100);
    bar.style.width = `${width}%`;
  });
}

function onSlideInteraction(event) {
  const choice = event.target.closest('[data-quiz-group]');
  if (choice) {
    event.stopPropagation();
    handleQuizChoice(choice);
    return;
  }

  const flashbackButton = event.target.closest('[data-flashback-action]');
  if (flashbackButton) {
    event.stopPropagation();
    handleFlashbackPaging(flashbackButton);
    return;
  }

  const actionButton = event.target.closest('[data-action]');
  if (actionButton) {
    event.stopPropagation();
    const action = actionButton.dataset.action;
    if (action === 'replay') openStory(0, 0);
    if (action === 'home') closeStoryPlayer();
  }
}

function handleQuizChoice(button) {
  const groupId = button.dataset.quizGroup;
  const selected = button.dataset.value;
  const correct = button.dataset.answer;
  if (state.quizSelections[groupId]) return;
  state.quizSelections[groupId] = selected;

  const group = els.storySlide.querySelector(`[data-quiz-id="${groupId}"]`);
  if (!group) return;

  [...group.querySelectorAll('[data-quiz-group]')].forEach((item) => {
    const isCorrect = item.dataset.value === correct;
    const isSelected = item.dataset.value === selected;
    if (isCorrect) item.classList.add('is-correct');
    if (isSelected && !isCorrect) item.classList.add('is-wrong');
    item.disabled = true;
  });

  const feedback = group.querySelector('.quiz-feedback');
  if (feedback) feedback.hidden = false;
}

function handleFlashbackPaging(button) {
  const flashbackId = button.dataset.flashbackId;
  const direction = button.dataset.flashbackAction;
  const slideNode = els.storySlide.querySelector(`[data-flashback-id="${flashbackId}"]`);
  if (!slideNode) return;
  const messages = getFlashbackChunks(flashbackId);
  if (!messages.length) return;

  const totalPages = Math.ceil(messages.length / 3);
  const current = state.flashbackPointer[flashbackId] || 0;
  const nextPage = direction === 'next'
    ? (current + 1) % totalPages
    : (current - 1 + totalPages) % totalPages;

  state.flashbackPointer[flashbackId] = nextPage;
  slideNode.querySelector('[data-flashback-page]').textContent = `${nextPage + 1} / ${totalPages}`;
  slideNode.querySelector('[data-flashback-messages]').innerHTML = renderFlashbackMessagePage(messages, nextPage);
}

function buildStories(data) {
  const summary = data.summary;
  const monthlyPeak = maxBy(data.monthly_activity, 'total_messages');
  const topDay = data.top_chat_days?.[0];
  const topDay2 = data.top_chat_days?.[1];
  const weekdayPeak = maxBy(data.weekday_activity_extended, 'messages');
  const quickJulian = data.response_time_summary?.find((row) => row.scope === '<= 3h') || data.response_time_summary?.[0];
  const reactionsTop = data.reactions?.slice(0, 6) || [];
  const topWords = data.top_words_curated?.slice(0, 6) || [];
  const emojiTop = data.emojis?.slice(0, 8) || [];
  const flashbacks = data.flashbacks || [];
  const yearlyPicks = data.word_of_year || [];
  const vibeTop = data.vibe_meter || [];
  const repeatedPhrases = data.repeated_phrases?.slice(0, 6) || [];
  const signaturesJulian = (data.sender_signatures || []).filter((item) => item.sender === 'Julian RR').slice(0, 3);
  const signaturesJohann = (data.sender_signatures || []).filter((item) => item.sender === 'johann').slice(0, 3);
  const wrmNumbers = wrmOverviewMap(data.wrm_overview);
  const wrmQuizzes = parseWrmNotesQuiz(data.wrm_notes_quiz);
  const wrmCore = parseWrmCoreTasks(data.wrm_core_tasks);
  const wrmDivisions = parseWrmDivisions(data.wrm_division_life);
  const wrmEras = parseWrmEras(data.wrm_eras);
  const wrmBackOfMind = parseSimpleArrayList(data.wrm_back_of_mind, ['idea', 'why', 'visual', 'source']).slice(0, 4);
  const wrmAlignment = parseSimpleArrayList(data.wrm_topic_alignment, ['topic', 'phase', 'evidence', 'use', 'visual', 'priority']);
  const extraCategories = data.extra_categories?.slice(0, 6) || [];
  const topicSuperlatives = data.topic_superlatives?.slice(0, 6) || [];
  const yearlySummary = data.yearly_summary || [];
  const mediaBreakdown = data.media_breakdown?.slice(0, 5) || [];
  const repeatedTitle = repeatedPhrases[0]?.phrase || 'gute nacht';
  const vibePlan = vibeTop.find((v) => v.vibe === 'Planungsmodus') || vibeTop[0];
  const vibeHype = vibeTop.find((v) => v.vibe === 'Hype') || vibeTop[1] || vibeTop[0];
  const dayStart = data.day_starters_summary || [];
  const openingsJulian = (data.day_starter_openings || []).filter((row) => row.sender === 'Julian RR').slice(0, 4);
  const openingsJohann = (data.day_starter_openings || []).filter((row) => row.sender === 'johann').slice(0, 4);
  const session1 = data.session_highlights?.[0];
  const session2 = data.session_highlights?.[1];
  const quoteGame = (data.quote_game || []).slice(0, 2).map((item) => {
    const answer = (data.quote_answers || []).find((entry) => entry.quote_id === item.quote_id);
    return {
      id: item.quote_id,
      quote: item.quote,
      answer: answer?.true_sender || 'Unbekannt',
      note: answer?.note || '',
    };
  });

  const stories = [
    {
      id: 'intro',
      title: 'Intro',
      kicker: 'Start',
      homeLabel: 'Der große Auftakt',
      icon: '◎',
      theme: 'ultraviolet',
      slides: [
        createCoverSlide({
          theme: 'ultraviolet',
          kicker: 'Friendship Wrapped',
          title: 'Johann × Julian',
          body: 'Nicht nur Chat. Nicht nur Schule. Sondern ein eigenes System aus Ehrgeiz, Ritualen, WRMs, Projekten und Insider-Geschichte.',
          tags: ['2022 → 2026', `${formatNumber(summary.total_messages)} Nachrichten`, `${wrmNumbers['WRMs listed on main page'] || '91'} WRMs`],
        }),
        createBigNumberSlide({
          theme: 'ultraviolet',
          kicker: 'Erstmal die Größenordnung',
          number: formatNumber(summary.total_messages),
          label: 'Nachrichten insgesamt',
          body: `${summary.active_days} aktive Tage. Eure Freundschaft hat also nicht nur Peaks — sie hat echte Laufzeit.`,
          stats: [
            `${summary.active_days} Tage aktiv`,
            `${summary.longest_streak_days} Tage Streak`,
            `${summary.avg_daily_peak_2h_window_label} Prime Time`,
          ],
        }),
        createMetricGridSlide({
          theme: 'ultraviolet',
          kicker: 'Fast absurd gleichmäßig',
          title: 'Fast exakt 50/50',
          body: 'Schon der Einstieg zeigt: Das hier war nie eine Einbahnstraße.',
          metrics: (summary.message_balance || []).map((entry) => ({
            label: entry.sender === 'johann' ? 'Johann' : 'Julian',
            value: `${(entry.share_pct * 100).toFixed(1)}%`,
            body: `${formatNumber(entry.messages)} Nachrichten`,
          })).concat([
            {
              label: 'Symmetrie-Score',
              value: findExtra(extraCategories, 'Symmetrie-Score') || '0.983',
              body: '1.0 wäre komplett gleichmäßig — ihr wart sehr nah dran.',
            },
            {
              label: 'Stärkste Phase',
              value: monthlyPeak?.month || '2025-10',
              body: `${formatNumber(monthlyPeak?.total_messages || 0)} Nachrichten in einem Monat`,
            },
          ]),
        }),
        createStatementSlide({
          theme: 'ultraviolet',
          kicker: 'Der Grundton',
          title: 'Aus einem Chat wurde mit der Zeit eine gemeinsame Architektur.',
          body: 'Erst schreiben. Dann planen. Dann Systeme bauen. Dann Projekte starten. Genau so geht diese Story weiter.',
          actionLabel: 'Weiter',
        }),
      ],
    },
    {
      id: 'chat',
      title: 'Chat',
      kicker: 'Verbindung',
      homeLabel: 'Peaks, Sessions, Antworten',
      icon: '↔',
      theme: 'aqua',
      slides: [
        createCoverSlide({
          theme: 'aqua',
          kicker: 'Chat-Dynamik',
          title: 'Das Rohmaterial der Freundschaft',
          body: 'Wann es laut war. Wann es intensiv wurde. Und wann ihr euch fast live geantwortet habt.',
          tags: [`Peak-Monat ${monthlyPeak?.month || ''}`, `${weekdayPeak?.weekday || 'Monday'} am stärksten`],
        }),
        createChartSlide({
          theme: 'aqua',
          kicker: 'Kommunikationskurve',
          title: `Peak-Monat: ${monthlyPeak?.month || '2025-10'}`,
          body: `${formatNumber(monthlyPeak?.total_messages || 0)} Nachrichten. Der Monatsverlauf zeigt ziemlich klar, wann ihr in Hochbetrieb wart.`,
          svg: renderSparkline(data.monthly_activity, 'total_messages', monthlyPeak?.month),
          labels: compactMonthLabels(data.monthly_activity),
        }),
        createMetricGridSlide({
          theme: 'aqua',
          kicker: 'Die größten Tage',
          title: 'Eure heftigsten Chat-Tage',
          body: 'Nicht jede Freundschaft hat dokumentierte Spitzentage mit Thema, Dauer und letzter Nachricht.',
          metrics: [topDay, topDay2].filter(Boolean).map((entry) => ({
            label: formatDate(entry.date),
            value: formatNumber(entry.messages),
            body: `${entry.dominant_topic || 'Mixed'} · ${entry.duration_hours?.toFixed(1) || '?'}h aktiv`,
          })).concat([
            {
              label: 'Prime Time',
              value: summary.avg_daily_peak_2h_window_label,
              body: 'Im Schnitt war das euer heißestes 2-Stunden-Fenster.',
            },
            {
              label: 'Montag',
              value: `${formatNumber(weekdayPeak?.messages || 0)}`,
              body: 'Der stärkste Wochentag über den ganzen Verlauf.',
            },
          ]),
        }),
        createBarsSlide({
          theme: 'aqua',
          kicker: 'Wochentagsmuster',
          title: 'Montag war euer Maschinenraum',
          body: 'Montag liegt vorn, aber auch Sonntag bleibt relevant — was sehr gut zu den WRMs passt.',
          bars: (data.weekday_activity_extended || []).map((row) => ({
            label: weekdayLabel(row.weekday),
            value: row.messages,
            note: `${row.avg_per_active_day.toFixed(1)} pro aktivem Tag`,
          })),
        }),
        createComparisonSlide({
          theme: 'aqua',
          kicker: 'Antwortgeschwindigkeit',
          title: 'Fast schon Live-Chat',
          body: 'Im <=3h-Fenster war Julian minimal schneller. Aber insgesamt war das hier beidseitig extrem reaktionsstark.',
          left: {
            label: 'Julian',
            value: `${quickJulian?.JulianRR_median_sec || 57}s`,
            body: 'Median-Antwortzeit im <=3h-Fenster',
          },
          right: {
            label: 'Johann',
            value: `${quickJulian?.johann_median_sec || 62}s`,
            body: 'Median-Antwortzeit im <=3h-Fenster',
          },
          footer: 'Schnellantworten waren hier eher Gewohnheit als Ausnahme.',
        }),
        createCardsSlide({
          theme: 'aqua',
          kicker: 'Session-Highlights',
          title: 'Wenn aus Nachrichten richtige Abende wurden',
          body: 'Ein paar Sessions wirkten schon fast wie Arbeitsräume mit Chatfunktion.',
          cards: [session1, session2].filter(Boolean).map((session) => ({
            label: `${formatDateTime(session.start)} → ${formatDateTime(session.end)}`,
            title: `${formatNumber(session.messages)} Nachrichten`,
            body: `${session.dominant_topic || 'Mixed'} · ${Math.round(session.duration_min || 0)} Minuten · Vibe-Score ${session.vibe_score}`,
          })),
        }),
      ],
    },
    {
      id: 'words',
      title: 'Wörter',
      kicker: 'Sprache',
      homeLabel: 'Top-Wörter, Phrasen, Eigenheiten',
      icon: '✦',
      theme: 'cosmic',
      slides: [
        createCoverSlide({
          theme: 'cosmic',
          kicker: 'Sprachwelt',
          title: 'Nicht nur was ihr gesagt habt — sondern wie.',
          body: 'Die Sprache erzählt bei euch fast so viel wie die Themen selbst.',
          tags: ['Insider', 'reaktiv', 'sehr wiedererkennbar'],
        }),
        createCloudSlide({
          theme: 'cosmic',
          kicker: 'Top-Wörter',
          title: 'Die auffälligen Wörter',
          body: 'Keine Artikel. Keine Füllwörter. Sondern das, was wirklich nach euch klingt.',
          words: topWords.map((item, index) => ({ label: item.word, count: item.count, size: index < 2 ? 'xl' : index < 4 ? 'lg' : 'md' })),
        }),
        createCardsSlide({
          theme: 'cosmic',
          kicker: 'Wort des Jahres',
          title: 'Jedes Jahr hatte sein eigenes Leitmotiv',
          body: 'Editorial Pick schlägt rohe Frequenz — also genau die Version, die sich wie Wrapped anfühlt.',
          cards: yearlyPicks.map((pick) => ({
            label: String(pick.year),
            title: pick.editorial_pick,
            body: `${pick.algorithmic_word} war der rohe Treffer (${pick.algorithmic_count}x) — aber ${pick.editorial_pick} erzählt die Phase besser.`,
          })),
        }),
        createBarsSlide({
          theme: 'cosmic',
          kicker: 'Running Phrases',
          title: `"${repeatedTitle}" war nicht zufällig`,
          body: 'Wiederkehrende Formulierungen sind fast so etwas wie der Takt eures Chats.',
          bars: repeatedPhrases.map((row) => ({
            label: row.phrase,
            value: row.count,
            note: `${row.count} Mal`,
          })),
        }),
        createComparisonSlide({
          theme: 'cosmic',
          kicker: 'Signaturwörter',
          title: 'Jeder hatte seine eigenen Marker',
          body: 'Diese Tokens wirken fast wie sprachliche Fingerabdrücke.',
          left: {
            label: 'Julian-Core',
            value: signaturesJulian.map((item) => item.token).join(' · '),
            body: 'auffällig distinct',
          },
          right: {
            label: 'Johann-Core',
            value: signaturesJohann.map((item) => item.token).join(' · '),
            body: 'auffällig distinct',
          },
          footer: 'Nicht wissenschaftlich im strengen Sinn — aber extrem wiedererkennbar.',
        }),
      ],
    },
    {
      id: 'vibes',
      title: 'Vibes',
      kicker: 'Tonlage',
      homeLabel: 'Emojis, Reaktionen, Vibe-Meter',
      icon: '◐',
      theme: 'lime',
      slides: [
        createCoverSlide({
          theme: 'lime',
          kicker: 'Tonlage & Energie',
          title: 'Zwischen Hype, Planung und Lachen',
          body: 'Eure Freundschaft ist messbar produktiv — aber sie klingt nie nur nach To-do-Liste.',
          tags: ['💪 dominiert', 'Hype + Planung', 'schnelle Reaktionen'],
        }),
        createCloudSlide({
          theme: 'lime',
          kicker: 'Emoji-Ranking',
          title: '💪 war euer Leit-Emoji',
          body: 'Danach kam direkt der Klassiker aus Lachen, Feuer und Drive.',
          words: emojiTop.map((item, index) => ({ label: `${item.emoji} ${item.count}`, count: item.count, size: index < 1 ? 'xl' : index < 3 ? 'lg' : 'md' })),
        }),
        createBarsSlide({
          theme: 'lime',
          kicker: 'Reaktionsfamilien',
          title: 'So hat sich der Chat angefühlt',
          body: 'Die häufigsten Reaktionsmuster lesen sich fast schon wie ein Freundschafts-Soundtrack.',
          bars: reactionsTop.map((row) => ({
            label: row.reaction_family,
            value: row.count,
            note: `${row.count} Treffer`,
          })),
        }),
        createCardsSlide({
          theme: 'lime',
          kicker: 'Vibe-Meter',
          title: 'Planungsmodus war der Grundzustand',
          body: 'Aber Hype und Lachen waren nie weit weg.',
          cards: [vibePlan, vibeHype, vibeTop.find((v) => v.vibe === 'Lachen')].filter(Boolean).map((item) => ({
            label: item.vibe,
            title: `${formatNumber(item.matches_total)} Matches`,
            body: `Peak: ${item.peak_month} · ${item.top_examples}`,
          })),
        }),
        createMetricGridSlide({
          theme: 'lime',
          kicker: 'Medienmix',
          title: 'Nicht nur Text',
          body: 'Bilder, Audios, Docs — und spätestens im späten 2025 wurde das Ganze sehr multimodal.',
          metrics: mediaBreakdown.map((row) => ({
            label: mediaTypeLabel(row.msg_type),
            value: formatNumber(row.total),
            body: `${Math.round((row.share_pct || 0) * 100)}% Anteil`,
          })).slice(0, 4),
        }),
        createComparisonSlide({
          theme: 'lime',
          kicker: 'Tagesstarter',
          title: 'Sogar das Starten war 50/50',
          body: 'Wer den Tag im Chat eröffnet hat, war fast perfekt ausgeglichen.',
          left: {
            label: 'Julian',
            value: `${dayStart[0] ? Math.round(dayStart[0].share_pct * 100) : 50}%`,
            body: `Top-Opening: ${(openingsJulian[0] || {}).opening_phrase || 'johann'}`,
          },
          right: {
            label: 'Johann',
            value: `${dayStart[1] ? Math.round(dayStart[1].share_pct * 100) : 50}%`,
            body: `Top-Opening: ${(openingsJohann[0] || {}).opening_phrase || 'julian'}`,
          },
          footer: 'Auch das ist eher Partnerschaft als Zufall.',
        }),
      ],
    },
    {
      id: 'eras',
      title: 'Eras',
      kicker: 'Phasen',
      homeLabel: 'Von Australien bis Bildungsbrücke',
      icon: '▦',
      theme: 'sunset',
      slides: [
        createCoverSlide({
          theme: 'sunset',
          kicker: 'Freundschaft in Phasen',
          title: 'Nicht alles passierte gleichzeitig.',
          body: 'Jede Phase hatte ihr eigenes Hauptthema, ihren eigenen Ton und ihr eigenes Tempo.',
          tags: ['Zeitachsen', 'Themen-Peaks', 'Übergänge'],
        }),
        createTimelineSlide({
          theme: 'sunset',
          kicker: 'Haupt-Eras',
          title: 'Eure Timeline',
          body: 'Eine Freundschaft mit klaren Bögen: erst Orga, dann Arcs, dann Systeme, dann Projekte.',
          items: (data.friendship_eras || []).map((era) => ({
            range: `${era.start_month} → ${era.end_month}`,
            title: era.era_label,
            body: `${formatNumber(era.messages_in_era)} Nachrichten · ${era.why_it_matters}`,
          })),
        }),
        createCardsSlide({
          theme: 'sunset',
          kicker: 'Themen-Superlative',
          title: 'Wann welches Thema am stärksten war',
          body: 'So lassen sich eure großen Stränge ziemlich gut übereinanderlegen.',
          cards: topicSuperlatives.map((topic) => ({
            label: topic.topic,
            title: `Peak: ${topic.peak_month}`,
            body: `${topic.total_hits} Treffer insgesamt · stärkster Tag ${topic.peak_day}`,
          })),
        }),
        createCardsSlide({
          theme: 'sunset',
          kicker: 'Jahresdominanz',
          title: 'Was jedes Jahr getragen hat',
          body: 'Die Jahreszusammenfassung ist fast schon eine Dramaturgie in Tabellenform.',
          cards: yearlySummary.map((year) => ({
            label: String(year.year),
            title: year.dominant_topic || 'Mixed',
            body: `${formatNumber(year.messages)} Nachrichten · ${year.active_days} aktive Tage · ${year.dominant_topic_mentions} Topic-Hits`,
          })),
        }),
        createStatementSlide({
          theme: 'sunset',
          kicker: 'Der Wendepunkt',
          title: 'Und dann kam WRM.',
          body: 'Ab hier wird sichtbar: Aus einer starken Chat-Dynamik wurde ein dokumentiertes System.',
          actionLabel: 'WRM',
        }),
      ],
    },
    {
      id: 'wrm',
      title: 'WRM',
      kicker: 'System',
      homeLabel: 'Vom Chat zum Betriebssystem',
      icon: '◈',
      theme: 'midnight',
      slides: [
        createCoverSlide({
          theme: 'midnight',
          kicker: 'Weekly Refreshing Meeting',
          title: 'Aus Chat wurde ein System.',
          body: 'Genau hier fühlt sich eure Freundschaft plötzlich wie ein eigenes Betriebssystem an: dokumentiert, rhythmisch, ausdauernd.',
          tags: [`${wrmNumbers['WRMs listed on main page'] || '91'} WRMs`, `${wrmNumbers['WRM time span'] || '2024-09-01 → 2026-05-24'}`, 'öffentliche Notion-Spur'],
        }),
        createBigNumberSlide({
          theme: 'midnight',
          kicker: 'WRM in Zahlen',
          number: wrmNumbers['WRMs listed on main page'] || '91',
          label: 'dokumentierte WRMs',
          body: `${wrmNumbers['WRM time span'] || '2024-09-01 → 2026-05-24'} · dazu kommt eine sichtbare Untergrenze von ${wrmNumbers['Visible lower-bound task count'] || '630+'} Tasks.`,
          stats: ['wöchentlich', 'ca. 21 Monate', 'Notion-gestützt'],
        }),
        createNoteListSlide({
          theme: 'midnight',
          kicker: 'Das WRM-Prinzip',
          title: 'Jede Woche dieselbe Grundfrage — und genau das war die Stärke.',
          body: 'Nicht bloß To-dos sammeln, sondern die nächste Woche bewusst designen.',
          notes: [
            'Was war diese Woche erfolgreich?',
            'Was steht nächste Woche an?',
            'Was muss ich tun, damit die nächste Woche erfolgreich wird?',
          ],
          footnote: 'Diese Leitfragen sind öffentlich auf den WRM-Seiten beschrieben und machen den Unterschied zwischen Chat und Ritual aus.',
        }),
        createTimelineSlide({
          theme: 'midnight',
          kicker: 'WRM-Eras',
          title: 'Auch das System selbst hatte Phasen',
          body: 'Erst Setup. Dann Routine. Dann Optimierung. Dann Schülersprecher und Vereins-/Career-Expansion.',
          items: wrmEras.map((era) => ({
            range: era.range,
            title: era.label,
            body: `${era.description} · ${era.why}`,
          })),
        }),
        createDivisionSlide({
          theme: 'midnight',
          kicker: 'Division of life',
          title: 'Das System war nicht nur Schule',
          body: 'Selbst im sichtbaren Snapshot liegen Organise, School und Personal gleichzeitig vorn. Genau das macht WRM so stark.',
          divisions: wrmDivisions,
        }),
        createCardsSlide({
          theme: 'midnight',
          kicker: 'Back of mind',
          title: 'Sogar euer aktuelles Projekt war schon vorweggenommen',
          body: 'Das hier ist fast schon unfair meta.',
          cards: wrmBackOfMind.map((item) => ({
            label: 'Back of mind',
            title: item.idea,
            body: `${item.why} · ${item.visual}`,
          })),
        }),
      ],
    },
    {
      id: 'tasks',
      title: 'Tasks',
      kicker: 'Identität',
      homeLabel: 'Core Tasks & Operating System',
      icon: '⬢',
      theme: 'ultraviolet',
      slides: [
        createCoverSlide({
          theme: 'ultraviolet',
          kicker: 'Core Tasks',
          title: 'Was euch in WRM wirklich geprägt hat',
          body: 'Die besten Core Tasks wirken nicht peinlich — sie wirken präzise.',
          tags: ['Johann', 'Julian', 'Shared system'],
        }),
        createCoreTaskSlide({
          theme: 'ultraviolet',
          kicker: 'Johann-Core',
          title: 'Struktur, Schule, Systeme',
          body: 'Schlafrhythmus, Exam Prep, Organisation, Website-Push — sehr klar auf Kontrolle, Qualität und Systembau ausgelegt.',
          cards: wrmCore.Johann || [],
        }),
        createCoreTaskSlide({
          theme: 'ultraviolet',
          kicker: 'Julian-Core',
          title: 'Performance, Sport, Karriere',
          body: 'Schule, Kader, Bewerbungen, Kontakte und Habit-Disziplin — eher Vorwärtsschub als Feinjustierung.',
          cards: wrmCore.Julian || [],
        }),
        createCoreTaskSlide({
          theme: 'ultraviolet',
          kicker: 'Shared-Core',
          title: 'Gemeinsam habt ihr ein Betriebssystem gebaut',
          body: 'WRM, 5. PK, Schülersprecher, BildungsBrücke: diese Karten lesen sich wie eine Team-Roadmap.',
          cards: wrmCore.Shared || [],
        }),
      ],
    },
    {
      id: 'projects',
      title: 'Projekte',
      kicker: 'Missionen',
      homeLabel: 'Abitur, Schülersprecher, Verein',
      icon: '△',
      theme: 'aqua',
      slides: [
        createCoverSlide({
          theme: 'aqua',
          kicker: 'Projekt-Layer',
          title: 'Nicht nur Freundschaft — auch Missionen.',
          body: 'Ein großer Teil der Verbindung lief über echte gemeinsame Vorhaben.',
          tags: ['Abi', 'Schülersprecher', 'Verein', 'Nischenprojekte'],
        }),
        createCardsSlide({
          theme: 'aqua',
          kicker: 'Topic Alignment',
          title: 'Die großen Themen verlaufen über beide Welten',
          body: 'WhatsApp zeigt die Peaks. WRM zeigt, wie daraus strukturierte Arbeit wurde.',
          cards: wrmAlignment.filter((row) => ['Abitur / 1,0 mission', 'Weekly Refreshing Meeting itself', '5. PK'].includes(row.topic)).map((row) => ({
            label: row.topic,
            title: row.phase,
            body: row.evidence,
          })),
        }),
        createCardsSlide({
          theme: 'aqua',
          kicker: 'Schülersprecher & Co.',
          title: 'Spätestens hier wird die Außenwirkung sichtbar',
          body: 'Nicht mehr nur intern organisieren — sondern Rollen übernehmen, Kampagnen fahren, Debatten und Events planen.',
          cards: wrmAlignment.filter((row) => row.topic.includes('Schülersprecher') || row.topic.includes('Career')).map((row) => ({
            label: row.topic,
            title: row.phase,
            body: row.evidence,
          })),
        }),
        createCardsSlide({
          theme: 'aqua',
          kicker: 'Verein & Build-Mode',
          title: 'BildungsBrücke und Projektenergie',
          body: 'Die späte Phase kippt sichtbar in Richtung Verein, Website, Career-Expansion und eigenen Auftritt.',
          cards: wrmAlignment.filter((row) => row.topic.includes('BildungsBrücke') || row.topic.includes('Gärtner-Bot')).map((row) => ({
            label: row.topic,
            title: row.phase,
            body: row.evidence,
          })),
        }),
      ],
    },
    {
      id: 'flashbacks',
      title: 'Flashbacks',
      kicker: 'Erinnerungen',
      homeLabel: 'Nostalgische Mini-Fenster',
      icon: '☼',
      theme: 'sunset',
      slides: [
        createCoverSlide({
          theme: 'sunset',
          kicker: 'Flashbacks',
          title: 'Ein paar Zeiten, die sofort wieder da sind',
          body: 'Nicht als Chatdump — sondern als kurze Erinnerungsfenster.',
          tags: ['Nostalgie', 'Mini-Chats', 'durchklickbar'],
        }),
        ...flashbacks.slice(0, 3).map((flashback) => createFlashbackSlide({
          theme: 'sunset',
          kicker: flashback.title,
          title: flashback.title,
          body: flashback.why_it_is_fun,
          flashbackId: flashback.flashback_id,
          dateRange: `${formatDateTime(flashback.date_start)} → ${formatDateTime(flashback.date_end)}`,
        })),
      ],
    },
    {
      id: 'quiz',
      title: 'Quiz',
      kicker: 'Spiel',
      homeLabel: 'Zitatspiel & WRM-Quiz',
      icon: '✳',
      theme: 'lime',
      slides: [
        createCoverSlide({
          theme: 'lime',
          kicker: 'Interaktive Karten',
          title: 'Erst raten. Dann auflösen.',
          body: 'Ein bisschen Wrapped, ein bisschen Story-Game.',
          tags: ['Wer hat’s geschrieben?', 'Welche WRM-Nummer war das?'],
        }),
        ...quoteGame.map((item, index) => createBinaryQuizSlide({
          theme: 'lime',
          kicker: 'Quote Game',
          title: 'Wer hat das geschrieben?',
          body: `„${item.quote}“`,
          quizId: item.id,
          options: ['Johann', 'Julian RR'],
          answer: item.answer,
          explanation: item.note,
        })),
        ...wrmQuizzes.map((quiz, index) => createWrmQuizSlide({
          theme: 'lime',
          kicker: 'WRM-Quiz',
          title: 'Welche WRM-Nummer war das?',
          body: 'Anhand dieser drei Notes-before-Punkte soll die Phase erkennbar werden.',
          notes: quiz.notes,
          quizId: `wrm-${index + 1}`,
          options: ['WRM 23', 'WRM 51', 'WRM 75'],
          answer: quiz.wrm,
          explanation: `${quiz.wrm} · ${quiz.date}`,
        })),
      ],
    },
    {
      id: 'finale',
      title: 'Finale',
      kicker: 'Ende',
      homeLabel: 'Die Landung',
      icon: '✺',
      theme: 'cosmic',
      slides: [
        createCoverSlide({
          theme: 'cosmic',
          kicker: 'Finale',
          title: 'Das hier war keine zufällige Chat-Historie.',
          body: 'Sondern eine Freundschaft mit Rhythmus, Anspruch, Humor, Reflexion und überraschend viel Systembau.',
          tags: ['Chat', 'WRM', 'Abi', 'Projekte'],
        }),
        createCardsSlide({
          theme: 'cosmic',
          kicker: 'Die stärksten Marker',
          title: 'Was hängen bleibt',
          body: 'Wenn man alles verdichtet, bleiben genau diese Dinge übrig.',
          cards: [
            {
              label: 'Balance',
              title: findExtra(extraCategories, 'Symmetrie-Score') || '0.983',
              body: 'Fast perfekt gleichmäßige Beteiligung im Chat.',
            },
            {
              label: 'Ritual',
              title: `${wrmNumbers['WRMs listed on main page'] || '91'} WRMs`,
              body: 'Die Freundschaft hatte ein dokumentiertes Wochenritual.',
            },
            {
              label: 'Drive',
              title: summary.longest_streak_days + ' Tage',
              body: 'So lang lief eure längste tägliche Kontaktserie.',
            },
            {
              label: 'Prime time',
              title: summary.avg_daily_peak_2h_window_label,
              body: 'Dort war eure durchschnittliche Hochphase.',
            },
          ],
        }),
        createStatementSlide({
          theme: 'cosmic',
          kicker: 'Noch einmal?',
          title: 'Friendship Wrapped complete.',
          body: 'Du kannst jetzt neu starten oder gezielt einzelne Story-Bubbles erneut öffnen.',
          actionLabel: 'Replay',
          extraAction: true,
        }),
      ],
    },
  ];

  return stories;
}

function createCoverSlide({ theme, kicker, title, body, tags = [] }) {
  return {
    theme,
    duration: 7200,
    html: `
      <div class="story-slide__bg"></div>
      <div class="story-slide__inner story-layout--center">
        <div class="story-slide__top">
          <p class="story-kicker">${escapeHtml(kicker)}</p>
          <h3 class="story-title">${escapeHtml(title)}</h3>
          <p class="story-lead">${escapeHtml(body)}</p>
        </div>
        <div class="story-slide__bottom">
          <div class="chip-row">
            ${tags.map((tag) => `<span class="chip">${escapeHtml(tag)}</span>`).join('')}
          </div>
          <p class="story-footer-note">Tippe rechts zum Weitergehen.</p>
        </div>
      </div>
    `,
  };
}

function createBigNumberSlide({ theme, kicker, number, label, body, stats = [] }) {
  return {
    theme,
    duration: 7200,
    html: `
      <div class="story-slide__bg"></div>
      <div class="story-slide__inner story-layout--center">
        <div class="story-slide__top">
          <p class="story-kicker">${escapeHtml(kicker)}</p>
          <div class="hero-number">${escapeHtml(number)}</div>
          <p class="hero-label">${escapeHtml(label)}</p>
          <p class="story-lead">${escapeHtml(body)}</p>
        </div>
        <div class="story-slide__bottom">
          <div class="chip-row">
            ${stats.map((stat) => `<span class="chip">${escapeHtml(stat)}</span>`).join('')}
          </div>
        </div>
      </div>
    `,
  };
}

function createMetricGridSlide({ theme, kicker, title, body, metrics = [] }) {
  return {
    theme,
    duration: 7600,
    html: `
      <div class="story-slide__bg"></div>
      <div class="story-slide__inner">
        <div class="story-slide__top">
          <p class="story-kicker">${escapeHtml(kicker)}</p>
          <h3 class="story-title story-title--medium">${escapeHtml(title)}</h3>
          <p class="story-lead">${escapeHtml(body)}</p>
        </div>
        <div class="metric-grid">
          ${metrics.map((metric) => `
            <article class="metric-card">
              <p class="metric-card__label">${escapeHtml(metric.label)}</p>
              <div class="metric-card__value">${escapeHtml(metric.value)}</div>
              <p class="metric-card__body">${escapeHtml(metric.body || '')}</p>
            </article>
          `).join('')}
        </div>
      </div>
    `,
  };
}

function createChartSlide({ theme, kicker, title, body, svg, labels = [] }) {
  return {
    theme,
    duration: 7800,
    html: `
      <div class="story-slide__bg"></div>
      <div class="story-slide__inner">
        <div class="story-slide__top">
          <p class="story-kicker">${escapeHtml(kicker)}</p>
          <h3 class="story-title story-title--medium">${escapeHtml(title)}</h3>
          <p class="story-lead">${escapeHtml(body)}</p>
        </div>
        <div class="sparkline-wrap">
          ${svg}
          <div class="sparkline-labels">${labels.map((label) => `<span>${escapeHtml(label)}</span>`).join('')}</div>
        </div>
      </div>
    `,
  };
}

function createBarsSlide({ theme, kicker, title, body, bars = [] }) {
  const max = Math.max(...bars.map((bar) => Number(bar.value) || 0), 1);
  return {
    theme,
    duration: 7600,
    html: `
      <div class="story-slide__bg"></div>
      <div class="story-slide__inner">
        <div class="story-slide__top">
          <p class="story-kicker">${escapeHtml(kicker)}</p>
          <h3 class="story-title story-title--medium">${escapeHtml(title)}</h3>
          <p class="story-lead">${escapeHtml(body)}</p>
        </div>
        <div class="bar-list">
          ${bars.map((bar) => `
            <div class="bar-item">
              <div class="bar-item__label">
                <span>${escapeHtml(bar.label)}</span>
                <span>${escapeHtml(bar.note || formatNumber(bar.value))}</span>
              </div>
              <div class="bar-track"><div class="bar-fill" style="width:${((Number(bar.value) || 0) / max) * 100}%"></div></div>
            </div>
          `).join('')}
        </div>
      </div>
    `,
  };
}

function createComparisonSlide({ theme, kicker, title, body, left, right, footer }) {
  return {
    theme,
    duration: 7600,
    html: `
      <div class="story-slide__bg"></div>
      <div class="story-slide__inner">
        <div class="story-slide__top">
          <p class="story-kicker">${escapeHtml(kicker)}</p>
          <h3 class="story-title story-title--medium">${escapeHtml(title)}</h3>
          <p class="story-lead">${escapeHtml(body)}</p>
        </div>
        <div class="duo-grid">
          ${[left, right].map((card) => `
            <article class="core-card">
              <p class="core-card__meta">${escapeHtml(card.label)}</p>
              <div class="core-card__title">${escapeHtml(card.value)}</div>
              <p class="core-card__body">${escapeHtml(card.body || '')}</p>
            </article>
          `).join('')}
        </div>
        <p class="story-footer-note">${escapeHtml(footer || '')}</p>
      </div>
    `,
  };
}

function createCardsSlide({ theme, kicker, title, body, cards = [] }) {
  return {
    theme,
    duration: 7800,
    html: `
      <div class="story-slide__bg"></div>
      <div class="story-slide__inner">
        <div class="story-slide__top">
          <p class="story-kicker">${escapeHtml(kicker)}</p>
          <h3 class="story-title story-title--medium">${escapeHtml(title)}</h3>
          <p class="story-lead">${escapeHtml(body)}</p>
        </div>
        <div class="story-card-grid">
          ${cards.map((card) => `
            <article class="story-card">
              <p class="story-card__label">${escapeHtml(card.label)}</p>
              <div class="story-card__title">${escapeHtml(card.title)}</div>
              <p class="story-card__body">${escapeHtml(card.body || '')}</p>
            </article>
          `).join('')}
        </div>
      </div>
    `,
  };
}

function createCloudSlide({ theme, kicker, title, body, words = [] }) {
  return {
    theme,
    duration: 7600,
    html: `
      <div class="story-slide__bg"></div>
      <div class="story-slide__inner">
        <div class="story-slide__top">
          <p class="story-kicker">${escapeHtml(kicker)}</p>
          <h3 class="story-title story-title--medium">${escapeHtml(title)}</h3>
          <p class="story-lead">${escapeHtml(body)}</p>
        </div>
        <div class="pill-cloud">
          ${words.map((word) => `
            <span class="pill pill--${word.size || 'md'}">${escapeHtml(word.label)}</span>
          `).join('')}
        </div>
      </div>
    `,
  };
}

function createTimelineSlide({ theme, kicker, title, body, items = [] }) {
  return {
    theme,
    duration: 8200,
    html: `
      <div class="story-slide__bg"></div>
      <div class="story-slide__inner">
        <div class="story-slide__top">
          <p class="story-kicker">${escapeHtml(kicker)}</p>
          <h3 class="story-title story-title--medium">${escapeHtml(title)}</h3>
          <p class="story-lead">${escapeHtml(body)}</p>
        </div>
        <div class="timeline">
          ${items.map((item) => `
            <article class="timeline-card">
              <p class="timeline-card__range">${escapeHtml(item.range)}</p>
              <div class="timeline-card__title">${escapeHtml(item.title)}</div>
              <p class="timeline-card__body">${escapeHtml(item.body || '')}</p>
            </article>
          `).join('')}
        </div>
      </div>
    `,
  };
}

function createNoteListSlide({ theme, kicker, title, body, notes = [], footnote = '' }) {
  return {
    theme,
    duration: 7600,
    html: `
      <div class="story-slide__bg"></div>
      <div class="story-slide__inner">
        <div class="story-slide__top">
          <p class="story-kicker">${escapeHtml(kicker)}</p>
          <h3 class="story-title story-title--medium">${escapeHtml(title)}</h3>
          <p class="story-lead">${escapeHtml(body)}</p>
        </div>
        <div class="note-list">
          ${notes.map((note) => `<div class="note-pill">${escapeHtml(note)}</div>`).join('')}
        </div>
        <p class="footnote">${escapeHtml(footnote)}</p>
      </div>
    `,
  };
}

function createDivisionSlide({ theme, kicker, title, body, divisions = [] }) {
  const total = divisions.reduce((sum, item) => sum + item.count, 0) || 1;
  const stops = [];
  let cursor = 0;
  const palette = ['#7cf2d5', '#b9ff55', '#ffdd55', '#ff8e5e', '#8e85ff', '#56b6ff'];
  divisions.forEach((item, index) => {
    const start = cursor;
    const share = (item.count / total) * 100;
    const end = cursor + share;
    stops.push(`${palette[index % palette.length]} ${start}% ${end}%`);
    cursor = end;
  });
  return {
    theme,
    duration: 7800,
    html: `
      <div class="story-slide__bg"></div>
      <div class="story-slide__inner">
        <div class="story-slide__top">
          <p class="story-kicker">${escapeHtml(kicker)}</p>
          <h3 class="story-title story-title--medium">${escapeHtml(title)}</h3>
          <p class="story-lead">${escapeHtml(body)}</p>
        </div>
        <div class="story-card" style="display:grid;grid-template-columns:120px 1fr;gap:16px;align-items:center;">
          <div style="width:120px;height:120px;border-radius:50%;background:conic-gradient(${stops.join(',')});padding:14px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.12);">
            <div style="width:100%;height:100%;border-radius:50%;background:rgba(9,12,22,.82);display:grid;place-items:center;text-align:center;font-weight:800;line-height:1.05;">
              <div><div style="font-size:1.8rem;font-family:'Space Grotesk', Inter, sans-serif;">${total}</div><div style="font-size:.75rem;color:rgba(255,255,255,.58);text-transform:uppercase;letter-spacing:.12em;">visible tasks</div></div>
            </div>
          </div>
          <div class="bar-list">
            ${divisions.map((item, index) => `
              <div class="bar-item">
                <div class="bar-item__label"><span>${escapeHtml(item.division)}</span><span>${item.count}</span></div>
                <div class="bar-track"><div class="bar-fill" style="width:${(item.count / total) * 100}%;background:${palette[index % palette.length]}"></div></div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `,
  };
}

function createCoreTaskSlide({ theme, kicker, title, body, cards = [] }) {
  return {
    theme,
    duration: 8000,
    html: `
      <div class="story-slide__bg"></div>
      <div class="story-slide__inner">
        <div class="story-slide__top">
          <p class="story-kicker">${escapeHtml(kicker)}</p>
          <h3 class="story-title story-title--medium">${escapeHtml(title)}</h3>
          <p class="story-lead">${escapeHtml(body)}</p>
        </div>
        <div class="card-stack">
          ${cards.map((card) => `
            <article class="core-card">
              <p class="core-card__meta">${escapeHtml(card.priority)}</p>
              <div class="core-card__title">${escapeHtml(card.label)}</div>
              <p class="core-card__body">${escapeHtml(card.evidence)}</p>
              <div class="core-card__chips">
                <span class="core-card__chip">${escapeHtml(card.use)}</span>
              </div>
            </article>
          `).join('')}
        </div>
      </div>
    `,
  };
}

function createFlashbackSlide({ theme, kicker, title, body, flashbackId, dateRange }) {
  const chunks = getFlashbackChunks(flashbackId);
  state.flashbackPointer[flashbackId] = state.flashbackPointer[flashbackId] || 0;
  return {
    theme,
    interactive: true,
    html: `
      <div class="story-slide__bg"></div>
      <div class="story-slide__inner" data-flashback-id="${escapeHtml(flashbackId)}">
        <div class="story-slide__top">
          <p class="story-kicker">${escapeHtml(kicker)}</p>
          <h3 class="story-title story-title--medium">${escapeHtml(title)}</h3>
          <p class="story-lead">${escapeHtml(body)}</p>
        </div>
        <div class="flashback-card">
          <p class="flashback-card__meta">${escapeHtml(dateRange)}</p>
          <div class="flashback-chat" data-flashback-messages>
            ${renderFlashbackMessagePage(chunks, 0)}
          </div>
          <div class="flashback-controls">
            <button type="button" class="flashback-button" data-flashback-action="prev" data-flashback-id="${escapeHtml(flashbackId)}">Zurück</button>
            <button type="button" class="flashback-button" data-flashback-action="next" data-flashback-id="${escapeHtml(flashbackId)}">Weiter</button>
          </div>
          <p class="story-footer-note">Seite <span data-flashback-page>1 / ${Math.ceil(chunks.length / 3) || 1}</span></p>
        </div>
      </div>
    `,
  };
}

function createBinaryQuizSlide({ theme, kicker, title, body, quizId, options, answer, explanation }) {
  return createQuizBase({ theme, kicker, title, body, quizId, options, answer, explanation });
}

function createWrmQuizSlide({ theme, kicker, title, body, notes, quizId, options, answer, explanation }) {
  return createQuizBase({
    theme,
    kicker,
    title,
    body: `${body}`,
    quizId,
    answer,
    options,
    explanation,
    extraHtml: `<div class="note-list" style="margin-top:16px;">${notes.map((note) => `<div class="note-pill">${escapeHtml(note)}</div>`).join('')}</div>`,
  });
}

function createQuizBase({ theme, kicker, title, body, quizId, options, answer, explanation, extraHtml = '' }) {
  const feedbackText = answer === 'Julian RR' || answer === 'Johann'
    ? `Richtig ist: ${answer === 'Julian RR' ? 'Julian' : 'Johann'}. ${explanation}`
    : `Richtig ist: ${answer}. ${explanation}`;

  return {
    theme,
    interactive: true,
    html: `
      <div class="story-slide__bg"></div>
      <div class="story-slide__inner" data-quiz-id="${escapeHtml(quizId)}">
        <div class="story-slide__top">
          <p class="story-kicker">${escapeHtml(kicker)}</p>
          <h3 class="story-title story-title--medium">${escapeHtml(title)}</h3>
          <p class="story-lead">${escapeHtml(body)}</p>
          ${extraHtml}
        </div>
        <div class="choice-grid">
          ${options.map((option) => `
            <button
              class="choice-button"
              type="button"
              data-quiz-group="${escapeHtml(quizId)}"
              data-value="${escapeHtml(option)}"
              data-answer="${escapeHtml(answer)}"
            >${escapeHtml(option === 'Julian RR' ? 'Julian' : option)}</button>
          `).join('')}
        </div>
        <div class="quiz-feedback" hidden>
          <strong>Auflösung</strong>
          ${escapeHtml(feedbackText)}
        </div>
      </div>
    `,
  };
}

function createStatementSlide({ theme, kicker, title, body, actionLabel = 'Replay', extraAction = false }) {
  return {
    theme,
    duration: 7600,
    html: `
      <div class="story-slide__bg"></div>
      <div class="story-slide__inner story-layout--center">
        <div class="story-slide__top">
          <p class="story-kicker">${escapeHtml(kicker)}</p>
          <h3 class="story-title">${escapeHtml(title)}</h3>
          <p class="story-lead">${escapeHtml(body)}</p>
        </div>
        <div class="story-slide__bottom">
          <div class="chip-row">
            <button class="primary-button" type="button" data-action="replay">${escapeHtml(actionLabel)}</button>
            ${extraAction ? '<button class="secondary-button" type="button" data-action="home">Zur Story-Auswahl</button>' : ''}
          </div>
        </div>
      </div>
    `,
  };
}

function getFlashbackChunks(flashbackId) {
  const messages = (state.data.flashback_messages || []).filter((item) => item.flashback_id === flashbackId);
  return messages.map((item) => ({
    sender: item.sender,
    message: item.message,
    self: item.sender.toLowerCase() === 'johann',
  }));
}

function renderFlashbackMessagePage(messages, page) {
  const start = page * 3;
  return messages.slice(start, start + 3).map((message) => `
    <div class="chat-bubble ${message.self ? 'chat-bubble--self' : 'chat-bubble--other'}">
      <span class="chat-bubble__sender">${escapeHtml(message.sender === 'Julian RR' ? 'Julian' : 'Johann')}</span>
      ${escapeHtml(message.message)}
    </div>
  `).join('');
}

function wrmOverviewMap(rows = []) {
  const map = {};
  rows.forEach((row) => {
    if (Array.isArray(row) && row.length >= 2) map[row[0]] = row[1];
  });
  return map;
}

function parseWrmNotesQuiz(rows = []) {
  return rows.map((row) => ({
    label: row[0],
    notes: [row[1], row[2], row[3]],
    wrm: row[4],
    date: row[5],
    intendedUse: row[6],
    howToUse: row[7],
  }));
}

function parseWrmCoreTasks(rows = []) {
  return rows.reduce((acc, row) => {
    const person = row[0];
    acc[person] = acc[person] || [];
    acc[person].push({
      label: row[1],
      evidence: row[2],
      use: row[3],
      priority: row[4],
    });
    return acc;
  }, {});
}

function parseWrmDivisions(rows = []) {
  return rows.map((row) => ({
    snapshot: row[0],
    division: row[1],
    count: Number(row[2]) || 0,
    examples: row[3],
    visual: row[4],
    note: row[5],
  }));
}

function parseWrmEras(rows = []) {
  return rows.map((row) => ({
    label: row[0],
    range: row[1],
    dateRange: row[2],
    description: row[3],
    why: row[4],
    visual: row[5],
  }));
}

function parseSimpleArrayList(rows = [], keys = []) {
  return rows.map((row) => {
    const obj = {};
    keys.forEach((key, index) => {
      obj[key] = row[index];
    });
    return obj;
  });
}

function findExtra(extraCategories, categoryName) {
  return (extraCategories.find((item) => item.category === categoryName) || {}).value;
}

function renderSparkline(rows = [], key = 'total_messages', highlightMonth = '') {
  const values = rows.map((row) => Number(row[key]) || 0);
  const width = 320;
  const height = 180;
  const padding = 16;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;

  const points = values.map((value, index) => {
    const x = padding + (usableWidth * index) / Math.max(values.length - 1, 1);
    const y = height - padding - ((value - min) / Math.max(max - min, 1)) * usableHeight;
    return [x, y];
  });

  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point[0]} ${point[1]}`).join(' ');
  const area = `${path} L ${points[points.length - 1][0]} ${height - padding} L ${points[0][0]} ${height - padding} Z`;
  const highlightIndex = rows.findIndex((row) => row.month === highlightMonth);
  const highlight = points[highlightIndex] || points[points.length - 1];

  return `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Monatsverlauf">
      <defs>
        <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="rgba(255,255,255,0.35)" />
          <stop offset="100%" stop-color="rgba(255,255,255,0.95)" />
        </linearGradient>
        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(255,255,255,0.28)" />
          <stop offset="100%" stop-color="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>
      <path d="${area}" fill="url(#areaGradient)"></path>
      <path d="${path}" fill="none" stroke="url(#lineGradient)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></path>
      ${highlight ? `<circle cx="${highlight[0]}" cy="${highlight[1]}" r="7" fill="#fff"></circle>` : ''}
    </svg>
  `;
}

function compactMonthLabels(rows = []) {
  if (rows.length <= 3) return rows.map((row) => row.month);
  const first = rows[0]?.month;
  const mid = rows[Math.floor(rows.length / 2)]?.month;
  const last = rows[rows.length - 1]?.month;
  return [first, mid, last].filter(Boolean);
}

function maxBy(rows = [], key) {
  return rows.reduce((best, row) => {
    if (!best) return row;
    return (row[key] || 0) > (best[key] || 0) ? row : best;
  }, null);
}

function mediaTypeLabel(type) {
  const map = {
    text: 'Text',
    image_omitted: 'Bilder',
    audio_omitted: 'Audios',
    document_omitted: 'Dokumente',
    video_omitted: 'Videos',
    sticker_omitted: 'Sticker',
    voice_call: 'Calls',
  };
  return map[type] || type;
}

function weekdayLabel(weekday) {
  const map = {
    Monday: 'Montag',
    Tuesday: 'Dienstag',
    Wednesday: 'Mittwoch',
    Thursday: 'Donnerstag',
    Friday: 'Freitag',
    Saturday: 'Samstag',
    Sunday: 'Sonntag',
  };
  return map[weekday] || weekday;
}

function formatNumber(value) {
  return new Intl.NumberFormat('de-DE').format(value || 0);
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

function formatDateTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }).format(date);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
