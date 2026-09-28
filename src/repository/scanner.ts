import fs from "node:fs";
import path from "node:path";
import { Project, Node, SyntaxKind } from "ts-morph";
import type { FileInfo, SymbolInfo } from "../types.js";
import { relative, walkSourceFiles } from "../utils/files.js";

export function scanRepository(root: string): FileInfo[] {
  return walkSourceFiles(root).map((file) => ({
    path: relative(root, file),
    extension: path.extname(file),
    size: fs.statSync(file).size
  }));
}

export function extractSymbols(root: string): SymbolInfo[] {
  const files = walkSourceFiles(root);
  const project = new Project({
    skipAddingFilesFromTsConfig: true,
    compilerOptions: { allowJs: true }
  });

  project.addSourceFilesAtPaths(files);

  const symbols: SymbolInfo[] = [];

  for (const source of project.getSourceFiles()) {
    const file = relative(root, source.getFilePath());

    source.getFunctions().forEach((fn) => {
      const name = fn.getName();
      if (!name) return;
      symbols.push({
        file,
        kind: "function",
        name,
        line: fn.getStartLineNumber(),
        exported: fn.isExported(),
       signature: fn.getText()
  .split("{")[0]
  .replace(/^export\s+/, "")
  .trim()
      });
    });

    source.getClasses().forEach((cls) => {
      const name = cls.getName();
      if (!name) return;
      symbols.push({
        file,
        kind: "class",
        name,
        line: cls.getStartLineNumber(),
        exported: cls.isExported(),
        signature: `class ${name}`
      });
    });

    source.getInterfaces().forEach((intf) => {
      const name = intf.getName();
      symbols.push({
        file,
        kind: "interface",
        name,
        line: intf.getStartLineNumber(),
        exported: intf.isExported(),
        signature: intf.getText()
  .split("{")[0]
  .replace(/^export\s+/, "")
  .trim()
      });
    });

    source.getTypeAliases().forEach((alias) => {
      symbols.push({
        file,
        kind: "type",
        name: alias.getName(),
        line: alias.getStartLineNumber(),
        exported: alias.isExported(),
        signature: alias.getText().split("=")[0].trim()
      });
    });
  }

  return symbols;
}