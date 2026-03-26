import { TouchableOpacity } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { CardCategory } from "@/lib/types";

interface FloatingActionButtonProps {
  onPress: () => void;
  category?: CardCategory;
}

const bgColorMap: Record<CardCategory, string> = {
  word: "bg-feather",
  phrase: "bg-macaw",
  pattern: "bg-beetle",
};

const shadowColorMap: Record<CardCategory, string> = {
  word: "#58cc02",
  phrase: "#1cb0f6",
  pattern: "#ce82ff",
};

export default function FloatingActionButton({
  onPress,
  category = "word",
}: FloatingActionButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      className={`absolute bottom-6 right-6 w-14 h-14 rounded-full items-center justify-center ${bgColorMap[category]}`}
      style={{
        shadowColor: shadowColorMap[category],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 8,
      }}
    >
      <MaterialCommunityIcons name="plus" size={28} color="#FFFFFF" />
    </TouchableOpacity>
  );
}
