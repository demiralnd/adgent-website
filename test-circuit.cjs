// Circuit routing maths — the parts that fail silently in a browser.
const assert = require('assert');

// L-shaped elbow: vertical leg, arc, horizontal run, arc, into the anchor.
function L(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  if (Math.abs(dx) < 2) return { straight: true, end: b };
  const R = Math.min(18, Math.abs(dx) / 2, Math.abs(dy) / 2);
  const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1;
  return { R, sx, sy, turnY: b.y - sy * R, end: b, straight: false };
}
let e = L({ x: 1200, y: 300 }, { x: 400, y: 1200 });
assert.strictEqual(e.R, 18, 'long legs use the full corner radius');
assert.strictEqual(e.sx, -1, 'travels left');
assert.deepStrictEqual(e.end, { x: 400, y: 1200 }, 'lands exactly on the anchor');
// a short leg must shrink the radius, or the arc overshoots the segment
e = L({ x: 100, y: 100 }, { x: 110, y: 120 });
assert.ok(e.R <= 5, 'radius clamps to half the shorter leg, got ' + e.R);
// a pure vertical move must not try to turn
assert.ok(L({ x: 500, y: 0 }, { x: 501, y: 900 }).straight, 'near-vertical stays straight');

// Paint length: binary search for the point on the path at the viewport mark.
// Verified against a synthetic path whose y grows with length.
function searchDist(total, yAt, markY) {
  let lo = 0, hi = total, mid;
  for (let s = 0; s < 18; s++) {
    mid = (lo + hi) / 2;
    if (yAt(mid) < markY) lo = mid; else hi = mid;
  }
  return lo;
}
const yAt = (len) => len * 0.5;             // path descends half as fast as it runs
const TOTAL = 9000;
assert.ok(Math.abs(searchDist(TOTAL, yAt, 0) - 0) < 1, 'top of page paints nothing');
assert.ok(Math.abs(searchDist(TOTAL, yAt, 2250) - 4500) < 1, 'mid mark → mid distance');
assert.ok(searchDist(TOTAL, yAt, 99999) > TOTAL - 1, 'past the end clamps to full');
// the search must terminate even when the path never reaches the mark
assert.ok(Number.isFinite(searchDist(TOTAL, () => 0, 500)), 'flat path must not hang');

console.log('PASS — L köşe yarıçapı, dikey durum ve boyama mesafesi araması doğru');
