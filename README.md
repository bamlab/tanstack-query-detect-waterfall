# tanstack-query-detect-waterfall

Auto-detect query waterfalls in your Tanstack Query project.

If multiple queries are run in sequence instead of parallel, the plugin will warn you and suggest solutions to fix the issue. No need to open a network profiler, and it works for any async operation. This can prove especially useful with React Suspense to catch waterfall introductions immediately.

# Example

```ts
const queryClient = new QueryClient();

if (__DEV__) {
  const { detectQueryWaterfalls } = require("@bam.tech/tanstack-query-detect-waterfall");
  detectQueryWaterfalls(queryClient);
}
```

If you need to ignore dependent queries, you can do:

```ts
detectQueryWaterfalls(queryClient, {
  whitelist: [
    { from: ["myquerykey", 1], to: ["otherquerykey", 2] },
    { from: ["yetanotherquerykey"], to: ["andalastone"] },
  ],
});
```

# Installation

```bash
npm install @bam.tech/tanstack-query-detect-waterfall --save-dev
# or
pnpm add @bam.tech/tanstack-query-detect-waterfall --dev
# or
yarn add @bam.tech/tanstack-query-detect-waterfall --dev
# or
bun add @bam.tech/tanstack-query-detect-waterfall --dev
```
