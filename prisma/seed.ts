import "dotenv/config";
import { readFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient, type Difficulty, type Pattern } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

type CatalogEntry = {
  title: string;
  slug: string;
  pattern: Pattern;
  difficulty: Difficulty;
  blind75: boolean;
};

// Sourced from neetcode-gh/leetcode `.problemSiteData.json` (the site's own data file),
// trimmed to the NeetCode 150. Blind 75 is a strict subset of it, so this single file
// covers every problem in the catalog.
const catalog: CatalogEntry[] = JSON.parse(
  readFileSync(path.join(__dirname, "catalog.json"), "utf8"),
);

// The Pareto 49, in its own study order. Every entry is also in the NeetCode 150,
// so these are set memberships over the same deduplicated problems.
const PARETO_49 = [
  "contains-duplicate", "valid-anagram", "two-sum", "group-anagrams",
  "top-k-frequent-elements", "valid-sudoku", "product-of-array-except-self",
  "longest-consecutive-sequence", "valid-palindrome", "two-sum-ii-input-array-is-sorted",
  "3sum", "container-with-most-water", "best-time-to-buy-and-sell-stock",
  "longest-substring-without-repeating-characters", "longest-repeating-character-replacement",
  "valid-parentheses", "min-stack", "daily-temperatures", "binary-search",
  "find-minimum-in-rotated-sorted-array", "search-in-rotated-sorted-array",
  "reverse-linked-list", "merge-two-sorted-lists", "reorder-list",
  "remove-nth-node-from-end-of-list", "linked-list-cycle", "lru-cache",
  "invert-binary-tree", "maximum-depth-of-binary-tree", "diameter-of-binary-tree",
  "balanced-binary-tree", "same-tree", "subtree-of-another-tree",
  "lowest-common-ancestor-of-a-binary-search-tree", "binary-tree-level-order-traversal",
  "binary-tree-right-side-view", "count-good-nodes-in-binary-tree",
  "validate-binary-search-tree", "kth-smallest-element-in-a-bst",
  "kth-largest-element-in-a-stream", "last-stone-weight", "kth-largest-element-in-an-array",
  "number-of-islands", "max-area-of-island", "clone-graph", "pacific-atlantic-water-flow",
  "surrounded-regions", "course-schedule", "course-schedule-ii",
];

const SETS = [
  {
    key: "pareto49",
    name: "The Pareto 49",
    description: "The 20% of problems that cover 90% of coding interviews.",
    slugs: PARETO_49,
  },
  {
    key: "blind75",
    name: "Blind 75",
    description: "The classic 75-problem list covering every core pattern.",
    slugs: catalog.filter((p) => p.blind75).map((p) => p.slug),
  },
  {
    key: "neetcode150",
    name: "NeetCode 150",
    description: "The full 150-problem roadmap across 18 patterns.",
    slugs: catalog.map((p) => p.slug),
  },
];

async function main() {
  const problemIdBySlug = new Map<string, string>();

  for (const entry of catalog) {
    const problem = await prisma.problem.upsert({
      where: { slug: entry.slug },
      update: {
        title: entry.title,
        pattern: entry.pattern,
        difficulty: entry.difficulty,
        leetcodeUrl: `https://leetcode.com/problems/${entry.slug}/`,
      },
      create: {
        title: entry.title,
        slug: entry.slug,
        pattern: entry.pattern,
        difficulty: entry.difficulty,
        leetcodeUrl: `https://leetcode.com/problems/${entry.slug}/`,
      },
    });
    problemIdBySlug.set(entry.slug, problem.id);
  }

  for (const set of SETS) {
    const missing = set.slugs.filter((s) => !problemIdBySlug.has(s));
    if (missing.length > 0) {
      throw new Error(`Set "${set.key}" references unknown slugs: ${missing.join(", ")}`);
    }

    const problemSet = await prisma.problemSet.upsert({
      where: { key: set.key },
      update: { name: set.name, description: set.description, totalCount: set.slugs.length },
      create: {
        key: set.key,
        name: set.name,
        description: set.description,
        totalCount: set.slugs.length,
      },
    });

    for (const [i, slug] of set.slugs.entries()) {
      const problemId = problemIdBySlug.get(slug)!;
      await prisma.problemSetItem.upsert({
        where: { problemSetId_problemId: { problemSetId: problemSet.id, problemId } },
        update: { orderIndex: i + 1 },
        create: { problemSetId: problemSet.id, problemId, orderIndex: i + 1 },
      });
    }

    // Drop memberships for problems no longer in the list, so a revised upstream
    // list can't leave the set over-counted.
    const keepIds = set.slugs.map((s) => problemIdBySlug.get(s)!);
    await prisma.problemSetItem.deleteMany({
      where: { problemSetId: problemSet.id, problemId: { notIn: keepIds } },
    });
  }

  // ---- Sanity check ----
  const uniqueProblems = await prisma.problem.count();
  const counts = await Promise.all(
    SETS.map(async (s) => {
      const set = await prisma.problemSet.findUniqueOrThrow({
        where: { key: s.key },
        include: { _count: { select: { items: true } } },
      });
      return { key: s.key, items: set._count.items, expected: s.slugs.length };
    }),
  );

  console.log(`\nUnique problems in catalog: ${uniqueProblems}`);
  for (const c of counts) {
    const ok = c.items === c.expected ? "OK" : "MISMATCH";
    console.log(`  ${c.key.padEnd(12)} ${String(c.items).padStart(3)} / ${c.expected}  ${ok}`);
  }

  const expectations: Record<string, number> = {
    pareto49: 49,
    blind75: 75,
    neetcode150: 150,
  };
  const bad = counts.filter((c) => c.items !== expectations[c.key]);
  if (bad.length > 0 || uniqueProblems !== 150) {
    throw new Error(
      `Seed sanity check failed — expected 150 unique problems and 49/75/150 per set.`,
    );
  }
  console.log("\nSeed sanity check passed.\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
