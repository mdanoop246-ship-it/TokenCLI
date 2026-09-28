import { execFileSync } from "node:child_process";

export function gitDiff(root: string): string {
  try {
    return execFileSync("git", ["diff", "-U2"], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024
    });
  } catch {
    return "";
  }
}

export function gitStatus(root: string): string {
  try {
    return execFileSync("git", ["status", "--short"], {
      cwd: root,
      encoding: "utf8"
    });
  } catch {
    return "";
  }
}