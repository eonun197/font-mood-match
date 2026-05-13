const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const strengthInput = document.getElementById('strength');
const strengthValue = document.getElementById('strengthValue');
const zoomInput = document.getElementById('zoom');
const zoomValue = document.getElementById('zoomValue');
const fileInput = document.getElementById('file');
const playBtn = document.getElementById('play');
const resetBtn = document.getElementById('reset');
const recordBtn = document.getElementById('record');
const downloadBtn = document.getElementById('download');
const hint = document.getElementById('hint');
const dropOverlay = document.getElementById('dropOverlay');

const SIZE = canvas.width;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = CX;
const R2 = R * R;
const MAX_APERTURE = Math.PI / 2 - 0.05;
const INITIAL_ZOOM = parseFloat(zoomInput.value);
const MIN_ZOOM = parseFloat(zoomInput.min);
const MAX_ZOOM = parseFloat(zoomInput.max);

// --- 미디어 소스: Image 또는 Video element (drawImage가 둘 다 받음) ---
let sourceMedia = null;
let isVideo = false;
let videoEl = null;
let videoPlaying = false;
let videoLoopId = null;

let baseScale = 1;
let zoomMul = INITIAL_ZOOM;
let panX = CX, panY = CY;

const scene = document.createElement('canvas');
scene.width = SIZE;
scene.height = SIZE;
const sceneCtx = scene.getContext('2d');
sceneCtx.imageSmoothingEnabled = true;
sceneCtx.imageSmoothingQuality = 'high';
ctx.imageSmoothingEnabled = true;
ctx.imageSmoothingQuality = 'high';

let cachedSceneData = null;
let sceneDirty = true;
let lensMapX = null;
let lensMapY = null;
let vignetteGrad = null;
let outputData = null;     // 매 프레임 alloc 방지

// --- 매핑 LUT ---

function buildLensMap(strength01) {
  const aperture = Math.max(0.001, strength01 * MAX_APERTURE);
  const tanA = Math.tan(aperture);
  const n = SIZE * SIZE;
  lensMapX = new Float32Array(n);
  lensMapY = new Float32Array(n);

  for (let y = 0; y < SIZE; y++) {
    const dy = y - CY;
    for (let x = 0; x < SIZE; x++) {
      const dx = x - CX;
      const r2 = dx * dx + dy * dy;
      const i = y * SIZE + x;
      if (r2 > R2) {
        lensMapX[i] = NaN;
        continue;
      }
      if (r2 === 0) {
        lensMapX[i] = CX;
        lensMapY[i] = CY;
        continue;
      }
      const r = Math.sqrt(r2);
      const rn = r / R;
      const k = Math.tan(rn * aperture) / tanA;
      const factor = k / rn;
      lensMapX[i] = CX + dx * factor;
      lensMapY[i] = CY + dy * factor;
    }
  }
}

function buildVignette() {
  vignetteGrad = ctx.createRadialGradient(CX, CY, 0, CX, CY, R);
  vignetteGrad.addColorStop(0.00, 'rgba(0, 0, 0, 0)');
  vignetteGrad.addColorStop(0.83, 'rgba(0, 0, 0, 0)');
  vignetteGrad.addColorStop(0.93, 'rgba(0, 0, 0, 0.10)');
  vignetteGrad.addColorStop(0.97, 'rgba(0, 0, 0, 0.35)');
  vignetteGrad.addColorStop(0.99, 'rgba(0, 0, 0, 0.75)');
  vignetteGrad.addColorStop(1.00, 'rgba(0, 0, 0, 1)');
}

// --- Scene 그리기 (이미지/비디오 동일 경로) ---

function drawScene() {
  sceneCtx.fillStyle = '#000';
  sceneCtx.fillRect(0, 0, SIZE, SIZE);
  if (!sourceMedia) return;
  const w = sourceMediaWidth() * baseScale * zoomMul;
  const h = sourceMediaHeight() * baseScale * zoomMul;
  sceneCtx.drawImage(sourceMedia, panX - w / 2, panY - h / 2, w, h);
}

function sourceMediaWidth() {
  return isVideo ? sourceMedia.videoWidth : sourceMedia.naturalWidth || sourceMedia.width;
}
function sourceMediaHeight() {
  return isVideo ? sourceMedia.videoHeight : sourceMedia.naturalHeight || sourceMedia.height;
}

// --- 메인 렌더 (이미지/비디오 동일) ---

function render() {
  if (sceneDirty) {
    drawScene();
    cachedSceneData = sceneCtx.getImageData(0, 0, SIZE, SIZE);
    sceneDirty = false;
  }
  if (!sourceMedia) {
    ctx.clearRect(0, 0, SIZE, SIZE);
    return;
  }

  const src = cachedSceneData.data;
  if (!outputData) outputData = ctx.createImageData(SIZE, SIZE);
  const dst = outputData.data;
  const sizeM1 = SIZE - 1;

  for (let i = 0, p = 0; i < lensMapX.length; i++, p += 4) {
    const sx = lensMapX[i];

    if (sx !== sx) {
      dst[p] = 0; dst[p + 1] = 0; dst[p + 2] = 0; dst[p + 3] = 255;
      continue;
    }

    const sy = lensMapY[i];
    let x0 = sx | 0;
    let y0 = sy | 0;
    let x1 = x0 + 1;
    let y1 = y0 + 1;

    if (x0 < 0) x0 = 0; else if (x0 > sizeM1) x0 = sizeM1;
    if (y0 < 0) y0 = 0; else if (y0 > sizeM1) y0 = sizeM1;
    if (x1 < 0) x1 = 0; else if (x1 > sizeM1) x1 = sizeM1;
    if (y1 < 0) y1 = 0; else if (y1 > sizeM1) y1 = sizeM1;

    const fx = sx - (sx | 0);
    const fy = sy - (sy | 0);
    const ifx = 1 - fx;
    const ify = 1 - fy;
    const w00 = ifx * ify;
    const w10 = fx * ify;
    const w01 = ifx * fy;
    const w11 = fx * fy;

    const i00 = (y0 * SIZE + x0) * 4;
    const i10 = (y0 * SIZE + x1) * 4;
    const i01 = (y1 * SIZE + x0) * 4;
    const i11 = (y1 * SIZE + x1) * 4;

    dst[p]     = src[i00]     * w00 + src[i10]     * w10 + src[i01]     * w01 + src[i11]     * w11;
    dst[p + 1] = src[i00 + 1] * w00 + src[i10 + 1] * w10 + src[i01 + 1] * w01 + src[i11 + 1] * w11;
    dst[p + 2] = src[i00 + 2] * w00 + src[i10 + 2] * w10 + src[i01 + 2] * w01 + src[i11 + 2] * w11;
    dst[p + 3] = 255;
  }

  ctx.putImageData(outputData, 0, 0);
  ctx.fillStyle = vignetteGrad;
  ctx.fillRect(0, 0, SIZE, SIZE);
}

// --- rAF 스로틀링 (이미지 + paused 비디오 + 드래그용) ---

let renderQueued = false;
function scheduleRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    render();
  });
}

// --- 비디오 재생 루프 ---

function videoTick() {
  if (!videoPlaying) {
    videoLoopId = null;
    return;
  }
  // 매 프레임 새 영상 픽셀이므로 무조건 dirty
  sceneDirty = true;
  scheduleRender();
  videoLoopId = requestAnimationFrame(videoTick);
}

function startVideoLoop() {
  if (videoLoopId !== null) return;
  videoLoopId = requestAnimationFrame(videoTick);
}

function stopVideoLoop() {
  if (videoLoopId !== null) cancelAnimationFrame(videoLoopId);
  videoLoopId = null;
}

// --- 파일 라우팅 ---

function loadFile(file) {
  if (!file) return;
  if (file.type.startsWith('image/'))      loadImage(file);
  else if (file.type.startsWith('video/')) loadVideo(file);
}

function clearVideo() {
  if (videoEl) {
    videoEl.pause();
    videoEl.removeAttribute('src');
    videoEl.load();
  }
  videoPlaying = false;
  stopVideoLoop();
  isVideo = false;
  playBtn.classList.add('hide');
  recordBtn.classList.add('hide');
  if (recording) stopRecording();
}

function loadImage(file) {
  clearVideo();
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      sourceMedia = img;
      isVideo = false;
      const sx = SIZE / img.width;
      const sy = SIZE / img.height;
      baseScale = Math.max(sx, sy);
      onMediaReady();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function loadVideo(file) {
  // Hidden <video> 엘리먼트 (DOM에 attach해야 일부 브라우저에서 오디오 안전)
  if (!videoEl) {
    videoEl = document.createElement('video');
    videoEl.loop = true;
    videoEl.playsInline = true;
    videoEl.crossOrigin = 'anonymous';
    videoEl.style.display = 'none';
    document.body.appendChild(videoEl);
  } else {
    videoEl.pause();
  }

  videoEl.src = URL.createObjectURL(file);

  videoEl.addEventListener('loadeddata', () => {
    sourceMedia = videoEl;
    isVideo = true;
    const sx = SIZE / videoEl.videoWidth;
    const sy = SIZE / videoEl.videoHeight;
    baseScale = Math.max(sx, sy);
    playBtn.classList.remove('hide');
    recordBtn.classList.remove('hide');
    onMediaReady();
    // 자동재생 시도. 사운드 있으면 차단될 수 있음 → 그 경우 사용자가 play 버튼 누름
    videoEl.play().then(() => {
      videoPlaying = true;
      startVideoLoop();
      updatePlayBtn();
    }).catch(() => {
      videoPlaying = false;
      updatePlayBtn();
    });
  }, { once: true });
}

function onMediaReady() {
  zoomMul = INITIAL_ZOOM;
  panX = CX;
  panY = CY;
  zoomInput.value = String(zoomMul);
  sceneDirty = true;
  updateLabels();
  hint.classList.add('hide');
  canvas.classList.remove('empty');
  downloadBtn.disabled = false;
  resetBtn.disabled = false;
  scheduleRender();
}

function updatePlayBtn() {
  playBtn.textContent = videoPlaying ? '일시정지' : '재생';
}

function togglePlay() {
  if (!isVideo) return;
  if (videoPlaying) {
    videoEl.pause();
    videoPlaying = false;
    stopVideoLoop();
  } else {
    videoEl.play();
    videoPlaying = true;
    startVideoLoop();
  }
  updatePlayBtn();
}

// --- MediaRecorder: 왜곡된 canvas를 webm으로 녹화 ---

let mediaRecorder = null;
let recordedChunks = [];
let recording = false;

function startRecording() {
  recordedChunks = [];
  const stream = canvas.captureStream(30);

  // 오디오 트랙도 함께 녹음
  if (isVideo && videoEl.captureStream) {
    try {
      videoEl.captureStream().getAudioTracks().forEach(t => stream.addTrack(t));
    } catch (err) {
      console.warn('audio capture failed:', err);
    }
  }

  const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
    ? 'video/webm;codecs=vp9,opus'
    : 'video/webm';
  mediaRecorder = new MediaRecorder(stream, { mimeType: mime });
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) recordedChunks.push(e.data);
  };
  mediaRecorder.onstop = () => {
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fisheye-${Date.now()}.webm`;
    a.click();
    URL.revokeObjectURL(url);
  };
  mediaRecorder.start();
  recording = true;
  recordBtn.classList.add('recording');
  recordBtn.textContent = '정지';
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
  recording = false;
  recordBtn.classList.remove('recording');
  recordBtn.textContent = '녹화';
}

function toggleRecording() {
  if (!isVideo) return;
  if (recording) stopRecording();
  else startRecording();
}

// --- 라벨 / 좌표 / 줌 ---

function updateLabels() {
  strengthValue.textContent = parseFloat(strengthInput.value).toFixed(2);
  zoomValue.textContent = zoomMul.toFixed(2) + 'x';
}

function getCanvasCoords(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (clientX - rect.left) / rect.width * SIZE,
    y: (clientY - rect.top) / rect.height * SIZE,
  };
}

function applyZoom(newZoom, anchorX, anchorY) {
  newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
  if (newZoom === zoomMul) return;
  const factor = newZoom / zoomMul;
  panX = anchorX - (anchorX - panX) * factor;
  panY = anchorY - (anchorY - panY) * factor;
  zoomMul = newZoom;
  zoomInput.value = String(zoomMul);
  sceneDirty = true;
}

// --- 컨트롤 이벤트 ---

strengthInput.addEventListener('input', () => {
  buildLensMap(parseFloat(strengthInput.value));
  updateLabels();
  if (sourceMedia) scheduleRender();
});

zoomInput.addEventListener('input', () => {
  applyZoom(parseFloat(zoomInput.value), CX, CY);
  updateLabels();
  if (sourceMedia) scheduleRender();
});

fileInput.addEventListener('change', (e) => loadFile(e.target.files[0]));

playBtn.addEventListener('click', togglePlay);
recordBtn.addEventListener('click', toggleRecording);

downloadBtn.addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = `fisheye-${Date.now()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
});

resetBtn.addEventListener('click', () => {
  if (!sourceMedia) return;
  zoomMul = INITIAL_ZOOM;
  panX = CX;
  panY = CY;
  zoomInput.value = String(zoomMul);
  sceneDirty = true;
  updateLabels();
  scheduleRender();
});

// --- 델타 기반 드래그 (재생 중에도 동시 작동) ---

let dragging = false;
let lastMouse = null;

canvas.addEventListener('mousedown', (e) => {
  if (!sourceMedia) return;
  e.preventDefault();
  dragging = true;
  lastMouse = getCanvasCoords(e.clientX, e.clientY);
  canvas.classList.add('dragging');
});

window.addEventListener('mousemove', (e) => {
  if (!dragging) return;
  const cur = getCanvasCoords(e.clientX, e.clientY);
  panX += cur.x - lastMouse.x;
  panY += cur.y - lastMouse.y;
  lastMouse = cur;
  sceneDirty = true;
  // 비디오 루프가 안 돌고 있을 때만 직접 스케줄 (재생 중이면 다음 frame에 자연 반영)
  if (!videoPlaying) scheduleRender();
});

window.addEventListener('mouseup', () => {
  if (!dragging) return;
  dragging = false;
  canvas.classList.remove('dragging');
});

window.addEventListener('blur', () => {
  if (dragging) {
    dragging = false;
    canvas.classList.remove('dragging');
  }
});

canvas.addEventListener('wheel', (e) => {
  if (!sourceMedia) return;
  e.preventDefault();
  const { x: mx, y: my } = getCanvasCoords(e.clientX, e.clientY);
  const step = e.deltaY < 0 ? 1.015 : 1 / 1.015;
  applyZoom(zoomMul * step, mx, my);
  updateLabels();
  if (!videoPlaying) scheduleRender();
}, { passive: false });

// --- 파일 드롭 ---

let dragDepth = 0;
window.addEventListener('dragenter', (e) => {
  e.preventDefault();
  if (!e.dataTransfer || !e.dataTransfer.types.includes('Files')) return;
  dragDepth++;
  dropOverlay.classList.add('active');
});
window.addEventListener('dragleave', (e) => {
  e.preventDefault();
  dragDepth--;
  if (dragDepth <= 0) {
    dragDepth = 0;
    dropOverlay.classList.remove('active');
  }
});
window.addEventListener('dragover', (e) => { e.preventDefault(); });
window.addEventListener('drop', (e) => {
  e.preventDefault();
  dragDepth = 0;
  dropOverlay.classList.remove('active');
  loadFile(e.dataTransfer.files[0]);
});

// --- 초기화 ---

canvas.classList.add('empty');
buildLensMap(parseFloat(strengthInput.value));
buildVignette();
updateLabels();
