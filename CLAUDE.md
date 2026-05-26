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
│   ├── 07/001.png … 046.png   ← unit 07: 여러 가지 방정식
│   ├── 08/001.png … 036.png   ← unit 08: 일차부등식과 연립일차부등식
│   ├── 09/001.png … 042.png   ← unit 09: 이차부등식과 연립이차부등식
│   ├── 10/, 11/, 12/          ← placeholder folders (.gitkeep) — empty
│
└── src/
    ├── main.jsx               ← React mount + KaTeX CSS import
    ├── App.jsx                ← top-level screen router (cart / list / preview)
    ├── config.js              ← CATEGORIES, CHAPTERS, buildImageUrl, parseProblemId
    │
    ├── data/
    │   └── answers.js         ← THE answer-key data — 124 entries today
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
        │   ├── Tabs.jsx               ← per-grade tabs
        │   ├── ProblemGrid.jsx        ← grid of problem cards for one grade
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

### Problem IDs

- Display form: `"7-30"`, `"12-160"` — grade-dash-number, no zero padding.
- On disk: `images/07/030.png` — grade folder is zero-padded to 2 digits,
  filename is zero-padded to 3 digits.
- `parseProblemId(id)`, `buildImageUrl(category, number)`,
  `compareProblemIds(a, b)`, `CHAPTERS[category]` are all in `src/config.js`.

### Answer values

`src/data/answers.js` is a flat `{ "9-30": "③", "7-1": "(1) … (2) …" }` map.

- Plain text and Unicode (e.g. `①②③④⑤`, `해는 없다.`) render as-is.
- LaTeX is wrapped in `$ … $` and rendered by KaTeX inline.
- Multi-part answers separate sub-parts with **two-or-more spaces** before
  `(2)`, `(3)`, … — `AnswerText` splits on that pattern when `multiline` is
  set so each sub-part lives in its own block.
- `\frac` is normalized to `\dfrac` in `AnswerText.normalizeForDisplay` for a
  uniform fraction size.

### Adding a new problem

1. Drop the image into `images/<grade-padded>/<number-padded>.png` on the
   `main` branch (the app pulls it via GitHub raw URL).
2. Add an entry to `src/data/answers.js` under the matching unit. The grid
   only renders ids that have an answers-map key — that's the registration.

### Print pipeline (the critical part)

There is **no canvas capture** anymore. The "PDF 저장" button calls
`window.print()` after setting `document.title` to the desired filename and
toggling `body.is-printing`. The scoped `@media print` block in
`src/styles/index.css` hides UI chrome and lays each `[data-pdf-page]`
article onto one A4-landscape sheet. See **docs/PRINT_FLOW.md** for the
full story (page geometry, line-alignment fix, font preload, etc.).

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
