import type { Difficulty, Pattern } from "@prisma/client";

export type ProblemStatus = "UNATTEMPTED" | "IN_PROGRESS" | "CLEARED";

export type ProblemRow = {
  id: string;
  title: string;
  slug: string;
  leetcodeUrl: string;
  pattern: Pattern;
  difficulty: Difficulty;
  orderIndex: number;
  status: ProblemStatus;
  submissionCount: number;
};
