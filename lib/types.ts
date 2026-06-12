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

// ─── Quiz Types ──────────────────────────────────────────────

export interface QuizRecord {
  id: string;
  quiz_date: string; // YYYY-MM-DD
  correct_count: number;
  created_at: string;
  updated_at: string;
}

export interface QuizRecordUpsert {
  quiz_date: string;
  correct_count: number;
}

export interface QuizAttempt {
  id: string;
  card_id: string;
  term: string;
  card_category: CardCategory;
  is_correct: boolean;
  user_example: string | null;
  attempted_at: string;
}

export interface QuizAttemptInsert {
  card_id: string;
  term: string;
  card_category: CardCategory;
  is_correct: boolean;
  user_example?: string | null;
}
