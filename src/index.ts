import { Query, QueryClient, QueryKey, matchQuery, notifyManager } from "@tanstack/query-core";
import differenceBy from "lodash/differenceBy";

type Waterfall = { from: Query; to: Query };
type Blacklist = { from: QueryKey; to: QueryKey }[];

const serializeQueryList = (queries: Query[]) => JSON.stringify(queries.map((query) => query.queryHash).sort());

const isSameQueryList = (a: Query[], b: Query[]) => serializeQueryList(a) === serializeQueryList(b);

const getPendingQueries = (queryClient: QueryClient) =>
  queryClient.getQueryCache().findAll({ predicate: (query) => query.state.status === "pending" });

const isBlacklisted = (waterfall: Waterfall, blacklist: Blacklist) =>
  blacklist.some(
    (blacklisted) =>
      matchQuery({ queryKey: blacklisted.from }, waterfall.from) &&
      matchQuery({ queryKey: blacklisted.to }, waterfall.to)
  );

export const trackQueryWaterfalls = (
  queryClient: QueryClient,
  options?: {
    blacklist?: Blacklist;
  }
) => {
  let pendingQueries = getPendingQueries(queryClient);

  return queryClient.getQueryCache().subscribe(
    notifyManager.batchCalls(() => {
      const newPendingQueries = getPendingQueries(queryClient);

      if (isSameQueryList(newPendingQueries, pendingQueries)) return;

      const startedQueries = differenceBy(newPendingQueries, pendingQueries, (query) => query.queryHash);
      const finishedQueries = differenceBy(pendingQueries, newPendingQueries, (query) => query.queryHash);

      const unfilteredWaterfalls = startedQueries.flatMap((startedQuery) =>
        finishedQueries.map((finishedQuery) => ({ from: finishedQuery, to: startedQuery }))
      );
      const blacklist = options?.blacklist;
      const waterfalls = blacklist
        ? unfilteredWaterfalls.filter((waterfall) => !isBlacklisted(waterfall, blacklist))
        : unfilteredWaterfalls;

      pendingQueries = newPendingQueries;

      if (waterfalls.length > 0) {
        console.warn(
          `Detected a query waterfall:
${waterfalls.map((waterfall) => `${waterfall.from.queryHash} --> ${waterfall.to.queryHash}`).join("\n")}

This can lead to performance issues.

If you REALLY think it's normal, you can blacklist this waterfall.

Otherwise, try these tips to fix it:
- If the backend allows it, try batching the queries together in a single query.
- Do not call two \`useSuspenseQuery\` in the same component, or in a parent and a child. Instead, call your hooks as low as possible in your React tree, closer to where you need it. Reorganize your components if needed. Note: won't work with React 19, see https://github.com/facebook/react/pull/26380
- Try \`useQueries\` / \`useSuspenseQueries\` to fetch several queries in parallel.
- As a last resort, use \`queryClient.prefetchQuery\` to fetch data ahead of time
`
        );
      }
    })
  );
};
