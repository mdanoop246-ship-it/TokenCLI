import fs from "node:fs";
import path from "node:path";

export interface ApplyResult {
  applied: boolean;
  files: string[];
  backupPath?: string;
  message: string;
}

function extractFilePath(patch: string): string | null {
  const match = patch.match(
    /^---\s+a\/(.+)$/m
  );

  return match?.[1]?.trim() ?? null;
}

function extractReplacement(
  patch: string,
  original: string
): string | null {
  const oldLines: string[] = [];
  const newLines: string[] = [];

  for (const line of patch.split("\n")) {
    if (line.startsWith("--- ") || line.startsWith("+++ ")) {
      continue;
    }

    if (line.startsWith("@@")) {
      continue;
    }

    if (line.startsWith("-")) {
      oldLines.push(line.slice(1));
      continue;
    }

    if (line.startsWith("+")) {
      newLines.push(line.slice(1));
      continue;
    }
  }

  if (oldLines.length === 0) {
    return null;
  }

  const oldBlock = oldLines.join("\n");
  const newBlock = newLines.join("\n");

  if (!original.includes(oldBlock)) {
    return null;
  }

  return original.replace(
    oldBlock,
    newBlock
  );
}

export function applyPatch(
  root: string,
  patch: string
): ApplyResult {

  const relativeFile = extractFilePath(patch);

  if (!relativeFile) {
    return {
      applied: false,
      files: [],
      message: "Could not determine the target file from the patch."
    };
  }

  const targetFile = path.resolve(
    root,
    relativeFile
  );

  // Security check: prevent the patch from
  // modifying files outside the repository.
  const repositoryRoot = path.resolve(root);

  if (
    !targetFile.startsWith(
      repositoryRoot + path.sep
    )
  ) {
    return {
      applied: false,
      files: [],
      message: "Patch target is outside the repository."
    };
  }

  if (!fs.existsSync(targetFile)) {
    return {
      applied: false,
      files: [],
      message: `Target file does not exist: ${relativeFile}`
    };
  }

  const original = fs.readFileSync(
    targetFile,
    "utf8"
  );

  const updated = extractReplacement(
    patch,
    original
  );

  if (updated === null) {
    return {
      applied: false,
      files: [],
      message:
        "Patch could not be safely matched against the current file."
    };
  }

  // Create a backup before modifying anything.
  const backupPath = `${targetFile}.tokencli.bak`;

  fs.copyFileSync(
    targetFile,
    backupPath
  );

  fs.writeFileSync(
    targetFile,
    updated,
    "utf8"
  );

  return {
    applied: true,
    files: [relativeFile],
    backupPath,
    message:
      `Patch applied successfully to ${relativeFile}.`
  };
}