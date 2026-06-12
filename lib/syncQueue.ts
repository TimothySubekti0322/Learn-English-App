import NetInfo, { NetInfoSubscription } from "@react-native-community/netinfo";
import { getSyncQueue, removeQueueEntry } from "./localStorage";
import { startNetworkMonitor, stopNetworkMonitor } from "./network";
import { processQuizSyncQueue } from "./quizCache";
import { supabase } from "./supabase";

let subscription: NetInfoSubscription | null = null;
let processing = false;

export async function processSyncQueue(): Promise<number> {
  if (processing) return 0;
  processing = true;

  let processed = 0;

  try {
    let queue = await getSyncQueue();

    while (queue.length > 0) {
      const entry = queue[0];
      let success = false;

      if (entry.type === "UPSERT") {
        const { error } = await supabase.from("cards").upsert(entry.card);
        success = !error;
      } else {
        const { error } = await supabase
          .from("cards")
          .delete()
          .eq("id", entry.cardId);
        success = !error;
      }

      if (success) {
        await removeQueueEntry(0);
        processed++;
        queue = await getSyncQueue();
      } else {
        // Stop on first failure — retry next time connectivity is restored
        break;
      }
    }
  } finally {
    processing = false;
  }

  return processed;
}

export function startNetworkListener(): void {
  // Keep the cached connectivity state warm for synchronous isOnline() reads.
  startNetworkMonitor();

  if (subscription) return; // already listening

  subscription = NetInfo.addEventListener((state) => {
    if (state.isConnected && state.isInternetReachable !== false) {
      processSyncQueue();
      processQuizSyncQueue();
    }
  });
}

export function stopNetworkListener(): void {
  stopNetworkMonitor();

  if (subscription) {
    subscription();
    subscription = null;
  }
}
