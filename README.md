# tanstack-query-detect-waterfall

Auto-detect query waterfalls in your Tanstack Query project.

If multiple queries are run in sequence instead of parallel, the plugin will warn you and suggest solutions to fix the issue. No need to open a network profiler, and it works for any async operation. This can prove especially useful with React Suspense to catch waterfall introductions immediately.

# Example

```ts
if (__DEV__) {
  const { trackQueryWaterfalls } = require("@bamlab/tanstack-query-detect-waterfall");
  trackQueryWaterfalls();
}
```

# Installation

```bash
npm install @bamlab/tanstack-query-detect-waterfall --save-dev
# or
pnpm add @bamlab/tanstack-query-detect-waterfall --dev
# or
yarn add @bamlab/tanstack-query-detect-waterfall --dev
# or
bun add @bamlab/tanstack-query-detect-waterfall --dev
```
