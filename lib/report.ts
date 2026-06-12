import { Card, QuizRecord } from "./types";

// ─── Types ───────────────────────────────────────────────────

export type Granularity = "daily" | "weekly" | "monthly";

export interface CardsAddedDataPoint {
  label: string;
  fullLabel: string;
  word: number;
  phrase: number;
  pattern: number;
}

export interface QuizDataPoint {
  label: string;
  fullLabel: string;
  value: number;
}

// ─── Date Helpers ────────────────────────────────────────────

function formatShortDate(date: Date): string {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

function formatMonthYear(date: Date): string {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return months[date.getMonth()];
}

const FULL_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function formatFullDate(date: Date): string {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${months[date.getMonth()]} ${date.getDate()} ${date.getFullYear()}`;
}

function formatFullMonthYear(date: Date): string {
  return `${FULL_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function toDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// Get Monday of the week containing the given date
function getMonday(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1; // Sunday = 6 days back, else day-1
  d.setDate(d.getDate() - diff);
  return d;
}

// ─── Chart 1: Cards Added ────────────────────────────────────

export function computeCardsAdded(
  cards: Card[],
  granularity: Granularity,
): CardsAddedDataPoint[] {
  const today = startOfDay(new Date());

  if (granularity === "daily") {
    // Last 7 days
    const points: CardsAddedDataPoint[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(today);
      day.setDate(today.getDate() - i);
      const dateStr = toDateString(day);
      const dayCards = cards.filter(
        (c) => c.created_at.split("T")[0] === dateStr,
      );
      points.push({
        label: formatShortDate(day),
        fullLabel: formatFullDate(day),
        word: dayCards.filter((c) => c.category === "word").length,
        phrase: dayCards.filter((c) => c.category === "phrase").length,
        pattern: dayCards.filter((c) => c.category === "pattern").length,
      });
    }
    return points;
  }

  if (granularity === "weekly") {
    // Last 4 weeks
    const points: CardsAddedDataPoint[] = [];
    const currentMonday = getMonday(today);

    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(currentMonday);
      weekStart.setDate(currentMonday.getDate() - i * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const startStr = toDateString(weekStart);
      const endStr = toDateString(weekEnd);
      const weekCards = cards.filter((c) => {
        const d = c.created_at.split("T")[0];
        return d >= startStr && d <= endStr;
      });

      points.push({
        label: `${formatShortDate(weekStart)}-${formatShortDate(weekEnd)}`,
        fullLabel: `${formatShortDate(weekStart)} - ${formatShortDate(weekEnd)} ${weekEnd.getFullYear()}`,
        word: weekCards.filter((c) => c.category === "word").length,
        phrase: weekCards.filter((c) => c.category === "phrase").length,
        pattern: weekCards.filter((c) => c.category === "pattern").length,
      });
    }
    return points;
  }

  // Monthly: last 4 months
  const points: CardsAddedDataPoint[] = [];
  for (let i = 3; i >= 0; i--) {
    const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();

    const monthCards = cards.filter((c) => {
      const d = new Date(c.created_at);
      return d.getFullYear() === year && d.getMonth() === month;
    });

    points.push({
      label: formatMonthYear(monthDate),
      fullLabel: formatFullMonthYear(monthDate),
      word: monthCards.filter((c) => c.category === "word").length,
      phrase: monthCards.filter((c) => c.category === "phrase").length,
      pattern: monthCards.filter((c) => c.category === "pattern").length,
    });
  }
  return points;
}

// ─── Chart 2: Quiz Completed ─────────────────────────────────

export function computeQuizCompleted(
  records: QuizRecord[],
  granularity: Granularity,
): QuizDataPoint[] {
  const today = startOfDay(new Date());

  if (granularity === "daily") {
    const points: QuizDataPoint[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(today);
      day.setDate(today.getDate() - i);
      const dateStr = toDateString(day);
      const record = records.find((r) => r.quiz_date === dateStr);
      points.push({
        label: formatShortDate(day),
        fullLabel: formatFullDate(day),
        value: record?.correct_count ?? 0,
      });
    }
    return points;
  }

  if (granularity === "weekly") {
    const points: QuizDataPoint[] = [];
    const currentMonday = getMonday(today);

    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(currentMonday);
      weekStart.setDate(currentMonday.getDate() - i * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const startStr = toDateString(weekStart);
      const endStr = toDateString(weekEnd);
      const total = records
        .filter((r) => r.quiz_date >= startStr && r.quiz_date <= endStr)
        .reduce((sum, r) => sum + r.correct_count, 0);

      points.push({
        label: `${formatShortDate(weekStart)}-${formatShortDate(weekEnd)}`,
        fullLabel: `${formatShortDate(weekStart)} - ${formatShortDate(weekEnd)} ${weekEnd.getFullYear()}`,
        value: total,
      });
    }
    return points;
  }

  // Monthly
  const points: QuizDataPoint[] = [];
  for (let i = 3; i >= 0; i--) {
    const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();

    const total = records
      .filter((r) => {
        const d = new Date(r.quiz_date + "T00:00:00");
        return d.getFullYear() === year && d.getMonth() === month;
      })
      .reduce((sum, r) => sum + r.correct_count, 0);

    points.push({
      label: formatMonthYear(monthDate),
      fullLabel: formatFullMonthYear(monthDate),
      value: total,
    });
  }
  return points;
}

// ─── Date ranges for fetching ────────────────────────────────

export function getMaxDateRange(): { fromDate: string; toDate: string } {
  const today = new Date();
  const fourMonthsAgo = new Date(
    today.getFullYear(),
    today.getMonth() - 3,
    1,
  );
  return {
    fromDate: toDateString(fourMonthsAgo),
    toDate: toDateString(today),
  };
}
