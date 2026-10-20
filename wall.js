/* Believers wall: counter + wall of recent cards.
 *
 * OFF by default. With WALL_ENABLED = false this file makes no network
 * requests, and the wall section, the counter and the "Show my card on the
 * Believers wall" checkbox stay hidden. The card generator does not depend on it.
 *
 * To switch it on later (e.g. with Vercel KV / Upstash Redis):
 *   1. Add an API route at WALL_API that answers
 *        GET  -> { ok: true, count: <number>, wall: [ {handle, name, avatar, belief, ts}, ... ] }
 *        POST { handle, name, avatar, belief, show, via } -> same shape as GET
 *   2. Set WALL_ENABLED = true below.
 */
(() => {
"use strict";
const WALL_ENABLED = false;
const WALL_API = "/api/believers";

const $ = (id) => document.getElementById(id);
const noop = { enabled: false, submit() {}, load() {}, showOnWall: () => false };
if (!WALL_ENABLED) { window.BelieversWall = noop; return; }

const bel = { count: $("believersCount"), wall: $("wall"), wallEmpty: $("wallEmpty"), show: $("showOnWall"), sec: $("believers"), opt: $("wallOpt") };
if (!bel.wall || !bel.show) { window.BelieversWall = noop; return; }
bel.sec.hidden = false; if (bel.opt) bel.opt.hidden = false;

const WALL_STORE = "catalystHypeWall";
try { const w = localStorage.getItem(WALL_STORE); if (w === "0") bel.show.checked = false; } catch (e) {}
bel.show.addEventListener("change", () => { try { localStorage.setItem(WALL_STORE, bel.show.checked ? "1" : "0"); } catch (e) {} });

function initials(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "C";
  const a = Array.from(parts[0])[0] || "";
  const b = parts.length > 1 ? (Array.from(parts[parts.length - 1])[0] || "") : (Array.from(parts[0])[1] || "");
  return (a + b).toUpperCase();
}
function renderCount(n) {
  if (typeof n !== "number") return;
  bel.count.dataset.n = String(n);
  bel.count.textContent = n >= 10 ? `🧡 ${n.toLocaleString("en-US")} believers so far` : n === 0 ? "🧡 Be the first believer" : "🧡 Be one of the first believers";
  bel.count.hidden = false;
}
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
const AV_OK = /^https:\/\/(pbs\.twimg\.com\/(profile_images|default_profile_images)\/|unavatar\.io\/x\/)/;
function miniCard(it) {
  const a = el("a", "mini");
  a.href = "https://x.com/" + encodeURIComponent(it.handle); a.target = "_blank"; a.rel = "noopener nofollow";
  a.setAttribute("aria-label", `${it.name} (@${it.handle}) on X`);
  const top = el("div", "mini-top");
  const av = el("span", "mini-av", initials(it.name || it.handle));
  if (it.avatar && AV_OK.test(it.avatar)) {
    const img = new Image(); img.alt = ""; img.loading = "lazy"; img.decoding = "async"; img.referrerPolicy = "no-referrer";
    img.onload = () => av.classList.add("has-img"); img.onerror = () => img.remove(); img.src = it.avatar; av.append(img);
  }
  const who = el("div", "mini-who");
  who.append(el("b", "mini-name", it.name || it.handle), el("span", "mini-handle", "@" + it.handle));
  top.append(av, who);
  a.append(top);
  const q = el("p", "mini-belief");
  if (it.belief) q.textContent = "“" + it.belief + "”"; else { q.textContent = "Early, and proud of it."; q.classList.add("dim"); }
  a.append(q, el("span", "mini-chip", "Early believer"));
  return a;
}
function renderWall(list) {
  if (!Array.isArray(list)) return;
  bel.wall.replaceChildren(...list.map(miniCard));
  bel.wallEmpty.hidden = list.length > 0;
}
function applySnap(j) { if (!j) return; renderCount(j.count); renderWall(j.wall); }
async function load() {
  try { const r = await fetch(WALL_API, { cache: "no-store" }); applySnap(await r.json()); } catch (e) { /* the page works without it */ }
}
let lastSent = "";
function submit(payload) {
  payload.show = bel.show.checked;
  const sig = JSON.stringify([String(payload.handle).toLowerCase(), payload.name, payload.avatar, payload.belief, payload.show]);
  if (sig === lastSent) return;            // same card again: nothing new to record
  lastSent = sig;
  fetch(WALL_API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload), keepalive: true })
    .then((r) => r.json()).then((j) => { applySnap(j); if (!j || (!j.ok && j.error !== "rate_limited")) lastSent = ""; })
    .catch(() => { lastSent = ""; });
}
window.BelieversWall = { enabled: true, submit, load, showOnWall: () => bel.show.checked };
load();
})();
