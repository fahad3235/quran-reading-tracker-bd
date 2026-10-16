/* quran-reading-tracker-bd -- pure logic, no DOM, no network, ASCII only.
   All Bengali text is \uXXXX escapes (never raw non-ASCII). */
(function () {
  "use strict";

  var TOTAL_PAGES = 604;
  var JUZ_STARTS = [1, 22, 42, 62, 82, 102, 122, 142, 162, 182, 202, 222, 242, 262, 282, 302, 322, 342, 362, 382, 402, 422, 442, 462, 482, 502, 522, 542, 562, 582];
  var INTERVALS = [1, 3, 7, 14, 30];
  var STORAGE_KEY = "qrt-bd-v1";

  var SURAHS = [
    ["Fatiha", 7], ["Baqarah", 286], ["Aal-e-Imran", 200], ["Nisa", 176],
    ["Maidah", 120], ["Anam", 165], ["Araf", 206], ["Anfal", 75],
    ["Tawbah", 129], ["Yunus", 109], ["Hud", 123], ["Yusuf", 111],
    ["Rad", 43], ["Ibrahim", 52], ["Hijr", 99], ["Nahl", 128],
    ["Isra", 111], ["Kahf", 110], ["Maryam", 98], ["Taha", 135],
    ["Anbiya", 112], ["Hajj", 78], ["Muminun", 118], ["Nur", 64],
    ["Furqan", 77], ["Shuara", 227], ["Naml", 93], ["Qasas", 88],
    ["Ankabut", 69], ["Rum", 60], ["Luqman", 34], ["Sajdah", 30],
    ["Ahzab", 73], ["Saba", 54], ["Fatir", 45], ["Yasin", 83],
    ["Saffat", 182], ["Sad", 88], ["Zumar", 75], ["Ghafir", 85],
    ["Fussilat", 54], ["Shura", 53], ["Zukhruf", 89], ["Dukhan", 59],
    ["Jathiyah", 37], ["Ahqaf", 35], ["Muhammad", 38], ["Fath", 29],
    ["Hujurat", 18], ["Qaf", 45], ["Dhariyat", 60], ["Tur", 49],
    ["Najm", 62], ["Qamar", 55], ["Rahman", 78], ["Waqiah", 96],
    ["Hadid", 29], ["Mujadila", 22], ["Hashr", 24], ["Mumtahanah", 13],
    ["Saff", 14], ["Jumuah", 11], ["Munafiqun", 11], ["Taghabun", 18],
    ["Talaq", 12], ["Tahrim", 12], ["Mulk", 30], ["Qalam", 52],
    ["Haqqah", 52], ["Maarij", 44], ["Nuh", 28], ["Jinn", 28],
    ["Muzzammil", 20], ["Muddaththir", 56], ["Qiyamah", 40], ["Insan", 31],
    ["Mursalat", 50], ["Naba", 40], ["Naziat", 46], ["Abasa", 42],
    ["Takwir", 29], ["Infitar", 19], ["Mutaffifin", 36], ["Inshiqaq", 25],
    ["Buruj", 22], ["Tariq", 17], ["Ala", 19], ["Ghashiyah", 26],
    ["Fajr", 30], ["Balad", 20], ["Shams", 15], ["Layl", 21],
    ["Duha", 11], ["Sharh", 8], ["Tin", 8], ["Alaq", 19],
    ["Qadr", 5], ["Bayyinah", 8], ["Zalzalah", 8], ["Adiyat", 11],
    ["Qariah", 11], ["Takathur", 8], ["Asr", 3], ["Humazah", 9],
    ["Fil", 5], ["Quraysh", 4], ["Maun", 7], ["Kawthar", 3],
    ["Kafirun", 6], ["Nasr", 3], ["Masad", 5], ["Ikhlas", 4],
    ["Falaq", 5], ["Nas", 6]
  ];

  function isValidDateStr(s) {
    if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    var parts = s.split("-").map(Number);
    var d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    return d.getUTCFullYear() === parts[0] && d.getUTCMonth() === parts[1] - 1 && d.getUTCDate() === parts[2];
  }
  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function todayStr() {
    var d = new Date();
    return d.getUTCFullYear() + "-" + pad2(d.getUTCMonth() + 1) + "-" + pad2(d.getUTCDate());
  }
  function addDays(dateStr, n) {
    var p = dateStr.split("-").map(Number);
    var d = new Date(Date.UTC(p[0], p[1] - 1, p[2] + n));
    return d.getUTCFullYear() + "-" + pad2(d.getUTCMonth() + 1) + "-" + pad2(d.getUTCDate());
  }
  function daysBetween(a, b) {
    var pa = a.split("-").map(Number), pb = b.split("-").map(Number);
    var da = Date.UTC(pa[0], pa[1] - 1, pa[2]);
    var db = Date.UTC(pb[0], pb[1] - 1, pb[2]);
    return Math.round((db - da) / 86400000);
  }

  function juzRange(j) {
    var from = JUZ_STARTS[j - 1];
    var to = (j < 30) ? JUZ_STARTS[j] - 1 : TOTAL_PAGES;
    return { from: from, to: to, length: to - from + 1 };
  }
  function juzFromPage(p) {
    for (var j = 30; j >= 1; j--) { if (p >= JUZ_STARTS[j - 1]) return j; }
    return 1;
  }

  function isInt(v) { return typeof v === "number" && isFinite(v) && Math.floor(v) === v; }
  function validateLog(e, asof) {
    if (!e || typeof e !== "object") return "Entry must be an object.";
    if (!isValidDateStr(e.date)) return "Date must be YYYY-MM-DD.";
    if (asof && e.date > asof) return "Date cannot be in the future.";
    if (!isInt(e.juz) || e.juz < 1 || e.juz > 30) return "Juz must be 1-30.";
    if (!isInt(e.fromPage) || !isInt(e.toPage)) return "Pages must be whole numbers.";
    if (e.fromPage < 1 || e.toPage > TOTAL_PAGES) return "Pages must be within 1-604.";
    if (e.toPage < e.fromPage) return "To page must be >= from page.";
    var r = juzRange(e.juz);
    if (e.fromPage < r.from || e.fromPage > r.to) return "From page must lie in the chosen juz (juz " + e.juz + " is pages " + r.from + "-" + r.to + ").";
    if (typeof e.minutes !== "number" || !isFinite(e.minutes) || e.minutes < 0) return "Minutes must be >= 0.";
    if (e.note !== undefined && typeof e.note !== "string") return "Note must be text.";
    return null;
  }
  function validateHifz(e) {
    if (!e || typeof e !== "object") return "Entry must be an object.";
    if (!isInt(e.surah) || e.surah < 1 || e.surah > 114) return "Surah must be 1-114.";
    var total = SURAHS[e.surah - 1][1];
    if (!isInt(e.ayahFrom) || !isInt(e.ayahTo)) return "Ayah numbers must be whole numbers.";
    if (e.ayahFrom < 1) return "Ayah from must be >= 1.";
    if (e.ayahTo > total) return "Ayah to must be <= " + total + " for this surah.";
    if (e.ayahTo < e.ayahFrom) return "Ayah to must be >= ayah from.";
    if (["Memorizing", "Reviewing", "Memorized"].indexOf(e.status) === -1) return "Status must be Memorizing, Reviewing or Memorized.";
    if (!isInt(e.reviewCount) || e.reviewCount < 0) return "Review count must be >= 0.";
    if (!isValidDateStr(e.lastReviewDate)) return "Last review date must be YYYY-MM-DD.";
    return null;
  }

  function computeStats(logs, asof) {
    var totalPages = 0, totalMinutes = 0;
    var byDay = {};
    logs.forEach(function (e) {
      var pages = e.toPage - e.fromPage + 1;
      totalPages += pages;
      totalMinutes += e.minutes || 0;
      byDay[e.date] = (byDay[e.date] || 0) + pages;
    });
    var streak = 0;
    var cursor = asof;
    if (!byDay[cursor]) cursor = addDays(asof, -1);
    while (byDay[cursor]) { streak++; cursor = addDays(cursor, -1); }
    var dates = Object.keys(byDay).sort();
    var longest = 0, run = 0, prev = null;
    dates.forEach(function (d) {
      if (prev !== null && daysBetween(prev, d) === 1) run++;
      else run = 1;
      if (run > longest) longest = run;
      prev = d;
    });
    var series = [];
    for (var i = 6; i >= 0; i--) {
      var d = addDays(asof, -i);
      series.push({ date: d, pages: byDay[d] || 0 });
    }
    var sum7 = series.reduce(function (a, x) { return a + x.pages; }, 0);
    return {
      totalPages: totalPages, totalMinutes: totalMinutes,
      streak: streak, longestStreak: longest,
      avg7Pages: sum7 / 7, last7: series,
      overallPct: totalPages / TOTAL_PAGES * 100
    };
  }
  function juzProgress(logs, j) {
    var r = juzRange(j);
    var read = 0;
    logs.forEach(function (e) {
      var lo = Math.max(e.fromPage, r.from), hi = Math.min(e.toPage, r.to);
      if (hi >= lo) read += hi - lo + 1;
    });
    return { read: read, total: r.length, pct: read / r.length * 100 };
  }
  function currentPage(logs) {
    var m = 0;
    logs.forEach(function (e) { if (e.toPage > m) m = e.toPage; });
    return m;
  }
  function neededPerDay(pagesLeft, daysLeft) {
    if (daysLeft < 1) return null;
    return Math.ceil(pagesLeft / daysLeft);
  }
  function projectedFinish(asof, pagesLeft, pagesPerDay) {
    if (pagesPerDay < 1) return null;
    if (pagesLeft <= 0) return asof;
    return addDays(asof, Math.ceil(pagesLeft / pagesPerDay) - 1);
  }
  function nextReviewDate(lastReviewDate, reviewCount) {
    var idx = Math.min(reviewCount, INTERVALS.length - 1);
    return addDays(lastReviewDate, INTERVALS[idx]);
  }
  function dueHifz(hifz, asof) {
    return hifz.filter(function (e) { return nextReviewDate(e.lastReviewDate, e.reviewCount) <= asof; });
  }
  function exportData(state) {
    return JSON.stringify({ app: "quran-reading-tracker-bd", version: 1, logs: state.logs || [], hifz: state.hifz || [] }, null, 2);
  }
  function validateImport(obj, asof) {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return { ok: false, error: "Import must be a JSON object." };
    if (!Array.isArray(obj.logs) || !Array.isArray(obj.hifz)) return { ok: false, error: "Import must contain logs[] and hifz[] arrays." };
    for (var i = 0; i < obj.logs.length; i++) {
      var err = validateLog(obj.logs[i], asof);
      if (err) return { ok: false, error: "Log #" + (i + 1) + ": " + err };
    }
    for (var j = 0; j < obj.hifz.length; j++) {
      var herr = validateHifz(obj.hifz[j]);
      if (herr) return { ok: false, error: "Hifz #" + (j + 1) + ": " + herr };
    }
    return { ok: true, data: { logs: obj.logs, hifz: obj.hifz } };
  }
  function parseImport(text, asof) {
    var obj;
    try { obj = JSON.parse(text); } catch (e) { return { ok: false, error: "Not valid JSON." }; }
    return validateImport(obj, asof);
  }

  var BN_DIGITS = ["\u09e6", "\u09e7", "\u09e8", "\u09e9", "\u09ea", "\u09eb", "\u09ec", "\u09ed", "\u09ee", "\u09ef"];
  function toBnDigits(s) {
    return String(s).replace(/[0-9]/g, function (d) { return BN_DIGITS[Number(d)]; });
  }
  function fmtNum(n, lang) {
    return lang === "bn" ? toBnDigits(String(n)) : String(n);
  }
  function fmtPct(x, lang) {
    var s = (Math.round(x * 100) / 100).toFixed(2);
    return lang === "bn" ? toBnDigits(s) : s;
  }

  var I18N = {
    en: {
      appTitle: "Quran Reading Tracker",
      tagline: "Offline reading log, khatma planner and hifz tracker.",
      langBtn: "\u09ac\u09be\u0982\u09b2\u09be",
      tabDashboard: "Dashboard", tabLog: "Log", tabKhatma: "Khatma",
      tabHifz: "Hifz", tabData: "Data",
      totalPages: "Total pages read", totalMinutes: "Total minutes",
      streak: "Current streak (days)", longest: "Longest streak (days)",
      avg7: "Avg pages/day (last 7 days)", overall: "Overall progress",
      juzTitle: "Progress by juz", last7Title: "Last 7 days (pages)",
      juzLabel: "Juz", pagesLabel: "pages",
      logTitle: "Add reading entry", date: "Date", juz: "Juz",
      fromPage: "From page", toPage: "To page", minutes: "Minutes", note: "Note (optional)",
      addEntry: "Add entry", entriesTitle: "Entries (newest first)",
      noEntries: "No entries yet. Add your first reading above.",
      delete: "Delete", entrySaved: "Entry saved.", entryDeleted: "Entry deleted.",
      khatmaTitle: "Khatma planner", currentPage: "Current page",
      targetDate: "Target finish date", pagesPerDay: "Pages per day",
      calcByDate: "Compute pages/day", calcByPace: "Compute finish date",
      pagesLeft: "Pages left", needed: "Pages/day needed",
      projected: "Projected finish", onTrack: "On track", behind: "Behind pace",
      onTrackHint: "Your 7-day average covers the needed pace.",
      behindHint: "Your 7-day average is below the needed pace.",
      targetError: "Target date must be after today.",
      paceError: "Pages per day must be >= 1.",
      hifzTitle: "Add hifz entry", surah: "Surah", ayahFrom: "Ayah from",
      ayahTo: "Ayah to", status: "Status", reviewCount: "Review count",
      addHifz: "Add hifz entry", hifzSaved: "Hifz entry saved.",
      dueTitle: "Due today", noDue: "Nothing due today.",
      allTitle: "All hifz entries", memorized: "Memorized",
      markReviewed: "Mark reviewed", reviewed: "Marked reviewed. Next review: ",
      hifzDeleted: "Hifz entry deleted.",
      dataTitle: "Export / Import / Erase", exportBtn: "Download JSON export",
      importBtn: "Import JSON", importHint: "Paste exported JSON below, or choose a file.",
      importOk: "Import successful.", importFail: "Import failed: ",
      eraseTitle: "Erase all data", eraseHint: "Type DELETE to confirm wiping all logs and hifz entries.",
      eraseBtn: "Erase all data", erased: "All data erased.",
      eraseMismatch: "Type DELETE exactly to confirm.",
      chooseFile: "Choose file", noData: "No data to export.",
      noHifz: "No hifz entries yet.",
      disclaimer: "Personal offline tracker. Page numbering follows the 604-page Madani mushaf (adjust if your mushaf differs). This app is not a religious authority."
    },
    bn: {
      appTitle: "\u0995\u09c1\u09b0\u0986\u09a8 \u09aa\u09be\u09a0 \u099f\u09cd\u09b0\u09cd\u09af\u09be\u0995\u09be\u09b0",
      tagline: "\u0985\u09ab\u09bc\u09b2\u09be\u0987\u09a8 \u09aa\u09be\u09a0\u09c7\u09b0 \u09b2\u0997, \u0996\u09a4\u09ae\u09be \u09aa\u09b0\u09bf\u0995\u09b2\u09cd\u09aa\u09a8\u09be \u0993 \u09b9\u09bf\u09ab\u09bc\u099c \u099f\u09cd\u09b0\u09cd\u09af\u09be\u0995\u09be\u09b0\u0964",
      langBtn: "English",
      tabDashboard: "\u09a1\u09cd\u09af\u09be\u09b6\u09ac\u09cb\u09b0\u09cd\u09a1", tabLog: "\u09aa\u09be\u09a0\u09c7\u09b0 \u09b2\u0997", tabKhatma: "\u0996\u09a4\u09ae\u09be",
      tabHifz: "\u09b9\u09bf\u09ab\u09bc\u099c", tabData: "\u09a1\u09c7\u099f\u09be",
      totalPages: "\u09ae\u09cb\u099f \u09aa\u09a0\u09bf\u09a4 \u09aa\u09c3\u09b7\u09cd\u09a0\u09be", totalMinutes: "\u09ae\u09cb\u099f \u09ae\u09bf\u09a8\u09bf\u099f",
      streak: "\u09ac\u09b0\u09cd\u09a4\u09ae\u09be\u09a8 \u09a7\u09be\u09b0\u09be\u09ac\u09be\u09b9\u09bf\u0995\u09a4\u09be (\u09a6\u09bf\u09a8)", longest: "\u09b8\u09b0\u09cd\u09ac\u09cb\u099a\u09cd\u099a \u09a7\u09be\u09b0\u09be\u09ac\u09be\u09b9\u09bf\u0995\u09a4\u09be (\u09a6\u09bf\u09a8)",
      avg7: "\u0997\u09a1\u09bc \u09aa\u09c3\u09b7\u09cd\u09a0\u09be/\u09a6\u09bf\u09a8 (\u09b6\u09c7\u09b7 \u09ed \u09a6\u09bf\u09a8)", overall: "\u09b8\u09be\u09b0\u09cd\u09ac\u09bf\u0995 \u0985\u0997\u09cd\u09b0\u0997\u09a4\u09bf",
      juzTitle: "\u099c\u09c1\u099c \u0985\u09a8\u09c1\u09af\u09be\u09af\u09bc\u09c0 \u0985\u0997\u09cd\u09b0\u0997\u09a4\u09bf", last7Title: "\u09b6\u09c7\u09b7 \u09ed \u09a6\u09bf\u09a8 (\u09aa\u09c3\u09b7\u09cd\u09a0\u09be)",
      juzLabel: "\u099c\u09c1\u099c", pagesLabel: "\u09aa\u09c3\u09b7\u09cd\u09a0\u09be",
      logTitle: "\u09aa\u09be\u09a0\u09c7\u09b0 \u098f\u09a8\u09cd\u099f\u09cd\u09b0\u09bf \u09af\u09cb\u0997 \u0995\u09b0\u09c1\u09a8", date: "\u09a4\u09be\u09b0\u09bf\u0996", juz: "\u099c\u09c1\u099c",
      fromPage: "\u09b6\u09c1\u09b0\u09c1\u09b0 \u09aa\u09c3\u09b7\u09cd\u09a0\u09be", toPage: "\u09b6\u09c7\u09b7 \u09aa\u09c3\u09b7\u09cd\u09a0\u09be", minutes: "\u09ae\u09bf\u09a8\u09bf\u099f", note: "\u09a8\u09cb\u099f (\u0987\u099a\u09cd\u099b\u09be\u09ae\u09a4)",
      addEntry: "\u098f\u09a8\u09cd\u099f\u09cd\u09b0\u09bf \u09af\u09cb\u0997 \u0995\u09b0\u09c1\u09a8", entriesTitle: "\u098f\u09a8\u09cd\u099f\u09cd\u09b0\u09bf\u09b8\u09ae\u09c2\u09b9 (\u09a8\u09a4\u09c1\u09a8 \u0986\u0997\u09c7)",
      noEntries: "\u098f\u0996\u09a8\u09cb \u0995\u09cb\u09a8\u09cb \u098f\u09a8\u09cd\u099f\u09cd\u09b0\u09bf \u09a8\u09c7\u0987\u0964",
      delete: "\u09ae\u09c1\u099b\u09c1\u09a8", entrySaved: "\u098f\u09a8\u09cd\u099f\u09cd\u09b0\u09bf \u09b8\u0982\u09b0\u0995\u09cd\u09b7\u09bf\u09a4 \u09b9\u09af\u09bc\u09c7\u099b\u09c7\u0964", entryDeleted: "\u098f\u09a8\u09cd\u099f\u09cd\u09b0\u09bf \u09ae\u09c1\u099b\u09be \u09b9\u09af\u09bc\u09c7\u099b\u09c7\u0964",
      khatmaTitle: "\u0996\u09a4\u09ae\u09be \u09aa\u09b0\u09bf\u0995\u09b2\u09cd\u09aa\u09a8\u09be", currentPage: "\u09ac\u09b0\u09cd\u09a4\u09ae\u09be\u09a6 \u09aa\u09c3\u09b7\u09cd\u09a0\u09be",
      targetDate: "\u09b2\u0995\u09cd\u09b7\u09cd\u09af \u09b6\u09c7\u09b7 \u09a4\u09be\u09b0\u09bf\u0996", pagesPerDay: "\u09a6\u09bf\u09a8\u09c7 \u09aa\u09c3\u09b7\u09cd\u09a0\u09be",
      calcByDate: "\u09aa\u09c3\u09b7\u09cd\u09a0\u09be/\u09a6\u09bf\u09a8 \u09b9\u09bf\u09b8\u09be\u09ac \u0995\u09b0\u09c1\u09a8", calcByPace: "\u09b6\u09c7\u09b7 \u09a4\u09be\u09b0\u09bf\u0996 \u09b9\u09bf\u09b8\u09be\u09ac \u0995\u09b0\u09c1\u09a8",
      pagesLeft: "\u09ac\u09be\u0995\u09bf \u09aa\u09c3\u09b7\u09cd\u09a0\u09be", needed: "\u09aa\u09cd\u09b0\u09af\u09bc\u09cb\u099c\u09a8\u09c0\u09af\u09bc \u09aa\u09c3\u09b7\u09cd\u09a0\u09be/\u09a6\u09bf\u09a8",
      projected: "\u0986\u09a8\u09c1\u09ae\u09be\u09a8\u09bf\u0995 \u09b6\u09c7\u09b7 \u09a4\u09be\u09b0\u09bf\u0996", onTrack: "\u09b8\u09a0\u09bf\u0995 \u09aa\u09a5\u09c7 \u0986\u099b\u09c7", behind: "\u09aa\u09bf\u099b\u09bf\u09af\u09bc\u09c7 \u0986\u099b\u09c7",
      targetError: "\u09b2\u0995\u09cd\u09b7\u09cd\u09af \u09a4\u09be\u09b0\u09bf\u0996 \u0986\u099c\u09c7\u09b0 \u09aa\u09b0\u09c7 \u09b9\u09a4\u09c7 \u09b9\u09ac\u09c7\u0964",
      paceError: "\u09a6\u09bf\u09a8\u09c7 \u09aa\u09c3\u09b7\u09cd\u09a0\u09be \u09e7 \u09ac\u09be \u09a4\u09be\u09b0 \u09ac\u09c7\u09b6\u09bf \u09b9\u09a4\u09c7 \u09b9\u09ac\u09c7\u0964",
      hifzTitle: "\u09b9\u09bf\u09ab\u09bc\u099c \u098f\u09a8\u09cd\u099f\u09cd\u09b0\u09bf \u09af\u09cb\u0997 \u0995\u09b0\u09c1\u09a8", surah: "\u09b8\u09c2\u09b0\u09be", ayahFrom: "\u0986\u09af\u09bc\u09be\u09a4 \u09b6\u09c1\u09b0\u09c1",
      ayahTo: "\u0986\u09af\u09bc\u09be\u09a4 \u09b6\u09c7\u09b7", status: "\u0985\u09ac\u09b8\u09cd\u09a5\u09be", reviewCount: "\u09b0\u09bf\u09ad\u09bf\u0989 \u09b8\u0982\u0996\u09cd\u09af\u09be",
      addHifz: "\u09b9\u09bf\u09ab\u09bc\u099c \u098f\u09a8\u09cd\u099f\u09cd\u09b0\u09bf \u09af\u09cb\u0997 \u0995\u09b0\u09c1\u09a8", hifzSaved: "\u09b9\u09bf\u09ab\u09bc\u099c \u098f\u09a8\u09cd\u099f\u09cd\u09b0\u09bf \u09b8\u0982\u09b0\u0995\u09cd\u09b7\u09bf\u09a4 \u09b9\u09af\u09bc\u09c7\u099b\u09c7\u0964",
      dueTitle: "\u0986\u099c \u09b0\u09bf\u09ad\u09bf\u0989 \u09ac\u09be\u0995\u09bf", noDue: "\u0986\u099c \u09b0\u09bf\u09ad\u09bf\u0989\u09af\u09bc\u09c7\u09b0 \u0995\u09bf\u099b\u09c1 \u09a8\u09c7\u0987\u0964",
      allTitle: "\u09b8\u09ac \u09b9\u09bf\u09ab\u09bc\u099c \u098f\u09a8\u09cd\u099f\u09cd\u09b0\u09bf", memorized: "\u09ae\u09c1\u0996\u09b8\u09cd\u09a5\u09cd\u09a5",
      markReviewed: "\u09b0\u09bf\u09ad\u09bf\u0989 \u09b9\u09af\u09bc\u09c7\u099b\u09c7", reviewed: "\u09b0\u09bf\u09ad\u09bf\u0989 \u09b9\u09af\u09bc\u09c7\u099b\u09c7\u0964 \u09aa\u09b0\u09c7\u09b0 \u09b0\u09bf\u09ad\u09bf\u0989: ",
      hifzDeleted: "\u09b9\u09bf\u09ab\u09bc\u099c \u098f\u09a8\u09cd\u099f\u09cd\u09b0\u09bf \u09ae\u09c1\u099b\u09be \u09b9\u09af\u09bc\u09c7\u099b\u09c7\u0964",
      dataTitle: "\u098f\u0995\u09cd\u09b8\u09aa\u09cb\u09b0\u09cd\u099f / \u0987\u09ae\u09aa\u09cb\u09b0\u09cd\u099f / \u09ae\u09c1\u099b\u09c1\u09a8", exportBtn: "JSON \u098f\u0995\u09cd\u09b8\u09aa\u09cb\u09b0\u09cd\u099f \u09a1\u09be\u0989\u09a8\u09b2\u09cb\u09a1 \u0995\u09b0\u09c1\u09a8",
      importBtn: "JSON \u0987\u09ae\u09aa\u09cb\u09b0\u09cd\u099f \u0995\u09b0\u09c1\u09a8", importHint: "\u09a8\u09bf\u099a\u09c7 \u098f\u0995\u09cd\u09b8\u09aa\u09cb\u09b0\u09cd\u099f \u0995\u09c3\u09a4 JSON \u09aa\u09c7\u09b8\u09cd\u099f \u0995\u09b0\u09c1\u09a8 \u09ac\u09be \u09ab\u09be\u0987\u09b2 \u09a8\u09bf\u09b0\u09cd\u09ac\u09be\u099a\u09a8 \u0995\u09b0\u09c1\u09a8\u0964",
      importOk: "\u0987\u09ae\u09aa\u09cb\u09b0\u09cd\u099f \u09b8\u09ab\u09b2 \u09b9\u09af\u09bc\u09c7\u099b\u09c7\u0964", importFail: "\u0987\u09ae\u09aa\u09cb\u09b0\u09cd\u099f \u09ac\u09cd\u09af\u09b0\u09cd\u09a5 \u09b9\u09af\u09bc\u09c7\u099b\u09c7: ",
      eraseTitle: "\u09b8\u09ac \u09a1\u09c7\u099f\u09be \u09ae\u09c1\u099b\u09c1\u09a8", eraseHint: "\u09a8\u09bf\u09b6\u09cd\u099a\u09bf\u09a4 \u0995\u09b0\u09a4\u09c7 DELETE \u099f\u09be\u0987\u09aa \u0995\u09b0\u09c1\u09a8\u0964",
      eraseBtn: "\u09b8\u09ac \u09a1\u09c7\u099f\u09be \u09ae\u09c1\u099b\u09c1\u09a8", erased: "\u09b8\u09ac \u09a1\u09c7\u099f\u09be \u09ae\u09c1\u099b\u09be \u09b9\u09af\u09bc\u09c7\u099b\u09c7\u0964",
      eraseMismatch: "DELETE \u09b9\u09c1\u09ac\u09b9\u09c1 \u099f\u09be\u0987\u09aa \u0995\u09b0\u09c1\u09a8\u0964",
      chooseFile: "\u09ab\u09be\u0987\u09b2 \u09a8\u09bf\u09b0\u09cd\u09ac\u09be\u099a\u09a8 \u0995\u09b0\u09c1\u09a8", noData: "\u098f\u0995\u09cd\u09b8\u09aa\u09cb\u09b0\u09cd\u099f \u0995\u09b0\u09be\u09b0 \u09ae\u09a4\u09cb \u09a1\u09c7\u099f\u09be \u09a8\u09c7\u0987\u0964",
      noHifz: "\u098f\u0996\u09a8\u09cb \u0995\u09cb\u09a8\u09cb \u09b9\u09bf\u09ab\u09bc\u099c \u098f\u09a8\u09cd\u099f\u09cd\u09b0\u09bf \u09a8\u09c7\u0987\u0964",
      disclaimer: "\u09ac\u09cd\u09af\u0995\u09cd\u09a4\u09bf\u0997\u09a4 \u0985\u09ab\u09bc\u09b2\u09be\u0987\u09a8 \u099f\u09cd\u09b0\u09cd\u09af\u09be\u0995\u09be\u09b0\u0964 \u09aa\u09c3\u09b7\u09cd\u09a0\u09be \u09b8\u0982\u0996\u09cd\u09af\u09be \u09ec\u09cd\u09af\u09ac\u09b9\u09be\u09b0 \u09e6\u09e6\u09ea-\u09aa\u09c3\u09b7\u09cd\u09a0\u09be\u09b0 \u09ae\u09be\u09a6\u09be\u09a8\u09bf \u09ae\u09c1\u09b8\u09b9\u09be\u09ab \u0985\u09a8\u09c1\u09b8\u09be\u09b0\u09c7\u0964 \u098f\u099f\u09bf \u0995\u09cb\u09a8\u09cb \u09a7\u09b0\u09cd\u09ae\u09c0\u09af\u09bc \u0995\u09b0\u09cd\u09a4\u09c3\u09aa\u0995\u09cd\u09b7 \u09a8\u09af\u09bc\u0964"
    }
  };
  function t(key, lang) {
    var l = lang || "en";
    if (I18N[l] && I18N[l][key] !== undefined) return I18N[l][key];
    return I18N.en[key] || key;
  }

  var api = {
    TOTAL_PAGES: TOTAL_PAGES, JUZ_STARTS: JUZ_STARTS, SURAHS: SURAHS,
    INTERVALS: INTERVALS, STORAGE_KEY: STORAGE_KEY, I18N: I18N,
    isValidDateStr: isValidDateStr, todayStr: todayStr, addDays: addDays,
    daysBetween: daysBetween, juzRange: juzRange, juzFromPage: juzFromPage,
    validateLog: validateLog, validateHifz: validateHifz,
    computeStats: computeStats, juzProgress: juzProgress, currentPage: currentPage,
    neededPerDay: neededPerDay, projectedFinish: projectedFinish,
    nextReviewDate: nextReviewDate, dueHifz: dueHifz,
    exportData: exportData, validateImport: validateImport, parseImport: parseImport,
    toBnDigits: toBnDigits, fmtNum: fmtNum, fmtPct: fmtPct, t: t
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.QRT = api;
})();
