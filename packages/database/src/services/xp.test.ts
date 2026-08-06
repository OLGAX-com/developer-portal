import { describe, expect, it } from "vitest";
import { calculateLevel } from "./xp";

describe("calculateLevel", () => {
  it("starts at level 1 with 0 xp", () => {
    expect(calculateLevel(0)).toEqual({ level: 1, xpIntoLevel: 0, xpToNextLevel: 100 });
  });

  it("stays level 1 just below the level 2 threshold", () => {
    expect(calculateLevel(99)).toEqual({ level: 1, xpIntoLevel: 99, xpToNextLevel: 100 });
  });

  it("reaches level 2 at exactly 100 xp", () => {
    expect(calculateLevel(100)).toEqual({ level: 2, xpIntoLevel: 0, xpToNextLevel: 200 });
  });

  it("reaches level 3 at 300 total xp (100 + 200)", () => {
    expect(calculateLevel(300)).toEqual({ level: 3, xpIntoLevel: 0, xpToNextLevel: 300 });
  });

  it("handles xp partway through a higher level", () => {
    // 100 (lvl1->2) + 200 (lvl2->3) + 50 into level 3 = 350
    expect(calculateLevel(350)).toEqual({ level: 3, xpIntoLevel: 50, xpToNextLevel: 300 });
  });

  it("clamps negative xp to 0", () => {
    expect(calculateLevel(-50)).toEqual({ level: 1, xpIntoLevel: 0, xpToNextLevel: 100 });
  });
});
