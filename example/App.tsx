import { detectQueryWaterfalls } from "@bam.tech/tanstack-query-detect-waterfall";
import { QueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

const queryClient = new QueryClient();

/**
 * The detector reports through `console.warn`. We tap that channel and parse the
 * `from --> to` lines out of its real payload so every detection it makes shows
 * up on screen. Nothing is synthesised here.
 */
type Listener = (line: string) => void;
const listeners = new Set<Listener>();

const originalWarn = console.warn.bind(console);
console.warn = (...args: unknown[]) => {
  const message = String(args[0] ?? "");
  if (message.startsWith("Detected query waterfalls")) {
    message
      .split("\n")
      .filter((line) => line.includes(" --> "))
      .forEach((line) => listeners.forEach((listener) => listener(line.trim())));
  }
  originalWarn(...args);
};

detectQueryWaterfalls(queryClient);

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let run = 0;

const fetchQuery = (name: string) =>
  queryClient.fetchQuery({
    queryKey: [name, run],
    queryFn: async () => {
      await delay(300);
      return name;
    },
  });

export default function App() {
  const [waterfalls, setWaterfalls] = useState<string[]>([]);
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    const listener: Listener = (line) => setWaterfalls((previous) => [...previous, line]);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const runSequential = async () => {
    run += 1;
    setStatus("running 2 sequential queries…");
    const user = await fetchQuery("user");
    // `posts` only starts once `user` has resolved: a textbook waterfall.
    await fetchQuery(`posts-of-${user}`);
    setStatus("sequential run done");
  };

  const runParallel = async () => {
    run += 1;
    setStatus("running 2 parallel queries…");
    await Promise.all([fetchQuery("profile"), fetchQuery("settings")]);
    setStatus("parallel run done");
  };

  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.title}>Waterfall detector E2E</Text>
      <Text style={styles.subtitle}>@tanstack/react-query v5 · Expo Go</Text>

      <Pressable testID="run-sequential" style={styles.button} onPress={runSequential}>
        <Text style={styles.buttonLabel}>Run 2 SEQUENTIAL queries</Text>
      </Pressable>
      <Pressable testID="run-parallel" style={[styles.button, styles.parallel]} onPress={runParallel}>
        <Text style={styles.buttonLabel}>Run 2 PARALLEL queries</Text>
      </Pressable>

      <Text testID="status" style={styles.status}>
        Status: {status}
      </Text>
      <Text testID="waterfall-count" style={styles.count}>
        Detected waterfalls: {waterfalls.length}
      </Text>

      <ScrollView testID="waterfall-list" style={styles.list}>
        {waterfalls.length === 0 ? (
          <Text testID="waterfall-empty" style={styles.empty}>
            No waterfall detected yet
          </Text>
        ) : (
          waterfalls.map((line, index) => (
            <View key={`${line}-${index}`} style={styles.item}>
              <Text testID={`waterfall-${index}`} style={styles.itemText}>
                {line}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0f172a", paddingHorizontal: 20, paddingTop: 60 },
  title: { color: "#f8fafc", fontSize: 24, fontWeight: "700" },
  subtitle: { color: "#94a3b8", fontSize: 13, marginBottom: 24 },
  button: { backgroundColor: "#ef4444", borderRadius: 10, paddingVertical: 16, marginBottom: 12 },
  parallel: { backgroundColor: "#22c55e" },
  buttonLabel: { color: "#0f172a", fontSize: 16, fontWeight: "700", textAlign: "center" },
  status: { color: "#cbd5f5", fontSize: 14, marginTop: 8 },
  count: { color: "#f8fafc", fontSize: 18, fontWeight: "700", marginTop: 4, marginBottom: 12 },
  list: { flex: 1, backgroundColor: "#1e293b", borderRadius: 10, padding: 12 },
  empty: { color: "#64748b", fontStyle: "italic" },
  item: { borderBottomColor: "#334155", borderBottomWidth: 1, paddingVertical: 8 },
  itemText: { color: "#fca5a5", fontFamily: "Courier", fontSize: 13 },
});
