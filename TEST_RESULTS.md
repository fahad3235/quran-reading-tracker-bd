# TEST_RESULTS.md -- quran-reading-tracker-bd

Recorded 2026-10-16 (run #69, 09:00 slot). All numbers from real test runs;
nothing invented.

## Unit tests

Command: `node --test tests/unit.test.mjs`
Result: **11 passed, 0 failed** (11 tests).

Coverage:
- Surah table: 114 surahs, ayah counts sum to exactly 6236; Fatiha 7,
  Baqarah 286, Nas 6 spot-checked.
- juzFromPage boundaries: 1->1, 21->1, 22->2, 42->3, 302->16, 581->29,
  582->30, 604->30.
- juzRange: juz 1 = 1-21 (21 pages), juz 2 = 22-41 (20), juz 30 = 582-604 (23).
- Khatma math: neededPerDay(100,10)=10; neededPerDay(101,10)=11 (ceil);
  projectedFinish(2026-10-16, 100, 10)=2026-10-25; (101,10)=2026-10-26;
  pace 0 -> null; 0 pages left -> asof.
- Streak math: 3 consecutive days -> 3; gap (14th + 16th) -> 1;
  yesterday-alive (14th + 15th, asof 16th) -> 2; today-only -> 1; none -> 0;
  longest streak across two runs -> 2.
- Dashboard: log 1-20 pages -> totalPages 20, overallPct 20/604*100;
  juz 1 progress read 20/21 (95.238...%); boundary-spanning entry 15-25
  counts 7 pages in juz 1 and 4 in juz 2.
- Hifz intervals from 2026-10-01: reviewCount 0->10-02, 1->10-04, 2->10-08,
  3->10-15, 4->10-31, 5->10-31 (capped), 99->10-31.
- Validation rejections: toPage<fromPage, page 0, page 605, from-page outside
  chosen juz, future date, bad date, juz 31, negative minutes; hifz ayahTo >
  surah total (Fatiha 8), ayahFrom 0, ayahTo<ayahFrom, surah 115, bad status,
  negative review count.
- Bengali digits: toBnDigits("0123456789") -> Bengali 0-9; fmtNum(20,"bn") -> Bengali 20.
- Import: 14 malformed inputs rejected (non-JSON, array, {}, wrong-typed
  arrays, 5 bad logs, 3 bad hifz, null); valid export/import round-trip
  restores logs + hifz exactly; failed import leaves caller data untouched.

## Smoke tests (headless Chrome, raw CDP)

Command: `node tests/smoke.mjs`
Result: **44 checks passed, 0 failed**. Console errors: 0. Page errors: 0.
Network requests: 0.

Verified end-to-end with `?asof=2026-10-16`:
- Boot empty: EN title, Bangla toggle button, 5 tabs, 30 juz tiles, empty
  log/hifz messages.
- Add log (juz 1, pages 1-20, 30 min) -> total 20, minutes 30, streak 1,
  overall 3.31%, 7-day avg 2.9, juz-1 tile 95.24%, 1 list row.
- Invalid log (from-page 22 in juz 1) rejected with juz message; future date
  rejected; totals unchanged (20).
- Khatma: target 2026-10-26 -> needed 59 pages/day (584 left / 10 days),
  Behind pace; pace 10/day -> projected finish 2026-12-13.
- Hifz: Fatiha 1-7 Memorizing added, due count 0; Mark reviewed ->
  next review 2026-10-19 (+3 days at reviewCount 1).
- Bangla toggle: h1 matches BN title, totals render in Bengali digits;
  language + data persist across reload.
- Export/import API round-trip ok; malformed hifz import rejected.
- Typed-DELETE erase -> total back to 0 (Bengali digit).
- 390px viewport: document scrollWidth <= 390 (no horizontal overflow).

## Repairs

- 1 pre-run fix (not a test failure): corrected a hand-computed smoke
  expectation for projected finish (2026-12-12 -> 2026-12-13, verified with
  `date -d`) before the first smoke run. No repair cycles consumed:
  unit 11/11 and smoke 44/44 passed on first full runs.

## Hygiene

- Pure-ASCII check: `grep -rP '[^\x00-\x7F]'` over *.html/*.js/*.css/*.md
  returns zero matches (all Bengali is \uXXXX escapes).
- Total source: 70,525 bytes (< 120KB target).
- No secrets, no network requests at runtime, ships empty.
