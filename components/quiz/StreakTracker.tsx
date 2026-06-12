import { Colors, QuizStreakColors } from "@/constants/theme";
import { QuizAttempt, QuizRecord } from "@/lib/types";
import { Text, TouchableOpacity, View } from "react-native";

interface StreakTrackerProps {
  quizRecords: QuizRecord[];
  quizAttempts: QuizAttempt[];
  todayCorrectCount: number;
  onDayPress: (date: string) => void;
}

function getStreakDotColor(count: number): string {
  if (count >= 15) return QuizStreakColors.fifteen;
  if (count >= 10) return QuizStreakColors.ten;
  if (count >= 5) return QuizStreakColors.five;
  return Colors.swan;
}

function getLast7Days(): { date: string; label: string; dayLetter: string }[] {
  const result = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const dayLetter = ["S", "M", "T", "W", "T", "F", "S"][d.getDay()];
    const dayNum = d.getDate();
    result.push({ date: dateStr, label: String(dayNum), dayLetter });
  }
  return result;
}

export default function StreakTracker({
  quizRecords,
  quizAttempts,
  todayCorrectCount,
  onDayPress,
}: StreakTrackerProps) {
  const todayDate = new Date().toISOString().split("T")[0];
  const last7Days = getLast7Days();

  const getCountForDate = (date: string): number => {
    if (date === todayDate) return todayCorrectCount;
    return quizRecords.find((r) => r.quiz_date === date)?.correct_count ?? 0;
  };

  const hasAttemptsForDate = (date: string): boolean => {
    return quizAttempts.some((a) => a.attempted_at.startsWith(date));
  };

  return (
    <View className="mt-3.5">
      {/* Header Row */}
      <View className="flex-row items-center justify-between mb-2">
        <Text
          className="text-sm uppercase font-nunito-extrabold text-wolf"
          style={{ letterSpacing: 0.6 }}
        >
          7-Day Streak
        </Text>
        <Text className="text-sm font-nunito-extrabold text-bee">
          {todayCorrectCount} today
        </Text>
      </View>

      {/* Tap hint */}
      <View className="flex-row items-center gap-1 mb-1.5">
        <Text className="text-[12px] font-nunito-bold text-hare">
          Tap a day to see history
        </Text>
      </View>

      {/* Day Dots */}
      <View className="flex-row gap-1.5">
        {last7Days.map(({ date, label, dayLetter }) => {
          const count = getCountForDate(date);
          const isToday = date === todayDate;
          const dotColor = getStreakDotColor(count);
          const hasData = hasAttemptsForDate(date);

          return (
            <TouchableOpacity
              key={date}
              onPress={() => onDayPress(date)}
              className="items-center flex-1 gap-1"
              activeOpacity={0.7}
            >
              <Text
                className={`text-[12px] font-nunito-bold ${isToday ? "text-eel" : "text-hare"}`}
              >
                {dayLetter}
              </Text>
              <View
                className="items-center justify-center w-full rounded-lg"
                style={{
                  aspectRatio: 1,
                  backgroundColor: dotColor,
                  borderWidth: 2,
                  borderColor: isToday ? Colors.eel : "transparent",
                  ...(hasData
                    ? {
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.12,
                        shadowRadius: 3,
                        elevation: 3,
                      }
                    : {}),
                }}
              >
                {count > 0 && (
                  <Text
                    className="text-[12px] font-nunito-extrabold"
                    style={{ color: count >= 5 ? "#FFFFFF" : Colors.hare }}
                  >
                    {count}
                  </Text>
                )}
              </View>
              <Text className="text-[12px] font-nunito-bold text-hare">
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Legend */}
      <View className="flex-row gap-2.5 mt-2 flex-wrap">
        {[
          { color: QuizStreakColors.five, label: "5+" },
          { color: QuizStreakColors.ten, label: "10+" },
          { color: QuizStreakColors.fifteen, label: "15+" },
        ].map(({ color, label }) => (
          <View key={label} className="flex-row items-center gap-1">
            <View
              className="w-2.5 h-2.5 rounded-[3px]"
              style={{ backgroundColor: color }}
            />
            <Text className="text-[12px] font-nunito-bold text-hare">
              {label} correct
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
