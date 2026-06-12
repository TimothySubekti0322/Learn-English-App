import AsyncStorage from "@react-native-async-storage/async-storage";
import { Card } from "./types";

const CARDS_KEY = "@cards";
const SYNC_QUEUE_KEY = "@sync_queue";
const INITIALIZED_KEY = "@cards_initialized";

// ─── Sync Queue Types ────────────────────────────────────────

export type SyncQueueEntry =
  | { type: "UPSERT"; card: Card }
  | { type: "DELETE"; cardId: string };

// ─── Cards CRUD ──────────────────────────────────────────────

export async function getLocalCards(): Promise<Card[]> {
  const json = await AsyncStorage.getItem(CARDS_KEY);
  return json ? (JSON.parse(json) as Card[]) : [];
}

export async function setLocalCards(cards: Card[]): Promise<void> {
  await AsyncStorage.setItem(CARDS_KEY, JSON.stringify(cards));
}

// ─── Sync Queue ──────────────────────────────────────────────

export async function getSyncQueue(): Promise<SyncQueueEntry[]> {
  const json = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
  return json ? (JSON.parse(json) as SyncQueueEntry[]) : [];
}

async function setSyncQueue(queue: SyncQueueEntry[]): Promise<void> {
  await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
}

export async function addToSyncQueue(entry: SyncQueueEntry): Promise<void> {
  const queue = await getSyncQueue();

  if (entry.type === "UPSERT") {
    // Replace existing UPSERT for the same card, or append
    const idx = queue.findIndex(
      (e) => e.type === "UPSERT" && e.card.id === entry.card.id,
    );
    if (idx !== -1) {
      queue[idx] = entry;
    } else {
      queue.push(entry);
    }
  } else {
    // DELETE — check if there's a pending UPSERT for this card
    const idx = queue.findIndex(
      (e) => e.type === "UPSERT" && e.card.id === entry.cardId,
    );
    if (idx !== -1) {
      // Card was created/updated offline and never synced → just remove from queue
      queue.splice(idx, 1);
    } else {
      // Card exists in DB → queue the DELETE
      queue.push(entry);
    }
  }

  await setSyncQueue(queue);
}

export async function clearSyncQueue(): Promise<void> {
  await AsyncStorage.removeItem(SYNC_QUEUE_KEY);
}

export async function removeQueueEntry(index: number): Promise<void> {
  const queue = await getSyncQueue();
  queue.splice(index, 1);
  await setSyncQueue(queue);
}

// ─── Initialization flag ─────────────────────────────────────

export async function isLocalInitialized(): Promise<boolean> {
  const val = await AsyncStorage.getItem(INITIALIZED_KEY);
  return val === "true";
}

export async function markLocalInitialized(): Promise<void> {
  await AsyncStorage.setItem(INITIALIZED_KEY, "true");
}
