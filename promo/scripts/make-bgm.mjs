// matenaiyo プロモ用の "あたたかポップ" BGM を著作権フリーで合成する。
// マリンバ風メロディ + やわらかいパッド + ベース + 軽いパーカッションで、
// イントロ→ステップ→CTA にかけて盛り上がる展開を作る。依存なしで WAV を書き出す。
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const SR = 44100;
const BPM = 100;
const BEAT = 60 / BPM; // 0.6s
const BAR = BEAT * 4;
const BARS = 12;
const DURATION = BARS * BAR + 1.2; // 余韻を少し足す
const N = Math.floor(SR * DURATION);
const buf = new Float32Array(N);

const midi = (m) => 440 * 2 ** ((m - 69) / 12);
// 音名 → MIDI(C4=60)
const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const n = (name) => {
  const m = name.match(/^([A-G])(#?)(-?\d)$/);
  return 12 * (Number(m[3]) + 1) + NOTE[m[1]] + (m[2] ? 1 : 0);
};

// 整数サンプル添字で加算する。開始時刻を毎サンプル floor(t*SR) すると、
// BEAT(=0.6) が2進数で不正確なため丸め誤差で1サンプルおきに書き込みが
// 飛び、ナイキスト成分(金属的な機械音)が発生する。開始位置を一度だけ丸めて
// 以降は整数インデックスで書くことで根絶する。
const addAt = (i, v) => {
  if (i >= 0 && i < N) buf[i] += v;
};
const startSample = (startBeat) => Math.round(startBeat * BEAT * SR);

// マリンバ/木琴風のプラック。基音 + 4倍音でウッディな鳴り、速い減衰。
function pluck(startBeat, durBeats, noteName, gain) {
  const f = midi(n(noteName));
  const i0 = startSample(startBeat);
  const dur = durBeats * BEAT;
  const len = Math.floor(dur * SR);
  for (let s = 0; s < len; s++) {
    const t = s / SR;
    const env = Math.exp(-t * 7) * (1 - Math.exp(-t * 400));
    const vib = 1 + 0.004 * Math.sin(2 * Math.PI * 5 * t);
    const w =
      Math.sin(2 * Math.PI * f * vib * t) +
      0.32 * Math.sin(2 * Math.PI * 4 * f * t) +
      0.12 * Math.sin(2 * Math.PI * 2 * f * t);
    addAt(i0 + s, w * env * gain);
  }
}

// やわらかいパッド(和音)。ゆるやかな立ち上がりと軽いトレモロ。
function pad(startBeat, durBeats, noteNames, gain) {
  const i0 = startSample(startBeat);
  const dur = durBeats * BEAT;
  const len = Math.floor(dur * SR);
  const freqs = noteNames.map((x) => midi(n(x)));
  for (let s = 0; s < len; s++) {
    const t = s / SR;
    const atk = 1 - Math.exp(-t * 6);
    const rel = Math.min(1, (dur - t) * 4);
    const trem = 1 + 0.05 * Math.sin(2 * Math.PI * 3 * t);
    let w = 0;
    for (const f of freqs) {
      w += Math.sin(2 * Math.PI * f * t) + 0.08 * Math.sin(2 * Math.PI * 2 * f * t);
    }
    addAt(i0 + s, (w / freqs.length) * atk * rel * trem * gain);
  }
}

// やわらかいベース(サイン)。
function bass(startBeat, durBeats, noteName, gain) {
  const f = midi(n(noteName));
  const i0 = startSample(startBeat);
  const dur = durBeats * BEAT;
  const len = Math.floor(dur * SR);
  for (let s = 0; s < len; s++) {
    const t = s / SR;
    const env = (1 - Math.exp(-t * 30)) * Math.min(1, (dur - t) * 8) * Math.exp(-t * 1.2);
    const w = Math.sin(2 * Math.PI * f * t) + 0.15 * Math.sin(2 * Math.PI * 2 * f * t);
    addAt(i0 + s, w * env * gain);
  }
}

// キック(周波数スイープ)。
function kick(startBeat, gain) {
  const i0 = startSample(startBeat);
  const len = Math.floor(0.16 * SR);
  for (let s = 0; s < len; s++) {
    const t = s / SR;
    const f = 120 * Math.exp(-t * 24) + 48;
    const env = Math.exp(-t * 16);
    addAt(i0 + s, Math.sin(2 * Math.PI * f * t) * env * gain);
  }
}

// I–V–vi–IV(C–G–Am–F)。あたたかく前向きな定番進行。
const CHORDS = [
  { root: "C2", pad: ["C4", "E4", "G4"], triad: ["C5", "E5", "G5"], minor: false },
  { root: "G1", pad: ["G3", "B3", "D4"], triad: ["G4", "B4", "D5"], minor: false },
  { root: "A1", pad: ["A3", "C4", "E4"], triad: ["A4", "C5", "E5"], minor: true },
  { root: "F1", pad: ["F3", "A3", "C4"], triad: ["F4", "A4", "C5"], minor: false },
];

// 各バーのメロディの盛り上がり(0=薄い, 1=フル)。イントロ→展開→締め。
const MELODY_GAIN = [0, 0.35, 0.7, 0.9, 1, 1, 1, 1, 1, 1, 0.9, 0.7];
const PERC_GAIN = [0, 0, 0.5, 0.7, 0.9, 1, 1, 1, 1, 1, 0.8, 0.4];

// 診断用: STEM=pad|bass|pluck|kick を指定するとその楽器だけを鳴らす。
const STEM = process.env.STEM || "";
const on = (name) => !STEM || STEM === name;

for (let bar = 0; bar < BARS; bar++) {
  const chord = CHORDS[bar % 4];
  const b0 = bar * 4;
  const mg = MELODY_GAIN[bar];
  const pg = PERC_GAIN[bar];

  // パッド和音(バー全体)
  if (on("pad")) pad(b0, 4, chord.pad, 0.16 + 0.04 * mg);

  // ベース: 1拍目と3拍目
  if (on("bass")) {
    bass(b0, 2, chord.root, 0.5);
    bass(b0 + 2, 2, chord.root, 0.42);
  }

  // メロディ: 8分音符のアルペジオ(上下)。tri を1オクターブ上で。
  const arp = [chord.triad[0], chord.triad[1], chord.triad[2], upOct(chord.triad[0])];
  const pattern = [0, 1, 2, 3, 2, 1, 2, 3];
  for (let e = 0; e < 8; e++) {
    if (mg <= 0 || !on("pluck")) break;
    const noteName = arp[pattern[e]];
    const accent = e % 2 === 0 ? 1 : 0.75;
    pluck(b0 + e * 0.5, 0.6, noteName, 0.28 * mg * accent);
  }

  // パーカッション(キックのみ。シェイカーは廃止)
  if (pg > 0 && on("kick")) {
    kick(b0, 0.28 * pg);
    kick(b0 + 2, 0.25 * pg);
  }
}

// 最後の1音: トニックでキラッと締める。
if (on("pluck")) {
  pluck(BARS * 4, 2, "C6", 0.3);
  pluck(BARS * 4, 2, "E5", 0.2);
}
if (on("pad")) pad(BARS * 4, 2.2, ["C4", "E4", "G4"], 0.14);
if (on("bass")) bass(BARS * 4, 2, "C2", 0.4);

function upOct(name) {
  const m = name.match(/^([A-G]#?)(-?\d)$/);
  return `${m[1]}${Number(m[2]) + 1}`;
}

// マスタリング: 正規化 → やわらかい飽和 → ローパス(高域を落としてまろやかに) → フェード。
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(buf[i]));
const norm = peak > 0 ? 0.9 / peak : 1;

// 一次ローパスを2段カスケード(約5kHz)。キンキンする高域をなだらかに削る。
const fc = 5000;
const rc = 1 / (2 * Math.PI * fc);
const dt = 1 / SR;
const alpha = dt / (rc + dt);
let lp1 = 0;
let lp2 = 0;
const fadeIn = Math.floor(0.25 * SR);
const fadeOut = Math.floor(1.2 * SR);
const RAW = process.env.RAW === "1"; // 診断用: 飽和とローパスを無効化
for (let i = 0; i < N; i++) {
  let v = RAW ? buf[i] * norm : Math.tanh(buf[i] * norm * 0.95); // 控えめな飽和
  if (!RAW) {
    lp1 += alpha * (v - lp1);
    lp2 += alpha * (lp1 - lp2);
    v = lp2;
  }
  if (i < fadeIn) v *= i / fadeIn;
  if (i > N - fadeOut) v *= (N - i) / fadeOut;
  buf[i] = v;
}

// ローパスで下がった音量を軽く持ち上げる。
let peak2 = 0;
for (let i = 0; i < N; i++) peak2 = Math.max(peak2, Math.abs(buf[i]));
const makeup = peak2 > 0 ? Math.min(1.6, 0.9 / peak2) : 1;
for (let i = 0; i < N; i++) buf[i] *= makeup;

// 16bit PCM WAV(モノ)を書き出す。
const bytesPerSample = 2;
const dataSize = N * bytesPerSample;
const out = Buffer.alloc(44 + dataSize);
out.write("RIFF", 0);
out.writeUInt32LE(36 + dataSize, 4);
out.write("WAVE", 8);
out.write("fmt ", 12);
out.writeUInt32LE(16, 16);
out.writeUInt16LE(1, 20); // PCM
out.writeUInt16LE(1, 22); // mono
out.writeUInt32LE(SR, 24);
out.writeUInt32LE(SR * bytesPerSample, 28);
out.writeUInt16LE(bytesPerSample, 32);
out.writeUInt16LE(16, 34);
out.write("data", 36);
out.writeUInt32LE(dataSize, 40);
for (let i = 0; i < N; i++) {
  const s = Math.max(-1, Math.min(1, buf[i]));
  out.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
}

const outPath = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "bgm.wav");
writeFileSync(outPath, out);
console.log(`wrote ${outPath} (${(out.length / 1024 / 1024).toFixed(2)} MB, ${DURATION.toFixed(1)}s)`);
