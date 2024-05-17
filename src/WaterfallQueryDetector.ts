import { Query, QueryClient, QueryKey, matchQuery, notifyManager } from "@tanstack/query-core";
import differenceBy from "lodash/differenceBy";

export interface Waterfall {
  from: Query;
  to: Query;
}

export interface WhitelistEntry {
  from: QueryKey;
  to: QueryKey;
}

export interface WaterfallQueryDetectorOptions {
  whitelist?: WhitelistEntry[];
}

export class WaterfallQueryDetector {
  constructor(private queryClient: QueryClient, private options: WaterfallQueryDetectorOptions = {}) {}

  private previousPendingQueries: Query[] = [];
  private currentPendingQueries: Query[] = [];

  private get queryCache() {
    return this.queryClient.getQueryCache();
  }

  // This function is used to get all the pending queries
  // We check for queries with status "pending" or "loading"
  // We need this for retrocompatibility with ReactQuery 4
  private getPendingQueries() {
    return this.queryCache.findAll({ predicate: (query) => ["pending", "loading"].includes(query.state.status) });
  }

  private getPendingQueryChanges(previousPendingQueries: Query[], currentPendingQueries: Query[]) {
    const newQueries = differenceBy(currentPendingQueries, previousPendingQueries, (query) => query.queryHash);
    const removedQueries = differenceBy(previousPendingQueries, currentPendingQueries, (query) => query.queryHash);

    return { newPendingQueries: newQueries, removedPendingQueries: removedQueries };
  }

  // This function is used to check if a waterfall is whitelisted
  private isWhiteListed(waterfall: Waterfall) {
    if (!this.options.whitelist) return false;

    this.options.whitelist.some((entry) => {
      return matchQuery({ queryKey: entry.from }, waterfall.from) && matchQuery({ queryKey: entry.to }, waterfall.to);
    });
  }

  watchQueryWaterfall() {
    this.previousPendingQueries = this.getPendingQueries();

    return this.queryCache.subscribe(
      notifyManager.batchCalls(() => {
        // Snapshot current pending queries
        this.currentPendingQueries = this.getPendingQueries();

        // Get the new and removed pending queries
        const { newPendingQueries, removedPendingQueries } = this.getPendingQueryChanges(
          this.previousPendingQueries,
          this.currentPendingQueries
        );

        // If no changes, return
        if (newPendingQueries.length === 0 && removedPendingQueries.length === 0) return;

        // else, update previousPendingQueries
        this.previousPendingQueries = this.currentPendingQueries;

        // Whitelisted waterfalls
        let waterfalledQueries = [];
        for (const newPendingQuery of newPendingQueries) {
          for (const removedPendingQuery of removedPendingQueries) {
            const waterfall = { from: removedPendingQuery, to: newPendingQuery };

            if (this.isWhiteListed(waterfall)) {
              continue;
            }

            waterfalledQueries.push(waterfall);
          }
        }

        // Log waterfalls
        if (waterfalledQueries.length > 0) {
          this.logQueryWaterfalls(waterfalledQueries);
        }
      })
    );
  }

  private logQueryWaterfalls(waterfalledQueriesToLog: Waterfall[]) {
    const formattedWaterfalls = waterfalledQueriesToLog
      .map((waterfall) => `${waterfall.from.queryHash} --> ${waterfall.to.queryHash}`)
      .join("\n");

    console.log(
      `Detected query waterfalls: 
        ${formattedWaterfalls}
        
      This can lead to performance issues.

      If you REALLY think it's normal, you can whitelist this waterfall.

      Otherwise, try these tips to fix it:
      - If the backend allows it, try batching the queries together in a single query.
      - Do not call two \`useSuspenseQuery\` in the same component, or in a parent and a child. Instead, call your hooks as low as possible in your React tree, closer to where you need it. Reorganize your components if needed. Note: won't work with React 19, see https://github.com/facebook/react/pull/26380
      - Try \`useQueries\` / \`useSuspenseQueries\` to fetch several queries in parallel.
      - As a last resort, use \`queryClient.prefetchQuery\` to fetch data ahead of time
`
    );
  }
}
