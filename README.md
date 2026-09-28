# TokenCLI

TokenCLI is a lightweight, context-aware developer CLI that reduces unnecessary LLM context before API dispatch.

## Core pipeline

Repository → AST analysis → Git diff slicing → relevance filtering → secret redaction → token measurement → LLM → verification → report

## MVP commands

```bash
npm install
npm run build

# Analyze the current repository
npx tokencli analyze

# Optimize context for a task without calling an LLM
npx tokencli optimize "fix authentication bug"

# Optimize only changed code
npx tokencli optimize "review my changes" --diff

# Run an LLM-backed refactoring request
npx tokencli refactor "improve error handling in authentication"

# Generate a local JSON/terminal report
npx tokencli report
```

If you install the package globally:

```bash
npm link
tokencli analyze
```

## What the MVP does

- Scans TypeScript/JavaScript source files.
- Builds a lightweight AST symbol inventory with `ts-morph`.
- Reads Git changes using `git diff -U2`.
- Selects relevant files using lexical matching.
- Produces a compact context instead of dumping the whole repository.
- Redacts common API keys, bearer tokens, passwords, and secret-like environment values.
- Estimates original vs optimized token counts.
- Sends an optional refactoring request to Anthropic.
- Validates the returned structured result with Zod.
- Runs basic verification commands when requested.
- Produces a token-savings report.

## Important

The 35–55% reduction described in the project proposal is a target, not a hard-coded result. TokenCLI calculates the actual reduction for each request.

## Suggested demo

Create a small repository with 5–10 files, put a bug in one file, and run:

```bash
tokencli optimize "fix the login validation bug"
tokencli refactor "fix the login validation bug"
```

Show the before/after token counts and the generated patch.

## Architecture

```text
CLI
 ├─ Repository Scanner
 ├─ AST Analyzer
 ├─ Git Diff Slicer
 ├─ Relevance Engine
 ├─ Secret Redactor
 ├─ Token Counter
 ├─ Model Router
 ├─ Refactor Agent
 └─ Verification Engine
```
