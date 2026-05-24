# Architecture

> Read `CLAUDE.md` first for the elevator pitch and conventions. This file
> is the map of the running app — what mounts, what state lives where,
> which component shows up when.

## 1. Module map

```
src/main.jsx                                     ← React root
    └── App.jsx                                  ← screen router
        ├── Toaster                              ← global toasts (overlay)
        ├── header
        │   ├── SearchBar                        ← "9-30" → jumps tab, can add
        │   └── "내 오답노트 (N)" button         ← opens NotebookList
        ├── main
        │   ├── Tabs                             ← grade selector
        │   ├── ProblemGrid                      ← cards for selected grade
        │   │   └── ProblemImage                 ← lazy <img>, fallback UI
        │   └── Cart (desktop sidebar)           ← selected problems
        ├── MobileCartBar (mobile only)          ← bottom sheet trigger
        ├── CreateNotebookModal (when open)      ← title / name / date form
        ├── NotebookList (when open)             ← saved-notebook list
        └── PrintPreview (when notebook open)    ← landscape A4 pages
```

## 2. Screen state machine

`App.jsx` owns three pieces of UI state that overlay the main grid view.
Only one overlay shows at a time — when multiple are conceptually open
(e.g. list + preview), the preview renders on top.

```
            (main view: grid + cart)
                     │
                     ├── createOpen     → <CreateNotebookModal>
                     │                    └─ on save, opens list +
                     │                       preview for the new id
                     │
                     ├── listOpen       → <NotebookList>
                     │                    └─ click → set openNotebookId
                     │
                     └── openNotebookId → <PrintPreview notebook=…>
                                          └─ closes back to whatever was
                                             behind (usually the list)
```

The state lives as three `useState` hooks:

```js
const [createOpen, setCreateOpen] = useState(false);
const [listOpen, setListOpen]     = useState(false);
const [openNotebookId, setOpenNotebookId] = useState(null);
```

There is no router. Closing an overlay only flips its boolean; the main
grid never unmounts, so cart selection and tab state survive overlays.

## 3. Data flow

### Selection (cart)

```
User clicks a card in ProblemGrid
       │
       ▼
useCartStore.toggle(id)         ◄── in-memory, no persist
       │
       ▼
Cart / MobileCartBar re-render (subscribed via selector)
```

The cart is intentionally **not persisted** — a refresh wipes it so the
user starts each session clean. The earlier `math-pro:cart-v1`
localStorage key is no longer read by anything; it's harmless dead data.

### Notebook creation

```
Cart "오답노트 생성" button
       │
       ▼
App.setCreateOpen(true)
       │
       ▼
<CreateNotebookModal>                 ← reads items from useCartStore
       │ submit
       ▼
useNotebookStore.create({ title, studentName, studentDate, problemIds: items })
       │  returns notebook id
       ▼
clearCart()                           ← cart is emptied after snapshot
       ▼
App.setListOpen(true)
App.setOpenNotebookId(newId)          ← jump straight into the preview
```

### Print

```
PrintPreview "PDF 저장" button
       │
       ▼
handleBrowserPrint({ title, studentName, studentDate })
       │
       ├── document.title = "title-name-date"   ← becomes default save filename
       ├── document.body.classList.add('is-printing')
       │
       ▼
window.print()                        ← browser opens system print dialog
       │
       │ user picks "Save as PDF" or a printer
       ▼
'afterprint' fires (or 6-second fallback timer)
       │
       ▼
restore document.title and remove .is-printing
```

The `@media print` block (`src/styles/index.css`) is scoped to
`body.is-printing` so it does nothing on normal screen layout.

## 4. Print page layout (PrintPreview)

Each `<article data-pdf-page>` is one printed A4-landscape sheet
(297 × 210 mm). Pagination is computed in `PrintPreview.jsx` purely from
the notebook's `problemIds`:

1. `chunkByChapter(items, 4)` — items already arrive sorted, so a new
   chunk starts whenever the category changes OR the chunk hits 4. Each
   chunk is one page.
2. `annotatePages(pages)` — the **first** page of each chapter gets the
   chapter label in its header; subsequent pages of the same chapter
   leave the unit-name slot blank (but still reserve its height so the
   2×2 grid below sits at a consistent y on every page).
3. The answer key appends as one extra page after the problem pages.
   It's grouped by chapter via `groupAnswerEntriesByChapter`, and each
   entry's `displayNumber` is the real problem number from the id
   (e.g. `9-30` → `30`), matching the textbook.

See **PRINT_FLOW.md** for the exact CSS that makes window.print render
this correctly.

## 5. Styling layers

```
src/styles/index.css
├── @tailwind base/components/utilities
├── @layer base       — body font, focus ring
├── @layer components — .btn-primary, .btn-ghost, .chip, .card
└── @media print      — scoped under body.is-printing; see PRINT_FLOW.md
```

Tailwind is the workhorse for screen layout. Print-specific tokens
(greyscale palette `#161616 / #cfcfcf / #e2e2e2 / #ecebe7`, IBM Plex
Mono labels, Pretendard Variable body) live as inline styles in
`PrintPreview.jsx` because they aren't reused elsewhere and shipping
them as Tailwind classes would inflate the screen-only stylesheet for
no gain.

## 6. Build output

`npm run build` produces a static SPA in `dist/`:

```
dist/
├── index.html
├── favicon.svg
└── assets/
    ├── index-<hash>.js       ← ~454 KB (139 KB gz) — React + Zustand +
    │                             react-katex + components + answers data
    ├── index-<hash>.css      ← ~56 KB (13 KB gz) — Tailwind + print CSS
    └── KaTeX_*.{woff2,woff,ttf}  ← per-glyph KaTeX font subsets
```

There are **no** runtime image assets in the bundle — problem images
live at the GitHub raw URL configured in `src/config.js`. The KaTeX font
files ARE bundled (about 1 MB total of woff2/woff/ttf) and served from
`/assets/`.
