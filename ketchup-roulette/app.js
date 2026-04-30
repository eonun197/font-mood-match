/* =========================================================
   케찹 룰렛 — High Noon
   서부극 시네마틱 + 식빵/케찹 룰렛
   ========================================================= */

const MAX_COUNT = 20;

const state = {
  totalCount: 3,
  winnerCount: 1,
  names: ['', '', ''],
  bulletPlan: [],          // true=실탄(케찹), false=공탄
  currentTurn: 0,
  hitNames: [],
  quickMode: false,
};

// ---------- 화면 전환 ----------
const screens = ['title', 'entry', 'ready', 'action', 'result'];
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
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/* =========================================================
   시네마틱 효과 트리거
   ========================================================= */

const cameraEl    = document.getElementById('camera');
const bwFlashEl   = document.getElementById('bwFlash');
const speedLines  = document.getElementById('speedLines');
const smokeEl     = document.getElementById('smokeOverlay');

function shakeCamera(strong = false) {
  cameraEl.classList.remove('shake', 'shake-strong');
  void cameraEl.offsetWidth;
  cameraEl.classList.add(strong ? 'shake-strong' : 'shake');
}
function fireSpeedLines() {
  speedLines.classList.remove('fire');
  void speedLines.offsetWidth;
  speedLines.classList.add('fire');
}
function fireSmoke() {
  smokeEl.classList.remove('fire');
  void smokeEl.offsetWidth;
  smokeEl.classList.add('fire');
}
function bwOn()  { bwFlashEl.classList.add('active'); }
function bwOff() { bwFlashEl.classList.remove('active'); }

const sfxTextEl = document.getElementById('sfxText');
function showSFX(text) {
  sfxTextEl.textContent = text;
  sfxTextEl.classList.remove('fire');
  void sfxTextEl.offsetWidth;
  sfxTextEl.classList.add('fire');
}

/* =========================================================
   SVG 생성기 — 녹슨 무쇠 토스터 + 빈티지 케찹통 + 식빵 + X자 스플래시
   ========================================================= */

// 녹슨 무쇠 토스터 (가로 슬롯 N개 + 측면 레버 + 다이얼)
function toasterSVG(slotCount, opts = {}) {
  const slotW   = opts.slotW   || 56;
  const slotGap = opts.slotGap || 14;
  const padding = opts.padding || 36;
  const leverW  = opts.leverW  || 50;
  const bodyH   = opts.bodyH   || 140;
  const bodyY   = opts.bodyY   || 50;
  const innerW  = slotCount * slotW + (slotCount - 1) * slotGap;
  const totalW  = padding * 2 + innerW + leverW;
  const totalH  = bodyY + bodyH + 30;  // 발 공간 포함

  // 슬롯
  let slots = '';
  for (let i = 0; i < slotCount; i++) {
    const x = padding + i * (slotW + slotGap);
    slots += `
      <rect x="${x}" y="${bodyY + 6}" width="${slotW}" height="14" rx="2"
            fill="#0a0604" stroke="#2a1a0a" stroke-width="1"/>
      <rect x="${x + 2}" y="${bodyY + 8}" width="${slotW - 4}" height="10" rx="1.5"
            fill="#000"/>
    `;
  }

  const leverX = padding + innerW + 14;
  const leverYTop = bodyY + 30;
  const leverYBot = bodyY + bodyH - 20;
  const leverDownOffset = (leverYBot - leverYTop - 26);

  // 녹 패치 (랜덤하게 보이는 갈색 점들)
  const rustPatches = `
    <ellipse cx="${padding + 30}" cy="${bodyY + bodyH - 50}" rx="14" ry="6" fill="#a85d28" opacity="0.55"/>
    <ellipse cx="${padding + innerW - 50}" cy="${bodyY + bodyH - 18}" rx="18" ry="5" fill="#6e3812" opacity="0.5"/>
    <ellipse cx="${padding + innerW / 2 - 30}" cy="${bodyY + 38}" rx="8" ry="3" fill="#a85d28" opacity="0.45"/>
    <ellipse cx="${leverX - 20}" cy="${bodyY + 80}" rx="10" ry="4" fill="#6e3812" opacity="0.5"/>
    <circle cx="${padding + 80}" cy="${bodyY + bodyH - 70}" r="3" fill="#a85d28" opacity="0.7"/>
    <circle cx="${padding + innerW - 100}" cy="${bodyY + 60}" r="2.5" fill="#a85d28" opacity="0.6"/>
  `;

  // 스크래치
  const scratches = `
    <line x1="${padding + 60}" y1="${bodyY + 55}" x2="${padding + 110}" y2="${bodyY + 50}" stroke="#1a0d04" stroke-width="0.6" opacity="0.5"/>
    <line x1="${padding + innerW - 80}" y1="${bodyY + bodyH - 60}" x2="${padding + innerW - 30}" y2="${bodyY + bodyH - 65}" stroke="#1a0d04" stroke-width="0.6" opacity="0.5"/>
    <line x1="${leverX - 4}" y1="${bodyY + 40}" x2="${leverX - 4}" y2="${bodyY + 110}" stroke="#1a0d04" stroke-width="0.5" opacity="0.4"/>
  `;

  return `
    <svg viewBox="0 0 ${totalW} ${totalH}" width="${opts.width || totalW}" height="${opts.height || totalH}" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="ironGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stop-color="#6a5238"/>
          <stop offset="40%" stop-color="#4a3520"/>
          <stop offset="100%" stop-color="#2a1f15"/>
        </linearGradient>
        <linearGradient id="ironHighlight" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stop-color="rgba(255,235,180,0.25)"/>
          <stop offset="100%" stop-color="rgba(255,235,180,0)"/>
        </linearGradient>
      </defs>

      <!-- 그림자 -->
      <ellipse cx="${totalW / 2}" cy="${totalH - 8}" rx="${totalW * 0.45}" ry="8" fill="rgba(20,12,4,0.55)"/>

      <!-- 발 -->
      <rect x="${padding - 4}" y="${bodyY + bodyH - 4}" width="22" height="14" rx="2" fill="#1a0d04"/>
      <rect x="${padding + innerW - 18}" y="${bodyY + bodyH - 4}" width="22" height="14" rx="2" fill="#1a0d04"/>
      <rect x="${leverX + 4}" y="${bodyY + bodyH - 4}" width="22" height="14" rx="2" fill="#1a0d04"/>

      <!-- 본체 (무쇠) -->
      <rect x="${padding - 14}" y="${bodyY}" width="${innerW + leverW + 28}" height="${bodyH}"
            rx="6" fill="url(#ironGrad)" stroke="#1a0d04" stroke-width="3"/>

      <!-- 본체 상단 하이라이트 (살짝) -->
      <rect x="${padding - 8}" y="${bodyY + 4}" width="${innerW + leverW + 16}" height="14"
            rx="3" fill="url(#ironHighlight)"/>

      <!-- 녹 패치 (본체 위) -->
      ${rustPatches}

      <!-- 스크래치 -->
      ${scratches}

      <!-- 슬롯 -->
      ${slots}

      <!-- 다이얼 (왼쪽 아래 작은 원) -->
      <circle cx="${padding + 16}" cy="${bodyY + bodyH - 30}" r="14"
              fill="#2a1a0a" stroke="#1a0d04" stroke-width="1.5"/>
      <circle cx="${padding + 16}" cy="${bodyY + bodyH - 30}" r="3" fill="#a85d28"/>
      <line x1="${padding + 16}" y1="${bodyY + bodyH - 30}"
            x2="${padding + 16}" y2="${bodyY + bodyH - 42}"
            stroke="#a85d28" stroke-width="2" stroke-linecap="round"/>

      <!-- 레버 슬롯 -->
      <rect x="${leverX + 8}" y="${leverYTop}" width="14" height="${leverYBot - leverYTop}"
            rx="3" fill="#0a0604" opacity="0.7"/>

      <!-- 레버 손잡이 -->
      <g class="toaster-lever" transform="translate(0, ${opts.leverDown ? leverDownOffset : 0})">
        <rect x="${leverX}" y="${leverYTop + 4}" width="30" height="22"
              rx="2" fill="#1a0d04" stroke="#000" stroke-width="1.5"/>
        <circle cx="${leverX + 15}" cy="${leverYTop + 15}" r="4" fill="#a85d28"/>
        <!-- 레버 위 녹 -->
        <circle cx="${leverX + 22}" cy="${leverYTop + 10}" r="1.5" fill="#a85d28" opacity="0.7"/>
      </g>

      <!-- 브랜드 라벨 (KETCHUP CO.) -->
      <text x="${padding + innerW / 2 + 10}" y="${bodyY + bodyH - 14}"
            text-anchor="middle"
            font-family="'Rye', serif" font-size="13"
            fill="#a85d28" letter-spacing="3"
            opacity="0.9">KETCHUP CO.</text>
      <text x="${padding + innerW / 2 + 10}" y="${bodyY + bodyH - 4}"
            text-anchor="middle"
            font-family="'Bevan', serif" font-size="6"
            fill="#a85d28" letter-spacing="2"
            opacity="0.7">EST. 1873</text>
    </svg>
  `;
}

// 토스터 BACK 레이어 — 슬롯 어두운 안쪽만 (z-index 1)
function toasterBackSVG(slotCount, opts = {}) {
  const slotW   = opts.slotW   || 56;
  const slotGap = opts.slotGap || 14;
  const padding = opts.padding || 36;
  const leverW  = opts.leverW  || 50;
  const bodyH   = opts.bodyH   || 140;
  const bodyY   = opts.bodyY   || 50;
  const innerW  = slotCount * slotW + (slotCount - 1) * slotGap;
  const totalW  = padding * 2 + innerW + leverW;
  const totalH  = bodyY + bodyH + 30;

  let slots = '';
  for (let i = 0; i < slotCount; i++) {
    const x = padding + i * (slotW + slotGap);
    slots += `
      <rect x="${x}" y="${bodyY + 6}" width="${slotW}" height="14" rx="2"
            fill="#0a0604" stroke="#2a1a0a" stroke-width="1"/>
      <rect x="${x + 2}" y="${bodyY + 8}" width="${slotW - 4}" height="10" rx="1.5"
            fill="#000"/>
    `;
  }

  return `
    <svg viewBox="0 0 ${totalW} ${totalH}" width="${opts.width || totalW}" height="${opts.height || totalH}" preserveAspectRatio="xMidYMid meet">
      ${slots}
    </svg>
  `;
}

// 토스터 FRONT 레이어 — 본체+디테일, 슬롯 위치는 evenodd hole로 뚫림 (z-index 3)
function toasterFrontSVG(slotCount, opts = {}) {
  const slotW   = opts.slotW   || 56;
  const slotGap = opts.slotGap || 14;
  const padding = opts.padding || 36;
  const leverW  = opts.leverW  || 50;
  const bodyH   = opts.bodyH   || 140;
  const bodyY   = opts.bodyY   || 50;
  const innerW  = slotCount * slotW + (slotCount - 1) * slotGap;
  const totalW  = padding * 2 + innerW + leverW;
  const totalH  = bodyY + bodyH + 30;

  // 본체 path with 슬롯 hole (evenodd fill rule)
  const bx = padding - 14;
  const by = bodyY;
  const bw = innerW + leverW + 28;
  const bh = bodyH;
  const r  = 6;

  // 외곽 (라운디드 사각형 path)
  let bodyPath = `
    M ${bx + r} ${by}
    L ${bx + bw - r} ${by}
    Q ${bx + bw} ${by}, ${bx + bw} ${by + r}
    L ${bx + bw} ${by + bh - r}
    Q ${bx + bw} ${by + bh}, ${bx + bw - r} ${by + bh}
    L ${bx + r} ${by + bh}
    Q ${bx} ${by + bh}, ${bx} ${by + bh - r}
    L ${bx} ${by + r}
    Q ${bx} ${by}, ${bx + r} ${by}
    Z`;

  // 슬롯 hole (반대 방향 path, evenodd로 hole 됨)
  for (let i = 0; i < slotCount; i++) {
    const sx = padding + i * (slotW + slotGap);
    const sy = bodyY + 6;
    bodyPath += `
      M ${sx} ${sy}
      L ${sx} ${sy + 14}
      L ${sx + slotW} ${sy + 14}
      L ${sx + slotW} ${sy}
      Z`;
  }

  const leverX = padding + innerW + 14;
  const leverYTop = bodyY + 30;
  const leverYBot = bodyY + bodyH - 20;
  const leverDownOffset = (leverYBot - leverYTop - 26);

  const rustPatches = `
    <ellipse cx="${padding + 30}" cy="${bodyY + bodyH - 50}" rx="14" ry="6" fill="#a85d28" opacity="0.55"/>
    <ellipse cx="${padding + innerW - 50}" cy="${bodyY + bodyH - 18}" rx="18" ry="5" fill="#6e3812" opacity="0.5"/>
    <ellipse cx="${padding + innerW / 2 - 30}" cy="${bodyY + 38}" rx="8" ry="3" fill="#a85d28" opacity="0.45"/>
    <ellipse cx="${leverX - 20}" cy="${bodyY + 80}" rx="10" ry="4" fill="#6e3812" opacity="0.5"/>
    <circle cx="${padding + 80}" cy="${bodyY + bodyH - 70}" r="3" fill="#a85d28" opacity="0.7"/>
    <circle cx="${padding + innerW - 100}" cy="${bodyY + 60}" r="2.5" fill="#a85d28" opacity="0.6"/>
  `;

  const scratches = `
    <line x1="${padding + 60}" y1="${bodyY + 55}" x2="${padding + 110}" y2="${bodyY + 50}" stroke="#1a0d04" stroke-width="0.6" opacity="0.5"/>
    <line x1="${padding + innerW - 80}" y1="${bodyY + bodyH - 60}" x2="${padding + innerW - 30}" y2="${bodyY + bodyH - 65}" stroke="#1a0d04" stroke-width="0.6" opacity="0.5"/>
    <line x1="${leverX - 4}" y1="${bodyY + 40}" x2="${leverX - 4}" y2="${bodyY + 110}" stroke="#1a0d04" stroke-width="0.5" opacity="0.4"/>
  `;

  return `
    <svg viewBox="0 0 ${totalW} ${totalH}" width="${opts.width || totalW}" height="${opts.height || totalH}" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="ironGradFront" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stop-color="#6a5238"/>
          <stop offset="40%" stop-color="#4a3520"/>
          <stop offset="100%" stop-color="#2a1f15"/>
        </linearGradient>
        <linearGradient id="ironHighlightFront" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stop-color="rgba(255,235,180,0.25)"/>
          <stop offset="100%" stop-color="rgba(255,235,180,0)"/>
        </linearGradient>
      </defs>

      <!-- 그림자 -->
      <ellipse cx="${totalW / 2}" cy="${totalH - 8}" rx="${totalW * 0.45}" ry="8" fill="rgba(20,12,4,0.55)"/>

      <!-- 발 -->
      <rect x="${padding - 4}" y="${bodyY + bodyH - 4}" width="22" height="14" rx="2" fill="#1a0d04"/>
      <rect x="${padding + innerW - 18}" y="${bodyY + bodyH - 4}" width="22" height="14" rx="2" fill="#1a0d04"/>
      <rect x="${leverX + 4}" y="${bodyY + bodyH - 4}" width="22" height="14" rx="2" fill="#1a0d04"/>

      <!-- 본체 (evenodd로 슬롯 hole 뚫림) -->
      <path d="${bodyPath}" fill-rule="evenodd"
            fill="url(#ironGradFront)" stroke="#1a0d04" stroke-width="3"/>

      <!-- 본체 상단 하이라이트 -->
      <rect x="${padding - 8}" y="${bodyY + 4}" width="${innerW + leverW + 16}" height="14"
            rx="3" fill="url(#ironHighlightFront)"/>

      ${rustPatches}
      ${scratches}

      <!-- 다이얼 -->
      <circle cx="${padding + 16}" cy="${bodyY + bodyH - 30}" r="14"
              fill="#2a1a0a" stroke="#1a0d04" stroke-width="1.5"/>
      <circle cx="${padding + 16}" cy="${bodyY + bodyH - 30}" r="3" fill="#a85d28"/>
      <line x1="${padding + 16}" y1="${bodyY + bodyH - 30}"
            x2="${padding + 16}" y2="${bodyY + bodyH - 42}"
            stroke="#a85d28" stroke-width="2" stroke-linecap="round"/>

      <!-- 레버 슬롯 -->
      <rect x="${leverX + 8}" y="${leverYTop}" width="14" height="${leverYBot - leverYTop}"
            rx="3" fill="#0a0604" opacity="0.7"/>
      <g class="toaster-lever" transform="translate(0, ${opts.leverDown ? leverDownOffset : 0})">
        <rect x="${leverX}" y="${leverYTop + 4}" width="30" height="22"
              rx="2" fill="#1a0d04" stroke="#000" stroke-width="1.5"/>
        <circle cx="${leverX + 15}" cy="${leverYTop + 15}" r="4" fill="#a85d28"/>
        <circle cx="${leverX + 22}" cy="${leverYTop + 10}" r="1.5" fill="#a85d28" opacity="0.7"/>
      </g>

      <!-- 라벨 -->
      <text x="${padding + innerW / 2 + 10}" y="${bodyY + bodyH - 14}"
            text-anchor="middle"
            font-family="'Rye', serif" font-size="13"
            fill="#a85d28" letter-spacing="3"
            opacity="0.9">KETCHUP CO.</text>
      <text x="${padding + innerW / 2 + 10}" y="${bodyY + bodyH - 4}"
            text-anchor="middle"
            font-family="'Bevan', serif" font-size="6"
            fill="#a85d28" letter-spacing="2"
            opacity="0.7">EST. 1873</text>
    </svg>
  `;
}

// 케찹통 — Heinz 스타일, 캡-본체 곡선 연결, 좌측 광택 + 우측 그림자, 발사구 강조
function ketchupGunSVG() {
  return `
    <svg viewBox="0 0 110 220" width="100%" height="100%" preserveAspectRatio="xMidYMax meet">
      <defs>
        <linearGradient id="bottleBody" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stop-color="#7a0e0e"/>
          <stop offset="22%"  stop-color="#c4221d"/>
          <stop offset="50%"  stop-color="#e6342a"/>
          <stop offset="78%"  stop-color="#c4221d"/>
          <stop offset="100%" stop-color="#7a0e0e"/>
        </linearGradient>
        <radialGradient id="bottleShine" cx="32%" cy="38%" r="55%">
          <stop offset="0%"  stop-color="rgba(255,255,255,0.45)"/>
          <stop offset="55%" stop-color="rgba(255,255,255,0.05)"/>
          <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
        </radialGradient>
        <linearGradient id="capGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#ffffff"/>
          <stop offset="55%"  stop-color="#f4eedf"/>
          <stop offset="100%" stop-color="#bdb59c"/>
        </linearGradient>
        <linearGradient id="capSide" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"  stop-color="#cdc6ad"/>
          <stop offset="40%" stop-color="#ffffff"/>
          <stop offset="100%" stop-color="#a8a087"/>
        </linearGradient>
        <linearGradient id="labelGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stop-color="#fffaee"/>
          <stop offset="100%" stop-color="#f0e6c8"/>
        </linearGradient>
        <radialGradient id="tomato" cx="40%" cy="35%" r="65%">
          <stop offset="0%"  stop-color="#ff6a4a"/>
          <stop offset="55%" stop-color="#e6342a"/>
          <stop offset="100%" stop-color="#9a1a1a"/>
        </radialGradient>
      </defs>

      <!-- =============== 본체 (눈물방울 / Teardrop) =============== -->
      <!-- 본체 fill (위가 좁고 아래가 빵빵) -->
      <path id="bottleShape" d="
        M 42 28
        C 30 38, 14 78, 10 130
        C 8 178, 24 210, 55 210
        C 86 210, 102 178, 100 130
        C 96 78, 80 38, 68 28
        Z"
        fill="url(#bottleBody)" stroke="#3a0a08" stroke-width="2.4" stroke-linejoin="round"/>

      <!-- 본체 광택 (radial highlight, 좌상단) -->
      <path d="
        M 42 28
        C 30 38, 14 78, 10 130
        C 8 178, 24 210, 55 210
        C 86 210, 102 178, 100 130
        C 96 78, 80 38, 68 28
        Z" fill="url(#bottleShine)"/>

      <!-- 좌상단 강렬한 흰 하이라이트 스트립 (반짝) -->
      <path d="M 26 50 Q 18 90, 18 150 Q 19 178, 26 196"
            fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="6" stroke-linecap="round"/>
      <!-- 보조 하이라이트 (옅음) -->
      <path d="M 36 60 Q 30 100, 30 150"
            fill="none" stroke="rgba(255,255,255,0.32)" stroke-width="2" stroke-linecap="round"/>
      <!-- 작은 sparkle 점 -->
      <ellipse cx="22" cy="78" rx="2.4" ry="5" fill="rgba(255,255,255,0.9)"/>
      <ellipse cx="32" cy="62" rx="1.4" ry="3" fill="rgba(255,255,255,0.85)"/>

      <!-- 우측 깊은 그림자 (부피감) -->
      <path d="M 92 56 Q 96 90, 96 150 Q 94 184, 88 200"
            fill="none" stroke="rgba(0,0,0,0.30)" stroke-width="4" stroke-linecap="round"/>

      <!-- 발사구 (캡 안쪽 검은 구멍 — 캡 닫힐 때 살짝 보이는 그늘) -->
      <ellipse cx="55" cy="28" rx="11" ry="2.6" fill="#1a0204" opacity="0.9"/>
      <ellipse cx="55" cy="27.5" rx="7" ry="1.4" fill="#000"/>

      <!-- =============== 라벨 (방패형 + 흰 테두리) =============== -->
      <!-- 흰 테두리 outer -->
      <path d="
        M 24 116
        Q 24 96, 42 90
        Q 55 86, 68 90
        Q 86 96, 86 116
        Q 86 152, 70 168
        Q 55 178, 40 168
        Q 24 152, 24 116
        Z"
        fill="#ffffff" stroke="#3a0a08" stroke-width="1.4"/>
      <!-- 라벨 inner (크림색) -->
      <path d="
        M 28 117
        Q 28 99, 44 94
        Q 55 91, 66 94
        Q 82 99, 82 117
        Q 82 150, 68 164
        Q 55 173, 42 164
        Q 28 150, 28 117
        Z"
        fill="url(#labelGrad)" stroke="#c8362f" stroke-width="0.6" opacity="0.95"/>

      <!-- KETCHUP -->
      <text x="55" y="108" text-anchor="middle"
            font-family="'Bevan', serif" font-size="8"
            fill="#3a0a08" letter-spacing="1.2">KETCHUP</text>
      <!-- ROULETTE -->
      <text x="55" y="120" text-anchor="middle"
            font-family="'Bevan', serif" font-size="7.5"
            fill="#c8362f" letter-spacing="1">ROULETTE</text>

      <!-- 토마토 아이콘 -->
      <circle cx="55" cy="142" r="11" fill="url(#tomato)" stroke="#3a0a08" stroke-width="0.9"/>
      <!-- 토마토 광택 -->
      <ellipse cx="50" cy="138" rx="3.2" ry="1.8" fill="rgba(255,255,255,0.65)"/>
      <ellipse cx="51" cy="139.5" rx="1.4" ry="0.7" fill="rgba(255,255,255,0.8)"/>
      <!-- 토마토 잎 (꼭지) -->
      <path d="M 50 132 Q 55 128, 60 132 Q 58 134, 55 134 Q 52 134, 50 132 Z"
            fill="#3aa83a" stroke="#1a5a1a" stroke-width="0.5" stroke-linejoin="round"/>
      <path d="M 55 130 L 55 134" stroke="#1a5a1a" stroke-width="0.6"/>

      <!-- IT'S DELICIOUS -->
      <text x="55" y="160" text-anchor="middle"
            font-family="'Bevan', serif" font-size="3.2"
            fill="#3a0a08" letter-spacing="0.8">IT'S DELICIOUS</text>

      <!-- =============== 캡 (별도 그룹 — 발사 시 플립) =============== -->
      <g class="bottle-cap-group" style="transform-box: view-box; transform-origin: 42px 28px;">
        <!-- 캡 측면 (밴드, 살짝 어두움) -->
        <path d="M 38 24 Q 40 30, 44 30 L 66 30 Q 70 30, 72 24 L 70 22 L 40 22 Z"
              fill="url(#capSide)" stroke="#3a0a08" stroke-width="1.4" stroke-linejoin="round"/>
        <!-- 캡 돔 (둥근 흰 모자) -->
        <path d="
          M 40 22
          Q 38 14, 44 6
          Q 50 0, 55 0
          Q 60 0, 66 6
          Q 72 14, 70 22
          Z"
          fill="url(#capGrad)" stroke="#3a0a08" stroke-width="1.6" stroke-linejoin="round"/>
        <!-- 캡 광택 (둥근 highlight) -->
        <path d="M 46 4 Q 50 2, 54 4 Q 51 12, 47 18"
              fill="none" stroke="rgba(255,255,255,0.95)" stroke-width="2.2" stroke-linecap="round"/>
        <ellipse cx="51" cy="6" rx="2" ry="1" fill="rgba(255,255,255,0.95)"/>
        <!-- 캡 하단 그림자 라인 -->
        <path d="M 41 28 Q 55 32, 69 28" fill="none" stroke="rgba(0,0,0,0.18)" stroke-width="1.2" stroke-linecap="round"/>
      </g>
    </svg>
  `;
}

// 케찹 스플래시 — 중심 mass 크게 + 드립 굵기 변화 (base 굵음 → tip 가늘게 → droplet)
function ketchupSplashSVG() {
  return `
    <svg viewBox="0 0 200 260" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      <!-- 메인 중심 mass: 크고 불규칙한 덩어리 (이전보다 1.3x 큼) -->
      <path d="
        M 60 75 L 80 60 L 100 55 L 120 60 L 138 55 L 152 70
        L 162 88 L 158 105 L 170 120 L 165 138 L 172 158 L 158 175
        L 142 178 L 125 188 L 105 188 L 88 195 L 68 182 L 52 168
        L 58 148 L 45 132 L 50 112 L 42 95 L 55 82 Z"
        fill="#c8362a"/>

      <!-- 드립 1: 위로 길게 — base 굵게(14px) → tip 가늘게(4px) + 큰 droplet -->
      <path d="
        M 95 60 Q 92 50 92 35 Q 92 22 96 16 Q 100 14 104 16 Q 108 22 108 35 Q 108 50 105 60 Z"
        fill="#c8362a"/>
      <circle cx="100" cy="11" r="7" fill="#c8362a"/>

      <!-- 드립 2: 오른쪽 위 짧음 — base 굵음 → tip + 작은 droplet -->
      <path d="
        M 152 70 Q 162 58 168 50 Q 172 47 174 50 Q 173 56 167 64 Q 160 72 156 80 Z"
        fill="#c8362a"/>
      <circle cx="176" cy="46" r="5" fill="#c8362a"/>

      <!-- 드립 3: 오른쪽 길게 (variable width) -->
      <path d="
        M 170 120 Q 182 117 192 110 Q 196 110 196 114 Q 188 120 175 126 Z"
        fill="#c8362a"/>
      <circle cx="198" cy="107" r="5.5" fill="#c8362a"/>

      <!-- 드립 4: 오른쪽 아래 매우 길게 + 큰 droplet (탱탱하게 맺힘) -->
      <path d="
        M 172 158 Q 178 170 184 185 Q 186 196 188 204 Q 188 210 184 210 Q 180 200 178 192 Q 175 180 168 168 Z"
        fill="#c8362a"/>
      <circle cx="186" cy="218" r="8" fill="#c8362a"/>

      <!-- 드립 5: 아래 짧고 굵음 -->
      <path d="
        M 105 188 Q 108 200 112 215 Q 113 222 110 224 Q 106 222 104 215 Q 100 200 98 188 Z"
        fill="#c8362a"/>
      <circle cx="111" cy="230" r="4" fill="#c8362a"/>

      <!-- 드립 6: 왼쪽 아래 길게 + droplet -->
      <path d="
        M 68 182 Q 56 195 46 212 Q 42 220 46 222 Q 52 218 58 208 Q 64 198 73 188 Z"
        fill="#c8362a"/>
      <circle cx="42" cy="226" r="6" fill="#c8362a"/>

      <!-- 드립 7: 왼쪽 짧은 stub — base 굵음, tip 무딤 -->
      <path d="
        M 45 132 Q 32 130 20 132 Q 16 132 16 136 Q 30 138 45 138 Z"
        fill="#c8362a"/>

      <!-- 드립 8: 왼쪽 위 매우 길게 + droplet (가장 가는 끝) -->
      <path d="
        M 60 75 Q 48 58 38 38 Q 36 32 40 30 Q 46 38 56 60 Q 60 68 66 78 Z"
        fill="#c8362a"/>
      <circle cx="38" cy="28" r="4.5" fill="#c8362a"/>

      <!-- 본체에서 떨어진 작은 위성 chunk -->
      <path d="M 78 28 Q 88 24 96 30 Q 92 36 82 34 Z" fill="#c8362a"/>
      <ellipse cx="124" cy="36" rx="4" ry="3" fill="#c8362a"/>

      <!-- 사방으로 흩뿌린 isolated 점 (다양한 크기/opacity) -->
      <circle cx="20"  cy="50"  r="3"   fill="#c8362a" opacity="0.9"/>
      <circle cx="180" cy="30"  r="2.5" fill="#c8362a" opacity="0.75"/>
      <circle cx="30"  cy="170" r="3.5" fill="#c8362a" opacity="0.85"/>
      <circle cx="190" cy="140" r="2"   fill="#c8362a" opacity="0.6"/>
      <circle cx="170" cy="240" r="2.5" fill="#c8362a" opacity="0.7"/>
      <circle cx="140" cy="245" r="3"   fill="#c8362a" opacity="0.85"/>
      <circle cx="60"  cy="245" r="2"   fill="#c8362a" opacity="0.55"/>
      <circle cx="10"  cy="150" r="2"   fill="#c8362a" opacity="0.65"/>
      <circle cx="195" cy="180" r="1.8" fill="#c8362a" opacity="0.5"/>
      <circle cx="115" cy="6"   r="2.5" fill="#c8362a" opacity="0.75"/>
      <circle cx="78"  cy="6"   r="1.8" fill="#c8362a" opacity="0.6"/>
      <circle cx="6"   cy="100" r="2.2" fill="#c8362a" opacity="0.7"/>

      <!-- 마이크로 점 (더 멀리, 진한 #7a1a14) -->
      <circle cx="3"   cy="200" r="1.2" fill="#7a1a14" opacity="0.65"/>
      <circle cx="196" cy="60"  r="0.9" fill="#7a1a14" opacity="0.55"/>
      <circle cx="80"  cy="252" r="1"   fill="#7a1a14" opacity="0.7"/>
      <circle cx="160" cy="14"  r="1.1" fill="#7a1a14" opacity="0.6"/>
      <circle cx="46"  cy="252" r="0.8" fill="#7a1a14" opacity="0.5"/>

      <!-- 농도 변화: 진한 패치 (중심부에 더 많이 뭉친 잉크) -->
      <path d="M 80 100 L 105 102 L 115 125 L 95 130 L 75 118 Z"
            fill="#7a1a14" opacity="0.35"/>
      <path d="M 130 140 L 152 138 L 158 162 L 138 165 L 128 152 Z"
            fill="#7a1a14" opacity="0.30"/>
      <path d="M 95 145 L 115 145 L 120 168 L 100 170 L 90 158 Z"
            fill="#7a1a14" opacity="0.28"/>
    </svg>
  `;
}

function breadPopHTML(no, name) {
  return `
    <div class="splash">${ketchupSplashSVG()}</div>
    <div class="bread-no">No.${no}</div>
    ${name ? `<div class="bread-name">${escapeHTML(name)}</div>` : ''}
  `;
}

// 케찹 묻은 식빵 미니 mugshot (WANTED 포스터 안 현상수배 얼굴처럼)
function breadMugshotSVG() {
  return `
    <svg viewBox="0 0 100 130" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="mugBreadGrad" cx="50%" cy="55%" r="78%">
          <stop offset="0%"   stop-color="#FFF0C0"/>
          <stop offset="28%"  stop-color="#FFD580"/>
          <stop offset="55%"  stop-color="#E8AC60"/>
          <stop offset="78%"  stop-color="#B07030"/>
          <stop offset="100%" stop-color="#5A2E10"/>
        </radialGradient>
      </defs>
      <!-- 식빵 본체 (M 아치, 바닥 꼭짓점 둥글게) -->
      <path d="
        M 0 45
        Q 0 11, 15 7
        C 22 2, 40 4, 50 4
        C 60 4, 78 2, 85 7
        Q 100 11, 100 45
        L 100 119
        Q 100 127, 92 127
        L 8 127
        Q 0 127, 0 119
        Z"
        fill="url(#mugBreadGrad)"
        stroke="#5a3018"
        stroke-width="2.5"
        stroke-linejoin="round"/>

      <!-- 케찹 splash (multiply blend로 식빵 위에 묻은 느낌) -->
      <g style="mix-blend-mode: multiply">
        <!-- 메인 비대칭 splat -->
        <path d="
          M 38 35
          L 50 28 L 56 38 L 68 30 L 76 45 L 72 58 L 82 68 L 64 72 L 70 86 L 52 80 L 36 88 L 40 72 L 24 70 L 32 56 L 22 46 Z"
          fill="#c8362a"/>
        <!-- 농도 진한 패치 -->
        <path d="M 45 50 L 55 48 L 60 60 L 50 65 L 42 58 Z" fill="#7a1a14" opacity="0.35"/>
        <!-- 흘러내리는 큰 방울 -->
        <ellipse cx="38" cy="105" rx="3.5" ry="7" fill="#c8362a"/>
        <ellipse cx="56" cy="115" rx="4" ry="9" fill="#c8362a"/>
        <ellipse cx="70" cy="105" rx="3" ry="6" fill="#c8362a"/>
        <!-- 사방 튄 작은 점 -->
        <circle cx="10" cy="35" r="2"   fill="#c8362a" opacity="0.85"/>
        <circle cx="90" cy="40" r="1.6" fill="#c8362a" opacity="0.7"/>
        <circle cx="14" cy="80" r="1.4" fill="#c8362a" opacity="0.7"/>
        <circle cx="88" cy="80" r="2"   fill="#c8362a" opacity="0.8"/>
        <circle cx="50" cy="20" r="1.6" fill="#c8362a" opacity="0.65"/>
        <circle cx="20" cy="60" r="1.2" fill="#7a1a14" opacity="0.6"/>
        <circle cx="80" cy="58" r="1.3" fill="#7a1a14" opacity="0.6"/>
      </g>
    </svg>
  `;
}

// 식빵 모양 SVG — M 아치 (dip 없음, 두 봉우리가 부드럽게 연결)
// 방사 그라디언트(중심 황금→가장자리 브라운) + 노이즈 + 거친 crust
function breadShapeSVG() {
  return `
    <svg class="bread-bg" viewBox="0 0 200 260" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <!-- 방사 그라디언트: 아이보리 → 황금 → 진한 갈색 crust (대비 더 명확) -->
        <radialGradient id="breadGrad" cx="50%" cy="55%" r="78%">
          <stop offset="0%"   stop-color="#FFF0C0"/>
          <stop offset="28%"  stop-color="#FFD580"/>
          <stop offset="55%"  stop-color="#E8AC60"/>
          <stop offset="78%"  stop-color="#B07030"/>
          <stop offset="100%" stop-color="#5A2E10"/>
        </radialGradient>
        <!-- 노이즈 필터 (구운 질감) -->
        <filter id="breadNoise" x="0" y="0" width="100%" height="100%">
          <feTurbulence baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" seed="3"/>
          <feColorMatrix values="0 0 0 0 0.40   0 0 0 0 0.25   0 0 0 0 0.10   0 0 0 0.45 0"/>
        </filter>
        <!-- 식빵 모양 클립 (바닥 꼭짓점 둥글게) -->
        <clipPath id="breadClip">
          <path d="
            M 0 90
            Q 0 22, 30 14
            C 45 5, 80 9, 100 9
            C 120 9, 155 5, 170 14
            Q 200 22, 200 90
            L 200 240
            Q 200 254, 186 254
            L 14 254
            Q 0 254, 0 240
            Z"/>
        </clipPath>
      </defs>

      <!-- 식빵 본체 fill — 부드러운 M, 바닥 꼭짓점 둥글게 -->
      <path d="
        M 0 90
        Q 0 22, 30 14
        C 45 5, 80 9, 100 9
        C 120 9, 155 5, 170 14
        Q 200 22, 200 90
        L 200 240
        Q 200 254, 186 254
        L 14 254
        Q 0 254, 0 240
        Z"
        fill="url(#breadGrad)"/>

      <!-- 노이즈 overlay (식빵 안만, 가벼운 질감만) -->
      <rect x="0" y="0" width="200" height="260"
            filter="url(#breadNoise)"
            clip-path="url(#breadClip)"
            opacity="0.32"
            style="mix-blend-mode: multiply"/>

      <!-- 구운 자국 ellipse (식빵 안, 옅게) -->
      <g clip-path="url(#breadClip)">
        <ellipse cx="42"  cy="125" rx="7" ry="3.5" fill="#a06030" opacity="0.20"/>
        <ellipse cx="160" cy="195" rx="6" ry="3"   fill="#a06030" opacity="0.18"/>
        <ellipse cx="85"  cy="215" rx="5" ry="2.5" fill="#a06030" opacity="0.16"/>
        <ellipse cx="135" cy="105" rx="4" ry="2"   fill="#b87040" opacity="0.20"/>
        <ellipse cx="65"  cy="175" rx="4" ry="2"   fill="#b87040" opacity="0.16"/>
        <circle  cx="170" cy="140" r="1.5" fill="#7a4218" opacity="0.28"/>
        <circle  cx="30"  cy="200" r="1.3" fill="#7a4218" opacity="0.24"/>
        <circle  cx="115" cy="155" r="1.4" fill="#7a4218" opacity="0.26"/>
        <circle  cx="180" cy="170" r="1.0" fill="#7a4218" opacity="0.22"/>
      </g>

      <!-- crust 스트로크 (모양 외곽, 진하게, 바닥 꼭짓점 둥글게) -->
      <path d="
        M 0 90
        Q 0 22, 30 14
        C 45 5, 80 9, 100 9
        C 120 9, 155 5, 170 14
        Q 200 22, 200 90
        L 200 240
        Q 200 254, 186 254
        L 14 254
        Q 0 254, 0 240
        Z"
        fill="none"
        stroke="#4a2810"
        stroke-width="9"
        stroke-linejoin="round"/>
    </svg>
  `;
}

/* =========================================================
   STAGE 1: TITLE — 슬라이더 2개 + "멤버 등록하러 가기"
   ========================================================= */

const countSlider   = document.getElementById('countSlider');
const winnerSlider  = document.getElementById('winnerSlider');
const countValueEl  = document.getElementById('countValue');
const winnerValueEl = document.getElementById('winnerValue');
const enterBtn      = document.getElementById('enterBtn');

function syncNamesArray() {
  while (state.names.length < state.totalCount) state.names.push('');
  state.names.length = state.totalCount;
}

function refreshTitle() {
  countValueEl.textContent  = state.totalCount;
  winnerValueEl.textContent = state.winnerCount;
  winnerSlider.max          = state.totalCount;
  if (state.winnerCount > state.totalCount) {
    state.winnerCount  = state.totalCount;
    winnerSlider.value = state.totalCount;
    winnerValueEl.textContent = state.totalCount;
  }
}

countSlider.addEventListener('input', () => {
  state.totalCount = clamp(parseInt(countSlider.value, 10), 1, MAX_COUNT);
  refreshTitle();
});
winnerSlider.addEventListener('input', () => {
  state.winnerCount = clamp(parseInt(winnerSlider.value, 10), 1, state.totalCount);
  winnerValueEl.textContent = state.winnerCount;
});

enterBtn.addEventListener('click', () => {
  syncNamesArray();
  renderMemberGrid();
  showScreen('entry');
});

/* =========================================================
   STAGE 2: ENTRY — 멤버 슬롯 + 격발 토글 + 굽기
   ========================================================= */

const memberGridEl    = document.getElementById('memberGrid');
const fireModeBtns    = [...document.querySelectorAll('.fire-mode-btn')];
const backToTitleBtn  = document.getElementById('backToTitleBtn');
const bakeBtn         = document.getElementById('bakeBtn');

function renderMemberGrid() {
  memberGridEl.innerHTML = '';
  for (let i = 0; i < state.totalCount; i++) {
    const slot = document.createElement('div');
    slot.className = 'member-slot';
    slot.innerHTML = `
      <div class="slot-no">No.${i + 1}</div>
      <input type="text" class="slot-name" data-idx="${i}" placeholder="이름" maxlength="8" value="${escapeHTML(state.names[i] || '')}" />
    `;
    memberGridEl.appendChild(slot);
  }
  memberGridEl.querySelectorAll('.slot-name').forEach(inp => {
    inp.addEventListener('input', e => {
      const idx = parseInt(e.target.dataset.idx, 10);
      state.names[idx] = e.target.value;
    });
  });
}

fireModeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    fireModeBtns.forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    state.quickMode = (btn.dataset.mode === 'bulk');
  });
});

backToTitleBtn.addEventListener('click', () => {
  showScreen('title');
});

bakeBtn.addEventListener('click', () => {
  state.names = state.names.map((n, i) => (n && n.trim()) || `No.${i + 1}`);
  const livePattern = [
    ...Array(state.winnerCount).fill(true),
    ...Array(state.totalCount - state.winnerCount).fill(false),
  ];
  state.bulletPlan  = shuffle(livePattern);
  state.currentTurn = 0;
  state.hitNames    = [];

  startStandoff();
});

/* =========================================================
   SCREEN 2: 만화 컷신 (사선 2분할 — 레버 click + 케찹통 spin)
   ========================================================= */

/* 토스터 측면 패널 + 레버 손잡이 클로즈업 */
function leverCloseupSVG() {
  return `
    <svg viewBox="0 0 280 360" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="panelSide" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stop-color="#7a3a12"/>
          <stop offset="50%"  stop-color="#d28030"/>
          <stop offset="100%" stop-color="#6a2a08"/>
        </linearGradient>
        <linearGradient id="panelGloss" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="rgba(255,255,255,0.35)"/>
          <stop offset="50%"  stop-color="rgba(255,255,255,0)"/>
          <stop offset="100%" stop-color="rgba(0,0,0,0.25)"/>
        </linearGradient>
        <linearGradient id="knobMetal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#fff8e6"/>
          <stop offset="48%"  stop-color="#ece1c2"/>
          <stop offset="100%" stop-color="#7a6e4e"/>
        </linearGradient>
        <linearGradient id="slotShadow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#0a0402"/>
          <stop offset="100%" stop-color="#3a1808"/>
        </linearGradient>
      </defs>

      <!-- 토스터 측면 패널 -->
      <rect x="0" y="0" width="280" height="360" rx="14" fill="url(#panelSide)" stroke="#3a1808" stroke-width="3"/>
      <rect x="0" y="0" width="280" height="360" rx="14" fill="url(#panelGloss)"/>

      <!-- 리벳 4개 -->
      <circle cx="28"  cy="28"  r="6" fill="#3a1808" stroke="#1a0a04" stroke-width="2"/>
      <circle cx="252" cy="28"  r="6" fill="#3a1808" stroke="#1a0a04" stroke-width="2"/>
      <circle cx="28"  cy="332" r="6" fill="#3a1808" stroke="#1a0a04" stroke-width="2"/>
      <circle cx="252" cy="332" r="6" fill="#3a1808" stroke="#1a0a04" stroke-width="2"/>
      <!-- 리벳 광택 -->
      <circle cx="26"  cy="26"  r="1.5" fill="rgba(255,255,255,0.7)"/>
      <circle cx="250" cy="26"  r="1.5" fill="rgba(255,255,255,0.7)"/>

      <!-- 레버 슬롯 (수직 홈) -->
      <rect x="156" y="56" width="34" height="232" rx="17"
            fill="url(#slotShadow)" stroke="#1a0a04" stroke-width="2.5"/>
      <rect x="162" y="62" width="22" height="220" rx="11" fill="#0a0402"/>

      <!-- 슬롯 마커 (▲ 위, ▼ 아래) -->
      <text x="173" y="80" font-family="'Bevan', serif" font-size="14" fill="#1a0a04" text-anchor="middle">▲</text>
      <text x="173" y="278" font-family="'Bevan', serif" font-size="14" fill="#1a0a04" text-anchor="middle">▼</text>

      <!-- 레버 손잡이 -->
      <g class="lever-knob">
        <rect x="116" y="68" width="84" height="48" rx="11"
              fill="url(#knobMetal)" stroke="#1a0a04" stroke-width="3"/>
        <line x1="132" y1="84" x2="184" y2="84" stroke="#1a0a04" stroke-width="2"/>
        <line x1="132" y1="92" x2="184" y2="92" stroke="#1a0a04" stroke-width="2"/>
        <line x1="132" y1="100" x2="184" y2="100" stroke="#1a0a04" stroke-width="2"/>
        <rect x="124" y="74" width="68" height="6" rx="3" fill="rgba(255,255,255,0.85)"/>
      </g>
    </svg>
  `;
}

async function startStandoff() {
  // 컷신 노드
  const panelTL  = document.querySelector('.panel-tl');
  const panelBR  = document.querySelector('.panel-br');
  const diag     = document.querySelector('.diagonal-line');
  const clickSfx = document.querySelector('.click-sfx');
  const spinSfx  = document.querySelector('.spin-sfx');
  const flashEl  = document.getElementById('comicFlash');
  const leverEl  = document.getElementById('leverCloseup');
  const bottleEl = document.getElementById('bottleSpin');

  // 재진입 대비 초기화
  panelTL.classList.remove('enter', 'click');
  panelBR.classList.remove('enter', 'spin');
  diag.classList.remove('enter');
  clickSfx.classList.remove('show');
  spinSfx.classList.remove('show');
  flashEl.classList.remove('flash');

  // SVG 주입 (매 회 신규)
  leverEl.innerHTML  = leverCloseupSVG();
  bottleEl.innerHTML = ketchupGunSVG();

  showScreen('ready');

  // reflow
  void panelTL.offsetWidth;

  // 1) 패널 + 사선 입장
  panelTL.classList.add('enter');
  panelBR.classList.add('enter');
  diag.classList.add('enter');
  await sleep(260);

  // 2) 좌상단 — 레버 click + 집중선 + 먼지 + SFX
  panelTL.classList.add('click');
  clickSfx.classList.add('show');
  shakeCamera(true);

  // 살짝 늦게 우하단 — 케찹통 360° 스핀 + SFX
  await sleep(80);
  panelBR.classList.add('spin');
  spinSfx.classList.add('show');

  // 3) 양쪽 모션 종료 대기
  await sleep(760);

  // 4) 마무리 플래시 → 본 게임 진입
  flashEl.classList.add('flash');
  setupAction();
  await sleep(220);
  showScreen('action');
}

/* =========================================================
   SCREEN 3: ACTION
   ========================================================= */

const actionSceneEl     = document.getElementById('actionScene');
const bigToasterBackEl  = document.getElementById('bigToasterBack');
const bigToasterFrontEl = document.getElementById('bigToasterFront');
const breadPopupsEl     = document.getElementById('breadPopups');
const ketchupFixedEl    = document.getElementById('ketchupFixed');
const fireBtn           = document.getElementById('fireBtn');
const counterEl         = document.getElementById('actionCounter');

// 큰 토스터 슬롯 사이즈 (FPS, 추가 1.5x 더 키움 — 토스터가 화면 주인공)
const SLOT_W       = 320;
const SLOT_GAP     = 140;
const SLOT_PITCH   = SLOT_W + SLOT_GAP;
const TOASTER_PAD  = 140;

function setupAction() {
  // Quick Draw 모드면 action-scene에 클래스 추가 (CSS 트랜지션 단축용)
  if (state.quickMode) actionSceneEl.classList.add('quick-draw');
  else                 actionSceneEl.classList.remove('quick-draw');

  // 토스터 BACK (슬롯 어두운 안쪽, 식빵 뒤)
  const toasterOpts = {
    slotW: SLOT_W,
    slotGap: SLOT_GAP,
    padding: TOASTER_PAD,
    leverW: 180,
    bodyH: 850,
    bodyY: 180,
    leverDown: true,
  };
  bigToasterBackEl.innerHTML  = toasterBackSVG(state.totalCount, toasterOpts);
  // 토스터 FRONT (본체 + 슬롯 hole, 식빵 앞)
  bigToasterFrontEl.innerHTML = toasterFrontSVG(state.totalCount, toasterOpts);

  // 식빵 popup들 — 슬롯 위치에 절대 배치
  breadPopupsEl.innerHTML = '';
  for (let i = 0; i < state.totalCount; i++) {
    const slotCenterX = TOASTER_PAD + i * SLOT_PITCH + SLOT_W / 2;
    const bread = document.createElement('div');
    bread.className   = 'bread-popup';
    bread.dataset.idx = i;
    bread.style.left  = `${slotCenterX}px`;

    // 텍스트 중복 방지: 이름이 비어있거나 "No.X" 디폴트와 같으면 No.X만 보여줌
    const name = state.names[i];
    const isDefault = !name || name === `No.${i + 1}`;

    bread.innerHTML   = `
      ${breadShapeSVG()}
      <div class="bread-text">
        <div class="bread-no">No.${i + 1}</div>
        ${isDefault ? '' : `<div class="bread-name">${escapeHTML(name)}</div>`}
      </div>
      <div class="splash">${ketchupSplashSVG()}</div>
    `;
    breadPopupsEl.appendChild(bread);
  }

  // 케찹총 (하단 중앙 고정)
  ketchupFixedEl.innerHTML = ketchupGunSVG();

  // 카메라: 슬롯 0 위치로 초기 정렬
  panCameraToSlot(0);

  fireBtn.disabled    = false;
  fireBtn.textContent = state.quickMode ? 'QUICK DRAW' : 'FIRE';
  counterEl.textContent = `0 / ${state.totalCount}`;
}

function panCameraToSlot(idx) {
  const slotCenterX = TOASTER_PAD + idx * SLOT_PITCH + SLOT_W / 2;
  const viewportW = window.innerWidth;
  const offset = viewportW / 2 - slotCenterX;
  actionSceneEl.style.transform = `rotateX(22deg) translateX(${offset}px)`;
}

function squeezeFixedGun() {
  ketchupFixedEl.classList.remove('shoot');
  void ketchupFixedEl.offsetWidth;
  ketchupFixedEl.classList.add('shoot');
}

fireBtn.addEventListener('click', async () => {
  if (fireBtn.disabled) return;
  fireBtn.disabled = true;

  if (state.quickMode) {
    for (let i = 0; i < state.totalCount; i++) {
      await fireOneTurn(i, true);
    }
  } else {
    await fireOneTurn(state.currentTurn, false);
  }

  if (state.currentTurn >= state.totalCount) {
    await sleep(900);
    showResult();
  } else {
    fireBtn.disabled = false;
  }
});

async function fireOneTurn(idx, fast) {
  state.currentTurn = idx + 1;
  counterEl.textContent = `${state.currentTurn} / ${state.totalCount}`;

  const bread  = breadPopupsEl.querySelector(`.bread-popup[data-idx="${idx}"]`);
  const isLive = state.bulletPlan[idx];
  if (!bread) return;

  // 1. 카메라 슬롯으로 횡이동
  panCameraToSlot(idx);
  await sleep(fast ? 120 : 800);

  // 2. 식빵 퓽! (Quick Draw에선 슬로모션 효과 생략)
  if (!fast) {
    bwOn();
    fireSpeedLines();
  }
  bread.classList.add('popped');
  await sleep(fast ? 100 : 800);

  // 3. 케찹총 발사
  squeezeFixedGun();
  shakeCamera(false);
  if (!fast) {
    fireSmoke();
    bwOff();
  }
  await sleep(fast ? 50 : 350);

  // 4. 실탄이면 케찹 + 당첨! SFX
  if (isLive) {
    bread.classList.add('hit');
    if (!fast) showSFX('당첨!');
    state.hitNames.push({ idx, name: state.names[idx] });
  }
  await sleep(fast ? 220 : 1100);

  // 5. 식빵 떨어짐
  bread.classList.remove('popped');
  bread.classList.add('fall');
  await sleep(fast ? 80 : 700);
  bread.classList.remove('fall');
}

/* =========================================================
   SCREEN 5: RESULT (WANTED 포스터)
   ========================================================= */

function showResult() {
  const list = document.getElementById('winnerList');
  list.innerHTML = '';
  if (state.hitNames.length === 0) {
    const li = document.createElement('li');
    li.className = 'no-winner';
    li.innerHTML = '<span class="winner-name">— NO ONE WAS COVERED IN KETCHUP —</span>';
    list.appendChild(li);
  } else {
    state.hitNames.forEach(w => {
      const li = document.createElement('li');
      li.innerHTML = `
        <div class="mugshot">${breadMugshotSVG()}</div>
        <div class="winner-info">
          <span class="winner-no">No.${w.idx + 1}</span>
          <span class="winner-name">${escapeHTML(w.name)}</span>
        </div>
      `;
      list.appendChild(li);
    });
  }
  showScreen('result');
}

document.getElementById('restartBtn').addEventListener('click', () => {
  // 라운드 상태 초기화 (설정/이름은 유지)
  state.currentTurn = 0;
  state.hitNames    = [];
  state.bulletPlan  = [];
  showScreen('title');
});

/* =========================================================
   초기화
   ========================================================= */

refreshTitle();
