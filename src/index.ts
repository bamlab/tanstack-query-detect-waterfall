import { QueryClient } from "@tanstack/query-core";
import { WaterfallQueryDetector, WaterfallQueryDetectorOptions } from "./WaterfallQueryDetector";

export const detectQueryWaterfalls = (queryClient: QueryClient, options?: WaterfallQueryDetectorOptions) => {
  return new WaterfallQueryDetector(queryClient, options).watchQueryWaterfall();
};
