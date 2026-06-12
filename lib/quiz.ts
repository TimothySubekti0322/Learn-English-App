import { supabase } from "./supabase";
import {
  QuizAttempt,
  QuizAttemptInsert,
  QuizRecord,
  QuizRecordUpsert,
} from "./types";

// ─── Quiz Records (daily totals) ────────────────────────────

const RECORDS_TABLE = "quiz_records";

export async function fetchLast7DaysRecords(): Promise<QuizRecord[]> {
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 6);

  const fromDate = sevenDaysAgo.toISOString().split("T")[0];
  const toDate = today.toISOString().split("T")[0];

  const { data, error } = await supabase
    .from(RECORDS_TABLE)
    .select("*")
    .gte("quiz_date", fromDate)
    .lte("quiz_date", toDate)
    .order("quiz_date", { ascending: true });

  if (error) throw error;
  return data as QuizRecord[];
}

export async function fetchQuizRecords(): Promise<QuizRecord[]> {
  const { data, error } = await supabase
    .from(RECORDS_TABLE)
    .select("*")
    .order("quiz_date", { ascending: false });

  if (error) throw error;
  return data as QuizRecord[];
}

export async function upsertQuizRecord(
  record: QuizRecordUpsert,
): Promise<QuizRecord> {
  const { data, error } = await supabase
    .from(RECORDS_TABLE)
    .upsert(record, { onConflict: "quiz_date" })
    .select()
    .single();

  if (error) throw error;
  return data as QuizRecord;
}

// ─── Quiz Attempts (individual answers) ─────────────────────

const ATTEMPTS_TABLE = "quiz_attempts";

export async function fetchAttemptsByDate(
  date: string,
): Promise<QuizAttempt[]> {
  const startOfDay = `${date}T00:00:00.000Z`;
  const endOfDay = `${date}T23:59:59.999Z`;

  const { data, error } = await supabase
    .from(ATTEMPTS_TABLE)
    .select("*")
    .gte("attempted_at", startOfDay)
    .lte("attempted_at", endOfDay)
    .order("attempted_at", { ascending: true });

  if (error) throw error;
  return data as QuizAttempt[];
}

export async function fetchAttemptsByDateRange(
  fromDate: string,
  toDate: string,
): Promise<QuizAttempt[]> {
  const start = `${fromDate}T00:00:00.000Z`;
  const end = `${toDate}T23:59:59.999Z`;

  const { data, error } = await supabase
    .from(ATTEMPTS_TABLE)
    .select("*")
    .gte("attempted_at", start)
    .lte("attempted_at", end)
    .order("attempted_at", { ascending: true });

  if (error) throw error;
  return data as QuizAttempt[];
}

export async function insertQuizAttempt(
  attempt: QuizAttemptInsert,
): Promise<QuizAttempt> {
  const { data, error } = await supabase
    .from(ATTEMPTS_TABLE)
    .insert(attempt)
    .select()
    .single();

  if (error) throw error;
  return data as QuizAttempt;
}
