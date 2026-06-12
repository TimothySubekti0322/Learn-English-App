import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Pressable,
} from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { QuizAttempt, CardCategory } from "@/lib/types";
import { Colors } from "@/constants/theme";

interface DayHistorySheetProps {
  date: string;
  attempts: QuizAttempt[];
  correctCount: number;
  onClose: () => void;
}

const TYPE_COLORS: Record<CardCategory, { main: string; bg: string }> = {
  word: { main: Colors.featherGreen, bg: "#f0fde4" },
  phrase: { main: Colors.macaw, bg: "#e8f7fe" },
  pattern: { main: Colors.beetle, bg: "#f5eeff" },
};

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export default function DayHistorySheet({
  date,
  attempts,
  correctCount,
  onClose,
}: DayHistorySheetProps) {
  const wrongCount = attempts.length - correctCount;
  const displayDate = formatDisplayDate(date);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        {/* Backdrop */}
        <Pressable
          className="absolute top-0 left-0 right-0 bottom-0 bg-black/40"
          onPress={onClose}
        />

        {/* Sheet */}
        <View
          className="bg-white max-h-[80%]"
          style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
        >
          {/* Handle */}
          <View className="items-center pt-2.5 pb-1">
            <View className="w-9 h-1 rounded-full bg-swan" />
          </View>

          {/* Header */}
          <View className="flex-row items-start justify-between px-[18px] pt-1.5 pb-3.5 border-b-2 border-polar">
            <View className="flex-1 mr-3">
              <Text className="text-[17px] font-nunito-extrabold text-eel">
                {displayDate}
              </Text>
              <Text className="text-xs font-nunito-bold text-hare mt-0.5">
                {attempts.length} attempt{attempts.length !== 1 ? "s" : ""} ·{" "}
                <Text className="text-feather">{correctCount} correct</Text>
                {wrongCount > 0 && (
                  <Text className="text-cardinal">
                    {" "}· {wrongCount} incorrect
                  </Text>
                )}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              className="w-[30px] h-[30px] rounded-full bg-polar items-center justify-center mt-0.5"
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="close"
                size={15}
                color={Colors.wolf}
              />
            </TouchableOpacity>
          </View>

          {/* Attempt List */}
          <ScrollView
            className="px-3.5 pt-2.5"
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
          >
            {attempts.length === 0 ? (
              <View
                className="items-center justify-center"
                style={{ height: 120 }}
              >
                <Text className="text-[32px] mb-2">📭</Text>
                <Text className="text-sm font-nunito-bold text-hare">
                  No quiz attempts this day
                </Text>
              </View>
            ) : (
              attempts.map((attempt, i) => {
                const tc = TYPE_COLORS[attempt.card_category];
                return (
                  <View
                    key={attempt.id}
                    className="mb-2"
                    style={{
                      backgroundColor: attempt.is_correct
                        ? "#FAFFFE"
                        : "#FFFAFA",
                      borderWidth: 2,
                      borderColor: attempt.is_correct
                        ? "rgba(88, 204, 2, 0.13)"
                        : "rgba(255, 75, 75, 0.13)",
                      borderRadius: 14,
                      padding: 10,
                    }}
                  >
                    {/* Row 1: index + type badge + term + result icon */}
                    <View className="flex-row items-center" style={{ gap: 7 }}>
                      <Text
                        className="text-[10px] font-nunito-extrabold text-hare text-right"
                        style={{ minWidth: 16 }}
                      >
                        {i + 1}.
                      </Text>
                      <View
                        style={{
                          backgroundColor: tc.bg,
                          paddingHorizontal: 7,
                          paddingVertical: 2,
                          borderRadius: 5,
                        }}
                      >
                        <Text
                          className="text-[10px] font-nunito-extrabold uppercase"
                          style={{ color: tc.main, letterSpacing: 0.4 }}
                        >
                          {attempt.card_category}
                        </Text>
                      </View>
                      <Text
                        className="flex-1 text-sm font-nunito-extrabold text-eel"
                        style={{ lineHeight: 18 }}
                      >
                        {attempt.term}
                      </Text>
                      <MaterialCommunityIcons
                        name={
                          attempt.is_correct ? "check-circle" : "close-circle"
                        }
                        size={18}
                        color={
                          attempt.is_correct
                            ? Colors.featherGreen
                            : Colors.cardinal
                        }
                      />
                    </View>

                    {/* Row 2: user example (correct) or incorrect label */}
                    {attempt.is_correct && attempt.user_example ? (
                      <View
                        className="ml-[23px] mt-1.5 bg-[#f0fde4] rounded-lg flex-row items-start"
                        style={{
                          paddingVertical: 6,
                          paddingHorizontal: 10,
                          gap: 6,
                        }}
                      >
                        <Text className="text-xs">✍️</Text>
                        <Text
                          className="text-xs font-nunito-semibold text-eel flex-1"
                          style={{ fontStyle: "italic", lineHeight: 18 }}
                        >
                          &ldquo;{attempt.user_example}&rdquo;
                        </Text>
                      </View>
                    ) : !attempt.is_correct ? (
                      <Text className="ml-[23px] mt-1.5 text-[11px] font-nunito-bold text-cardinal">
                        Answered incorrectly
                      </Text>
                    ) : null}
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
