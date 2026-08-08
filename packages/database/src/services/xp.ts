const XP_PER_LEVEL_STEP = 100;

// Ongoing per-contribution rewards (as opposed to one-time mission milestones in missions.json).
export const XP_PER_MERGED_PR = 25;
export const XP_PER_ISSUE_OPENED = 10;
export const XP_PER_REVIEW = 15;

export interface LevelInfo {
  level: number;
  xpIntoLevel: number;
  xpToNextLevel: number;
}

/** Level N requires N * 100 XP to clear (level 1->2 needs 100, 2->3 needs 200, etc.). */
export function calculateLevel(xp: number): LevelInfo {
  let level = 1;
  let remaining = Math.max(0, xp);
  let threshold = level * XP_PER_LEVEL_STEP;

  while (remaining >= threshold) {
    remaining -= threshold;
    level += 1;
    threshold = level * XP_PER_LEVEL_STEP;
  }

  return { level, xpIntoLevel: remaining, xpToNextLevel: threshold };
}
