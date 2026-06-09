# CLAUDE.md — Agent Onboarding Guide

> **Audience:** Claude Code and other AI agents picking up work on this repo.
> Read this first, then dive into `docs/` for specifics.

## 1. What this project is

**Math Pro** is a single-page React app that lets a user assemble a printable
"wrong-answer notebook" (오답노트) from a bank of math problems.

The user picks problems from per-grade tabs, saves them as a named notebook,
and prints the notebook to A4 landscape. The print output includes the problem
images followed by a typeset answer key (KaTeX).

```
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  Pick problems   │    │  Create notebook │    │  Print / save    │
│  (tabs + cart)   │ ── │  (title + name + │ ── │  PDF (browser    │
│                  │    │   date snapshot) │    │  native print)   │
└──────────────────┘    └──────────────────┘    └──────────────────┘
```

## 2. Stack

| Layer | Choice |
|---|---|
| Build / dev | **Vite 5** |
| UI | **React 18**, JSX (no TypeScript) |
| Styling | **Tailwind CSS 3** + a small `@media print` block in `src/styles/index.css` |
| State | **Zustand 4** — `cartStore` (in-memory) + `notebookStore` (persisted) + `toastStore` |
| Math typesetting | **KaTeX** via `react-katex` (`InlineMath` only — no block math) |
| Fonts | Pretendard Variable (Korean sans) + IBM Plex Mono (numerics / labels) — both via CDN in `index.html` |
| Print | **Browser-native `window.print()`** with a scoped `@media print` block. **No** html2canvas / jsPDF. |
| Deploy | Vercel, framework-detected via `vercel.json` |

## 3. Repo layout

```
/
├── CLAUDE.md                  ← this file
├── readme.html                ← user-facing how-to (open in a browser)
├── docs/                      ← deeper agent docs
│   ├── ARCHITECTURE.md        ← module map, data flow, screen states
│   ├── DATA_MODEL.md          ← ANSWERS / notebook / cart / problem-ID shapes
│   ├── COMPONENTS.md          ← every React component, props, responsibility
│   └── PRINT_FLOW.md          ← how window.print() + @media print works here
│
├── index.html                 ← Vite entry, loads Pretendard + IBM Plex Mono
├── package.json, vite.config.js, tailwind.config.js, postcss.config.js
├── vercel.json, .nvmrc        ← deployment hints
│
├── images/                    ← problem PNGs, served by GitHub raw URL
│   ├── 07/001.png … 046.png   ← unit 07: 여러 가지 방정식        ("legacy" flat)
│   ├── 08/001.png … 036.png   ← unit 08: 일차부등식과 연립일차부등식
│   ├── 09/001.png … 042.png   ← unit 09: 이차부등식과 연립이차부등식
│   ├── 10/, 11/, 12/          ← placeholder folders (.gitkeep) — empty
│   ├── IV_순열과조합/          ← NEW: 단원 → 강 → 유형/실전 hierarchy
│   │   ├── 19강_경우의수/유형01.png … 유형21.png
│   │   ├── 20강_순열/유형01.png … 유형31.png
│   │   ├── 21강_조합/유형01.png … 유형22.png
│   │   └── 실전감각UP_기출/실전01.png … 실전21.png
│   └── V_행렬/
│       ├── 22강_행렬의뜻과연산/유형01.png … 유형18.png
│       ├── 23강_행렬의곱셈/유형01.png … 유형30.png
│       └── 실전감각UP_기출/실전01.png … 실전18.png
│
└── src/
    ├── main.jsx               ← React mount + KaTeX CSS import
    ├── App.jsx                ← top-level screen router (cart / list / preview)
    │
    ├── data/
    │   ├── catalog.js         ← BOOKS (문제집) + CATALOG (single source of truth),
    │   │                        getBook/getCategory, categoryGroupsForBook,
    │   │                        buildImageUrl, parseProblemId, compareProblemIds
    │   └── answers.js         ← THE answer-key data — 285 entries (124 legacy
    │                            + 161 worked-solution entries for Ⅳ·Ⅴ)
    │
    ├── store/
    │   ├── cartStore.js       ← selected-problem ids (in-memory, no persist)
    │   ├── notebookStore.js   ← saved notebooks (localStorage)
    │   └── toastStore.js      ← transient toast notifications
    │
    ├── styles/
    │   └── index.css          ← Tailwind layers + @media print
    │
    └── components/
        ├── App-level
        │   ├── SearchBar.jsx          ← jump to a problem by id (e.g. "9-30")
        │   ├── Navigator.jsx          ← 문제집 dropdown + wrapping 단원/강 chips
        │   ├── ProblemGrid.jsx        ← grid of problem cards for one category
        │   ├── ProblemImage.jsx       ← lazy <img> with skeleton + fallback
        │   ├── Cart.jsx               ← desktop sidebar (selected problems)
        │   └── MobileCartBar.jsx      ← mobile bottom-sheet version of Cart
        │
        ├── Notebook flow
        │   ├── CreateNotebookModal.jsx ← cart → notebook (title/name/date)
        │   ├── NotebookList.jsx        ← saved notebooks (open / delete)
        │   └── PrintPreview.jsx        ← A4-landscape preview + print trigger
        │
        ├── Shared
        │   ├── AnswerText.jsx         ← renders mixed text + $LaTeX$, multiline
        │   ├── Toaster.jsx            ← toast container
        │   └── Icons.jsx              ← inline SVG icon set
```

## 4. How to run

```bash
npm install          # one-time
npm run dev          # http://localhost:5173, HMR
npm run build        # outputs dist/, Vite tree-shakes everything
npm run preview      # serve dist/ to verify the prod bundle
```

There is no test suite. The verification loop is `npm run build` plus
manually opening the dev server and stepping through the flows in
`readme.html`.

## 5. Conventions worth knowing

### Books, problem IDs & the catalog

`src/data/catalog.js` is the single source of truth. **`BOOKS`** (문제집) is the
top nav level — e.g. `풍산자 라이트유형 · 공통수학(상)` (codes 7–12) and
`베이직 쎈 · 공통수학(상)` (Ⅳ·Ⅴ). Add a book there, tag its categories with
`book: <id>`, and the navigation picks it up.

Every category (= one 단원/강 chip, one print chapter, one answer-key section)
is one entry in **`CATALOG`**, carrying its `book`. Two `kind`s:

- **`legacy`** — flat grade folders. id `"9-30"` ↔ `images/09/030.png`
  (grade pad-2, number pad-3).
- **`lecture`** — the 단원 → 강 hierarchy. id `"20-5"` ↔
  `images/IV_순열과조합/20강_순열/유형05.png` (number pad-2, prefix `유형`/`실전`).
  Folder paths are URL-encoded (they contain Korean) by `buildImageUrl`.

Category **codes**: legacy `7…12`; lectures `19,20,21` (Ⅳ 강), `22,23` (Ⅴ 강),
and `4G`/`5G` for the two 실전감각 UP (기출) sets. `parseProblemId` splits on the
**last** `-` so alphanumeric codes like `4G-3` parse. Helpers in `catalog.js`:
`getBook(id)`, `getCategory(code)`, `bookIdOf(code)`,
`categoryGroupsForBook(bookId)` (단원 grouping for the unit picker),
`CHAPTERS`, `buildImageUrl`, `compareProblemIds` (orders by catalog index).

### Answer values

`src/data/answers.js` is a flat `{ "9-30": "③", "20-1": "…\n∴ 48" }` map.

- Plain text and Unicode (e.g. `①②③④⑤`, `해는 없다.`, `∴`, `→`) render as-is.
- LaTeX is wrapped in `$ … $` and rendered by KaTeX inline (incl. `pmatrix`).
- Legacy multi-part answers separate sub-parts with **two-or-more spaces**
  before `(2)`, `(3)`, …
- **Worked solutions** (Ⅳ·Ⅴ, 수능형 식 중심): steps are separated by **`\n`**
  and end with a `∴ …` conclusion line. `AnswerText` (with `multiline`) puts
  each `\n`-line / sub-part in its own block; `extractFinalAnswer(value)`
  returns the text after the last `∴` (used in the cart row).
- **Two shapes**: an entry is a string (the answer) **or** `{ a, s }` (answer
  + solution). Only multi-part problems that would print their part-answers
  twice use the object form. `answerOf` / `solutionOf` (in `AnswerText.jsx`)
  pick the right view. Notebooks carry `solutionMode` (`'answer'` | `'solution'`)
  — a toolbar toggle in PrintPreview — choosing which the answer sheet prints.
- `\frac` → `\dfrac` (and `\binom` → `\dbinom`) in `AnswerText.normalizeForDisplay`.
- Validate every `$…$` segment with `node scripts/validate-answers.mjs`.

### Adding a new problem

1. Drop the image on `main` — `images/<grade-padded>/<number-padded>.png`
   (legacy) **or** `images/<folder>/<유형|실전><nn>.png` under an existing
   `lecture` catalog entry's `folder`. To add a whole new 단원/강, add a
   `CATALOG` entry in `src/config.js` first.
2. Add an entry to `src/data/answers.js` keyed by the display id. The grid
   only renders ids that have an answers-map key — that's the registration.

### Print pipeline (the critical part)

There is **no canvas capture** anymore. While `PrintPreview` is open it keeps
`body.is-printing` on (a mount `useEffect`), so **every** print path — the
"인쇄 / PDF" button, `Cmd/Ctrl+P`, and the mobile browser's own print/share
menu — renders the clean sheet (the old toggle-at-click leaked the app chrome
on mobile). The scoped `@media print` block in `src/styles/index.css` hides UI
chrome and lays each `[data-pdf-page]` onto one A4-landscape sheet
(`@page { size: A4 landscape }`; iOS can't be forced, so a mobile hint asks the
user to pick 가로). The "정답 및 풀이" section is **paginated** in JS
(`paginateAnswerGroups`) by estimated height vs a two-column budget so it never
clips — 답만 (final answers) vs 풀이 (worked solutions) per the notebook's
`solutionMode`. See **docs/PRINT_FLOW.md** for the full story.

### State boundaries

- `cartStore` — selection during the current session. **No persistence**
  (a refresh clears it).
- `notebookStore` — saved notebooks (immutable `problemIds`, editable
  cover fields). **localStorage** key `math-pro:notebooks-v1`.
- `localStorage.math-pro:last-title` / `:last-name` — UX convenience
  defaults for the create modal, not part of the notebook record.

## 6. Branch / deploy expectations

- Develop on the per-task branch named in the task description (typically
  `claude/...`).
- Push to that branch, then **also** fast-forward `main` to it after each
  feature lands so Vercel sees the latest state.
- `vercel.json` pins framework + commands; `.nvmrc` pins Node 22.
- Image uploads (user does this via GitHub web UI) land on `main`
  directly — rebase your branch onto `origin/main` before pushing.

## 7. Where to look next

| If you need to … | Read |
|---|---|
| understand the screen / state machine | `docs/ARCHITECTURE.md` |
| know the shape of every store / value | `docs/DATA_MODEL.md` |
| find a component's contract | `docs/COMPONENTS.md` |
| modify the print output | `docs/PRINT_FLOW.md` |
| show the app to a human user | `readme.html` (open in any browser) |
