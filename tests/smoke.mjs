/* quran-reading-tracker-bd -- headless-Chrome smoke tests via raw CDP.
   Run: node tests/smoke.mjs
   Scenario (asof=2026-10-16): boot empty, add-log flow with exact dashboard
   numbers, invalid log rejected, khatma math, hifz add + mark-reviewed,
   BN toggle + Bengali digits + reload persistence, export/import round-trip,
   typed-DELETE erase, 390px no-overflow, 0 console errors, 0 network reqs. */
import { launchChrome, waitPort, newPage, CDP, sleep, waitFor } from "./cdp.mjs";

const PORT = 9500 + (process.pid % 100);
const PROFILE = "/tmp/qrt-smoke-profile-" + process.pid;
const APP = "file:///home/hatch/workspace/muse-project-factory/builds/quran-reading-tracker-bd/index.html?asof=2026-10-16";

let pass = 0, fail = 0;
function eq(name, actual, expected) {
  if (actual === expected) pass++;
  else { fail++; console.log("FAIL", name, "| actual:", JSON.stringify(actual), "| expected:", JSON.stringify(expected)); }
}
function ok(name, cond) { if (cond) pass++; else { fail++; console.log("FAIL", name); } }
function contains(name, hay, needle) { ok(name, typeof hay === "string" && hay.includes(needle)); }
const J = (v) => JSON.stringify(v);

const chrome = launchChrome(PORT, PROFILE);
try {
  await waitPort(PORT);
  const target = await newPage(PORT, APP);
  const cdp = new CDP(target.webSocketDebuggerUrl);
  await cdp.connect();

  const consoleErrors = [], pageErrors = [], netReqs = [];
  cdp.on("Runtime.consoleAPICalled", (p) => {
    if (p.type === "error") consoleErrors.push(p.args.map(a => a.value || a.description || "").join(" "));
  });
  cdp.on("Runtime.exceptionThrown", (p) => pageErrors.push(JSON.stringify(p.exceptionDetails).slice(0, 300)));
  cdp.on("Log.entryAdded", (p) => { if (p.entry && p.entry.level === "error") consoleErrors.push(p.entry.text); });
  cdp.on("Network.requestWillBeSent", (p) => {
    if (p.request && p.request.url && !p.request.url.startsWith("file:") && !p.request.url.startsWith("data:") && !p.request.url.startsWith("blob:")) netReqs.push(p.request.url);
  });
  await cdp.send("Runtime.enable");
  await cdp.send("Page.enable");
  await cdp.send("Log.enable");
  await cdp.send("Network.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });

  await waitFor(cdp, "window.__QRT_READY === true");
  const ev = (js) => cdp.eval(js);
  async function click(sel) {
    const done = await ev("(function(){var e=document.querySelector(" + J(sel) + "); if(!e) return false; e.click(); return true;})()");
    if (!done) throw new Error("click target missing: " + sel);
    await sleep(250);
  }
  async function setVal(id, val) { await ev("document.getElementById(" + J(id) + ").value = " + J(val) + ";"); }
  async function text(id) { return await ev("document.getElementById(" + J(id) + ").textContent.trim()"); }

  // 1. boot + empty states
  eq("asof honored", await ev("window.__QRT.asof"), "2026-10-16");
  eq("h1 EN", await ev("document.querySelector('h1').textContent"), "Quran Reading Tracker");
  eq("langBtn shows Bangla word", await text("langBtn"), "\u09ac\u09be\u0982\u09b2\u09be");
  eq("5 tabs present", await ev("document.querySelectorAll('.tab').length"), 5);
  eq("total pages 0", await text("statTotalPages"), "0");
  eq("streak 0", await text("statStreak"), "0");
  eq("30 juz tiles", await ev("document.querySelectorAll('.juz-tile').length"), 30);
  contains("log empty msg", await ev("document.getElementById('logList').textContent"), "No entries yet");
  contains("hifz empty msg", await ev("document.getElementById('hifzList').textContent"), "No hifz entries yet");

  // 2. add log: juz 1, pages 1-20, 30 min
  await setVal("logDate", "2026-10-16");
  await setVal("logJuz", "1");
  await setVal("logFrom", "1");
  await setVal("logTo", "20");
  await setVal("logMinutes", "30");
  await click("#logForm button[type=submit]");
  eq("log saved msg", await text("logMsg"), "Entry saved.");
  eq("total pages 20", await text("statTotalPages"), "20");
  eq("total minutes 30", await text("statTotalMinutes"), "30");
  eq("streak 1", await text("statStreak"), "1");
  eq("overall pct 3.31%", await text("statOverallPct"), "3.31%");
  eq("avg7 2.9", await text("statAvg7"), "2.9");
  eq("juz 1 tile pct", await ev("document.querySelectorAll('.juz-tile')[0].textContent.includes('95.24%')"), true);
  eq("log list rows 1", await ev("document.querySelectorAll('#logList tbody tr').length"), 1);

  // 3. invalid log rejected: from page outside chosen juz (juz 1, from 22)
  await setVal("logDate", "2026-10-16");
  await setVal("logJuz", "1");
  await setVal("logFrom", "22");
  await setVal("logTo", "30");
  await click("#logForm button[type=submit]");
  contains("juz mismatch error", await text("logMsg"), "must lie in the chosen juz");
  eq("total still 20 after invalid", await text("statTotalPages"), "20");

  // 4. invalid log rejected: future date
  await setVal("logDate", "2026-10-17");
  await setVal("logJuz", "1");
  await setVal("logFrom", "1");
  await setVal("logTo", "5");
  await click("#logForm button[type=submit]");
  contains("future date error", await text("logMsg"), "future");
  eq("total still 20 after future", await text("statTotalPages"), "20");

  // 5. khatma: target 2026-10-26 -> 584 left / 10 days = 59/day
  await setVal("khTarget", "2026-10-26");
  await click("#khByDateBtn");
  eq("khatma needed dataset", await ev("document.getElementById('khResult').dataset.needed"), "59");
  contains("khatma needed text", await text("khResult"), "59");
  contains("khatma behind", await text("khOnTrack"), "Behind pace");
  // khatma by pace: 10/day -> finish 2026-12-13 (584 pages: ceil(584/10)=59 days, +58)
  await setVal("khPace", "10");
  await click("#khByPaceBtn");
  eq("khatma projected finish", await ev("document.getElementById('khResult').dataset.finish"), "2026-12-13");
  contains("khatma projected text", await text("khResult"), "2026-12-13");

  // 6. hifz: Fatiha 1-7 Memorizing, then mark reviewed
  await ev("document.querySelector('[data-tab=hifz]').click();");
  await sleep(200);
  await setVal("hSurah", "1");
  await setVal("hFrom", "1");
  await setVal("hTo", "7");
  await setVal("hStatus", "Memorizing");
  await setVal("hReviews", "0");
  await click("#hifzForm button[type=submit]");
  eq("hifz saved msg", await text("hifzMsg"), "Hifz entry saved.");
  eq("due count 0 (next review tomorrow)", await text("hifzDueCount"), "0");
  eq("memorized 0", await text("hifzMemorized"), "0");
  eq("hifz rows 1", await ev("document.querySelectorAll('#hifzList tbody tr').length"), 1);
  await click("#hifzList .review-hifz");
  contains("reviewed msg", await text("hifzMsg"), "2026-10-19"); // +3 days at reviewCount 1
  eq("review count now 1", await ev("document.querySelector('#hifzList tbody tr').textContent.includes('2026-10-19')"), true);

  // 7. BN toggle + Bengali digits + reload persistence
  await click("#langBtn");
  eq("h1 BN", await ev("document.querySelector('h1').textContent"), await ev("window.__QRT.I18N.bn.appTitle"));
  eq("total pages BN digits", await text("statTotalPages"), "\u09e8\u09e6");
  await cdp.send("Page.navigate", { url: APP });
  await waitFor(cdp, "window.__QRT_READY === true");
  eq("BN persists after reload", await ev("document.querySelector('h1').textContent"), await ev("window.__QRT.I18N.bn.appTitle"));
  eq("logs persist after reload", await text("statTotalPages"), "\u09e8\u09e6");

  // 8. export/import round-trip + malformed rejected (via exposed API)
  eq("export/import round-trip", await ev("window.__QRT.parseImport(window.__QRT.exportData(window.__QRT.state), '2026-10-16').ok"), true);
  eq("malformed import rejected", await ev("window.__QRT.parseImport('{\"logs\": [], \"hifz\": [{\"surah\":1,\"ayahFrom\":1,\"ayahTo\":8,\"status\":\"Memorized\",\"reviewCount\":0,\"lastReviewDate\":\"2026-10-16\"}]}', '2026-10-16').ok"), false);

  // 9. typed-DELETE erase
  await ev("document.querySelector('[data-tab=data]').click();");
  await sleep(200);
  await setVal("eraseInput", "DELETE");
  await click("#eraseBtn");
  eq("erase msg", await text("eraseMsg"), await ev("window.__QRT.I18N.bn.erased"));
  await ev("document.querySelector('[data-tab=dashboard]').click();");
  await sleep(200);
  eq("total 0 after erase (BN digit)", await text("statTotalPages"), "\u09e6");

  // 10. 390px mobile no-overflow
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await sleep(300);
  eq("390px no horizontal overflow", await ev("document.documentElement.scrollWidth <= 390"), true);

  // 11. hygiene
  eq("0 console errors", consoleErrors.length, 0);
  eq("0 page errors", pageErrors.length, 0);
  eq("0 network requests", netReqs.length, 0);

  console.log("\n" + pass + " smoke checks passed, " + fail + " failed");
  if (fail) process.exitCode = 1;
} finally {
  try { chrome.kill(); } catch (e) {}
}
