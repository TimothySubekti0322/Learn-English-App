export type CardCategory = "word" | "phrase" | "pattern";

export interface Card {
  id: string;
  category: CardCategory;
  term: string;
  definition: string;
  example: string;
  created_at: string;
  updated_at: string;
}

export interface CardInsert {
  category: CardCategory;
  term: string;
  definition: string;
  example: string;
}

export interface CardUpdate {
  term?: string;
  definition?: string;
  example?: string;
  updated_at?: string;
}
