export interface FileInfo {
  path: string;
  extension: string;
  size: number;
}

export interface SymbolInfo {
  file: string;
  kind: string;
  name: string;
  line: number;
  exported: boolean;
  signature?: string;
}

export interface OptimizationResult {
  task: string;
  filesScanned: number;
  filesSelected: string[];
  originalCharacters: number;
  optimizedCharacters: number;
  originalTokens: number;
  optimizedTokens: number;
  reductionPercent: number;
  context: string;
  redactions: number;
}

export interface RefactorResult {
  summary: string;
  patch: string;
  files: string[];
  verification: {
    typecheck: boolean;
    lint: boolean;
    tests: boolean;
  };
}
