import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export interface VerificationResult {
  typecheck: boolean;
  lint: boolean;
  tests: boolean;
}

/**
 * Run a shell command inside the target project.
 */
function run(
  root: string,
  command: string
): boolean {
  try {
    execSync(command, {
      cwd: root,
      stdio: "ignore",
      timeout: 120_000,
      windowsHide: true
    });

    return true;
  } catch {
    return false;
  }
}

/**
 * Check whether package.json contains
 * a particular npm script.
 */
function hasScript(
  root: string,
  script: string
): boolean {
  try {
    const packagePath = path.join(
      root,
      "package.json"
    );

    if (!fs.existsSync(packagePath)) {
      return false;
    }

    const packageJson = JSON.parse(
      fs.readFileSync(packagePath, "utf8")
    );

    return Boolean(
      packageJson.scripts?.[script]
    );
  } catch {
    return false;
  }
}

/**
 * Verify the target repository.
 */
export function verify(
  root: string
): VerificationResult {

  // TypeScript type checking
  const typecheck = run(
    root,
    "npx tsc --noEmit"
  );

  // Lint verification
  const lint = hasScript(root, "lint")
    ? run(
        root,
        "npm run lint"
      )
    : true;

  // Test verification
  const tests = hasScript(root, "test")
    ? run(
        root,
        "npm test"
      )
    : true;

  return {
    typecheck,
    lint,
    tests
  };
}