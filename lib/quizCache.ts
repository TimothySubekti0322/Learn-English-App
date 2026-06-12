import AsyncStorage from "@react-native-async-storage/async-storage";
import { randomUUID } from "expo-crypto";
import { isOnline } from "./network";
import { insertQuizAttempt, upsertQuizRecord } from "./quiz";
import { supabase } from "./supabase";
import {
  QuizAttempt,
  QuizAttemptInsert,
  QuizRecord,
  QuizRecordUpsert,
} from "./types";

const CACHE_QUIZ_RECORDS = "@cache_quiz_records";
const CACHE_QUIZ_ATTEMPTS = "@cache_quiz_attempts";
const QUIZ_SYNC_QUEUE = "@quiz_sync_queue";

type QuizSyncEntry =
  | { type: "ATTEMPT"; data: QuizAttemptInsert }
  | { type: "RECORD"; data: QuizRecordUpsert };

// ─── Cache helpers ───────────────────────────────────────────

async function getCachedRecords(): Promise<QuizRecord[]> {
  const json = await AsyncStorage.getItem(CACHE_QUIZ_RECORDS);
  return json ? (JSON.parse(json) as QuizRecord[]) : [];
}

async function setCachedRecords(records: QuizRecord[]): Promise<void> {
  await AsyncStorage.setItem(CACHE_QUIZ_RECORDS, JSON.stringify(records));
}

// ─── Cache-aware fetch ───────────────────────────────────────

export async function fetchQuizRecordsCached(
  fromDate: string,
  toDate: string,
): Promise<QuizRecord[]> {
  if (isOnline()) {
    // Online: fetch from Supabase, update cache
    const { data, error } = await supabase
      .from("quiz_records")
      .select("*")
      .gte("quiz_date", fromDate)
      .lte("quiz_date", toDate)
      .order("quiz_date", { ascending: true });

    if (!error && data) {
      const records = data as QuizRecord[];
      // Merge into cache (keep existing records outside this range)
      const cached = await getCachedRecords();
      const fetchedIds = new Set(records.map((r) => r.id));
      const outside = cached.filter(
        (r) =>
          !fetchedIds.has(r.id) &&
          (r.quiz_date < fromDate || r.quiz_date > toDate),
      );
      const merged = [...outside, ...records].sort((a, b) =>
        a.quiz_date.localeCompare(b.quiz_date),
      );
      await setCachedRecords(merged);
      return records;
    }
  }

  // Offline or error: return from cache filtered by range
  const cached = await getCachedRecords();
  return cached.filter(
    (r) => r.quiz_date >= fromDate && r.quiz_date <= toDate,
  );
}

export async function fetchAllQuizRecordsCached(): Promise<QuizRecord[]> {
  if (isOnline()) {
    const { data, error } = await supabase
      .from("quiz_records")
      .select("*")
      .order("quiz_date", { ascending: true });

    if (!error && data) {
      const records = data as QuizRecord[];
      await setCachedRecords(records);
      return records;
    }
  }

  return getCachedRecords();
}

// ─── Attempt cache helpers ──────────────────────────────────

async function getCachedAttempts(): Promise<QuizAttempt[]> {
  const json = await AsyncStorage.getItem(CACHE_QUIZ_ATTEMPTS);
  return json ? (JSON.parse(json) as QuizAttempt[]) : [];
}

async function setCachedAttempts(attempts: QuizAttempt[]): Promise<void> {
  await AsyncStorage.setItem(CACHE_QUIZ_ATTEMPTS, JSON.stringify(attempts));
}

// ─── Quiz sync queue ────────────────────────────────────────

async function getQuizQueue(): Promise<QuizSyncEntry[]> {
  const json = await AsyncStorage.getItem(QUIZ_SYNC_QUEUE);
  return json ? (JSON.parse(json) as QuizSyncEntry[]) : [];
}

async function setQuizQueue(queue: QuizSyncEntry[]): Promise<void> {
  await AsyncStorage.setItem(QUIZ_SYNC_QUEUE, JSON.stringify(queue));
}

async function addToQuizQueue(entry: QuizSyncEntry): Promise<void> {
  const queue = await getQuizQueue();

  if (entry.type === "RECORD") {
    // Deduplicate: only keep the latest record per date
    const idx = queue.findIndex(
      (e) =>
        e.type === "RECORD" &&
        (e.data as QuizRecordUpsert).quiz_date ===
          (entry.data as QuizRecordUpsert).quiz_date,
    );
    if (idx >= 0) {
      queue[idx] = entry;
      await setQuizQueue(queue);
      return;
    }
  }

  queue.push(entry);
  await setQuizQueue(queue);
}

let quizProcessing = false;

export async function processQuizSyncQueue(): Promise<number> {
  if (quizProcessing) return 0;
  quizProcessing = true;
  let processed = 0;

  try {
    let queue = await getQuizQueue();

    while (queue.length > 0) {
      const entry = queue[0];
      let success = false;

      if (entry.type === "ATTEMPT") {
        const { error } = await supabase
          .from("quiz_attempts")
          .insert(entry.data);
        success = !error;
      } else {
        const { error } = await supabase
          .from("quiz_records")
          .upsert(entry.data, { onConflict: "quiz_date" });
        success = !error;
      }

      if (success) {
        queue.shift();
        await setQuizQueue(queue);
        processed++;
      } else {
        break; // Retry next time connectivity is restored
      }
    }
  } finally {
    quizProcessing = false;
  }

  return processed;
}

// ─── Cache-aware attempt fetch ──────────────────────────────

export async function fetchAttemptsCached(
  fromDate: string,
  toDate: string,
): Promise<QuizAttempt[]> {
  const start = `${fromDate}T00:00:00.000Z`;
  const end = `${toDate}T23:59:59.999Z`;
  if (isOnline()) {
    const { data, error } = await supabase
      .from("quiz_attempts")
      .select("*")
      .gte("attempted_at", start)
      .lte("attempted_at", end)
      .order("attempted_at", { ascending: true });

    if (!error && data) {
      const attempts = data as QuizAttempt[];
      // Merge into cache (keep existing records outside this range)
      const cached = await getCachedAttempts();
      const fetchedIds = new Set(attempts.map((a) => a.id));
      const outside = cached.filter(
        (a) =>
          !fetchedIds.has(a.id) &&
          (a.attempted_at < start || a.attempted_at > end),
      );
      const merged = [...outside, ...attempts].sort((a, b) =>
        a.attempted_at.localeCompare(b.attempted_at),
      );
      await setCachedAttempts(merged);
      return attempts;
    }
  }

  // Offline or error: return from cache filtered by range
  const cached = await getCachedAttempts();
  return cached.filter(
    (a) => a.attempted_at >= start && a.attempted_at <= end,
  );
}

// ─── Offline-safe attempt insert ────────────────────────────

export async function insertQuizAttemptCached(
  attempt: QuizAttemptInsert,
): Promise<QuizAttempt> {
  if (isOnline()) {
    try {
      const result = await insertQuizAttempt(attempt);
      const cached = await getCachedAttempts();
      cached.push(result);
      await setCachedAttempts(cached);
      return result;
    } catch {
      // Fall through to offline path
    }
  }

  // Offline: generate locally, save to cache, queue for sync
  const localAttempt: QuizAttempt = {
    id: randomUUID(),
    card_id: attempt.card_id,
    term: attempt.term,
    card_category: attempt.card_category,
    is_correct: attempt.is_correct,
    user_example: attempt.user_example ?? null,
    attempted_at: new Date().toISOString(),
  };

  const cached = await getCachedAttempts();
  cached.push(localAttempt);
  await Promise.all([
    setCachedAttempts(cached),
    addToQuizQueue({ type: "ATTEMPT", data: attempt }),
  ]);

  return localAttempt;
}

// ─── Offline-safe record upsert ─────────────────────────────

export async function upsertQuizRecordCached(
  record: QuizRecordUpsert,
): Promise<QuizRecord> {
  if (isOnline()) {
    try {
      const result = await upsertQuizRecord(record);
      // Update cache
      const cached = await getCachedRecords();
      const idx = cached.findIndex((r) => r.quiz_date === result.quiz_date);
      if (idx >= 0) {
        cached[idx] = result;
      } else {
        cached.push(result);
      }
      cached.sort((a, b) => a.quiz_date.localeCompare(b.quiz_date));
      await setCachedRecords(cached);
      return result;
    } catch {
      // Fall through to offline path
    }
  }

  // Offline: update cache and queue for sync
  const cached = await getCachedRecords();
  const idx = cached.findIndex((r) => r.quiz_date === record.quiz_date);
  let result: QuizRecord;

  if (idx >= 0) {
    result = {
      ...cached[idx],
      correct_count: record.correct_count,
      updated_at: new Date().toISOString(),
    };
    cached[idx] = result;
  } else {
    result = {
      id: randomUUID(),
      quiz_date: record.quiz_date,
      correct_count: record.correct_count,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    cached.push(result);
  }

  cached.sort((a, b) => a.quiz_date.localeCompare(b.quiz_date));
  await Promise.all([
    setCachedRecords(cached),
    addToQuizQueue({ type: "RECORD", data: record }),
  ]);
  return result;
}
