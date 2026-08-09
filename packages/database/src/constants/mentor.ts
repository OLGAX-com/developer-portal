// Curated so expertise stays filterable/consistent (matches the data-driven badge/mission style
// used elsewhere) instead of freeform, inconsistent tags.
export const MENTOR_EXPERTISE_AREAS = [
  "Software Development",
  "Cloud & DevOps",
  "AI / Machine Learning",
  "Data & Analytics",
  "Mobile Development",
  "UI/UX Design",
  "Product Management",
  "Cybersecurity",
  "QA & Testing",
  "Community & Open Source",
] as const;

export type MentorExpertiseArea = (typeof MENTOR_EXPERTISE_AREAS)[number];

export const MENTORSHIP_SKILL_LEVELS = ["Beginner", "Intermediate", "Advanced", "Expert"] as const;

export type MentorshipSkillLevel = (typeof MENTORSHIP_SKILL_LEVELS)[number];
