/* =========================================================
   Russian Roulette — state machine + game logic
   ========================================================= */

const state = {
  totalCount: 3,
  winnerCount: 1,
  names: [],
  bulletPlan: [],     // 배열: true=실탄, false=공포탄, 길이 = totalCount
  targetQueue: [],    // 실탄이 터트릴 풍선 인덱스의 순서 (길이 = winnerCount)
  shotIndex: 0,       // 다음에 발사될 총알 index
  poppedNames: [],    // 결과 저장
};

// ---------- 화면 전환 ----------
const screens = ['setup', 'names', 'load', 'action', 'result'];
function showScreen(name) {
  screens.forEach(s => {
    const el = document.getElementById(`screen-${s}`);
    if (!el) return;
    if (s === name) el.setAttribute('data-active', 'true');
    else            el.removeAttribute('data-active');
  });
}

// ---------- 유틸 ----------
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function range(n) { return Array.from({ length: n }, (_, i) => i); }

// ---------- SCREEN 1: SETUP ----------
const totalInput  = document.getElementById('totalCount');
const winnerInput = document.getElementById('winnerCount');
const setupError  = document.getElementById('setupError');

document.getElementById('goNamesBtn').addEventListener('click', () => {
  const total  = parseInt(totalInput.value, 10);
  const winner = parseInt(winnerInput.value, 10);

  if (!Number.isInteger(total) || total < 1) {
    return showError(setupError, '총 인원은 1명 이상으로 입력해주세요.');
  }
  if (!Number.isInteger(winner) || winner < 1) {
    return showError(setupError, '당첨 인원은 1명 이상으로 입력해주세요.');
  }
  if (winner > total) {
    return showError(setupError, '당첨 인원은 총 인원보다 많을 수 없습니다.');
  }
  if (total > 50) {
    return showError(setupError, '최대 50명까지 입력할 수 있습니다.');
  }
  hideError(setupError);

  state.totalCount  = total;
  state.winnerCount = winner;
  buildNamesGrid(total);
  showScreen('names');
});

// ---------- SCREEN 2: NAMES ----------
const namesGrid  = document.getElementById('namesGrid');
const namesError = document.getElementById('namesError');
const goLoadBtn  = document.getElementById('goLoadBtn');

function buildNamesGrid(n) {
  namesGrid.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const input = document.createElement('input');
    input.type        = 'text';
    input.className   = 'name-input';
    input.placeholder = `${i + 1}번 이름`;
    input.maxLength   = 20;
    input.dataset.idx = i;
    input.addEventListener('input', refreshLoadBtnState);
    namesGrid.appendChild(input);
  }
  refreshLoadBtnState();
}

function refreshLoadBtnState() {
  const inputs   = [...namesGrid.querySelectorAll('.name-input')];
  const allFilled = inputs.length > 0 && inputs.every(i => i.value.trim().length > 0);
  goLoadBtn.disabled = !allFilled;
}

document.getElementById('backToSetupBtn').addEventListener('click', () => {
  showScreen('setup');
});

goLoadBtn.addEventListener('click', () => {
  const inputs = [...namesGrid.querySelectorAll('.name-input')];
  const names  = inputs.map(i => i.value.trim());

  if (names.some(n => !n)) return; // 안전장치: disabled 상태에서 호출되는 일은 없음
  hideError(namesError);

  state.names = names;
  showScreen('load');
});

// ---------- SCREEN 3: LOAD ----------
const loadBtn = document.getElementById('loadBtn');
loadBtn.addEventListener('click', () => {
  loadBtn.classList.add('loading');

  // 장전 모션 끝난 후 액션 화면으로
  setTimeout(() => {
    setupActionScreen();
    showScreen('action');
    loadBtn.classList.remove('loading');
  }, 900);
});

// ---------- SCREEN 4: ACTION ----------
const balloonsEl   = document.getElementById('balloons');
const bulletsEl    = document.getElementById('bullets');
const fireBtn      = document.getElementById('fireBtn');
const stageEl      = document.getElementById('stage');
const gunEl        = document.querySelector('.gun');
const muzzleFlash  = document.getElementById('muzzleFlash');

function setupActionScreen() {
  // 1. 총알 계획 만들기 — 무작위 위치에 실탄 M개
  const livePattern = [
    ...Array(state.winnerCount).fill(true),
    ...Array(state.totalCount - state.winnerCount).fill(false),
  ];
  state.bulletPlan = shuffle(livePattern);

  // 2. 실탄이 터트릴 풍선 순서 (랜덤 M개를 골라 셔플)
  state.targetQueue = shuffle(range(state.totalCount)).slice(0, state.winnerCount);

  // 3. 상태 초기화
  state.shotIndex   = 0;
  state.poppedNames = [];

  // 4. 풍선 렌더
  balloonsEl.innerHTML = '';
  state.names.forEach((name, idx) => {
    const balloon = document.createElement('div');
    balloon.className     = 'balloon';
    balloon.dataset.idx   = idx;
    balloon.dataset.color = idx % 5;
    balloon.innerHTML = `
      <div class="balloon-shape"></div>
      <div class="balloon-string"></div>
      <div class="name">${escapeHTML(name)}</div>
    `;
    balloonsEl.appendChild(balloon);
  });

  // 5. 총알 렌더
  bulletsEl.innerHTML = '';
  for (let i = 0; i < state.totalCount; i++) {
    const b = document.createElement('div');
    b.className   = 'bullet';
    b.dataset.idx = i;
    bulletsEl.appendChild(b);
  }

  // 6. 발사 버튼 활성화
  fireBtn.disabled    = false;
  fireBtn.textContent = '발사';

  // 7. 스크롤 위치 초기화
  stageEl.scrollLeft = 0;
}

fireBtn.addEventListener('click', () => {
  if (state.shotIndex >= state.totalCount) return;

  const isLive = state.bulletPlan[state.shotIndex];

  // 총알 소비 (시각)
  const bulletEl = bulletsEl.querySelector(`.bullet[data-idx="${state.shotIndex}"]`);
  if (bulletEl) bulletEl.classList.add('spent');

  // 발사 효과
  fireMuzzle();
  recoilGun();

  if (isLive) {
    const targetIdx = state.targetQueue.shift();
    setTimeout(() => popBalloon(targetIdx), 120);
  }

  state.shotIndex++;

  // 다음 발사 가능 여부
  if (state.shotIndex >= state.totalCount) {
    fireBtn.disabled    = true;
    fireBtn.textContent = '끝';
    setTimeout(showResult, 1100);
  }
});

function fireMuzzle() {
  muzzleFlash.classList.remove('fire');
  void muzzleFlash.offsetWidth; // reflow
  muzzleFlash.classList.add('fire');
}

function recoilGun() {
  gunEl.classList.remove('recoil');
  void gunEl.offsetWidth;
  gunEl.classList.add('recoil');
}

function popBalloon(idx) {
  const balloon = balloonsEl.querySelector(`.balloon[data-idx="${idx}"]`);
  if (!balloon) return;

  // 파편 효과
  const burst = document.createElement('div');
  burst.className = 'pop-burst';
  const shape = balloon.querySelector('.balloon-shape');
  const colorVar = getComputedStyle(shape).backgroundColor;
  burst.style.color = colorVar;
  for (let i = 0; i < 8; i++) {
    const piece = document.createElement('span');
    const angle = (i / 8) * Math.PI * 2;
    piece.style.setProperty('--dx', `${Math.cos(angle) * 60}px`);
    piece.style.setProperty('--dy', `${Math.sin(angle) * 60}px`);
    burst.appendChild(piece);
  }
  balloon.appendChild(burst);

  // 풍선 사라짐 (이름은 잠시 흐릿하게 보였다가 결과로 이동)
  state.poppedNames.push(state.names[idx]);
  setTimeout(() => balloon.classList.add('popped'), 30);

  // 풍선 위치로 자동 스크롤
  scrollToBalloon(balloon);
}

function scrollToBalloon(balloon) {
  const stageRect   = stageEl.getBoundingClientRect();
  const balloonRect = balloon.getBoundingClientRect();
  const offset = balloonRect.left - stageRect.left
               + stageEl.scrollLeft
               - stageRect.width / 2
               + balloonRect.width / 2;
  stageEl.scrollTo({ left: offset, behavior: 'smooth' });
}

// ---------- SCREEN 5: RESULT ----------
function showResult() {
  const winnerList = document.getElementById('winnerList');
  winnerList.innerHTML = '';
  state.poppedNames.forEach(name => {
    const li = document.createElement('li');
    li.textContent = name;
    winnerList.appendChild(li);
  });
  showScreen('result');
}

document.getElementById('restartBtn').addEventListener('click', () => {
  showScreen('setup');
});

// ---------- 헬퍼 ----------
function showError(el, msg) {
  el.textContent = msg;
  el.hidden = false;
}
function hideError(el) {
  el.hidden = true;
  el.textContent = '';
}
function escapeHTML(str) {
  return str.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
