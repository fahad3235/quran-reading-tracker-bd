# Quran Reading Tracker BD

An offline, bilingual (English / Bangla) Quran reading log, khatma planner, and
hifz (memorization) tracker. Everything runs in the browser with zero network
requests; all data stays in `localStorage` on your own device. Ships empty --
no demo logs, no sample data.

## Problem

Keeping a consistent Quran reading habit is hard without a simple record:
which pages were read, how the streak is going, when a khatma will finish at
the current pace, and which memorized portions are due for review. Existing
apps are often account-gated, ad-supported, or online-only. This tracker is
the opposite: open `index.html`, log pages, and it just works -- offline.

## Features

- **Dashboard** -- total pages and minutes read, current streak (with the
  yesterday-alive rule: a streak survives if yesterday has an entry), longest
  streak, 7-day average pages/day, 7-day SVG bar chart, 30 juz tiles showing
  % read per juz, and overall % of the 604-page mushaf.
- **Reading log** -- add entries with date, juz (1-30), from/to page,
  minutes, and an optional note. Validation: `toPage >= fromPage`, pages
  within 1-604, from-page must lie inside the chosen juz, no future dates.
  Entries list newest-first with delete. No edit (delete + re-add instead).
- **Khatma planner** -- current page = max `toPage` across entries. Enter a
  target date to get pages/day needed, or a pages/day pace to get a
  projected finish date. Shows pages left, progress, current juz, and an
  on-track indicator comparing your 7-day average against the needed pace.
- **Hifz tracker** -- add surah (1-114 dropdown), ayah range, status
  (Memorizing / Reviewing / Memorized), and review count. Ayah range is
  validated against the real ayah count of the chosen surah. Next-review
  dates follow spaced intervals [1, 3, 7, 14, 30] days, capped at 30.
  "Mark reviewed" bumps the count and recomputes the next review; a
  "Due today" section lists entries due for review; memorized count shown.
- **Data** -- JSON export (download), import from file or pasted text with
  strict re-validation of every entry (malformed imports are rejected with
  existing data untouched), and typed-DELETE erase-all.
- **Bilingual** -- EN / Bangla toggle persisted in `localStorage`; Bangla
  mode renders Bengali digits throughout.

## Stack

Vanilla HTML / CSS / JavaScript. No frameworks, no build step, no backend,
no network requests at runtime.

## Prerequisites

Any modern browser. Node.js (18+) only if you want to run the tests.

## Install / run

Just open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 8000
# open http://localhost:8000/
```

For deterministic demo/testing, append `?asof=YYYY-MM-DD` to use that date
as "today" (used by the smoke tests).

## Dev commands

```sh
node --test tests/unit.test.mjs   # pure-logic unit tests
node tests/smoke.mjs              # headless-Chrome browser smoke tests
```

## Environment

None. No API keys, no secrets, no `.env` file.

## Testing

- `tests/unit.test.mjs` -- 11 tests: surah table (114 surahs, ayah sum 6236),
  juz boundaries/ranges, khatma math, streak math (consecutive, gap,
  yesterday-alive, today-only), juz progress %, hifz review intervals,
  log/hifz validation rejections, Bengali digits, import validation
  (14 malformed inputs rejected, valid round-trip restores data).
- `tests/smoke.mjs` -- 44 headless-Chrome checks: boot/empty states, add-log
  flow with exact dashboard numbers, invalid-log rejections, khatma math,
  hifz add + mark-reviewed, Bangla toggle + digits + reload persistence,
  export/import round-trip, typed-DELETE erase, 390px no-overflow,
  zero console errors, zero network requests.
- See `TEST_RESULTS.md` for the recorded run.

## Deployment

Static site -- publish the folder as-is on GitHub Pages, Netlify Drop, or
any static host. No build step.

## Limitations

- Page numbering follows the 604-page Madani mushaf. If your mushaf differs,
  page numbers will not match exactly.
- Streaks and statistics come from self-logged data; overlapping entries
  (logging the same pages twice) are summed, not de-duplicated.
- Juz progress counts logged page ranges overlapping each juz; it is a
  reading-log summary, not a mushaf-verified completion certificate.
- Data lives in one browser's `localStorage` under key `qrt-bd-v1`. Clearing
  browser data deletes it -- export JSON regularly as a backup.
- This app is a personal offline tracker, not a religious authority.

## Status

Complete MVP. All tests green (see TEST_RESULTS.md).
