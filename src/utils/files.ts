import fs from "node:fs";
import path from "node:path";

const IGNORED = new Set([
  "node_modules", ".git", "dist", "build", ".next", "coverage",
  ".venv", "venv", "__pycache__", ".idea", ".vscode"
]);

const SOURCE_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"
]);

export function walkSourceFiles(root: string): string[] {
  const result: string[] = [];

  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (IGNORED.has(entry.name)) continue;
      const full = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        walk(full);
      } else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
        result.push(full);
      }
    }
  }

  walk(root);
  return result;
}

export function readText(file: string): string {
  return fs.readFileSync(file, "utf8");
}

export function relative(root: string, file: string): string {
  return path.relative(root, file).replaceAll(path.sep, "/");
}