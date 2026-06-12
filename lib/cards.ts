import { randomUUID } from "expo-crypto";
import {
  addToSyncQueue,
  getLocalCards,
  setLocalCards,
} from "./localStorage";
import { Card, CardCategory, CardInsert, CardUpdate } from "./types";

export async function fetchCards(): Promise<Card[]> {
  return getLocalCards();
}

export async function fetchCardsByCategory(
  category: CardCategory,
): Promise<Card[]> {
  const cards = await getLocalCards();
  return cards.filter((c) => c.category === category);
}

export async function fetchCardCounts(): Promise<
  Record<CardCategory, number>
> {
  const cards = await getLocalCards();
  const counts: Record<CardCategory, number> = {
    word: 0,
    phrase: 0,
    pattern: 0,
  };
  cards.forEach((c) => counts[c.category]++);
  return counts;
}

export async function addCard(card: CardInsert): Promise<Card> {
  const now = new Date().toISOString();
  const newCard: Card = {
    id: randomUUID(),
    ...card,
    created_at: now,
    updated_at: now,
  };
  const cards = await getLocalCards();
  cards.unshift(newCard);
  // Independent storage keys (@cards vs @sync_queue) — write them concurrently.
  await Promise.all([
    setLocalCards(cards),
    addToSyncQueue({ type: "UPSERT", card: newCard }),
  ]);
  return newCard;
}

export async function updateCard(
  id: string,
  updates: CardUpdate,
): Promise<Card> {
  const cards = await getLocalCards();
  const index = cards.findIndex((c) => c.id === id);
  if (index === -1) throw new Error("Card not found");

  const updated: Card = {
    ...cards[index],
    ...updates,
    updated_at: new Date().toISOString(),
  };
  cards[index] = updated;
  await Promise.all([
    setLocalCards(cards),
    addToSyncQueue({ type: "UPSERT", card: updated }),
  ]);
  return updated;
}

export async function deleteCard(id: string): Promise<void> {
  const cards = await getLocalCards();
  await Promise.all([
    setLocalCards(cards.filter((c) => c.id !== id)),
    addToSyncQueue({ type: "DELETE", cardId: id }),
  ]);
}
