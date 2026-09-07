const easyWords = ["the","cat","sat","run","dog","sun","sky","big","red","top","hat","map","bag","box","cup","pen",
    "key","toy","fan","jar","ice","hot","wet","dry","new","old","far","near","warm","cool","fast","slow","open","shut",
    "soft","hard","tall","short","light","dark","green","blue","black","white","brown","happy","sunny","windy","quiet",
    "gentle","simple","little","garden","forest","valley","meadow","bridge","corner","window","pillow","basket"];

  const mediumWords = ["computer","keyboard","monitor","internet","software","project","meeting","schedule","report",
    "customer","service","quality","process","system","update","design","feature","product","market","strategy",
    "budget","revenue","client","vendor","contract","deadline","review","feedback","approval","training","support",
    "network","security","database","server","backup","storage","access","account","profile","message","notification",
    "calendar","document","folder","archive","upload","download","connection","function","variable","module",
    "interface","platform","framework","solution","resource","workflow","pipeline","dashboard"];

  const hardWords = ["extraordinary","significant","fundamentally","approximately","international","infrastructure",
    "responsibility","documentation","implementation","authentication","synchronization","configuration",
    "optimization","architecture","dependency","compatibility","virtualization","encryption","algorithm",
    "asynchronous","comprehensive","substantially","predominantly","simultaneously","unprecedented","controversial",
    "sophisticated","phenomenon","hypothesis","legislation","jurisdiction","negotiation","reconciliation",
    "philosophical","psychological","technological","environmental","organizational","interpersonal"];

  const contractions = ["don't","can't","won't","it's","that's","they're","we've","I'll","shouldn't","wouldn't"];
  const properNouns = ["London","Chicago","Beethoven","NASA","Everest","Amazon","Pacific","Einstein","Bangalore","Toronto"];

  /* ---------- Text generators ---------- */
  function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function capitalize(w) { return w.charAt(0).toUpperCase() + w.slice(1); }

  function generateEasyText(targetWords) {
    const words = [];
    while (words.length < targetWords) words.push(pickRandom(easyWords));
    return words.join(' ');
  }

  function generateMediumText(targetWords) {
    const sentences = [];
    let count = 0;
    while (count < targetWords) {
      const len = randomInt(6, 10);
      const words = [];
      for (let i = 0; i < len; i++) words.push(pickRandom(mediumWords));
      words[0] = capitalize(words[0]);
      if (len > 5) {
        const idx = randomInt(2, 4);
        words[idx] = words[idx] + ',';
      }
      sentences.push(words.join(' ') + '.');
      count += len;
    }
    return sentences.join(' ');
  }

  function generateHardText(targetWords) {
    const pool = hardWords.concat(mediumWords);
    const sentences = [];
    let count = 0;
    while (count < targetWords) {
      const len = randomInt(9, 15);
      const words = [];
      for (let i = 0; i < len; i++) {
        const r = Math.random();
        if (r < 0.08) words.push(pickRandom(contractions));
        else if (r < 0.13) words.push(pickRandom(properNouns));
        else words.push(pickRandom(pool));
      }
      words[0] = capitalize(words[0]);
      const commaCount = randomInt(1, 2);
      for (let c = 0; c < commaCount; c++) {
        const idx = randomInt(2, len - 2);
        if (!words[idx].endsWith(',')) words[idx] += ',';
      }
      const r2 = Math.random();
      const endPunct = r2 < 0.12 ? '!' : (r2 < 0.22 ? '?' : '.');
      sentences.push(words.join(' ') + endPunct);
      count += len;
    }
    return sentences.join(' ');
  }

  function generateText(level) {
    const targetWords = 900;
    if (level === 'easy') return generateEasyText(targetWords);
    if (level === 'hard') return generateHardText(targetWords);
    return generateMediumText(targetWords);
  }

  /* ---------- DOM refs ---------- */
  const paragraphEl = document.getElementById('paragraph');
  const typeInput = document.getElementById('typeInput');
  const tileTime = document.getElementById('tileTime');
  const statTime = document.getElementById('statTime');
  const statWpm = document.getElementById('statWpm');
  const statAcc = document.getElementById('statAcc');
  const statErr = document.getElementById('statErr');
  const bestWpmEl = document.getElementById('bestWpm');
  const settingsEls = document.querySelectorAll('.settings-group');
  const resultOverlay = document.getElementById('resultOverlay');
  const tryAgainBtn = document.getElementById('tryAgainBtn');
  const startBtn = document.getElementById('startBtn');
  const themeSwitch = document.getElementById('themeSwitch');
  const userNameEl = document.getElementById('userName');

  /* ---------- State ---------- */
  let currentLevel = 'easy';
  let selectedDuration = 15;
  let currentText = '';
  let lockedLength = 0;
  let startTime = null;
  let remainingSeconds = 15;
  let timerInterval = null;
  let finished = false;
  let audioCtx = null;
  let testActive = false;

  // function getBestWpm() { return parseInt(localStorage.getItem('keyDashBestWpm') || '0', 10); }
  // function setBestWpm(value) {
  //   const current = getBestWpm();
  //   if (value > current) localStorage.setItem('keyDashBestWpm', String(value));
  //   bestWpmEl.textContent = String(Math.max(current, value));
  // }

  /* ---------- Theme ---------- */
  themeSwitch.addEventListener('click', () => {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    document.documentElement.setAttribute('data-theme', isLight ? 'dark' : 'light');
    localStorage.setItem('keyDashTheme', isLight ? 'dark' : 'light');
  });
  const savedTheme = localStorage.getItem('keyDashTheme');
  if (savedTheme === 'light') document.documentElement.setAttribute('data-theme', 'light');

  /* ---------- Rendering ---------- */
  function renderParagraph() {
    paragraphEl.innerHTML = '';
    const frag = document.createDocumentFragment();
    currentText.split('').forEach((char) => {
      const span = document.createElement('span');
      span.textContent = char;
      frag.appendChild(span);
    });
    paragraphEl.appendChild(frag);
    updateHighlight();
  }

  function updateHighlight() {
    const typedLength = typeInput.value.length;
    const spans = paragraphEl.children;
    const visibleCount = Math.min(spans.length, typedLength + 400);
    for (let i = 0; i < visibleCount; i++) {
      const span = spans[i];
      span.className = '';
      if (i < typedLength) {
        span.classList.add(typeInput.value[i] === currentText[i] ? 'char-correct' : 'char-incorrect');
      } else if (i === typedLength) {
        span.classList.add('char-current');
      }
    }
    const activeSpan = spans[typedLength];
    if (activeSpan) activeSpan.scrollIntoView({ block: 'nearest' });
  }

  function computeStats() {
    const value = typeInput.value;
    let correct = 0;
    for (let i = 0; i < value.length; i++) {
      if (value[i] === currentText[i]) correct++;
    }
    return { correct, wrong: value.length - correct, typed: value.length };
  }

  function updateLiveStats() {
    const elapsed = selectedDuration - remainingSeconds;
    const { correct, wrong, typed } = computeStats();
    const minutes = elapsed / 60;
    const wpm = minutes > 0 ? Math.round((correct / 5) / minutes) : 0;
    const accuracy = typed > 0 ? Math.round((correct / typed) * 100) : 100;
    statWpm.textContent = wpm;
    statAcc.textContent = accuracy + '%';
    statErr.textContent = wrong;
  }

  /* ---------- Timer ---------- */
  function formatTime(sec) {
    if (sec >= 60) {
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return m + 'm ' + (s < 10 ? '0' : '') + s + 's';
    }
    return sec + 's';
  }

  function playTick() {
    try {
      if (!audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.frequency.value = 900;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.16, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.15);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) { /* audio not critical */ }
  }

  function startTimer() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    startTime = Date.now();
    remainingSeconds = selectedDuration;
    timerInterval = setInterval(() => {
      remainingSeconds--;
      statTime.textContent = formatTime(Math.max(0, remainingSeconds));
      if (remainingSeconds <= 10 && remainingSeconds > 0) {
        tileTime.classList.add('time-warning');
        playTick();
      }
      updateLiveStats();
      if (remainingSeconds <= 0) finishTest();
    }, 1000);
  }

  function stopTimer() { clearInterval(timerInterval); }

  /* ---------- Finish / Reset ---------- */
  function getMotivationMessage(wpm) {
    if (wpm < 20) return { emoji: '🐢', text: 'Just getting started — keep practicing!' };
    if (wpm < 25) return { emoji: '🙂', text: "Nice! You're building momentum." };
    if (wpm < 30) return { emoji: '💪', text: 'Good pace — solid typing!' };
    if (wpm < 35) return { emoji: '🚀', text: "Great speed! You're doing awesome." };
    return { emoji: '🔥', text: 'Excellent! Lightning-fast fingers!' };
  }

  function finishTest() {
    if (finished) return;
    finished = true;
    testActive = false;
    stopTimer();
    typeInput.disabled = true;
    tileTime.classList.remove('time-warning');

    const elapsed = Math.max(1, selectedDuration - Math.max(0, remainingSeconds));
    const { correct, wrong, typed } = computeStats();
    const minutes = elapsed / 60;
    const wpm = Math.round((correct / 5) / minutes) || 0;
    const accuracy = typed > 0 ? Math.round((correct / typed) * 100) : 100;

    document.getElementById('resultWpmValue').textContent = wpm;
    document.getElementById('resultAccuracy').textContent = accuracy + '%';
    document.getElementById('resultChars').innerHTML =
      '<span class="val-correct">' + correct + '</span><span class="val-muted">/</span><span class="val-incorrect">' + wrong + '</span>';

    const userName = userNameEl.value.trim();
    document.getElementById('resultTitle').textContent = userName ? ('Test Complete, ' + userName + '!') : 'Test Complete!';

    const msg = getMotivationMessage(wpm);
    document.getElementById('resultMessage').textContent = msg.emoji + ' ' + msg.text;

    // setBestWpm(wpm);
    resultOverlay.classList.add('show');
  }

  function resetTest() {
    currentText = generateText(currentLevel);
    lockedLength = 0;
    startTime = null;
    remainingSeconds = selectedDuration;
    finished = false;
    testActive = false;
    stopTimer();
    tileTime.classList.remove('time-warning');

    typeInput.value = '';
    typeInput.disabled = true;
    typeInput.placeholder = 'Click Start Test, then type here...';

    statTime.textContent = formatTime(selectedDuration);
    statWpm.textContent = '0';
    statAcc.textContent = '100%';
    statErr.textContent = '0';

    resultOverlay.classList.remove('show');
    renderParagraph();
  }

  /* ---------- Input handling (word-lock backspace) ---------- */
  typeInput.addEventListener('keydown', (e) => {
    if (!testActive || finished) return;
    if (e.key === 'Backspace' && typeInput.value.length <= lockedLength) {
      e.preventDefault();
    }
    if (e.key === 'Enter') e.preventDefault();
  });

  typeInput.addEventListener('paste', (e) => e.preventDefault());

  typeInput.addEventListener('input', () => {
    if (!testActive) return;
    if (startTime === null) startTimer();

    const value = typeInput.value;
    if (value.endsWith(' ')) lockedLength = value.length;

    updateHighlight();
    updateLiveStats();

    if (value.length >= currentText.length - 5) {
      currentText += ' ' + generateText(currentLevel);
      renderParagraph();
    }
  });

  startBtn.addEventListener('click', () => {
    if (testActive) return;

    const userName = userNameEl.value.trim();
    if (!userName) {
      userNameEl.focus();
      userNameEl.placeholder = 'Please enter your name';
      return;
    }

    testActive = true;
    typeInput.disabled = false;
    typeInput.placeholder = 'Start typing here...';
    typeInput.focus();
  });

  settingsEls.forEach((group) => {
    group.addEventListener('click', (e) => {
      const btn = e.target.closest('.pill');
      if (!btn) return;
      if (btn.dataset.duration) {
        group.querySelectorAll('[data-duration]').forEach((p) => p.classList.remove('active'));
        btn.classList.add('active');
        selectedDuration = parseInt(btn.dataset.duration, 10);
      } else if (btn.dataset.level) {
        group.querySelectorAll('[data-level]').forEach((p) => p.classList.remove('active'));
        btn.classList.add('active');
        currentLevel = btn.dataset.level;
      }
      resetTest();
    });
  });

  tryAgainBtn.addEventListener('click', resetTest);

  // bestWpmEl.textContent = getBestWpm();
  resetTest();