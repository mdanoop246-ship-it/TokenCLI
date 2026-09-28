import fs from "node:fs";
import { extractSymbols } from "../repository/scanner.js";
import { gitDiff } from "../repository/git.js";
import { relative } from "../utils/files.js";
import { redactSecrets } from "../utils/secrets.js";
import { estimateTokens, reductionPercent } from "../utils/token.js";
import { selectRelevantFiles } from "./relevance.js";
import type { OptimizationResult } from "../types.js";

export function optimizeContext(
  root: string,
  task: string,
  useDiff = false
): OptimizationResult {
  const allFiles = selectRelevantFiles(root, task, 8);
  const symbols = extractSymbols(root);

  let original = "";
  let optimized = "";

  for (const file of allFiles) {
    const content = fs.readFileSync(file, "utf8");
    original += `\\n// FILE: ${relative(root, file)}\\n${content}\\n`;

    const fileSymbols = symbols.filter((s) => s.file === relative(root, file));
    const signatures = fileSymbols
      .map((s) => `${s.exported ? "export " : ""}${s.signature ?? `${s.kind} ${s.name}`}`)
      .join("\\n");

    const header = `// FILE: ${relative(root, file)}\\n`;
    optimized += header;

    if (signatures) {
      optimized += `// Relevant symbols\\n${signatures}\\n`;
    }

    const lines = content.split("\\n");
    const focused = lines
      .filter((line) => {
        const lower = line.toLowerCase();
        return task.toLowerCase().split(/\\s+/).some((word) =>
          word.length > 3 && lower.includes(word.replace(/[^a-z0-9_]/g, ""))
        );
      })
      .slice(0, 80);

    if (focused.length) {
      optimized += `// Relevant implementation lines\\n${focused.join("\\n")}\\n`;
    }
  }

  if (useDiff) {
    const diff = gitDiff(root);
    if (diff) {
      original += `\\n// GIT DIFF\\n${diff}\\n`;
      optimized += `\\n// TARGETED GIT DIFF\\n${sliceDiff(diff)}\\n`;
    }
  }

  const redacted = redactSecrets(optimized);
  optimized = `TASK: ${task}\\n\\n${redacted.text}`;

  return {
    task,
    filesScanned: countSourceFiles(root),
    filesSelected: allFiles.map((f) => relative(root, f)),
    originalCharacters: original.length,
    optimizedCharacters: optimized.length,
    originalTokens: estimateTokens(original),
    optimizedTokens: estimateTokens(optimized),
    reductionPercent: reductionPercent(
      estimateTokens(original),
      estimateTokens(optimized)
    ),
    context: optimized,
    redactions: redacted.count
  };
}

function sliceDiff(diff: string): string {
  return diff
    .split("\\n")
    .filter((line) =>
      line.startsWith("diff ") ||
      line.startsWith("+++ ") ||
      line.startsWith("--- ") ||
      line.startsWith("@@") ||
      line.startsWith("+") ||
      line.startsWith("-")
    )
    .slice(0, 250)
    .join("\\n");
}

function countSourceFiles(root: string): number {
  const { walkSourceFiles } = requireShim();
  return walkSourceFiles(root).length;
}

function requireShim() {
  // Avoid CommonJS require in ESM.
  return { walkSourceFiles: (root: string) => {
    const fs = requireFs();
    const path = requirePath();
    const ignored = new Set(["node_modules",".git","dist","build",".next","coverage",".venv","venv","__pycache__"]);
    const exts = new Set([".ts",".tsx",".js",".jsx",".mjs",".cjs"]);
    const out: string[] = [];
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir,{withFileTypes:true})) {
        if (ignored.has(e.name)) continue;
        const p = path.join(dir,e.name);
        if (e.isDirectory()) walk(p);
        else if (exts.has(path.extname(e.name))) out.push(p);
      }
    };
    walk(root);
    return out;
  }};
}
function requireFs() { return fs; }
function requirePath() { return { join: (a:string,b:string)=>a + "/" + b, extname:(p:string)=>p.slice(p.lastIndexOf(".")) }; }