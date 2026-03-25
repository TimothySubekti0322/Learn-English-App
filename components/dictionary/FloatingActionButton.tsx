import { TouchableOpacity } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

interface FloatingActionButtonProps {
  onPress: () => void;
}

export default function FloatingActionButton({
  onPress,
}: FloatingActionButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-feather items-center justify-center"
      style={{
        shadowColor: "#58cc02",
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
