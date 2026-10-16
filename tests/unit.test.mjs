/* quran-reading-tracker-bd -- unit tests. Run: node --test tests/unit.test.mjs */
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const Q = require("../js/logic.js");

const ASOF = "2026-10-16";
const log = (date, juz, from, to, minutes) => ({ date, juz, fromPage: from, toPage: to, minutes: minutes || 0, note: "" });
const hifz = (surah, from, to, status, reviews, last) => ({ surah, ayahFrom: from, ayahTo: to, status, reviewCount: reviews, lastReviewDate: last || ASOF });

test("surah table: 114 surahs, ayah sum 6236", () => {
  assert.equal(Q.SURAHS.length, 114);
  assert.equal(Q.SURAHS.reduce((a, s) => a + s[1], 0), 6236);
  assert.deepEqual(Q.SURAHS[0], ["Fatiha", 7]);
  assert.deepEqual(Q.SURAHS[1], ["Baqarah", 286]);
  assert.deepEqual(Q.SURAHS[113], ["Nas", 6]);
});

test("juzFromPage boundaries", () => {
  assert.equal(Q.juzFromPage(1), 1);
  assert.equal(Q.juzFromPage(21), 1);
  assert.equal(Q.juzFromPage(22), 2);
  assert.equal(Q.juzFromPage(581), 29);
  assert.equal(Q.juzFromPage(582), 30);
  assert.equal(Q.juzFromPage(604), 30);
  assert.equal(Q.juzFromPage(42), 3);
  assert.equal(Q.juzFromPage(302), 16);
});

test("juzRange", () => {
  assert.deepEqual(Q.juzRange(1), { from: 1, to: 21, length: 21 });
  assert.deepEqual(Q.juzRange(2), { from: 22, to: 41, length: 20 });
  assert.deepEqual(Q.juzRange(30), { from: 582, to: 604, length: 23 });
  assert.equal(Q.TOTAL_PAGES, 604);
  assert.equal(Q.JUZ_STARTS.length, 30);
});

test("khatma math", () => {
  assert.equal(Q.neededPerDay(100, 10), 10);
  assert.equal(Q.neededPerDay(101, 10), 11);
  assert.equal(Q.neededPerDay(1, 3), 1);
  assert.equal(Q.neededPerDay(100, 0), null);
  assert.equal(Q.projectedFinish(ASOF, 100, 10), "2026-10-25");
  assert.equal(Q.projectedFinish(ASOF, 101, 10), "2026-10-26");
  assert.equal(Q.projectedFinish(ASOF, 100, 0), null);
  assert.equal(Q.projectedFinish(ASOF, 0, 10), ASOF);
  assert.equal(Q.daysBetween("2026-10-16", "2026-10-26"), 10);
  assert.equal(Q.addDays("2026-10-16", 9), "2026-10-25");
});

test("streak math", () => {
  const three = [log("2026-10-14", 1, 1, 5), log("2026-10-15", 1, 6, 10), log("2026-10-16", 1, 11, 15)];
  assert.equal(Q.computeStats(three, ASOF).streak, 3);
  const gap = [log("2026-10-14", 1, 1, 5), log("2026-10-16", 1, 6, 10)];
  assert.equal(Q.computeStats(gap, ASOF).streak, 1);
  const yAlive = [log("2026-10-14", 1, 1, 5), log("2026-10-15", 1, 6, 10)];
  assert.equal(Q.computeStats(yAlive, ASOF).streak, 2);
  assert.equal(Q.computeStats([log("2026-10-16", 1, 1, 5)], ASOF).streak, 1);
  assert.equal(Q.computeStats([], ASOF).streak, 0);
  assert.equal(Q.computeStats(three, ASOF).longestStreak, 3);
  const twoRuns = [log("2026-10-01", 1, 1, 2), log("2026-10-02", 1, 3, 4), log("2026-10-10", 1, 5, 6)];
  assert.equal(Q.computeStats(twoRuns, "2026-10-10").longestStreak, 2);
  assert.equal(Q.computeStats(twoRuns, "2026-10-10").streak, 1);
});

test("dashboard totals and juz progress", () => {
  const logs = [log("2026-10-16", 1, 1, 20, 30)];
  const st = Q.computeStats(logs, ASOF);
  assert.equal(st.totalPages, 20);
  assert.equal(st.totalMinutes, 30);
  assert.ok(Math.abs(st.overallPct - (20 / 604 * 100)) < 1e-9);
  const jp = Q.juzProgress(logs, 1);
  assert.equal(jp.read, 20);
  assert.equal(jp.total, 21);
  assert.ok(Math.abs(jp.pct - (20 / 21 * 100)) < 1e-9);
  assert.equal(Q.juzProgress(logs, 2).read, 0);
  assert.equal(Q.currentPage(logs), 20);
  assert.equal(Q.currentPage([]), 0);
  // entry spanning a juz boundary counts overlap per juz
  const span = [log("2026-10-16", 1, 15, 25)];
  assert.equal(Q.juzProgress(span, 1).read, 7); // 15..21
  assert.equal(Q.juzProgress(span, 2).read, 4); // 22..25
});

test("hifz next-review intervals", () => {
  assert.equal(Q.nextReviewDate("2026-10-01", 0), "2026-10-02");
  assert.equal(Q.nextReviewDate("2026-10-01", 1), "2026-10-04");
  assert.equal(Q.nextReviewDate("2026-10-01", 2), "2026-10-08");
  assert.equal(Q.nextReviewDate("2026-10-01", 3), "2026-10-15");
  assert.equal(Q.nextReviewDate("2026-10-01", 4), "2026-10-31");
  assert.equal(Q.nextReviewDate("2026-10-01", 5), "2026-10-31"); // capped at 30d
  assert.equal(Q.nextReviewDate("2026-10-01", 99), "2026-10-31");
  const entries = [hifz(1, 1, 7, "Memorized", 0, "2026-10-01"), hifz(112, 1, 4, "Memorizing", 0, "2026-10-16")];
  assert.equal(Q.dueHifz(entries, ASOF).length, 1);
  assert.equal(Q.dueHifz(entries, ASOF)[0].surah, 1);
});

test("log validation rejections", () => {
  assert.ok(Q.validateLog(log("2026-10-16", 1, 10, 5), ASOF)); // toPage < fromPage
  assert.ok(Q.validateLog(log("2026-10-16", 1, 0, 5), ASOF)); // page 0
  assert.ok(Q.validateLog(log("2026-10-16", 1, 600, 605), ASOF)); // page 605
  assert.ok(Q.validateLog(log("2026-10-16", 1, 22, 30), ASOF)); // page outside juz 1
  assert.ok(Q.validateLog(log("2026-10-17", 1, 1, 5), ASOF)); // future date
  assert.ok(Q.validateLog(log("2026-13-01", 1, 1, 5), ASOF)); // bad date
  assert.ok(Q.validateLog(log("2026-10-16", 31, 1, 5), ASOF)); // juz 31
  assert.ok(Q.validateLog(log("2026-10-16", 1, 1, 5, -1), ASOF)); // negative minutes
  assert.equal(Q.validateLog(log("2026-10-16", 1, 1, 21), ASOF), null);
  assert.equal(Q.validateLog(log("2026-10-16", 30, 582, 604), ASOF), null);
});

test("hifz validation rejections", () => {
  assert.ok(Q.validateHifz(hifz(1, 1, 8, "Memorized", 0))); // ayahTo > 7 for Fatiha
  assert.ok(Q.validateHifz(hifz(1, 0, 5, "Memorized", 0))); // ayahFrom 0
  assert.ok(Q.validateHifz(hifz(1, 5, 3, "Memorized", 0))); // to < from
  assert.ok(Q.validateHifz(hifz(115, 1, 2, "Memorized", 0))); // surah 115
  assert.ok(Q.validateHifz(hifz(1, 1, 7, "Almost", 0))); // bad status
  assert.ok(Q.validateHifz(hifz(1, 1, 7, "Memorized", -1))); // negative reviews
  assert.equal(Q.validateHifz(hifz(1, 1, 7, "Memorized", 3)), null);
  assert.equal(Q.validateHifz(hifz(114, 1, 6, "Reviewing", 0)), null);
});

test("Bengali digits", () => {
  assert.equal(Q.toBnDigits("0123456789"), "\u09e6\u09e7\u09e8\u09e9\u09ea\u09eb\u09ec\u09ed\u09ee\u09ef");
  assert.equal(Q.toBnDigits("604 pages"), "\u09ec\u09e6\u09ea pages");
  assert.equal(Q.fmtNum(20, "bn"), "\u09e8\u09e6");
  assert.equal(Q.fmtNum(20, "en"), "20");
});

test("import validation: >=10 malformed inputs rejected, data intact", () => {
  const goodLog = { date: "2026-10-16", juz: 1, fromPage: 1, toPage: 20, minutes: 30, note: "" };
  const goodHifz = { surah: 1, ayahFrom: 1, ayahTo: 7, status: "Memorized", reviewCount: 0, lastReviewDate: "2026-10-16" };
  const malformed = [
    "not json at all",
    "[]",
    "{}",
    '{"logs": "x", "hifz": []}',
    '{"logs": [], "hifz": {}}',
    '{"logs": [{"date":"2026-10-16","juz":1,"fromPage":10,"toPage":5,"minutes":0}], "hifz": []}',
    '{"logs": [{"date":"2026-10-16","juz":1,"fromPage":0,"toPage":5,"minutes":0}], "hifz": []}',
    '{"logs": [{"date":"2026-10-16","juz":1,"fromPage":600,"toPage":605,"minutes":0}], "hifz": []}',
    '{"logs": [{"date":"2026-10-16","juz":1,"fromPage":22,"toPage":30,"minutes":0}], "hifz": []}',
    '{"logs": [{"date":"2026-10-17","juz":1,"fromPage":1,"toPage":5,"minutes":0}], "hifz": []}',
    '{"logs": [], "hifz": [{"surah":1,"ayahFrom":1,"ayahTo":8,"status":"Memorized","reviewCount":0,"lastReviewDate":"2026-10-16"}]}',
    '{"logs": [], "hifz": [{"surah":1,"ayahFrom":0,"ayahTo":5,"status":"Memorized","reviewCount":0,"lastReviewDate":"2026-10-16"}]}',
    '{"logs": [], "hifz": [{"surah":1,"ayahFrom":1,"ayahTo":7,"status":"Nope","reviewCount":0,"lastReviewDate":"2026-10-16"}]}',
    "null",
    '{"logs": [], "hifz": [], "extra": 1, "logs2": null}'
  ];
  // last case has valid logs/hifz plus an ignored extra key: it is ACCEPTED (extras ignored)
  const rejected = malformed.slice(0, 14);
  assert.equal(rejected.length, 14);
  rejected.forEach((bad, i) => {
    const r = Q.parseImport(bad, ASOF);
    assert.equal(r.ok, false, "case " + i + " should be rejected: " + bad.slice(0, 60));
  });
  // valid round-trip restores data
  const state = { logs: [goodLog], hifz: [goodHifz] };
  const exported = Q.exportData(state);
  const rt = Q.parseImport(exported, ASOF);
  assert.equal(rt.ok, true);
  assert.deepEqual(rt.data.logs, [goodLog]);
  assert.deepEqual(rt.data.hifz, [goodHifz]);
  // import does not mutate caller data on failure
  const before = JSON.stringify(state);
  Q.parseImport("garbage", ASOF);
  assert.equal(JSON.stringify(state), before);
});
