import fs from "node:fs";
import path from "node:path";
import { walkSourceFiles, relative } from "../utils/files.js";

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "from", "that",
  "this", "fix", "make", "code", "file",
  "issue", "bug", "please", "into", "using"
]);

const INTERNAL_DIRECTORIES = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "coverage"
]);

function getTaskTerms(task: string): string[] {
  return [
    ...new Set(
      task
        .toLowerCase()
        .replace(/[^a-z0-9_./-]+/g, " ")
        .split(/\s+/)
        .filter(
          (word) =>
            word.length >= 3 &&
            !STOP_WORDS.has(word)
        )
    )
  ];
}

function scoreFile(
  file: string,
  root: string,
  keywords: string[]
): number {
  const relativePath = relative(root, file).toLowerCase();
  const content = fs.readFileSync(file, "utf8").toLowerCase();

  let score = 0;

  for (const keyword of keywords) {
    // Filename/path match is strong evidence.
    if (relativePath.includes(keyword)) {
      score += 10;
    }

    // Count occurrences in source.
    const matches = content.match(
      new RegExp(`\\b${escapeRegExp(keyword)}\\b`, "g")
    );

    if (matches) {
      score += Math.min(matches.length * 2, 10);
    }
  }

  return score;
}

export function selectRelevantFiles(
  root: string,
  task: string,
  limit = 5
): string[] {
  const keywords = getTaskTerms(task);

  const files = walkSourceFiles(root).filter((file) => {
    const relativePath = relative(root, file);
    const parts = relativePath.split("/");

    return !parts.some((part) =>
      INTERNAL_DIRECTORIES.has(part)
    );
  });

  const scored = files
    .map((file) => ({
      file,
      score: scoreFile(file, root, keywords)
    }))
    .sort((a, b) => b.score - a.score);

  const relevant = scored
    .filter((item) => item.score > 0)
    .slice(0, limit);

  // If nothing matches, keep a small fallback set.
  if (relevant.length === 0) {
    return scored
      .slice(0, Math.min(limit, scored.length))
      .map((item) => item.file);
  }

  return relevant.map((item) => item.file);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}