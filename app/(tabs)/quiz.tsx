import DayHistorySheet from "@/components/quiz/DayHistorySheet";
import MilestonePopup from "@/components/quiz/MilestonePopup";
import StreakTracker from "@/components/quiz/StreakTracker";
import { useAlert } from "@/components/ui/CustomAlert";
import { Colors } from "@/constants/theme";
import { fetchCards } from "@/lib/cards";
import {
  fetchAttemptsCached,
  fetchQuizRecordsCached,
  insertQuizAttemptCached,
  upsertQuizRecordCached,
} from "@/lib/quizCache";
import { Card, CardCategory, QuizAttempt, QuizRecord } from "@/lib/types";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── Types ───────────────────────────────────────────────

interface QuizQuestion {
  card: Card;
  options: string[];
  correctIndex: number;
}

// ─── Helpers ─────────────────────────────────────────────

function generateQuestion(cards: Card[]): QuizQuestion | null {
  if (cards.length < 2) return null;

  // Partial Fisher–Yates: pick up to 4 distinct cards (1 correct + ≤3 wrong)
  // without sorting the whole array, and with an unbiased distribution —
  // unlike `sort(() => Math.random() - 0.5)`, which is both O(n log n) and skewed.
  const pool = cards.slice();
  const pickCount = Math.min(4, pool.length);
  for (let i = 0; i < pickCount; i++) {
    const j = i + Math.floor(Math.random() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const card = pool[0];
  const wrongOptions = pool.slice(1, pickCount).map((c) => c.definition);
  const correctIndex = Math.floor(Math.random() * (wrongOptions.length + 1));
  const options = [
    ...wrongOptions.slice(0, correctIndex),
    card.definition,
    ...wrongOptions.slice(correctIndex),
  ];
  return { card, options, correctIndex };
}

const TYPE_COLORS: Record<CardCategory, { main: string; bg: string }> = {
  word: { main: Colors.featherGreen, bg: "#f0fde4" },
  phrase: { main: Colors.macaw, bg: "#e8f7fe" },
  pattern: { main: Colors.beetle, bg: "#f5eeff" },
};

const TYPE_LABELS: Record<CardCategory, string> = {
  word: "Word",
  phrase: "Phrase",
  pattern: "Pattern",
};

// ─── Main Component ──────────────────────────────────────

export default function QuizScreen() {
  const { showAlert } = useAlert();
  // Data state
  const [cards, setCards] = useState<Card[]>([]);
  const [quizRecords, setQuizRecords] = useState<QuizRecord[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  // Quiz state
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [userExample, setUserExample] = useState("");
  const [todayCorrectCount, setTodayCorrectCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Pending attempt (committed on "Next Question")
  const [pendingAttempt, setPendingAttempt] = useState<{
    card_id: string;
    term: string;
    card_category: CardCategory;
    is_correct: boolean;
  } | null>(null);

  // Milestone popup
  const [showMilestone, setShowMilestone] = useState(false);
  const [milestoneCount, setMilestoneCount] = useState(0);
  const previousMilestone = useRef(0);

  // Day History Sheet
  const [historyDate, setHistoryDate] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const feedbackY = useRef(0);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Scroll to input AFTER the padding re-render settles
  useEffect(() => {
    if (keyboardHeight > 0) {
      const timer = setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: feedbackY.current + 80,
          animated: true,
        });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [keyboardHeight]);

  // ─── Data Loading ────────────────────────────────────

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        try {
          if (isFirstLoad.current) setLoading(true);

          const today = new Date();
          const sevenDaysAgo = new Date(today);
          sevenDaysAgo.setDate(today.getDate() - 6);
          const fromDate = sevenDaysAgo.toISOString().split("T")[0];
          const toDate = today.toISOString().split("T")[0];

          const [cardsData, recordsData, attemptsData] = await Promise.all([
            fetchCards(),
            fetchQuizRecordsCached(fromDate, toDate),
            fetchAttemptsCached(fromDate, toDate),
          ]);

          setCards(cardsData);
          setQuizRecords(recordsData);
          setQuizAttempts(attemptsData);

          if (isFirstLoad.current) {
            const todayRecord = recordsData.find((r) => r.quiz_date === toDate);
            const initCount = todayRecord?.correct_count ?? 0;
            setTodayCorrectCount(initCount);
            previousMilestone.current = initCount;

            if (cardsData.length >= 2) {
              setQuestion(generateQuestion(cardsData));
            }
            isFirstLoad.current = false;
          }
        } catch {
          if (isFirstLoad.current) {
            showAlert({ type: "error", title: "Error", message: "Failed to load quiz data" });
          }
        } finally {
          setLoading(false);
        }
      };

      load();
    }, [showAlert]),
  );

  // ─── Quiz Logic ──────────────────────────────────────

  const todayDate = new Date().toISOString().split("T")[0];

  const handleAnswer = (idx: number) => {
    if (selectedIdx !== null || !question) return;
    setSelectedIdx(idx);
    const isCorrect = idx === question.correctIndex;

    setPendingAttempt({
      card_id: question.card.id,
      term: question.card.term,
      card_category: question.card.category,
      is_correct: isCorrect,
    });

    if (isCorrect) {
      const newCount = todayCorrectCount + 1;
      setTodayCorrectCount(newCount);

      // Check milestone (every 5th correct, capped at 15)
      const prevM = Math.floor(previousMilestone.current / 5) * 5;
      const newM = Math.floor(newCount / 5) * 5;
      if (newM > prevM && newCount >= 5) {
        setTimeout(() => {
          setMilestoneCount(newCount >= 15 ? 15 : newM);
          setShowMilestone(true);
        }, 800);
      }
      previousMilestone.current = newCount;
    }
  };

  const handleNext = async () => {
    if (submitting) return;

    if (pendingAttempt) {
      setSubmitting(true);
      try {
        // Insert attempt (Supabase if online, local cache if offline)
        const newAttempt = await insertQuizAttemptCached({
          card_id: pendingAttempt.card_id,
          term: pendingAttempt.term,
          card_category: pendingAttempt.card_category,
          is_correct: pendingAttempt.is_correct,
          user_example:
            pendingAttempt.is_correct && userExample.trim()
              ? userExample.trim()
              : null,
        });
        setQuizAttempts((prev) => [...prev, newAttempt]);

        // Upsert quiz record for today (Supabase if online, local cache if offline)
        const updatedRecord = await upsertQuizRecordCached({
          quiz_date: todayDate,
          correct_count: todayCorrectCount,
        });
        setQuizRecords((prev) => {
          const idx = prev.findIndex(
            (r) => r.quiz_date === updatedRecord.quiz_date,
          );
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = updatedRecord;
            return updated;
          }
          return [...prev, updatedRecord];
        });
      } catch {
        // Silently continue — quiz should not be blocked
      }
      setSubmitting(false);
    }

    // Advance to next question
    setQuestion(generateQuestion(cards));
    setSelectedIdx(null);
    setUserExample("");
    setPendingAttempt(null);
  };

  // ─── Derived State ───────────────────────────────────

  const isAnswered = selectedIdx !== null;
  const isCorrect = question ? selectedIdx === question.correctIndex : false;
  const typeColor = question
    ? TYPE_COLORS[question.card.category].main
    : Colors.featherGreen;

  // History sheet data
  const historyAttempts = historyDate
    ? quizAttempts.filter((a) => a.attempted_at.startsWith(historyDate))
    : [];
  const historyCorrectCount = historyDate
    ? (quizRecords.find((r) => r.quiz_date === historyDate)?.correct_count ??
      historyAttempts.filter((a) => a.is_correct).length)
    : 0;

  // ─── Render ──────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-snow" edges={["top"]}>
        <View className="items-center justify-center flex-1">
          <ActivityIndicator size="large" color={Colors.macaw} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-snow" edges={["top"]}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View className="px-5 pt-5 pb-4 bg-white border-b-2 border-polar">
          <Text className="text-[25px] font-nunito-extrabold text-eel mb-1">
            Daily <Text className="text-macaw">Quiz</Text>
          </Text>
          <Text className="text-[16px] font-nunito-semibold text-hare">
            Test what you&apos;ve learned today!
          </Text>

          <StreakTracker
            quizRecords={quizRecords}
            quizAttempts={quizAttempts}
            todayCorrectCount={todayCorrectCount}
            onDayPress={setHistoryDate}
          />
        </View>

        {/* Quiz Area */}
        <ScrollView
          ref={scrollViewRef}
          className="flex-1 px-4 pt-4"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 + keyboardHeight }}
          keyboardShouldPersistTaps="handled"
        >
          {cards.length < 2 ? (
            /* ── Not Enough Cards ── */
            <View
              className="items-center justify-center"
              style={{ height: 200 }}
            >
              <Text className="text-[44px] mb-2.5">🃏</Text>
              <Text className="text-[15px] font-nunito-extrabold text-eel mb-1.5">
                Not enough cards!
              </Text>
              <Text className="text-[12px] font-nunito-semibold text-hare text-center">
                Add at least 2 cards to the Dictionary to start the quiz.
              </Text>
            </View>
          ) : question ? (
            <>
              {/* ── Question Card ── */}
              <View
                className="bg-white rounded-2xl p-4 mb-3.5"
                style={{
                  borderTopWidth: 8,
                  borderTopColor: typeColor,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.07,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <View className="flex-row items-center gap-1.5 mb-2.5">
                  <View
                    className="px-2 py-[3px] rounded-md"
                    style={{ backgroundColor: typeColor + "18" }}
                  >
                    <Text
                      className="text-[11px] font-nunito-extrabold uppercase"
                      style={{ color: typeColor, letterSpacing: 0.5 }}
                    >
                      {TYPE_LABELS[question.card.category]}
                    </Text>
                  </View>
                  <Text className="text-xs font-nunito-bold text-hare">
                    What is the correct definition?
                  </Text>
                </View>
                <Text
                  className="text-xl font-nunito-extrabold text-eel"
                  style={{ lineHeight: 26 }}
                >
                  {question.card.term}
                </Text>
              </View>

              {/* ── Options ── */}
              <View className="gap-2 mb-3.5">
                {question.options.map((option, idx) => {
                  const isSelected = selectedIdx === idx;
                  const isRight = idx === question.correctIndex;

                  let bg = "#FFFFFF";
                  let border = Colors.swan;
                  let textColor = Colors.eel;
                  let iconName: "check-circle" | "close-circle" | null = null;
                  let iconColor = "";
                  let shadow = {};

                  if (isAnswered) {
                    if (isRight) {
                      bg = "#f0fde4";
                      border = Colors.featherGreen;
                      iconName = "check-circle";
                      iconColor = Colors.featherGreen;
                      shadow = {
                        shadowColor: "#58cc02",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.4,
                        shadowRadius: 0,
                        elevation: 2,
                      };
                    } else if (isSelected) {
                      bg = "#fff0f0";
                      border = Colors.cardinal;
                      textColor = Colors.cardinal;
                      iconName = "close-circle";
                      iconColor = Colors.cardinal;
                    }
                  }

                  return (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => handleAnswer(idx)}
                      disabled={isAnswered}
                      className="flex-row items-center justify-between py-4 px-3.5 rounded-[14px]"
                      style={{
                        backgroundColor: bg,
                        borderWidth: 2,
                        borderColor: border,
                        ...shadow,
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        className="flex-1 text-[13px] font-nunito-bold"
                        style={{ color: textColor, lineHeight: 18 }}
                      >
                        {option}
                      </Text>
                      {iconName && (
                        <MaterialCommunityIcons
                          name={iconName}
                          size={18}
                          color={iconColor}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* ── Feedback ── */}
              {isAnswered && (
                <View
                  onLayout={(e) => {
                    feedbackY.current = e.nativeEvent.layout.y;
                  }}
                >
                  {/* Feedback Banner */}
                  <View
                    className="flex-row items-center gap-2 p-3.5 rounded-[14px] mb-3"
                    style={{
                      backgroundColor: isCorrect ? "#f0fde4" : "#fff0f0",
                      borderWidth: 2,
                      borderColor: isCorrect
                        ? Colors.featherGreen
                        : Colors.cardinal,
                    }}
                  >
                    <MaterialCommunityIcons
                      name={isCorrect ? "check-circle" : "close-circle"}
                      size={20}
                      color={isCorrect ? Colors.featherGreen : Colors.cardinal}
                    />
                    <View className="flex-1">
                      <Text
                        className="text-sm font-nunito-extrabold"
                        style={{
                          color: isCorrect
                            ? Colors.featherGreen
                            : Colors.cardinal,
                        }}
                      >
                        {isCorrect
                          ? "Your answer is correct! 🎉"
                          : "Your answer is incorrect 😔"}
                      </Text>
                      {!isCorrect && (
                        <Text className="text-xs font-nunito-semibold text-wolf mt-0.5">
                          Correct: {question.card.definition}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* User Example Input (correct only) */}
                  {isCorrect && (
                    <View className="mb-3">
                      <Text className="text-[13px] font-nunito-extrabold text-eel mb-1.5">
                        ✍️ Write your own example:
                      </Text>
                      <TextInput
                        value={userExample}
                        onChangeText={setUserExample}
                        placeholder={`Use "${question.card.term}" in a sentence...`}
                        placeholderTextColor={Colors.hare}
                        multiline
                        className="font-nunito text-[13px] text-eel border-2 border-swan rounded-xl px-3 py-2.5"
                        style={{
                          maxHeight: 100,
                          textAlignVertical: "top",
                          backgroundColor: "#FAFAFA",
                        }}
                      />
                    </View>
                  )}

                  {/* Next Question Button */}
                  <TouchableOpacity
                    onPress={handleNext}
                    disabled={submitting}
                    className="flex-row items-center justify-center py-[13px] rounded-[14px] bg-macaw"
                    style={{
                      shadowColor: "#0e8bc4",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 1,
                      shadowRadius: 0,
                      elevation: 4,
                      opacity: submitting ? 0.7 : 1,
                    }}
                    activeOpacity={0.8}
                  >
                    <Text className="text-[15px] font-nunito-extrabold text-white mr-1.5">
                      {submitting ? "Saving..." : "Next Question"}
                    </Text>
                    {!submitting && (
                      <MaterialCommunityIcons
                        name="chevron-right"
                        size={18}
                        color="#FFFFFF"
                      />
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Day History Sheet */}
      {historyDate && (
        <DayHistorySheet
          date={historyDate}
          attempts={historyAttempts}
          correctCount={historyCorrectCount}
          onClose={() => setHistoryDate(null)}
        />
      )}

      {/* Milestone Popup */}
      {showMilestone && (
        <MilestonePopup
          count={milestoneCount}
          onClose={() => setShowMilestone(false)}
        />
      )}
    </SafeAreaView>
  );
}
