const DATA_URL = './data/friendship_wrapped_data.json';

const state = {
  data: null,
  stories: [],
  activeStoryIndex: 0,
  activeSlideIndex: 0,
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

function closeStoryPlayer() {
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
  els.homeSummary.textContent = `${formatNumber(data.summary.total_messages)} Nachrichten, ${data.summary.active_days} aktive Tage, ${data.wrm_overview?.[1]?.[1] || '91'} WRMs — und irgendwo dazwischen wurde aus Chat ein Betriebssystem.`;

  els.storyGrid.innerHTML = state.stories.map((story) => `
    <button class="story-bubble" data-story-id="${story.id}" data-theme="${story.theme}" type="button" aria-label="${story.title} öffnen">
      <div class="story-bubble__ring">
        <div class="story-bubble__inner">
          <div class="story-bubble__count">${story.icon}</div>
        </div>
      </div>
      <div class="story-bubble__title">${story.title}</div>
      <div class="story-bubble__preview">${story.homePreview || ''}</div>
      <div class="story-bubble__meta">${story.homeSubline || ''}</div>
    </button>
  `).join('');
}

function renderActiveStory() {
  const story = getActiveStory();
  const slide = story.slides[state.activeSlideIndex];

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
  syncProgressBars(1);
}

function syncProgressBars(currentProgress = 1) {
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
  const summary = data.summary || {};
  const monthlyPeak = maxBy(data.monthly_activity || [], 'total_messages') || {};
  const topDay = (data.top_chat_days || [])[0] || {};
  const topDay2 = (data.top_chat_days || [])[1] || {};
  const quickdraw = (data.response_time_quickdraw || [])[0] || {};
  const quickWindow = (data.response_time_summary || []).find((row) => row.scope === '<= 3h') || (data.response_time_summary || [])[0] || {};
  const voiceNotes = data.voice_notes || {};
  const mediaTop = (data.media_breakdown || []).slice(0, 5);
  const wordsTop = (data.top_words_curated || []).slice(0, 5);
  const emojiTop = (data.emojis || []).slice(0, 5);
  const reactionTop = (data.reactions || []).slice(0, 5);
  const repeatedTop = (data.repeated_phrases || [])[0] || {};
  const yearlyWord = (data.word_of_year || [])[0] || {};
  const signatures = data.sender_signatures || [];
  const vibeTop = (data.vibe_meter || [])[0] || {};
  const eras = (data.friendship_eras || []).slice(0, 4);
  const topicRows = parseSimpleArrayList(data.wrm_topic_alignment || [], ['topic', 'phase', 'evidence', 'use', 'visual', 'priority']);
  const flashbacks = (data.flashbacks || []).slice(0, 3);
  const wrmNumbers = wrmOverviewMap(data.wrm_overview || []);
  const wrmCore = parseWrmCoreTasks(data.wrm_core_tasks || []);
  const wrmDivisions = parseWrmDivisions(data.wrm_division_life || []);
  const wrmEras = parseWrmEras(data.wrm_eras || []).slice(0, 4);
  const wrmBack = parseSimpleArrayList(data.wrm_back_of_mind || [], ['idea', 'why', 'visual', 'source']).slice(0, 2);
  const wrmQuizzes = parseWrmNotesQuiz(data.wrm_notes_quiz || []).slice(0, 2);
  const quoteGame = (data.quote_game || []).slice(0, 2).map((item) => {
    const answer = (data.quote_answers || []).find((entry) => entry.quote_id === item.quote_id);
    return {
      id: item.quote_id,
      quote: item.quote,
      answer: answer?.true_sender || 'Johann',
      note: answer?.note || '',
    };
  });

  const totalMessages = formatNumber(summary.total_messages);
  const wrmCount = wrmNumbers['WRMs listed on main page'] || '91';
  const strongestMonthLabel = monthlyPeak.month || '2025-10';

  return [
    {
      id: 'intro',
      title: 'Intro',
      kicker: 'Start',
      icon: '◉',
      theme: 'ember',
      homePreview: totalMessages,
      homeSubline: 'messages',
      slides: [
        renderClaimSlide({ kicker: 'Friendship Wrapped', title: 'A private year in friendship', body: '26.260 messages. 91 WRMs. One operating system.' }),
        renderHeroStatSlide({ kicker: 'Total volume', number: totalMessages, label: 'Nachrichten insgesamt', body: `${summary.active_days || 957} aktive Tage.` }),
        renderHeroStatSlide({ kicker: 'Always on', number: String(summary.active_days || 957), label: 'aktive Tage', body: `${summary.longest_streak_days || 169} Tage am Stück von ${formatDate(summary.longest_streak_start)} bis ${formatDate(summary.longest_streak_end)}.` }),
        renderTopRankSlide({ kicker: 'Balance', title: 'Fast exakt 50/50', rows: (summary.message_balance || []).map((row) => ({ label: row.sender === 'Julian RR' ? 'Julian' : 'Johann', value: `${Math.round((row.share_pct || 0) * 1000) / 10}%` })) }),
        renderClaimSlide({ kicker: 'Prime window', title: summary.avg_daily_peak_2h_window_label || '18:18–20:18', body: 'Euer stärkstes Zeitfenster lag konstant am Abend.' }),
        renderClaimSlide({ kicker: 'Shift', title: 'This was never just chat.', body: 'It became a shared system.' }),
      ],
    },
    {
      id: 'chat',
      title: 'Chat',
      kicker: 'Intensity',
      icon: '⬤',
      theme: 'cobalt',
      homePreview: `${summary.active_days || 957} Tage`,
      homeSubline: 'full density',
      slides: [
        renderHeroStatSlide({ kicker: 'Biggest day', number: formatNumber(topDay.messages || 0), label: formatDate(topDay.date), body: `${topDay.dominant_topic || 'Peak topic'} · ${(topDay.duration_hours || 0).toFixed(1)}h aktiv.` }),
        renderClaimSlide({ kicker: 'Strongest month', title: strongestMonthLabel, body: `${formatNumber(monthlyPeak.total_messages || 0)} Nachrichten in einem Monat.` }),
        renderTopRankSlide({ kicker: 'Top chat days', title: 'Marathon sessions', rows: [topDay, topDay2].filter(Boolean).map((entry) => ({ label: formatDate(entry.date), value: formatNumber(entry.messages || 0), note: `${entry.dominant_topic || 'mixed'}` })) }),
        renderClaimSlide({ kicker: 'Quickdraw', title: `${quickWindow?.JulianRR_median_sec || 57}s vs ${quickWindow?.johann_median_sec || 62}s`, body: 'Antworten im <=3h-Fenster waren fast live.' }),
        renderHeroStatSlide({ kicker: 'Voice notes', number: formatNumber(voiceNotes.total_voice_notes || 1674), label: 'Audios', body: `Peak: ${voiceNotes.peak_month || '2025-11'} · ${formatNumber(voiceNotes.peak_month_count || 0)}.` }),
        renderTopRankSlide({ kicker: 'Media mix', title: 'Mehr als Text', rows: mediaTop.map((row) => ({ label: mediaTypeLabel(row.msg_type), value: formatNumber(row.total) })) }),
        renderClaimSlide({ kicker: 'Transition', title: 'Then your own language kicked in.', body: '' }),
      ],
    },
    {
      id: 'words',
      title: 'Wörter',
      kicker: 'Language',
      icon: '✦',
      theme: 'neon',
      homePreview: '#1 Wort',
      homeSubline: wordsTop[0]?.word || 'inside language',
      slides: [
        renderHeroStatSlide({ kicker: 'Top word', number: wordsTop[0]?.word || 'bro', label: `${formatNumber(wordsTop[0]?.count || 0)} Treffer`, body: 'Euer Signature-Vokabular in einem Wort.' }),
        renderTopRankSlide({ kicker: 'Top 5 words', title: 'Language board', rows: wordsTop.map((row) => ({ label: row.word, value: formatNumber(row.count) })) }),
        renderTopRankSlide({ kicker: 'Top 5 emojis', title: 'Emoji ranking', rows: emojiTop.map((row) => ({ label: row.emoji, value: formatNumber(row.count) })) }),
        renderTopRankSlide({ kicker: 'Top reactions', title: 'Reaction families', rows: reactionTop.map((row) => ({ label: row.reaction_family, value: formatNumber(row.count) })) }),
        renderClaimSlide({ kicker: 'Word of year', title: yearlyWord.editorial_pick || 'Momentum', body: `${yearlyWord.year || '2025'} editorial pick.` }),
        renderTopRankSlide({ kicker: 'Repeated phrase', title: repeatedTop.phrase || 'gute nacht', rows: [repeatedTop].filter((row) => row.phrase).map((row) => ({ label: row.phrase, value: `${row.count}x` })) }),
        renderIdentitySlide({ kicker: 'Sender signatures', title: 'Distinct voices', chips: signatures.slice(0, 6).map((item) => item.token), body: `${vibeTop.vibe || 'Planungsmodus'} war die dominante Tonlage.` }),
        renderClaimSlide({ kicker: 'Transition', title: 'Then it became more than conversation.', body: '' }),
      ],
    },
    {
      id: 'eras',
      title: 'Eras',
      kicker: 'Phases',
      icon: '◌',
      theme: 'violet',
      homePreview: `${eras.length || 4} Phasen`,
      homeSubline: 'phase shift',
      slides: [
        renderClaimSlide({ kicker: 'Phase intro', title: 'Every era had its own energy.', body: 'Setup → Leistung → System → Außenwirkung.' }),
        renderTimelineSlide({ theme: 'violet', kicker: 'Friendship eras', title: 'Topic evolution', body: 'Die Timeline zeigt klare Wechsel.', items: eras.map((era) => ({ range: `${era.start_month} → ${era.end_month}`, title: era.era_label, body: `${formatNumber(era.messages_in_era || 0)} messages` })) }),
        renderTopRankSlide({ kicker: 'Era 1', title: eras[0]?.era_label || 'Setup', rows: [{ label: 'Zeitraum', value: eras[0] ? `${eras[0].start_month} → ${eras[0].end_month}` : '-' }] }),
        renderTopRankSlide({ kicker: 'Era 2', title: eras[1]?.era_label || 'Abi Mode', rows: [{ label: 'Zeitraum', value: eras[1] ? `${eras[1].start_month} → ${eras[1].end_month}` : '-' }] }),
        renderTopRankSlide({ kicker: 'Era 3', title: eras[2]?.era_label || 'WRM System', rows: [{ label: 'Zeitraum', value: eras[2] ? `${eras[2].start_month} → ${eras[2].end_month}` : '-' }] }),
        renderClaimSlide({ kicker: 'Topic bridge', title: 'Out of chat, a system emerged.', body: '' }),
      ],
    },
    {
      id: 'flashbacks',
      title: 'Flashbacks',
      kicker: 'Memory',
      icon: '◐',
      theme: 'gold',
      homePreview: `${flashbacks.length} Fenster`,
      homeSubline: 'nostalgic scenes',
      slides: [
        renderFlashbackIntroSlide({ kicker: 'Flashbacks', title: 'Kurze Erinnerungsfenster', body: 'Keine Dumps, nur kuratierte Szenen.' }),
        ...flashbacks.flatMap((flashback) => [
          renderFlashbackIntroSlide({ kicker: flashback.title, title: flashback.title, body: flashback.why_it_is_fun || 'Moment captured.' }),
          renderFlashbackMessageSlide({ theme: 'gold', kicker: 'Scene', title: flashback.title, body: `${formatDateTime(flashback.date_start)} → ${formatDateTime(flashback.date_end)}`, flashbackId: flashback.flashback_id, dateRange: 'Flashback' }),
        ]),
      ],
    },
    {
      id: 'quiz',
      title: 'Quiz',
      kicker: 'Interactive',
      icon: 'Q',
      theme: 'coral',
      homePreview: 'QUIZ',
      homeSubline: 'guess who / wrm',
      slides: [
        renderQuizSlide({ kicker: 'QUIZ', title: 'Wer hat das geschrieben?', body: 'Round 1', quizId: quoteGame[0]?.id || 'q1', options: ['Johann', 'Julian RR'], answer: quoteGame[0]?.answer || 'Johann', quote: quoteGame[0]?.quote || '...' }),
        renderQuizRevealSlide({ kicker: 'Reveal', title: quoteGame[0]?.answer || 'Johann', body: quoteGame[0]?.note || '' }),
        renderQuizSlide({ kicker: 'QUIZ', title: 'Wer hat das geschrieben?', body: 'Round 2', quizId: quoteGame[1]?.id || 'q2', options: ['Johann', 'Julian RR'], answer: quoteGame[1]?.answer || 'Julian RR', quote: quoteGame[1]?.quote || '...' }),
        renderQuizRevealSlide({ kicker: 'Reveal', title: quoteGame[1]?.answer || 'Julian RR', body: quoteGame[1]?.note || '' }),
        ...wrmQuizzes.flatMap((quiz, index) => [
          renderQuizSlide({ kicker: 'WRM QUIZ', title: 'Welche WRM-Nummer war das?', body: quiz.notes.join(' · '), quizId: `wrm-${index}`, options: ['WRM 23', 'WRM 51', 'WRM 75'], answer: quiz.wrm, quote: 'Pick one' }),
          renderQuizRevealSlide({ kicker: 'Reveal', title: quiz.wrm, body: quiz.date }),
        ]),
      ],
    },
    {
      id: 'wrm',
      title: 'WRM',
      kicker: 'Operating system',
      icon: '◈',
      theme: 'plum',
      homePreview: `${wrmCount} WRMs`,
      homeSubline: 'weekly reset',
      slides: [
        renderClaimSlide({ kicker: 'WRM claim', title: 'At some point this became a weekly operating system.', body: '' }),
        renderHeroStatSlide({ kicker: 'WRM count', number: wrmCount, label: 'dokumentierte WRMs', body: wrmNumbers['WRM time span'] || '' }),
        renderHeroStatSlide({ kicker: 'Task volume', number: wrmNumbers['Visible lower-bound task count'] || '630+', label: 'sichtbare Tasks', body: 'Leistung als kontinuierlicher Stack.' }),
        renderIdentitySlide({ kicker: 'Division of life', title: 'Dominant worlds', chips: wrmDivisions.slice(0, 5).map((item) => `${item.division} ${item.count}`), body: 'School, Organise, Personal liefen parallel.' }),
        renderIdentitySlide({ kicker: 'Core Johann', title: 'Structure mode', chips: (wrmCore.Johann || []).slice(0, 4).map((item) => item.label), body: 'System, Schule, Qualität.' }),
        renderIdentitySlide({ kicker: 'Core Julian', title: 'Performance mode', chips: (wrmCore['Julian RR'] || wrmCore.Julian || []).slice(0, 4).map((item) => item.label), body: 'Sport, Drive, Karriere.' }),
        renderTimelineSlide({ theme: 'plum', kicker: 'Alignment', title: 'WRM x WhatsApp eras', body: 'Phasen liefen synchron.', items: topicRows.slice(0, 4).map((row) => ({ range: row.phase, title: row.topic, body: row.evidence })) }),
        renderTopRankSlide({ kicker: 'Back of mind', title: 'Prophecy moments', rows: wrmBack.map((row) => ({ label: row.idea, value: row.why })) }),
        renderClaimSlide({ kicker: 'Operating system', title: 'From chat to system.', body: 'And still friendship first.' }),
      ],
    },
    {
      id: 'finale',
      title: 'Finale',
      kicker: 'Close',
      icon: '◎',
      theme: 'ember',
      homePreview: 'The system',
      homeSubline: 'final poster',
      slides: [
        renderClaimSlide({ kicker: 'Finale', title: 'From chat to system', body: 'A friendship with rhythm, ambition and structure.' }),
        renderFinaleSlide({ kicker: 'Synthesis', headline: `${totalMessages} + ${wrmCount} + ${summary.longest_streak_days || 169}`, subline: 'messages + WRMs + longest streak', statement: 'One operating system.' }),
        renderFinaleSlide({ kicker: 'End', headline: 'Mission 1.0', subline: 'Not random. Built.', statement: 'Replay or jump into a chapter.' }),
      ],
    },
  ];
}

function renderHeroStatSlide({ kicker, number, label, body }) {
  return createBigNumberSlide({ theme: 'base', kicker, number, label, body, stats: [] });
}

function renderClaimSlide({ kicker, title, body }) {
  return createStatementSlide({ theme: 'base', kicker, title, body, actionLabel: 'Weiter', extraAction: false, showAction: false });
}

function renderTopRankSlide({ kicker, title, rows = [] }) {
  return {
    html: `
      <div class="story-slide__bg"></div>
      <div class="story-slide__inner">
        <p class="story-kicker">${escapeHtml(kicker)}</p>
        <h3 class="story-title story-title--medium">${escapeHtml(title)}</h3>
        <div class="rank-list">
          ${rows.slice(0, 5).map((row, index) => `
            <article class="rank-item rank-item--${index === 0 ? 'top' : 'rest'}">
              <div class="rank-item__index">#${index + 1}</div>
              <div class="rank-item__label">${escapeHtml(row.label || '')}</div>
              <div class="rank-item__value">${escapeHtml(row.value || '')}</div>
              ${row.note ? `<p class="rank-item__note">${escapeHtml(row.note)}</p>` : ''}
            </article>
          `).join('')}
        </div>
      </div>
    `,
  };
}

function renderIdentitySlide({ kicker, title, chips = [], body = '' }) {
  return {
    html: `
      <div class="story-slide__bg"></div>
      <div class="story-slide__inner story-layout--center">
        <p class="story-kicker">${escapeHtml(kicker)}</p>
        <h3 class="story-title">${escapeHtml(title)}</h3>
        <div class="chip-row">${chips.map((chip) => `<span class="chip">${escapeHtml(chip)}</span>`).join('')}</div>
        <p class="story-lead">${escapeHtml(body)}</p>
      </div>
    `,
  };
}

function renderQuizSlide({ kicker, title, body, quizId, options, answer, quote }) {
  return createQuizBase({ theme: 'base', kicker, title, body: `„${quote}“ · ${body}`, quizId, options, answer, explanation: '' });
}

function renderQuizRevealSlide({ kicker, title, body }) {
  return {
    html: `
      <div class="story-slide__bg"></div>
      <div class="story-slide__inner story-layout--center quiz-reveal">
        <p class="story-kicker">${escapeHtml(kicker)}</p>
        <div class="hero-number">${escapeHtml(title === 'Julian RR' ? 'Julian' : title)}</div>
        <p class="story-lead">${escapeHtml(body)}</p>
      </div>
    `,
  };
}

function renderFlashbackIntroSlide({ kicker, title, body }) {
  return createCoverSlide({ theme: 'base', kicker, title, body, tags: [] });
}

function renderFlashbackMessageSlide({ theme, kicker, title, body, flashbackId, dateRange }) {
  return createFlashbackSlide({ theme, kicker, title, body, flashbackId, dateRange });
}

function renderTimelineSlide({ theme, kicker, title, body, items = [] }) {
  return createTimelineSlide({ theme, kicker, title, body, items });
}

function renderFinaleSlide({ kicker, headline, subline, statement }) {
  return {
    html: `
      <div class="story-slide__bg"></div>
      <div class="story-slide__inner story-layout--center finale-slide">
        <p class="story-kicker">${escapeHtml(kicker)}</p>
        <div class="hero-number">${escapeHtml(headline)}</div>
        <p class="hero-label">${escapeHtml(subline)}</p>
        <h3 class="story-title story-title--medium">${escapeHtml(statement)}</h3>
      </div>
    `,
  };
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

function createStatementSlide({ theme, kicker, title, body, actionLabel = 'Replay', extraAction = false, showAction = true }) {
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
        ${showAction ? `<div class="story-slide__bottom">
          <div class="chip-row">
            <button class="primary-button" type="button" data-action="replay">${escapeHtml(actionLabel)}</button>
            ${extraAction ? '<button class=\"secondary-button\" type=\"button\" data-action=\"home\">Zur Story-Auswahl</button>' : ''}
          </div>
        </div>` : ''}
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
