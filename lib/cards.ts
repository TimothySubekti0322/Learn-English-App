import { supabase } from "./supabase";
import { Card, CardCategory, CardInsert, CardUpdate } from "./types";

const TABLE_NAME = "cards";

export async function fetchCards(): Promise<Card[]> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as Card[];
}

export async function fetchCardsByCategory(
  category: CardCategory
): Promise<Card[]> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("*")
    .eq("category", category)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as Card[];
}

export async function fetchCardCounts(): Promise<
  Record<CardCategory, number>
> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("category");

  if (error) throw error;

  const counts: Record<CardCategory, number> = {
    word: 0,
    phrase: 0,
    pattern: 0,
  };

  (data as { category: CardCategory }[]).forEach((row) => {
    counts[row.category]++;
  });

  return counts;
}

export async function addCard(card: CardInsert): Promise<Card> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert(card)
    .select()
    .single();

  if (error) throw error;
  return data as Card;
}

export async function updateCard(
  id: string,
  updates: CardUpdate
): Promise<Card> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Card;
}

export async function deleteCard(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE_NAME).delete().eq("id", id);

  if (error) throw error;
}
