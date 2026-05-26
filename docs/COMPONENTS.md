# Components

One-paragraph contracts per component, in the order an agent typically
needs them. All components live under `src/components/`.

## App-shell

### `App.jsx` (`src/App.jsx`)
Top-level screen router. Owns three booleans (`createOpen`, `listOpen`,
`openNotebookId`) that overlay the main grid with the create modal, the
saved-notebook list, and the print preview respectively. Computes
`counts` (per-category problem count derived from `ANSWERS`) and picks
the first non-empty grade as the initial tab. Renders `<Toaster>` once
at the top so toasts work from any subtree.

### `Toaster.jsx`
Subscribes to `useToastStore.toasts` and renders the floating stack in
the top-center. Tone classes map to colour swatches (`success`, `warn`,
`error`, default). Hidden during print via the `.no-print` utility.

### `Icons.jsx`
Inline SVG components for the icon set (`IconSearch`, `IconClose`,
`IconCart`, `IconTrash`, `IconPrint`, `IconCheck`, `IconPlus`,
`IconChevronDown`, `IconImageOff`, `IconEmptyBox`, `IconBack`). All
accept the usual SVG props (`className`, `style`, …) via spread. Stroke
inherits `currentColor`.

## Discovery (search & grid)

### `SearchBar.jsx`
Free-form id search ("9-30") plus an autocomplete dropdown that filters
`Object.keys(ANSWERS)` by prefix. Submit (or click a suggestion) calls
`useCartStore.add` and `onJump({category})` so the parent can switch
tabs to the matched grade. Validates id via `parseProblemId`; if the id
isn't in `ANSWERS`, toasts "찾을 수 없습니다".

### `Tabs.jsx`
Grade tabs derived from `CATEGORIES`. Props: `active`, `onChange`,
`counts` (a `{ [category]: number }` map). Sticky at the top of the
problem column. Active tab uses the brand blue pill; inactive tabs are
text-only with a count chip.

### `ProblemGrid.jsx`
For a given `category` prop, iterates `Object.keys(ANSWERS)`, parses
each id, and renders a sorted list of `ProblemCard`s. The card is a
button that toggles the cart and shows the image, the display id, and a
check-or-plus indicator. Each `ProblemImage` uses the URL from
`buildImageUrl(category, number)`.

### `ProblemImage.jsx`
Lazy `<img>` wrapper with three states (`loading`, `loaded`, `error`).
While `loading` shows an animated grey skeleton; on `error` shows a
small "이미지 로드 실패" panel with an icon. Props: `src`, `alt`,
`className`, `imgClassName`, `loading` (default `lazy`), `ratio`
(default `4 / 3`, used as `aspect-ratio` for the box).

## Cart

### `Cart.jsx`
Desktop right-rail. Lists the current cart items, each with a delete
button. Header has "전체 비우기"; footer has the "오답노트 생성" button
that calls `onCreate` (App opens `<CreateNotebookModal>`). Empty state
shows the box icon + "장바구니가 비었어요" copy. The same component
also renders inside the mobile bottom sheet via `variant="sheet"` which
turns on a close button in the header.

### `MobileCartBar.jsx`
A bottom-of-viewport bar with the cart count and an "열기" button. When
opened, slides up a sheet that renders `<Cart variant="sheet">`.
Locks body scroll while the sheet is up. Hidden on `lg+` viewports.

## Notebook flow

### `CreateNotebookModal.jsx`
Form modal that converts the current cart into a `notebook`. Fields:
title (defaults from `math-pro:last-title`, required), name (defaults
from `math-pro:last-name`, may be empty), date (`type="date"`, defaults
to **today every open**). On submit: calls `useNotebookStore.create`,
persists title/name to localStorage, empties the cart, then bubbles up
`onCreated(notebookId)` so the parent can navigate.

### `NotebookList.jsx`
Full-screen overlay listing every saved notebook. Each card shows the
`notebookDisplayName` ("제목-이름-날짜"), a problem-count + chapter
summary subtitle, and Open / Delete buttons. Empty state shows
"아직 생성한 오답노트가 없어요". Delete confirms via `window.confirm`.

### `PrintPreview.jsx`
The biggest single component. Accepts `notebook` prop and renders:

1. A toolbar (`.print-chrome`) with title / name / date inputs that
   write back through `useNotebookStore.update`. The "PDF 저장" button
   calls `handleBrowserPrint(...)`.
2. A scroll container (`.print-scroll` > `.print-pages`) of A4-landscape
   page articles (`[data-pdf-page]`):
   - One `ProblemPage` per chunk of up to 4 problems from one chapter
     (see `chunkByChapter` + `annotatePages`).
   - One `AnswerKeyPage` appended at the end, grouped by chapter via
     `groupAnswerEntriesByChapter`.

Each `Cell` inside a `ProblemPage` is a flex row holding a
`ProblemImage` plus — when `SOLUTIONS.has(id)` is true — a
`SolutionImage` filling the remaining space. The `SolutionImage` pulls
from `solutions/<grade>/<number>.png` via `buildSolutionUrl`, with
`object-fit: contain` so any aspect ratio fits cleanly.

All print-specific tokens (greyscale palette, IBM Plex Mono, Pretendard
Variable) are inline styles here. See **PRINT_FLOW.md** for the full
geometry / @media print interplay.

## Shared rendering

### `AnswerText.jsx`
Renders an answer string. Splits the input on the inline-math
delimiter `$ … $` and routes each chunk to either plain text or
`react-katex` `InlineMath`. Two layout modes:

- Default — single inline span. Used in the cart sidebar (truncated to
  one visible line).
- `multiline` prop — splits the input on the **two-spaces + `(n)`**
  pattern and renders each sub-part as a `display: block` span with a
  3 mm `marginTop`. Used on the answer key page so display fractions
  never bleed into adjacent sub-parts.

`normalizeForDisplay(tex)` rewrites `\frac → \dfrac` and
`\binom → \dbinom` so all fractions in an answer key page render at the
same display-style size regardless of source.

## Components NOT in this file

`src/main.jsx`, `src/App.jsx`, `src/config.js`, the stores, the styles,
and the answers data live outside `src/components/` and are covered by
their own docs:

- **State:** `docs/DATA_MODEL.md`
- **Print pipeline:** `docs/PRINT_FLOW.md`
- **Top-level / wiring:** `docs/ARCHITECTURE.md`
