import {
  getLocalCards,
  markLocalInitialized,
  setLocalCards,
} from "./localStorage";
import { supabase } from "./supabase";
import { processSyncQueue } from "./syncQueue";
import { Card } from "./types";

export interface SyncResult {
  pushed: number;
  pulled: number;
  updated: number;
  deleted: number;
}

export async function syncCards(): Promise<SyncResult> {
  const result: SyncResult = { pushed: 0, pulled: 0, updated: 0, deleted: 0 };

  // 1. Process pending queue first (pushes offline changes to DB)
  const queueProcessed = await processSyncQueue();
  result.pushed += queueProcessed;

  // 2. Fetch local and remote for bidirectional merge
  const localCards = await getLocalCards();

  const { data: remoteData, error } = await supabase
    .from("cards")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  const remoteCards = remoteData as Card[];

  // 3. Build lookup maps
  const localMap = new Map(localCards.map((c) => [c.id, c]));
  const remoteMap = new Map(remoteCards.map((c) => [c.id, c]));

  // 4. Merge
  const mergedCards: Card[] = [];

  for (const [id, localCard] of localMap) {
    const remoteCard = remoteMap.get(id);

    if (!remoteCard) {
      // Local-only (queue already pushed it, but upsert again to be safe)
      const { error: upsErr } = await supabase.from("cards").upsert(localCard);
      if (!upsErr) result.pushed++;
      mergedCards.push(localCard);
    } else {
      // Both exist → newer updated_at wins
      const localTime = new Date(localCard.updated_at).getTime();
      const remoteTime = new Date(remoteCard.updated_at).getTime();

      if (localTime > remoteTime) {
        const { error: updErr } = await supabase
          .from("cards")
          .upsert(localCard);
        if (!updErr) result.updated++;
        mergedCards.push(localCard);
      } else if (remoteTime > localTime) {
        result.updated++;
        mergedCards.push(remoteCard);
      } else {
        mergedCards.push(localCard);
      }
      remoteMap.delete(id);
    }
  }

  // 5. Remote-only → pull to local
  for (const [, remoteCard] of remoteMap) {
    mergedCards.push(remoteCard);
    result.pulled++;
  }

  // 6. Sort and save
  mergedCards.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  await setLocalCards(mergedCards);
  await markLocalInitialized();

  return result;
}
