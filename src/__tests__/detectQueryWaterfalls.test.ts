import { QueryClient } from "@tanstack/query-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { detectQueryWaterfalls } from "../index";

/**
 * These tests drive a real `QueryClient` from `@tanstack/query-core` (no mocks of
 * the query cache) and assert on the payload the detector actually hands to
 * `console.warn`. The same file runs twice, once per major, via the two vitest
 * projects declared in `vitest.config.ts`.
 */

type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void };

const deferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

/** Let the notifyManager's scheduled batches (setTimeout 0) drain. */
const flush = async () => {
  for (let i = 0; i < 5; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
};

let queryClient: QueryClient;
let warn: ReturnType<typeof vi.spyOn>;

/** The `from --> to` lines of every warning emitted so far, in order. */
const detectedWaterfalls = (): string[] =>
  warn.mock.calls.flatMap(([message]) =>
    String(message)
      .split("\n")
      .filter((line) => line.includes(" --> "))
      .map((line) => line.trim())
  );

beforeEach(() => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  warn.mockRestore();
  queryClient.clear();
});

/**
 * Runs `queryKeys` strictly one after the other: each query only starts once the
 * previous one has settled, which is exactly the dependent-query waterfall shape.
 */
const runSequentially = async (queryKeys: string[]) => {
  for (const key of queryKeys) {
    const gate = deferred<string>();
    const query = queryClient.fetchQuery({ queryKey: [key], queryFn: () => gate.promise });
    await flush();
    gate.resolve(key);
    await query;
  }
  await flush();
};

describe("detectQueryWaterfalls", () => {
  it("reports exactly one waterfall, with the right from/to keys, for two sequential queries", async () => {
    detectQueryWaterfalls(queryClient);

    await runSequentially(["first", "second"]);

    expect(detectedWaterfalls()).toEqual(['["first"] --> ["second"]']);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain("Detected query waterfalls");
  });

  it("reports nothing for two parallel queries", async () => {
    detectQueryWaterfalls(queryClient);

    const first = deferred<string>();
    const second = deferred<string>();
    const queries = Promise.all([
      queryClient.fetchQuery({ queryKey: ["first"], queryFn: () => first.promise }),
      queryClient.fetchQuery({ queryKey: ["second"], queryFn: () => second.promise }),
    ]);
    await flush();
    first.resolve("first");
    second.resolve("second");
    await queries;
    await flush();

    expect(detectedWaterfalls()).toEqual([]);
    expect(warn).not.toHaveBeenCalled();
  });

  it("reports nothing when the sequential pair is whitelisted", async () => {
    detectQueryWaterfalls(queryClient, { whitelist: [{ from: ["first"], to: ["second"] }] });

    await runSequentially(["first", "second"]);

    expect(detectedWaterfalls()).toEqual([]);
    expect(warn).not.toHaveBeenCalled();
  });

  it("only whitelists the exact pair, not the whole chain", async () => {
    detectQueryWaterfalls(queryClient, { whitelist: [{ from: ["first"], to: ["second"] }] });

    await runSequentially(["first", "second", "third"]);

    expect(detectedWaterfalls()).toEqual(['["second"] --> ["third"]']);
  });

  it("reports each link of a three-query chain separately", async () => {
    detectQueryWaterfalls(queryClient);

    await runSequentially(["first", "second", "third"]);

    expect(detectedWaterfalls()).toEqual(['["first"] --> ["second"]', '["second"] --> ["third"]']);
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it("stops detecting once the returned unsubscribe function is called", async () => {
    const unsubscribe = detectQueryWaterfalls(queryClient);
    expect(typeof unsubscribe).toBe("function");

    unsubscribe();
    await runSequentially(["first", "second"]);

    expect(detectedWaterfalls()).toEqual([]);
    expect(warn).not.toHaveBeenCalled();
  });

  it("keeps detecting waterfalls that start after an unrelated query has settled", async () => {
    detectQueryWaterfalls(queryClient);

    // A first, isolated query: it settles with nothing else in flight, so it is
    // not the source of a waterfall.
    await runSequentially(["standalone"]);
    expect(detectedWaterfalls()).toEqual([]);

    await runSequentially(["first", "second"]);
    expect(detectedWaterfalls()).toEqual(['["first"] --> ["second"]']);
  });
});
