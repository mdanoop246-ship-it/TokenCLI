#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";

import {
  scanRepository,
  extractSymbols
} from "../repository/scanner.js";

import { gitStatus } from "../repository/git.js";
import { optimizeContext } from "../optimizer/context.js";
import { runRefactor } from "../llm/router.js";
import { verify } from "../verify.js";
import { applyPatch } from "../patch/apply.js";

const program = new Command();

function rootDir(): string {
  return process.cwd();
}

/* =========================================================
   ANALYZE
   ========================================================= */

program
  .name("tokencli")
  .description("Context-aware token-optimized developer engine")
  .version("0.1.0");

program
  .command("analyze")
  .description("Analyze the current repository")
  .action(() => {
    const root = rootDir();
    const spinner = ora("Scanning repository...").start();

    try {
      const files = scanRepository(root);
      const symbols = extractSymbols(root);
      const status = gitStatus(root);

      spinner.succeed("Repository analysis complete");

      console.log(
        chalk.cyan("\nTOKENCLI REPOSITORY ANALYSIS")
      );

      console.log(
        "────────────────────────────────"
      );

      console.log(
        `Source files : ${chalk.bold(files.length)}`
      );

      console.log(
        `Symbols      : ${chalk.bold(symbols.length)}`
      );

      console.log(
        `Git changes  : ${chalk.bold(
          status ? "Yes" : "No"
        )}`
      );

      const byKind = symbols.reduce<
        Record<string, number>
      >((acc, s) => {
        acc[s.kind] = (acc[s.kind] ?? 0) + 1;
        return acc;
      }, {});

      console.log("\nSymbols:");

      for (const [kind, count] of Object.entries(
        byKind
      )) {
        console.log(
          `  ${kind.padEnd(12)} ${count}`
        );
      }
    } catch (error) {
      spinner.fail("Analysis failed");

      console.error(
        error instanceof Error
          ? error.message
          : error
      );

      process.exitCode = 1;
    }
  });

/* =========================================================
   OPTIMIZE
   ========================================================= */

program
  .command("optimize")
  .description("Build optimized context for a task")
  .argument("<task>", "developer task")
  .option("--diff", "include targeted Git diff")
  .action(
    (
      task: string,
      options: { diff?: boolean }
    ) => {
      const root = rootDir();

      const spinner = ora(
        "Optimizing context..."
      ).start();

      try {
        const result = optimizeContext(
          root,
          task,
          Boolean(options.diff)
        );

        spinner.succeed("Context optimized");

        console.log(
          chalk.cyan(
            "\nTOKENCLI OPTIMIZATION REPORT"
          )
        );

        console.log(
          "────────────────────────────────"
        );

        console.log(`Task             : ${task}`);

        console.log(
          `Files scanned    : ${result.filesScanned}`
        );

        console.log(
          `Files selected   : ${result.filesSelected.length}`
        );

        console.log(
          `Original tokens  : ${result.originalTokens}`
        );

        console.log(
          `Optimized tokens : ${result.optimizedTokens}`
        );

        console.log(
          `Tokens saved     : ${
            result.originalTokens -
            result.optimizedTokens
          }`
        );

        console.log(
          `Reduction        : ${chalk.bold(
            result.reductionPercent + "%"
          )}`
        );

        console.log(
          `Secrets redacted : ${result.redactions}`
        );

        console.log("\nSelected files:");

        result.filesSelected.forEach(
          (file) =>
            console.log(`  • ${file}`)
        );

        console.log(
          "\nOptimized context preview:"
        );

        console.log(
          result.context.slice(0, 5000)
        );
      } catch (error) {
        spinner.fail("Optimization failed");

        console.error(
          error instanceof Error
            ? error.message
            : error
        );

        process.exitCode = 1;
      }
    }
  );

/* =========================================================
   REFACTOR
   ========================================================= */

program
  .command("refactor")
  .description(
    "Generate an LLM-assisted refactoring patch"
  )
  .argument("<task>", "refactoring task")
  .option(
    "--diff",
    "include targeted Git diff"
  )
  .option(
    "--verify",
    "run local verification commands"
  )
  .option(
    "--apply",
    "apply the generated patch to the repository"
  )
  .action(
    async (
      task: string,
      options: {
        diff?: boolean;
        verify?: boolean;
        apply?: boolean;
      }
    ) => {
      const root = rootDir();

      const spinner = ora(
        "Building optimized context..."
      ).start();

      try {
        /* -----------------------------------------
           1. Optimize context
           ----------------------------------------- */

        const optimized =
          optimizeContext(
            root,
            task,
            Boolean(options.diff)
          );

        spinner.text =
          "Calling LLM with optimized context...";

        /* -----------------------------------------
           2. Generate refactoring
           ----------------------------------------- */

        const result =
          await runRefactor(
            optimized.context,
            task
          );

        /* -----------------------------------------
           3. Apply patch
           ----------------------------------------- */

        let applyResult:
          | ReturnType<typeof applyPatch>
          | null = null;

        if (options.apply) {
          spinner.text =
            "Applying generated patch...";

          applyResult = applyPatch(
            root,
            result.patch
          );

          if (!applyResult.applied) {
            spinner.fail(
              "Patch application failed"
            );

            console.error(
              `\n${applyResult.message}`
            );

            process.exitCode = 1;
            return;
          }
        }

        /* -----------------------------------------
           4. Verify
           ----------------------------------------- */

        if (options.verify) {
          spinner.text =
            "Verifying repository...";

          result.verification =
            verify(root);

          const verificationPassed =
            result.verification.typecheck &&
            result.verification.lint &&
            result.verification.tests;

          /* -----------------------------------------
             5. Automatic rollback
             ----------------------------------------- */

          if (
            options.apply &&
            applyResult?.applied &&
            !verificationPassed &&
            applyResult.backupPath &&
            applyResult.files.length > 0
          ) {
            spinner.text =
              "Verification failed. Rolling back...";

            const targetFile = path.resolve(
              root,
              applyResult.files[0]
            );

            try {
              fs.copyFileSync(
                applyResult.backupPath,
                targetFile
              );

              fs.unlinkSync(
                applyResult.backupPath
              );

              console.log(
                "\nRollback: Original file restored."
              );
            } catch (rollbackError) {
              console.error(
                "\nRollback failed:"
              );

              console.error(
                rollbackError instanceof Error
                  ? rollbackError.message
                  : rollbackError
              );

              process.exitCode = 1;
            }
          }
        }

        spinner.succeed(
          "Refactoring response received"
        );

        /* -----------------------------------------
           6. Result
           ----------------------------------------- */

        console.log(
          chalk.cyan(
            "\nTOKENCLI REFACTOR RESULT"
          )
        );

        console.log(
          "────────────────────────────────"
        );

        console.log(
          result.summary
        );

        console.log(
          `\nOptimized tokens: ${
            optimized.optimizedTokens
          }`
        );

        console.log(
          `Estimated reduction: ${
            optimized.reductionPercent
          }%`
        );

        /* -----------------------------------------
           Files
           ----------------------------------------- */

        console.log("\nFiles:");

        result.files.forEach(
          (file: string) =>
            console.log(`  • ${file}`)
        );

        /* -----------------------------------------
           Patch
           ----------------------------------------- */

        console.log("\nPatch:");

        console.log(result.patch);

        /* -----------------------------------------
           Apply result
           ----------------------------------------- */

        if (applyResult) {
          console.log("\nApply:");

          console.log(
            `  ${applyResult.message}`
          );

          if (applyResult.backupPath) {
            console.log(
              `  Backup: ${applyResult.backupPath}`
            );
          }
        }

        /* -----------------------------------------
           Verification
           ----------------------------------------- */

        console.log("\nVerification:");

        console.log(
          `  Typecheck: ${
            result.verification.typecheck
              ? "PASS"
              : "NOT RUN / FAIL"
          }`
        );

        console.log(
          `  Lint     : ${
            result.verification.lint
              ? "PASS"
              : "NOT RUN / FAIL"
          }`
        );

        console.log(
          `  Tests    : ${
            result.verification.tests
              ? "PASS"
              : "NOT RUN / FAIL"
          }`
        );

        /* -----------------------------------------
           Final exit status
           ----------------------------------------- */

        if (
          options.verify &&
          !result.verification.typecheck
        ) {
          process.exitCode = 1;
        }

        if (
          options.verify &&
          options.apply &&
          !(
            result.verification.typecheck &&
            result.verification.lint &&
            result.verification.tests
          )
        ) {
          process.exitCode = 1;
        }

      } catch (error) {
        spinner.fail(
          "Refactoring failed"
        );

        console.error(
          error instanceof Error
            ? error.message
            : error
        );

        process.exitCode = 1;
      }
    }
  );

/* =========================================================
   REPORT
   ========================================================= */

program
  .command("report")
  .description(
    "Print project build status and usage guidance"
  )
  .action(() => {
    console.log(
      chalk.cyan("\nTOKENCLI MVP")
    );

    console.log(
      "────────────────────────────────"
    );

    console.log(
      "1. tokencli analyze"
    );

    console.log(
      '2. tokencli optimize "your task"'
    );

    console.log(
      '3. tokencli optimize "review changes" --diff'
    );

    console.log(
      '4. tokencli refactor "your refactoring task"'
    );

    console.log(
      '5. tokencli refactor "your task" --verify --apply'
    );

    console.log(
      "\nThe optimizer calculates actual token reduction; it does not hard-code the target percentage."
    );
  });

program.parseAsync(process.argv);