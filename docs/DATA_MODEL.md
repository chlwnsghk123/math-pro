# Data Model

Every piece of state, identifier convention, and store API the app uses.
Read `CLAUDE.md` first for conventions; this file is the reference.

## 1. Problem identifiers

Each problem has a **display id** and a **disk path**. They share the
same grade and number but format differently.

```
display id     "9-30"        ←→  disk path  "images/09/030.png"
                ▲                                ▲       ▲
                category (1–2 digit grade)       │       │
                                 zero-pad to 2 ──┘       │
                                                         │
                                  zero-pad to 3 ─────────┘
```

### Helpers in `src/config.js`

```js
CATEGORIES                = ['7', '8', '9', '10', '11', '12']
CHAPTERS[category]        = "09 이차부등식과 연립이차부등식"   // string

parseProblemId("9-30")    = { category: '9', number: 30 }
parseProblemId("garbage") = null
parseProblemId("4-1")     = null     // 4 not in CATEGORIES

buildImageUrl('9', 30)
  = "https://raw.githubusercontent.com/chlwnsghk123/math-pro/main/images/09/030.png"

compareProblemIds(a, b)   = numeric sort by (category, number)
formatProblemId('9', 30)  = "9-30"
```

URL components are overridable through `VITE_REPO_OWNER`, `VITE_REPO_NAME`,
`VITE_REPO_BRANCH`, `VITE_IMAGE_BASE_PATH` (defaults match the current repo).

### Chapter codes

The string returned by `CHAPTERS[cat]` always starts with the
**zero-padded grade**, a space, then the chapter name:

```js
CHAPTERS = {
  '7':  '07 여러 가지 방정식',
  '8':  '08 일차부등식과 연립일차부등식',
  '9':  '09 이차부등식과 연립이차부등식',
  '10': '10 순열',
  '11': '11 조합',
  '12': '12 행렬',
};
```

`PrintPreview.jsx` has tiny `extractUnitCode("09 …")` / `extractUnitName(…)`
helpers that split this into the two halves it needs for the header.

## 2. Answer values — `src/data/answers.js`

A flat object: keys are display ids, values are strings that may mix
plain text, Unicode glyphs, and LaTeX delimited by `$ … $`.

```js
const ANSWERS = {
  '7-4':  '③',
  '7-7':  '$-2$',
  '7-13': '$a>\\frac{5}{4}$',
  '7-15': '(1) 6, 4, $-5$  (2) $-2$, $-1$, 7  (3) 2, $\\frac{9}{2}$, $\\frac{1}{2}$  (4) …',
  '9-1':  '(1) $x<-4$ 또는 $x>6$  (2) $-4 \\le x \\le 6$',
  '9-15': '$k \\le 4$',
  // 124 entries today across grades 7, 8, 9
};
```

### Rules `AnswerText` enforces

- **Empty / null** → renders an em-dash placeholder.
- **`$ … $`** → passed to `react-katex` `InlineMath`. The substring is
  first run through `normalizeForDisplay(tex)`:
  - `\frac` → `\dfrac` (uniform display-style fractions across all answers)
  - `\binom` → `\dbinom`
- **Multi-part answers** that contain `(2)`, `(3)`, … markers preceded by
  **two-or-more spaces** are split when the caller passes `multiline`.
  Each sub-part renders in its own `display: block` span with a 3 mm
  margin — display-style fractions can't overflow into the next part.

### Where the data lives

Right now `answers.js` ships in the bundle. There's no separate JSON
file or fetch. To register a new problem, add a key here AND drop the
matching PNG into `images/<padded-grade>/<padded-number>.png` on
`origin/main`. The grid auto-renders any id whose key exists in
`ANSWERS`.

## 3. `cartStore` — `src/store/cartStore.js`

```ts
type CartStore = {
  items: string[];                       // sorted by compareProblemIds

  contains(id): boolean;
  add(id):     boolean;                  // false if already in cart
  remove(id):  void;
  toggle(id):  'added' | 'removed';
  clear():     void;
  addMany(ids: string[]): number;        // returns count actually added
};
```

- **No persist middleware** — refresh = empty cart.
- All mutations re-sort with `compareProblemIds` so the array is always
  in canonical order. Downstream (`Cart`, `PrintPreview`) can rely on
  this without re-sorting.

## 4. `notebookStore` — `src/store/notebookStore.js`

```ts
type Notebook = {
  id:          string;       // e.g. "nb_lqf3z_x82q1k"
  title:       string;       // always non-empty (defaults to "오답 노트")
  studentName: string;       // may be ""
  studentDate: string;       // "YYYY-MM-DD" (HTML date input format)
  problemIds:  string[];     // sorted by compareProblemIds, immutable
  createdAt:   number;       // Date.now() at creation
  updatedAt:   number;
};

type NotebookStore = {
  notebooks: Notebook[];      // newest first

  create({title, studentName, studentDate, problemIds}): string;  // returns id
  update(id, partial):  void;                                     // updatedAt auto
  remove(id):           void;
  clear():              void;
  get(id):              Notebook | undefined;
};
```

- Persisted to `localStorage` under `math-pro:notebooks-v1` via Zustand's
  `persist` middleware (only the `notebooks` array is partialized in).
- `problemIds` is set once at creation and never edited later — only
  cover fields (title / name / date) get patched. If you ever need to
  let the user edit the problem list of a saved notebook, that's a new
  feature, not an existing affordance.
- `notebookDisplayName(nb)` returns `"제목-이름-날짜"` and is used both
  in the `NotebookList` cards and as the PDF filename (sanitised by
  `buildFilename` in `PrintPreview.jsx`).

## 5. `toastStore` — `src/store/toastStore.js`

```ts
type Toast = { id: number; message: string; tone: 'default'|'success'|'warn'|'error'; duration: number };

type ToastStore = {
  toasts: Toast[];
  show(message, opts?): number;          // returns id, auto-dismisses
  dismiss(id):          void;
};
```

Pure UI utility. Not persisted, no business logic.

## 6. `localStorage` keys this app writes

| Key | Owner | Cleared on refresh? | Notes |
|---|---|---|---|
| `math-pro:notebooks-v1` | `notebookStore` | no | the actual notebook data |
| `math-pro:last-title` | `CreateNotebookModal` | no | default for next create modal |
| `math-pro:last-name`  | `CreateNotebookModal` | no | default for next create modal |
| `math-pro:cart-v1`    | (dead — earlier persist) | no | unused now, fine to leave or sweep |

Date is intentionally **not** persisted — every time the create modal
opens it defaults to today.

## 7. PDF filename

```
"{title}-{studentName}-{studentDate}"      ← .pdf extension added by the browser
                                              save-as dialog (we set
                                              document.title before print)
```

Each segment is sanitised (`[\\/:*?"<>|]` → `_`). Empty studentName
gives `오답 노트--2026-05-23` — empty middle segment is intentional per
spec.
