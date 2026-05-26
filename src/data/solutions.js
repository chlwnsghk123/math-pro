/**
 * Manifest of problem ids that have a hand-written solution image
 * uploaded to `solutions/<grade-padded>/<number-padded>.png`.
 *
 * Adding a solution:
 *   1. Upload the image to `solutions/<grade>/<number>.png` on `main`
 *      (zero-pad grade to 2, number to 3 — same convention as images/).
 *   2. Add the problem id (e.g. `'9-15'`) below.
 *
 * The id's presence here is what makes the PrintPreview render the
 * solution image next to the problem in its quadrant cell. Problems
 * without an entry here keep the existing blank solving space.
 */
const SOLUTIONS = new Set([
  // Add ids as solution images get uploaded, e.g.:
  // '7-15',
  // '7-30',
  // '9-3',
]);

export default SOLUTIONS;
