import { View, Text, TouchableOpacity, Modal } from "react-native";

interface MilestonePopupProps {
  count: number;
  onClose: () => void;
}

export default function MilestonePopup({
  count,
  onClose,
}: MilestonePopupProps) {
  const isMax = count >= 15;
  const nextMilestone = count < 5 ? 5 : count < 10 ? 10 : 15;
  const remaining = nextMilestone - count;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/45">
        <View className="bg-white rounded-3xl py-7 px-6 w-[84%] items-center">
          <Text className="text-[52px] mb-2">
            {isMax ? "🏆" : count >= 10 ? "🥈" : "🥉"}
          </Text>
          <Text className="text-xl font-nunito-extrabold text-eel mb-2">
            {isMax ? "Amazing!" : "Keep Going!"}
          </Text>
          <Text
            className="text-sm font-nunito-bold text-wolf text-center mb-5"
            style={{ lineHeight: 21 }}
          >
            {isMax
              ? "Yeay, you have completed 15 quizzes today! Keep doing great! 🌟"
              : `Yeay, you have completed ${count} quizzes! Do another ${remaining} to reach another trophy! 🎯`}
          </Text>
          <TouchableOpacity
            onPress={onClose}
            className="w-full py-[13px] rounded-[14px] bg-feather items-center"
            style={{
              shadowColor: "#43c000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 1,
              shadowRadius: 0,
              elevation: 4,
            }}
            activeOpacity={0.8}
          >
            <Text className="text-[15px] font-nunito-extrabold text-white">
              Continue
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
