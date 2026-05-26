# Print flow

Everything an agent needs to know to safely modify the printed output.
This file is more granular than `ARCHITECTURE.md` because the print
pipeline is the single fiddliest part of the app.

## 1. Why window.print(), not html2canvas

The repo went through a previous iteration that captured each preview
page with `html2canvas`, fed the PNG into `jsPDF`, and saved a file.
That had two recurring problems:

1. **KaTeX glyphs disappeared.** The fraction bar and minus sign were
   thin horizontal hairlines; the canvas rasteriser at scale 2 (and even
   at scale 3) occasionally rendered them as blank pixels because the
   KaTeX font wasn't always loaded before the snapshot.
2. **Sub-pixel hairlines drifted.** The header had three 1 px borders
   (the title row's bottom border + each `<span class="field">`'s bottom
   border). At canvas scale they landed on different y rows, so the
   "Name ____ / Date ____" line and the title underline looked stair-stepped.

`window.print()` hands the DOM directly to the browser's print backend,
which renders fonts and 1 px borders as vectors — no rasterisation
ambiguity. The trade-off is that we can't directly write a file: the
browser shows its own print dialog, the user picks "Save as PDF" or a
printer. We bias the default filename by setting `document.title`
before the dialog opens.

## 2. Where the work lives

```
src/components/PrintPreview.jsx
    ├── handleBrowserPrint()      ← entry point from the "PDF 저장" button
    ├── buildFilename()           ← "{title}-{name}-{date}", sanitised
    ├── ProblemPage               ← one A4 sheet of up to 4 problems
    │     ├── PageHeader          ← title + Name/Date (page 1) + unit row
    │     ├── QuadrantGrid        ← 2×2 cell grid
    │     └── PageFooter          ← "오답 노트 · Unit XX" + "01 / 04"
    │
    └── AnswerKeyPage             ← last A4 sheet, 2-column grouped list
          └── AnswerGroup         ← one section per chapter
                └── AnswerText (multiline)   ← (1)(2)(3) sub-parts as blocks

src/styles/index.css
    └── @media print { … }        ← scoped to body.is-printing
```

## 3. The hand-off

```js
function handleBrowserPrint({ title, studentName, studentDate }) {
  document.title = buildFilename({ title, studentName, studentDate });
  document.body.classList.add('is-printing');

  const restore = onceOnly(() => {
    document.title = prevTitle;
    document.body.classList.remove('is-printing');
  });
  window.addEventListener('afterprint', restore);
  setTimeout(restore, 6000);     // hard fallback — some browsers skip afterprint

  window.print();
}
```

- **`document.title`** is what every browser uses as the default
  filename when the user picks "Save as PDF" from the system dialog.
  Restored on `afterprint`.
- **`body.is-printing`** scopes every `@media print` rule so the screen
  view is never affected accidentally (someone hits Cmd+P from the main
  app and the page goes blank? No — without `is-printing`, the rules
  don't fire).
- **The 6-second timer** is a belt-and-braces restore: Safari and some
  embedded browsers don't fire `afterprint` reliably.

## 4. @media print rules

Located in `src/styles/index.css`. Annotated below.

```css
@media print {
  /* A4 landscape sheet, no printer margins so our [data-pdf-page]
     padding controls the white space. */
  @page { size: A4 landscape; margin: 0; }

  html, body {
    background: #ffffff !important;
    margin: 0 !important;
    padding: 0 !important;
    print-color-adjust: exact;       /* keep our greys, even on "save ink" */
  }

  /* Anything tagged .no-print never appears on paper. */
  .no-print { display: none !important; }

  /* Inside the app, hide everything that ISN'T the print preview. */
  body.is-printing .app-root > *:not(.print-preview-root) {
    display: none !important;
  }

  /* Preview chrome (toolbar, inputs) — also gone. */
  body.is-printing .print-chrome { display: none !important; }

  /* Lift the overlay out of position:fixed so the browser paginates
     normally instead of reprinting the first page on every sheet. */
  body.is-printing .print-preview-root {
    position: static !important;
    inset: auto !important;
    background: #ffffff !important;
    display: block !important;
  }

  /* The scroll/stage shell is a preview-only affordance. Strip its
     padding / gap so pages flow tight against the sheet edges. */
  body.is-printing .print-scroll {
    padding: 0 !important;
    overflow: visible !important;
    background: #ffffff !important;
  }
  body.is-printing .print-pages {
    gap: 0 !important;
    padding: 0 !important;
    background: #ffffff !important;
  }

  /* Each preview page = one A4 sheet. */
  body.is-printing [data-pdf-page] {
    width: 297mm !important;
    height: 210mm !important;
    margin: 0 !important;
    box-shadow: none !important;
    page-break-after: always;
    break-after: page;
    overflow: hidden !important;
  }
  body.is-printing [data-pdf-page]:last-of-type {
    page-break-after: auto;
    break-after: auto;
  }
}
```

## 5. Page geometry

All numbers come from constants at the top of `PrintPreview.jsx`:

```js
PAGE_WIDTH_MM       = 297     // A4 landscape
PAGE_HEIGHT_MM      = 210
PROBLEMS_PER_PAGE   = 4       // 2×2 grid
IMAGE_WIDTH_MM      = 53      // ≈ 40 % of a cell's width
IMAGE_MAX_HEIGHT_MM = 60      // ≈ 80 % of a cell's height
```

Page padding is `12mm 14mm 10mm` and lives in `pageStyle`. The 2×2 grid
gets the remaining height (page minus header minus padding).

### Header height stays constant

Even though only page 1 shows the "오답 노트" title + Name/Date row,
**every page** reserves the same vertical space for the header. The
title row is always rendered (height: 14 mm) but its inner content is
conditional on `isFirstPage`. The unit row is always rendered with
height 8 mm; on a continuation page it sits empty. That way the
quadrant grid below starts at the same y on every sheet — no jumpy
images between pages.

### Quadrant cells with optional solution

Each `Cell` is a flex row. The problem image is the first flex child
(max-width 60% of the cell, max-height 100%). If
`SOLUTIONS.has(problemId)` is true, a second child renders the
hand-written solution image from `solutions/<grade>/<number>.png` with
`flex: 1` so it fills the rest of the row. When the id isn't in the
Set, the cell has only the problem image and the remaining space stays
empty — same as before, useful for hand-written work.

### Header line alignment fix

The earlier "stair-stepped underline" look came from
`align-items: center` on the title row's grid container. Both the
`<h1>` and the right-side Name/Date fields were vertically centred, so
each field's own `border-bottom` landed above the container's
`border-bottom`. Three separate 1 px lines at three y coordinates.

Current CSS sets `align-items: end` and `padding-bottom: 0` on the
title row. Now:

- `<h1>` bottom = row content bottom (matches the container border)
- Each field span's bottom = field-group bottom = row content bottom
- Container `border-bottom` = row content bottom

All three borders sit at the same y to within one pixel, so the print
shows one continuous horizontal rule under the title and the Name/Date
fields. The `<h1>` keeps a 1.5 mm bottom padding inside its own box so
the title text doesn't kiss the line.

## 6. Chunking & chapter labels

```js
chunkByChapter(items, 4)
    → split the (already-sorted) item list into contiguous runs of the
      same category, then sub-split each run into chunks of ≤ 4.

annotatePages(pages)
    → walk the chunks in order. The FIRST chunk for each category gets
      `unitCode` and `unitName` populated; later chunks in the same
      category leave them null (header slot stays reserved but blank).
      Every page also carries `unitNameForFooter` so the footer can
      print "오답 노트 · Unit 09" on every sheet of that chapter.

groupAnswerEntriesByChapter(items)
    → one entry per group: { category, unitCode, unitName, items: [{id,
      displayNumber}] }. `displayNumber` is the actual problem number
      from the id (9-15 → 15) so the answer key matches the textbook's
      numbering instead of being re-indexed 1..N per chapter.
```

## 7. Answer rendering quirks

- `AnswerText` with `multiline` puts each `(1) … (2) …` sub-part in a
  `display: block` span. Each block grows to fit its inline content,
  including display-style fractions. The 3 mm `marginTop` between
  blocks keeps tall fractions from crowding the next sub-part.
- `normalizeForDisplay` rewrites every `\frac` to `\dfrac` (and the
  matching `\binom → \dbinom`) so the answer key has uniform display-
  style fractions regardless of how the source string spelled the
  command. The answer-key line-height is bumped to `2.1` to give each
  inline display fraction breathing room.

## 8. Footer

Every preview page ends with `<PageFooter>`:

```
오답 노트 · Unit 09                        01  /  04
^^^^^^^^^^^^^^^^^^^^                       ^^      ^^
mono uppercase, ink-4                      current  total
                                          page in
                                          ink (bold-ish)
```

Implemented with `position: absolute; bottom: 6mm; left/right: 14mm;`
inside the page article. The article has `overflow: hidden` so footers
can't bleed into the next sheet.

## 9. Things to watch when changing this

- **Don't reintroduce `position: fixed` on the preview overlay during
  print** — the @media rule already overrides it to `static`, but if
  you change the wrapper class names without updating that selector,
  you'll see the same page printed on every sheet.
- **Don't drop the `.no-print` class from new toolbar bits** — anything
  visible during preview but useless on paper should carry it.
- **Don't bake background colours that depend on `print-color-adjust`**
  in print-critical surfaces unless you also confirm it in actual paper
  output. The dashed cell outlines use `#e2e2e2` which prints fine on
  laser printers but can wash out on cheap inkjet.
- **The page dimensions are mm, not px.** If you switch to px you'll
  re-introduce scale ambiguity between screen DPI and print DPI.
