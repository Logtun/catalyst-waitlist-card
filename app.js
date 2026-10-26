(() => {
"use strict";
const W = 1200, H = 675;
const APP_URL = location.origin + "/"; // this site's own address, wherever it is deployed
const SHARE_LINK = "catalyst.app"; // the single link in the post; set to APP_URL to link the hype site instead
const X_HANDLE = "@catalystapp"; // from catalyst.app's own links and twitter:creator tag

const BELIEFS = [
  "ETH flips BTC by 2027",
  "SOL hits $500 this cycle",
  "BTC tops $250k before 2028",
  "The Fed cuts in December and risk assets rip",
  "Stablecoins become Africa’s default dollar",
  "Prediction markets go fully mainstream",
  "AI stocks have one more leg up",
  "Gold keeps printing new all-time highs",
  "El Niño sends cocoa prices to the moon",
  "Memecoins outrun blue chips this quarter",
  "Oil spikes if shipping lanes get messy",
  "Nvidia beats earnings. Again.",
  "Altseason starts the day I stop checking",
  "Tokenised stocks go big in 2026",
  "The next bull run is AI agents trading for us",
  "Rate cuts are bullish, I said what I said",
  "BTC dominance peaks, then alts take over",
  "Onchain volume flips Nasdaq someday",
  "Coffee futures are wildly underrated",
  "Whoever buys the fear wins the year"
];

// Single card style: Ember (the style chooser was removed).
const T = { label: "Ember", bg: "#0e0e0e", accent: "#fa5000", glowA: "rgba(250,80,0,0.55)", glowB: "rgba(116,170,216,0.16)", text: "#ffffff", sub: "#a39d95", card: "rgba(255,255,255,0.045)", cardLine: "rgba(255,255,255,0.11)", grid: "rgba(255,255,255,0.045)", onAccent: "#ffffff" };

const $ = (id) => document.getElementById(id);
const canvas = $("card"), ctx = canvas.getContext("2d");
const els = { handle: $("handle"), belief: $("belief") };

const state = {
  avatar: null,
  xName: "" // display name fetched from X; never typed by the person
};

// ---------- persistence ----------
// v2: the card name is the person's X display name. Older saves (key "catalystHype")
// could hold a browser-autofilled / contact name, so they are dropped, not migrated.
const STORE = "catalystHypeX2";
try { localStorage.removeItem("catalystHype"); } catch (e) {}
// v3/v4: badge is always "Early believer" and style is always Ember; drop saved badge/spot/theme choices.
try {
  const old = JSON.parse(localStorage.getItem(STORE) || "{}");
  // v5: the display name is always fetched from X (no editable field), so drop any saved name.
  if ("badge" in old || "spot" in old || "theme" in old || "name" in old || "nameSource" in old) { delete old.badge; delete old.spot; delete old.theme; delete old.name; delete old.nameSource; localStorage.setItem(STORE, JSON.stringify(old)); }
} catch (e) {}
try {
  const saved = JSON.parse(localStorage.getItem(STORE) || "{}");
  if (saved.handle) els.handle.value = saved.handle;
  if (typeof saved.belief === "string") els.belief.value = saved.belief;
  if (saved.belief === undefined) els.belief.value = BELIEFS[0];
} catch (e) { els.belief.value = BELIEFS[0]; }
function persist() {
  try {
    localStorage.setItem(STORE, JSON.stringify({
      handle: els.handle.value, belief: els.belief.value
    }));
  } catch (e) {}
}

// ---------- assets ----------
function loadImg(src) {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}
const assets = {};
const ready = Promise.all([
  loadImg("assets/mark.png").then((i) => (assets.mark = i)),
  loadImg("assets/word.png").then((i) => (assets.word = i)),
  document.fonts ? Promise.all([
    document.fonts.load('700 40px "BDO"'), document.fonts.load('500 20px "BDO"'), document.fonts.load('400 20px "BDO"')
  ]).catch(() => {}) : Promise.resolve()
]);

// ---------- helpers ----------
const F = (w, s) => `${w} ${s}px "BDO", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
function rr(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function setLS(px) { if ("letterSpacing" in ctx) ctx.letterSpacing = px + "px"; }
function fitFont(text, weight, max, min, width) {
  let s = max;
  for (; s > min; s -= 1) { ctx.font = F(weight, s); if (ctx.measureText(text).width <= width) break; }
  ctx.font = F(weight, s); return s;
}
function wrap(text, width) {
  const words = text.split(/\s+/).filter(Boolean), lines = [];
  let line = "";
  for (const w of words) {
    const t = line ? line + " " + w : w;
    if (ctx.measureText(t).width <= width || !line) line = t; else { lines.push(line); line = w; }
  }
  if (line) lines.push(line);
  return lines;
}
function initials(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "C";
  const a = Array.from(parts[0])[0] || "";
  const b = parts.length > 1 ? (Array.from(parts[parts.length - 1])[0] || "") : (Array.from(parts[0])[1] || "");
  return (a + b).toUpperCase();
}
function cleanHandle(h) { return h.trim().replace(/^@+/, "").replace(/\s+/g, ""); }
// The card name: the X display name from the lookup; if X has none for this handle, the handle itself (no @).
function displayName() { return (state.xName || "").trim() || cleanHandle(els.handle.value); }
function hexPath(cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; ctx[i ? "lineTo" : "moveTo"](cx + r * Math.cos(a), cy + r * Math.sin(a)); }
  ctx.closePath();
}

// ---------- draw ----------
let drawVer = 0;
function draw() {
  drawVer++; if (typeof queuePre === "function") queuePre();
  const handle = cleanHandle(els.handle.value) || "yourhandle";
  const name = displayName() || "Your X name";
  const belief = els.belief.value.trim();
  const cardAccent = T.accent;
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  setLS(0);

  // background
  ctx.fillStyle = T.bg; ctx.fillRect(0, 0, W, H);
  let g = ctx.createRadialGradient(1080, -40, 0, 1080, -40, 640);
  g.addColorStop(0, T.glowA); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  g = ctx.createRadialGradient(80, 720, 0, 80, 720, 520);
  g.addColorStop(0, T.glowB); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  // grid, fading toward the bottom-left
  ctx.save();
  ctx.strokeStyle = T.grid; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0.5; x < W; x += 50) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
  for (let y = 0.5; y < H; y += 50) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.stroke();
  ctx.restore();
  // repaint a soft vignette so the grid sits back
  g = ctx.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, 820);
  g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  // logo: real Catalyst mark + wordmark
  if (assets.mark) ctx.drawImage(assets.mark, 64, 52, 56, 56);
  if (assets.word) { const wh = 43, ww = wh * assets.word.width / assets.word.height; ctx.drawImage(assets.word, 132, 62, ww, wh); }

  // headline
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  ctx.fillStyle = T.text;
  setLS(-2);
  const hs = fitFont("Catalyst waitlist.", 700, 70, 40, 540);
  ctx.fillText("I’m on the", 64, 222);
  ctx.fillStyle = T.accent;
  ctx.fillText("Catalyst waitlist.", 64, 222 + hs * 1.04);
  setLS(0);
  ctx.font = F(500, 23); ctx.fillStyle = T.sub;
  ctx.fillText("Tell it what you believe. It does the rest.", 64, 222 + hs * 1.04 + 52);

  // avatar
  const ax = 64, ay = 430, ad = 124, acx = ax + ad / 2, acy = ay + ad / 2;
  ctx.beginPath(); ctx.arc(acx, acy, ad / 2 + 7, 0, Math.PI * 2);
  ctx.lineWidth = 3; ctx.strokeStyle = T.accent; ctx.stroke();
  ctx.save();
  ctx.beginPath(); ctx.arc(acx, acy, ad / 2, 0, Math.PI * 2); ctx.clip();
  if (state.avatar) {
    const im = state.avatar, s = Math.min(im.width, im.height);
    ctx.drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, ax, ay, ad, ad);
  } else {
    const og = ctx.createLinearGradient(ax, ay, ax + ad, ay + ad);
    og.addColorStop(0, "#ff7a2e"); og.addColorStop(1, "#fa5000");
    ctx.fillStyle = og; ctx.fillRect(ax, ay, ad, ad);
    ctx.fillStyle = "#ffffff"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const ini = initials(displayName());
    setLS(-1); fitFont(ini, 700, 52, 24, ad - 30);
    ctx.fillText(ini, acx, acy + 3); setLS(0);
  }
  ctx.restore();

  // name + handle
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  ctx.fillStyle = T.text; setLS(-1);
  const nameW = 360;
  let ns = fitFont(name, 700, 44, 22, nameW);
  let nameShown = name;
  if (ctx.measureText(name).width > nameW) { let ch = Array.from(name); while (ch.length > 1 && ctx.measureText(ch.join("") + "…").width > nameW) ch.pop(); nameShown = ch.join("").trim() + "…"; }
  ctx.fillText(nameShown, 222, acy - 4);
  setLS(0);
  ctx.font = F(500, 26); ctx.fillStyle = T.sub;
  ctx.fillText("@" + handle, 223, acy + 36);

  // belief / strategy card
  const cx = 660, cy = 132, cw = 476, ch = 422;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 40; ctx.shadowOffsetY = 16;
  rr(cx, cy, cw, ch, 28); ctx.fillStyle = "rgba(18,18,18,0.92)"; ctx.fill();
  ctx.restore();
  rr(cx, cy, cw, ch, 28); ctx.fillStyle = T.card; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = T.cardLine; ctx.stroke();
  // top accent line
  ctx.save(); rr(cx, cy, cw, ch, 28); ctx.clip();
  const tl = ctx.createLinearGradient(cx, 0, cx + cw, 0);
  tl.addColorStop(0, "rgba(0,0,0,0)"); tl.addColorStop(0.5, cardAccent); tl.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = tl; ctx.fillRect(cx, cy, cw, 3);
  const cg = ctx.createRadialGradient(cx + cw, cy, 0, cx + cw, cy, 300);
  cg.addColorStop(0, hexA(cardAccent, 0.16)); cg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = cg; ctx.fillRect(cx, cy, cw, ch);
  ctx.restore();


  // "Early believer" badge: centred above the box, clear of its top border
  {
    ctx.textBaseline = "middle";
    ctx.font = F(700, 17); setLS(1.6);
    const txt = "EARLY BELIEVER", tw = ctx.measureText(txt).width, pw = tw + 62, ph = 44;
    const x = cx + (cw - pw) / 2, y = cy - ph - 14;
    ctx.save(); ctx.shadowColor = "rgba(0,0,0,0.45)"; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
    rr(x, y, pw, ph, 22); ctx.fillStyle = T.accent; ctx.fill(); ctx.restore();
    hexPath(x + 30, y + ph / 2, 10); ctx.fillStyle = T.onAccent; ctx.fill();
    ctx.fillStyle = T.onAccent; ctx.textAlign = "left"; ctx.fillText(txt, x + 50, y + ph / 2 + 1);
    setLS(0);
  }
  // card header
  ctx.textBaseline = "middle"; ctx.textAlign = "left";
  ctx.beginPath(); ctx.arc(cx + 38, cy + 44, 6, 0, Math.PI * 2); ctx.fillStyle = cardAccent; ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 38, cy + 44, 11, 0, Math.PI * 2); ctx.strokeStyle = hexA(cardAccent, 0.35); ctx.lineWidth = 2; ctx.stroke();
  ctx.font = F(700, 15); setLS(2.2); ctx.fillStyle = cardAccent;
  ctx.fillText("WHAT I BELIEVE", cx + 60, cy + 45);
  ctx.textAlign = "right"; ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.fillText("STRATEGY · DRAFT", cx + cw - 32, cy + 45);
  setLS(0);

  // quote marks: opening “ top-left, closing ” bottom-right (mirrored), in the accent colour;
  // the belief sits in the space between them so neither mark ever touches the text
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  ctx.font = F(700, 140); ctx.fillStyle = hexA(cardAccent, 0.55);
  const mo = ctx.measureText("“"), mc = ctx.measureText("”");
  const oL = cx + 30, oT = cy + 80, oW = mo.actualBoundingBoxLeft + mo.actualBoundingBoxRight;
  const cR = cx + cw - 30, cB = cy + 292, cH = mc.actualBoundingBoxAscent + mc.actualBoundingBoxDescent;
  ctx.fillText("“", oL + mo.actualBoundingBoxLeft, oT + mo.actualBoundingBoxAscent);
  ctx.fillText("”", cR - mc.actualBoundingBoxRight, cB - mc.actualBoundingBoxDescent);
  const bt = belief || "Tell it what you believe.";
  const qx = oL + oW + 20, qw = cx + cw - 36 - qx, qTop = cy + 84, qBot = cB - cH - 10;
  let bs = 52, lines;
  setLS(-0.8);
  for (; bs > 22; bs -= 2) {
    ctx.font = F(600, bs); lines = wrap(bt, qw);
    if (lines.length * bs * 1.14 <= qBot - qTop && lines.every((l) => ctx.measureText(l).width <= qw)) break;
  }
  ctx.font = F(600, bs); lines = wrap(bt, qw);
  const lh = bs * 1.14, maxLines = Math.floor((qBot - qTop) / lh);
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    let last = lines[maxLines - 1];
    while (last.length > 1 && ctx.measureText(last + "…").width > qw) last = last.slice(0, -1);
    lines[maxLines - 1] = last.replace(/[\s,.;:]+$/, "") + "…";
  }
  const blockH = lines.length * lh;
  const y0 = qTop + (qBot - qTop - blockH) / 2 + bs * 0.86;
  ctx.fillStyle = belief ? "#ffffff" : "rgba(255,255,255,0.55)";
  lines.forEach((l, i) => ctx.fillText(l, qx, y0 + i * lh));
  setLS(0);

  // divider
  const dy = cy + 306;
  ctx.fillStyle = "rgba(255,255,255,0.08)"; ctx.fillRect(cx + 32, dy, cw - 64, 1);

  // pipeline
  const steps = ["Research", "Strategy", "Monitor", "Execute"];
  const px0 = cx + 62, px1 = cx + cw - 62, py = dy + 44, gap = (px1 - px0) / 3;
  ctx.lineWidth = 3;
  for (let i = 0; i < 3; i++) {
    const x0 = px0 + i * gap + 16, x1 = px0 + (i + 1) * gap - 16;
    ctx.beginPath(); ctx.moveTo(x0, py); ctx.lineTo(x1, py);
    if (i < 2) { ctx.setLineDash([]); ctx.strokeStyle = cardAccent; }
    else { ctx.setLineDash([5, 7]); ctx.strokeStyle = "rgba(255,255,255,0.22)"; }
    ctx.stroke();
  }
  ctx.setLineDash([]);
  steps.forEach((s, i) => {
    const x = px0 + i * gap;
    if (i < 2) {
      ctx.beginPath(); ctx.arc(x, py, 14, 0, Math.PI * 2); ctx.fillStyle = cardAccent; ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - 6, py); ctx.lineTo(x - 1.5, py + 5); ctx.lineTo(x + 6.5, py - 5);
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke();
    } else if (i === 2) {
      ctx.beginPath(); ctx.arc(x, py, 22, 0, Math.PI * 2); ctx.fillStyle = hexA(cardAccent, 0.14); ctx.fill();
      ctx.beginPath(); ctx.arc(x, py, 14, 0, Math.PI * 2); ctx.strokeStyle = cardAccent; ctx.lineWidth = 3; ctx.stroke();
      ctx.beginPath(); ctx.arc(x, py, 6, 0, Math.PI * 2); ctx.fillStyle = cardAccent; ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(x, py, 14, 0, Math.PI * 2); ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = 2.5; ctx.stroke();
      // tiny lock
      ctx.fillStyle = "rgba(255,255,255,0.55)"; rr(x - 6, py - 2, 12, 9, 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x, py - 3, 4, Math.PI, 0); ctx.strokeStyle = "rgba(255,255,255,0.55)"; ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.font = F(600, 15); ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = i < 3 ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.45)";
    ctx.fillText(s, x, py + 42);
  });
  ctx.lineCap = "butt"; ctx.lineJoin = "miter";

  // credit: centred just below the box
  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  ctx.font = F(500, 16); setLS(0.3); ctx.fillStyle = "rgba(255,255,255,0.42)";
  ctx.fillText("design by @iamlogtun · not official", cx + cw / 2, cy + ch + 34);
  setLS(0);

  // bottom strip
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  ctx.font = F(700, 22); ctx.fillStyle = T.text;
  ctx.fillText("catalyst.app", 64, 626);
  const cw2 = ctx.measureText("catalyst.app").width;
  ctx.font = F(500, 18); ctx.fillStyle = T.sub;
  ctx.fillText("·  access opens in batches", 64 + cw2 + 12, 625);
  ctx.restore();
}
function hexA(c, a) {
  if (c[0] !== "#") return c;
  const n = parseInt(c.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

let raf = 0;
function schedule() { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); persist(); }); }

// ---------- inputs ----------
["belief"].forEach((k) => els[k].addEventListener("input", schedule));

// ---------- X lookup: display name + photo from the handle ----------
const xl = { box: $("xLookup"), av: $("xlAv"), text: $("xlText") };
let avatarSource = "none"; // "x" | "none"
let lookupTimer = 0, lookupSeq = 0, lookupCtl = null, lastLooked = "";
const HANDLE_RE = /^[A-Za-z0-9_]{1,15}$/;
function setLookup(st, html, avUrl) {
  xl.box.dataset.state = st; xl.text.innerHTML = html;
  xl.av.style.backgroundImage = avUrl ? `url("${avUrl}")` : "";
}
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function withTimeout(ms, outer) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  if (outer) outer.addEventListener("abort", () => c.abort());
  return { signal: c.signal, done: () => clearTimeout(t) };
}
// Fetch an image as a blob (CORS) and copy it onto our own canvas, so the card canvas
// never gets tainted and Download / Share / Copy keep working.
async function blobAvatar(url, outer) {
  const to = withTimeout(8000, outer);
  try {
    const r = await fetch(url, { mode: "cors", signal: to.signal, credentials: "omit" });
    if (!r.ok) throw new Error("img " + r.status);
    const b = await r.blob();
    if (!/^image\//.test(b.type) || b.size < 200) throw new Error("not an image");
    const u = URL.createObjectURL(b);
    try {
      const im = await loadImg(u);
      const s = Math.min(im.naturalWidth, im.naturalHeight), size = Math.min(s, 400);
      const c = document.createElement("canvas"); c.width = c.height = size;
      c.getContext("2d").drawImage(im, (im.naturalWidth - s) / 2, (im.naturalHeight - s) / 2, s, s, 0, 0, size, size);
      return { canvas: c, thumb: c.toDataURL("image/jpeg", 0.8) };
    } finally { URL.revokeObjectURL(u); }
  } finally { to.done(); }
}
async function fetchProfile(handle, outer) {
  const to = withTimeout(7000, outer);
  try {
    const r = await fetch("https://api.fxtwitter.com/" + encodeURIComponent(handle), { signal: to.signal, credentials: "omit" });
    const j = await r.json().catch(() => null);
    if (!j || !j.user) return { notFound: r.status === 404 || (j && j.code === 404) };
    return { name: j.user.name, screen: j.user.screen_name, avatar: j.user.avatar_url };
  } finally { to.done(); }
}
async function lookup(handle) {
  const seq = ++lookupSeq;
  if (lookupCtl) lookupCtl.abort();
  const ctl = (lookupCtl = new AbortController());
  lastLooked = handle.toLowerCase();
  setLookup("loading", `Looking up @${esc(handle)} on X…`);
  let prof = null;
  try { prof = await fetchProfile(handle, ctl.signal); } catch (e) { prof = null; }
  if (seq !== lookupSeq) return;
  if (prof && prof.name) {
    state.xName = prof.name;
    if (prof.screen && prof.screen.toLowerCase() === handle.toLowerCase() && prof.screen !== els.handle.value && document.activeElement !== els.handle) els.handle.value = prof.screen;
    schedule();
  }
  // photo: X's own image first (full size), then unavatar as a fallback
  let av = null;
  {
    const urls = [];
    if (prof && prof.avatar) urls.push(prof.avatar.replace(/_normal(\.[a-z]+)$/i, "_400x400$1"), prof.avatar);
    urls.push("https://unavatar.io/x/" + encodeURIComponent(handle) + "?fallback=false");
    for (const u of urls) {
      try { av = await blobAvatar(u, ctl.signal); av.url = u; break; } catch (e) { if (seq !== lookupSeq) return; }
    }
    if (seq !== lookupSeq) return;
    if (av) { state.avatar = av.canvas; state.avatarUrl = av.url; avatarSource = "x"; schedule(); }
  }
  if (prof && prof.name) {
    setLookup("found", `✓ <b>${esc(prof.name)}</b>${av ? "" : " <span class=\"muted\">(no photo, using initials)</span>"}`, av ? av.thumb : "");
  } else if (prof && prof.notFound) {
    setLookup("error", `Couldn’t find @${esc(handle)} on X. Check the spelling. Your handle will show as your name for now.`, av ? av.thumb : "");
  } else {
    setLookup("error", `Couldn’t reach X right now. Your handle will show as your name${av ? "" : ", with initials for the photo"}.`, av ? av.thumb : "");
  }
}
function onHandleInput(immediate) {
  clearTimeout(lookupTimer);
  const h = cleanHandle(els.handle.value);
  if (!h) {
    lookupSeq++; if (lookupCtl) lookupCtl.abort(); lastLooked = "";
    state.xName = "";
    if (avatarSource === "x") { state.avatar = null; state.avatarUrl = ""; avatarSource = "none"; }
    setLookup("idle", "Enter your handle and we’ll pull your X name and photo.");
    schedule(); return;
  }
  if (!HANDLE_RE.test(h)) { setLookup("error", "X handles are letters, numbers and _ only (max 15)."); schedule(); return; }
  if (h.toLowerCase() === lastLooked) return;
  // a different person: don't keep the previous person's auto-filled name/photo
  state.xName = "";
  if (avatarSource === "x") { state.avatar = null; state.avatarUrl = ""; avatarSource = "none"; }
  schedule();
  setLookup("loading", `Looking up @${esc(h)} on X…`);
  lookupTimer = setTimeout(() => lookup(h), immediate ? 0 : 650);
}
els.handle.addEventListener("input", () => { schedule(); onHandleInput(false); });
els.handle.addEventListener("change", () => onHandleInput(true));

els.handle.addEventListener("blur", () => { els.handle.value = cleanHandle(els.handle.value); schedule(); });
$("btnRandom").addEventListener("click", () => {
  const cur = els.belief.value; let next = cur;
  while (next === cur) next = BELIEFS[Math.floor(Math.random() * BELIEFS.length)];
  els.belief.value = next; schedule();
});

// ---------- output ----------
function fileName() {
  const h = cleanHandle(els.handle.value).replace(/[^A-Za-z0-9_]/g, "");
  return `catalyst-waitlist${h ? "-" + h : ""}.png`;
}
function getBlob() { draw(); return new Promise((res) => canvas.toBlob((b) => res(b), "image/png")); }
// Their own invite link when they unlocked with it and kept "Add my invite link" on (gate.js).
function joinLink() { const g = window.__gate; return (g && g.shareLink && g.shareLink()) || SHARE_LINK; }
const gateOk = () => !!(window.__gate && window.__gate.ok());
function shareText() {
  const b = els.belief.value.trim();
  const belief = b ? `\n\nWhat I believe: "${b.length > 100 ? b.slice(0, 99) + "…" : b}"` : "";
  return `I have joined the ${X_HANDLE} waitlist 🧡\n\nCatalyst is an AI powered financial intelligence and trading platform.\n\nTell it what you believe, it researches, builds the strategy and trades it for you.${belief}\n\nJoin us —> ${joinLink()}\n\nCreate your card —> ${location.origin}`;
}
const isIOS = /iP(hone|od|ad)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isInApp = /FBAN|FBAV|Instagram|Line\/|WhatsApp|Twitter|; wv\)/i.test(navigator.userAgent);

let lastUrl = null;
function showModal(url, withX) {
  $("modalImg").src = url;
  $("modalTitle").textContent = withX ? "Save your card, then post" : "Save your card";
  $("modalSteps").innerHTML = withX
    ? "Press and hold the image, tap <strong>Save to Photos</strong>, then tap <strong>Open X</strong> and attach it to your post."
    : "Press and hold the image, then tap <strong>Save to Photos</strong>.";
  const ox = $("modalOpenX"); ox.hidden = !withX; if (withX) ox.href = intentUrl();
  $("modal").hidden = false;
}
$("btnDownload").addEventListener("click", async () => {
  if (!gateOk()) return toast("Join the waitlist and paste your invite link to unlock your card.");
  const blob = await getBlob();
  if (!blob) return toast("Something went wrong. Try again.");
  if (lastUrl) URL.revokeObjectURL(lastUrl);
  lastUrl = URL.createObjectURL(blob);
  if (isIOS || isInApp) {
    // iOS saves downloads to Files and in-app browsers often block them: show the image to long-press instead
    showModal(lastUrl, false);
    believe("download");
    return;
  }
  const a = document.createElement("a");
  a.href = lastUrl; a.download = fileName(); document.body.append(a); a.click(); a.remove();
  toast("Card downloaded. Now attach it to your post on X.");
  believe("download");
});

// ---------- Share on X ----------
// The one link in the post. Swap to APP_URL to link the hype site instead of Catalyst.
// (X web intents can't attach images, and a second link only adds a second preview card.)
function intentUrl() { return "https://x.com/intent/tweet?text=" + encodeURIComponent(shareText()); }

// Phones: share the card PNG + text through the native share sheet (pick X → image attached).
// The PNG is pre-rendered after every change so navigator.share() runs straight inside the tap.
var canShareFiles = false;
try {
  const probe = new File([new Blob(["x"], { type: "image/png" })], "probe.png", { type: "image/png" });
  canShareFiles = !!(navigator.share && navigator.canShare && navigator.canShare({ files: [probe] }));
} catch (e) {}
var pre = { ver: -1, blob: null, file: null };
var preTimer = 0;
function queuePre() {
  clearTimeout(preTimer);
  preTimer = setTimeout(() => {
    const v = drawVer;
    canvas.toBlob((b) => { if (b && v === drawVer) pre = { ver: v, blob: b, file: new File([b], fileName(), { type: "image/png" }) }; }, "image/png");
  }, 250);
}
// synchronous fallback when the tap lands before the pre-render caught up
function blobNowSync() {
  const d = canvas.toDataURL("image/png"), bin = atob(d.split(",")[1]), u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return new Blob([u], { type: "image/png" });
}
function currentFile() {
  if (raf) { cancelAnimationFrame(raf); raf = 0; draw(); persist(); }
  if (pre.file && pre.ver === drawVer && pre.file.name === fileName()) return pre.file;
  const b = blobNowSync();
  pre = { ver: drawVer, blob: b, file: new File([b], fileName(), { type: "image/png" }) };
  return pre.file;
}
const shareDbg = (window.__shareDbg = { branch: "", intent: "", text: "" });

function fallbackShare(blob) {
  shareDbg.intent = intentUrl();
  believe("share");
  if (lastUrl) URL.revokeObjectURL(lastUrl);
  lastUrl = URL.createObjectURL(blob);
  if (isIOS || isInApp) { shareDbg.branch = "modal"; showModal(lastUrl, true); return; }
  shareDbg.branch = "download";
  const a = document.createElement("a");
  a.href = lastUrl; a.download = fileName(); document.body.append(a); a.click(); a.remove();
  let copy = Promise.resolve(false);
  try {
    if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write && !isIOS)
      copy = navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]).then(() => true, () => false);
  } catch (e) {}
  const late = new Promise((r) => setTimeout(() => r(false), 700));
  Promise.race([copy, late]).then((copied) => {
    shareDbg.copied = copied;
    toast(copied ? "Card saved, attach it to your post 📎 (on desktop you can paste with Ctrl/Cmd+V)"
                 : "Card saved, attach it to your post 📎", null, 9000);
    setTimeout(() => {
      const w = window.open(shareDbg.intent, "_blank");
      if (w) { try { w.opener = null; } catch (e) {} }
      shareDbg.opened = !!w;
      if (!w) toast("Card saved 📎 Now open X and attach it.", { label: "Open X →", href: shareDbg.intent }, 12000);
    }, 600);
  });
}

$("btnShareX").addEventListener("click", () => {
  if (!gateOk()) return toast("Join the waitlist and paste your invite link to unlock your card.");
  const file = currentFile();
  shareDbg.text = shareText();
  if (canShareFiles) {
    shareDbg.branch = "share";
    let p;
    try { p = navigator.share({ files: [file], text: shareDbg.text }); }
    catch (e) { return fallbackShare(file); }
    p.then(() => believe("share"), (e) => { if (!e || e.name !== "AbortError") fallbackShare(file); });
    return;
  }
  fallbackShare(file);
});

(function setupCopy() {
  if (!(window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) || isIOS) return;
  const btn = $("btnCopy"); btn.hidden = false;
  btn.addEventListener("click", async () => {
    if (!gateOk()) return;
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": getBlob() })]);
      toast("Copied! Paste it straight into your post.");
    } catch (e) { toast("Your browser blocked copying. Use Download instead."); }
  });
})();

$("modalClose").addEventListener("click", () => ($("modal").hidden = true));
$("modal").addEventListener("click", (e) => { if (e.target.id === "modal") $("modal").hidden = true; });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") $("modal").hidden = true; });

// ---------- Believers wall: lives in wall.js (off by default; see that file) ----------
function believe(via) {
  const Wall = window.BelieversWall;
  if (!Wall || !Wall.enabled) return;
  const handle = cleanHandle(els.handle.value);
  if (!HANDLE_RE.test(handle)) return;
  Wall.submit({ handle, name: displayName(), avatar: state.avatarUrl || "", belief: els.belief.value.trim().slice(0, 50), via });
}

let tt = 0;
function toast(msg, action, ms) {
  const t = $("toast"); t.textContent = msg;
  if (action) { const a = document.createElement("a"); a.href = action.href; a.target = "_blank"; a.rel = "noopener"; a.textContent = action.label; a.className = "toast-act"; t.append(" ", a); }
  t.classList.toggle("act", !!action); t.classList.add("show");
  clearTimeout(tt); tt = setTimeout(() => t.classList.remove("show"), ms || 3200);
}

draw();
ready.then(() => { draw(); document.documentElement.dataset.ready = "1"; });
// test hook
window.__hype = { believe, draw, getBlob, state, T, lookup, intentUrl, shareText, canShareFiles: () => canShareFiles };
// returning visitor: refresh name/photo for the saved handle
if (cleanHandle(els.handle.value)) onHandleInput(true);
})();
