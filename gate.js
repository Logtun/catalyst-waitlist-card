// Waitlist gate: the card unlocks only after the person pastes the invite link
// catalyst.app gives them once they have joined ("Invite a friend… Send them your link").
// Catalyst has no public way to look a code up, so this checks the link's format:
// catalyst.app (or www.) with ?r=CODE, CODE matching catalyst.app's own rule /^[A-Za-z0-9_-]{1,64}$/.
(() => {
"use strict";
const KEY = "catalystHypeInvite";
const CODE_RE = /^[A-Za-z0-9_-]{1,64}$/;
const $ = (id) => document.getElementById(id);

function parseInvite(raw) {
  let s = String(raw || "").trim();
  if (!s) return { ok: false, why: "empty" };
  if (/\s/.test(s)) s = s.split(/\s+/).find((p) => /catalyst\.app/i.test(p)) || s;
  if (!/^https?:\/\//i.test(s)) s = "https://" + s.replace(/^\/+/, "");
  let u;
  try { u = new URL(s); } catch (e) { return { ok: false, why: "notlink" }; }
  const host = u.hostname.toLowerCase();
  if (host !== "catalyst.app" && host !== "www.catalyst.app") return { ok: false, why: "notcatalyst" };
  const code = (u.searchParams.get("r") || "").trim();
  if (!code) return { ok: false, why: "nocode" };
  if (!CODE_RE.test(code)) return { ok: false, why: "badcode" };
  return { ok: true, code, link: "https://catalyst.app/?r=" + code };
}
const MSG = {
  notlink: "That doesn’t look like a link. Paste the invite link you got after joining, like catalyst.app/?r=AbC12.",
  notcatalyst: "That’s not a Catalyst link. Your invite link starts with catalyst.app/?r=",
  nocode: "That link has no invite code in it. Copy the one under “Invite a friend” after you join.",
  badcode: "That invite code doesn’t look right. Copy your link again from catalyst.app."
};

const g = {
  sec: $("gate"), steps: $("gateSteps"), done: $("gateDone"), code: $("gateCode"), change: $("gateChange"),
  input: $("invite"), msg: $("inviteMsg"), unlock: $("btnUnlock"),
  preview: document.querySelector(".preview"), lockBtn: $("lockGo"), refOpt: $("refOpt"), addRef: $("addRef")
};
const gated = ["btnDownload", "btnShareX", "btnCopy"].map($).filter(Boolean);
let current = null;   // parsed link while typing
let unlocked = null;  // { code, link } once unlocked

function setMsg(text, kind) {
  g.msg.textContent = text || "";
  g.msg.dataset.kind = kind || "";
  g.input.setAttribute("aria-invalid", kind === "err" ? "true" : "false");
}
function check(showErr) {
  current = parseInvite(g.input.value);
  g.unlock.disabled = !current.ok;
  if (current.ok) setMsg("Looks good ✓ invite code " + current.code, "ok");
  else if (current.why === "empty") setMsg("", "");
  else if (showErr) setMsg(MSG[current.why], "err");
  else setMsg("", "");
  return current;
}
function render() {
  const on = !!unlocked;
  g.steps.hidden = on; g.done.hidden = !on;
  g.sec.dataset.state = on ? "ok" : "locked";
  g.preview.classList.toggle("is-locked", !on);
  gated.forEach((b) => { b.disabled = !on; b.setAttribute("aria-disabled", on ? "false" : "true"); });
  g.refOpt.hidden = !on;
  if (on) g.code.textContent = unlocked.code;
  document.documentElement.dataset.gate = on ? "ok" : "locked";
}
function unlock(p, quiet) {
  unlocked = { code: p.code, link: p.link };
  try { localStorage.setItem(KEY, JSON.stringify({ link: p.link, addRef: g.addRef.checked })); } catch (e) {}
  render();
  if (!quiet) g.preview.scrollIntoView({ behavior: "smooth", block: "start" });
}

let tmr = 0;
g.input.addEventListener("input", () => { clearTimeout(tmr); check(false); if (!current.ok && current.why !== "empty") tmr = setTimeout(() => check(true), 700); });
g.input.addEventListener("blur", () => check(true));
g.input.addEventListener("paste", () => setTimeout(() => check(true), 0));
g.input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); if (check(true).ok) unlock(current); } });
g.unlock.addEventListener("click", () => { if (check(true).ok) unlock(current); });
g.change.addEventListener("click", () => {
  unlocked = null;
  try { localStorage.removeItem(KEY); } catch (e) {}
  render(); check(false); g.input.focus();
});
g.lockBtn.addEventListener("click", () => { g.sec.scrollIntoView({ behavior: "smooth", block: "start" }); setTimeout(() => g.input.focus({ preventScroll: true }), 350); });
g.addRef.addEventListener("change", () => {
  try { const s = JSON.parse(localStorage.getItem(KEY) || "{}"); s.addRef = g.addRef.checked; localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
});

// returning visitor who already unlocked
try {
  const s = JSON.parse(localStorage.getItem(KEY) || "null");
  if (s && typeof s.addRef === "boolean") g.addRef.checked = s.addRef;
  const p = s && parseInvite(s.link);
  if (p && p.ok) { g.input.value = p.link; unlock(p, true); }
} catch (e) {}
render();

window.__gate = {
  ok: () => !!unlocked,
  code: () => (unlocked ? unlocked.code : ""),
  // the link the post should carry: their own invite link when they opted in, else null
  shareLink: () => (unlocked && g.addRef.checked ? unlocked.link : null),
  parseInvite
};
})();
