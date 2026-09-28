import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { z } from "zod";
import type { RefactorResult } from "../types.js";

const responseSchema = z.object({
  summary: z.string(),
  patch: z.string(),
  files: z.array(z.string())
});

export async function runRefactor(
  context: string,
  task: string
): Promise<RefactorResult> {

  // Demo mode when no API key is configured.
  if (!process.env.ANTHROPIC_API_KEY) {
    return runDemoRefactor(context, task);
  }

  // Real Anthropic mode.
  const modelName =
    process.env.TOKENCLI_MODEL ||
    "claude-3-5-haiku-latest";

  const prompt = `
You are TokenCLI, a repository-aware
software engineering assistant.

Task:
${task}

Optimized repository context:
${context}

Return ONLY valid JSON:

{
  "summary": "short explanation",
  "patch": "unified diff",
  "files": ["files changed"]
}

Generate a minimal and safe refactoring.
`;

  const result = await generateText({
    model: anthropic(modelName),
    prompt
  });

  let parsed: unknown;

  try {
    parsed = JSON.parse(result.text);
  } catch {
    const fenced = result.text.match(
      /```json\s*([\s\S]*?)```/i
    );

    parsed = JSON.parse(
      fenced?.[1] ?? result.text
    );
  }

  const data = responseSchema.parse(parsed);

  return {
    ...data,
    verification: {
      typecheck: false,
      lint: false,
      tests: false
    }
  };
}

/**
 * Local deterministic demo refactoring.
 */
function runDemoRefactor(
  context: string,
  task: string
): RefactorResult {

  /*
   * The optimized context can contain literal "\n"
   * sequences. Therefore we simply detect whether
   * auth.ts exists in the context instead of trying
   * to capture the entire line as a filename.
   */
  const authFileDetected =
    /\/\/ FILE:\s*(?:[^\\]|\\(?!n))*src[\/\\]auth\.ts/i.test(
      context
    );

  const authPath = "src/auth.ts";

  let patch = "";

  if (authFileDetected) {

    patch = `--- a/${authPath}
+++ b/${authPath}
@@
 export function authenticate(user: User, password: string): boolean {
-  if (!user || !password) return false;
-  return password.length >= 8;
+  if (!user || !password) {
+    return false;
+  }
+
+  if (password.length < 8) {
+    return false;
+  }
+
+  return true;
}
`;

  } else {

    patch = `# Demo Mode

No authentication file was detected
in the optimized repository context.

Task:
${task}
`;
  }

  return {
    summary:
      "Demo Mode generated a safe authentication validation refactoring patch without using an external LLM API.",

    patch,

    files: authFileDetected
      ? [authPath]
      : [],

    verification: {
      typecheck: false,
      lint: false,
      tests: false
    }
  };
}