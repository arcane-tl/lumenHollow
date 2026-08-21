import assert from "node:assert/strict";
import test from "node:test";
import {
  compareScores,
  formatTime,
  previewRankList,
  wouldRankList,
  cleanName,
  SCORE_LIMIT,
  NAME_MAX,
} from "../src/game/scores.ts";

test("coins beat time", () => {
  assert.ok(compareScores({ coins: 9, time: 120 }, { coins: 8, time: 30 }) < 0);
  assert.ok(compareScores({ coins: 8, time: 30 }, { coins: 9, time: 120 }) > 0);
});

test("equal coins prefer faster time", () => {
  assert.ok(compareScores({ coins: 8, time: 30 }, { coins: 8, time: 40 }) < 0);
});

test("board fills then knocks off worse runs", () => {
  const list = Array.from({ length: SCORE_LIMIT }, (_, i) => ({
    name: `P${i}`,
    coins: 8,
    time: 40 + i,
    at: i,
  }));
  assert.equal(wouldRankList(list, 8, 39), true);
  assert.equal(wouldRankList(list, 8, 80), false);
  assert.equal(wouldRankList(list, 9, 200), true);
  assert.equal(previewRankList(list, 9, 200), 1);
  assert.equal(previewRankList(list, 8, 40.5), 2);
});

test("format and name", () => {
  assert.equal(formatTime(65.2), "1:05.20");
  assert.equal(NAME_MAX, 18);
  assert.equal(cleanName("   Ash  Vale   "), "ASHVALE");
  assert.equal(cleanName("fox_1"), "FOX_1");
  assert.equal(cleanName("   "), "FOX");
  assert.equal(cleanName("THIRTEENCHARS"), "THIRTEENCHARS");
  assert.equal(cleanName("NINETEENCHARACTERSX").length, 18);
  assert.equal(cleanName("FOX NAME OKAY"), "FOXNAMEOKAY");
});

test("identical coins and time keep earlier at first", () => {
  assert.ok(compareScores({ coins: 8, time: 30, at: 1 }, { coins: 8, time: 30, at: 2 }) < 0);
});
