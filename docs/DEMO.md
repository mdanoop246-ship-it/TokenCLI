# TokenCLI Demo

## 1. Install

From the TokenCLI root:

```bash
npm install
npm run build
```

## 2. Analyze the sample repository

```bash
cd examples/sample-project
npx --prefix ../.. tokencli analyze
```

If using the source directly from the root:

```bash
cd ../..
npm run dev -- analyze
```

## 3. Demonstrate optimization

From the sample repository:

```bash
npm run --prefix ../.. dev -- optimize "fix login authentication validation"
```

Compare:

- Original tokens
- Optimized tokens
- Tokens saved
- Reduction percentage
- Selected files

## 4. LLM demo

Set your key in the TokenCLI `.env` or shell:

```text
ANTHROPIC_API_KEY=your_key
```

Then:

```bash
npm run dev -- refactor "improve login authentication validation"
```

## 5. Judge/examiner explanation

Say:

> TokenCLI does not blindly send the whole repository to the LLM. It first understands the repository locally, identifies relevant symbols and files, slices the Git diff when needed, removes unnecessary context, redacts secrets, measures the token reduction, and only then sends the compact context to the model. The generated change can then be verified locally.
