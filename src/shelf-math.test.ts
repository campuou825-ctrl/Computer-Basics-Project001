import test from 'node:test';
import assert from 'node:assert/strict';
import {
  smoothstep,
  smoothStepB,
  computeTapeX,
  computeRelativeIndex,
  computeOpenness,
  computeCropCss,
  shortestJumpToFilm,
  computeBlobRadius,
} from './shelf-math';

test('smoothstep boundaries and midpoint', () => {
  assert.equal(smoothstep(0), 0);
  assert.equal(smoothstep(1), 1);
  assert.equal(smoothstep(0.5), 0.5);
  assert.equal(smoothstep(-0.5), 0);
  assert.equal(smoothstep(1.5), 1);
});

test('smoothStepB continuity and limits', () => {
  assert.equal(smoothStepB(0), 0);
  assert.equal(smoothStepB(1), 0.5);
  assert.equal(smoothStepB(-1), -0.5);
  assert.equal(smoothStepB(2), 0.5);
  assert.equal(smoothStepB(-2), -0.5);
});

test('computeRelativeIndex wraps smoothly within [-18, 18)', () => {
  assert.equal(computeRelativeIndex(17, 17), 0);
  assert.equal(computeRelativeIndex(18, 17), 1);
  assert.equal(computeRelativeIndex(16, 17), -1);
  assert.equal(computeRelativeIndex(0, 17), -17);
  assert.equal(computeRelativeIndex(35, 17), 18);
});

test('computeOpenness is 1 at center and 0 at spines', () => {
  assert.equal(computeOpenness(0), 1);
  assert.equal(computeOpenness(1), 0);
  assert.equal(computeOpenness(-1), 0);
  assert.equal(computeOpenness(2), 0);
  assert.equal(computeOpenness(0.5), smoothstep(0.5));
});

test('computeTapeX symmetric push-apart', () => {
  const ws = 70;
  const d = 210;
  const gap = 12;
  const xCenter = computeTapeX(0, ws, d, gap);
  const xRight = computeTapeX(1, ws, d, gap);
  const xLeft = computeTapeX(-1, ws, d, gap);

  assert.equal(xCenter, 0);
  assert.ok(xRight > 0);
  assert.ok(xLeft < 0);
  assert.equal(Math.round(xRight + xLeft), 0);
});

test('computeCropCss generates valid background rules', () => {
  const res = computeCropCss('https://example.com/sheet.png', 1000, 2000, 100, 200, 200, 400);
  assert.equal(res.backgroundImage, 'url("https://example.com/sheet.png")');
  assert.equal(res.backgroundSize, '500% 500%');
  assert.equal(res.backgroundPosition, '12.5% 12.5%');
});

test('shortestJumpToFilm picks nearest direction on 12-loop', () => {
  // Currently at film 5 (Noon in Ashes), jump to 1980s (film 9) -> +4 steps
  assert.equal(shortestJumpToFilm(17, 9), 21);
  // Currently at film 1 (1960s), jump to 1950s (film 0) -> -1 step
  assert.equal(shortestJumpToFilm(13, 0), 12);
  // Currently at film 0, jump to 1980s (film 9) -> -3 steps
  assert.equal(shortestJumpToFilm(12, 9), 9);
});

test('computeBlobRadius ease-out curve and delay', () => {
  assert.equal(computeBlobRadius(50, 100), 0);
  assert.equal(computeBlobRadius(100, 100), 0);
  const mid = computeBlobRadius(100 + 625, 100, 1250, 720);
  assert.ok(mid > 360); // Ease-out is faster at the start
  assert.equal(computeBlobRadius(100 + 1250, 100, 1250, 720), 720);
  assert.equal(computeBlobRadius(100 + 2000, 100, 1250, 720), 720);
});
