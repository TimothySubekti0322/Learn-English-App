import { View, Text, TouchableOpacity, Alert } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Card } from "@/lib/types";

interface CardItemProps {
  card: Card;
  onEdit: (card: Card) => void;
  onDelete: (id: string) => void;
}

function renderExampleWithBoldTerm(example: string, term: string) {
  if (!example || !term) {
    return (
      <Text className="font-nunito text-sm text-wolf leading-5">
        {example}
      </Text>
    );
  }

  const lowerExample = example.toLowerCase();
  const lowerTerm = term.toLowerCase();
  const parts: { text: string; bold: boolean }[] = [];
  let currentIndex = 0;

  while (currentIndex < example.length) {
    const foundIndex = lowerExample.indexOf(lowerTerm, currentIndex);
    if (foundIndex === -1) {
      parts.push({ text: example.slice(currentIndex), bold: false });
      break;
    }
    if (foundIndex > currentIndex) {
      parts.push({
        text: example.slice(currentIndex, foundIndex),
        bold: false,
      });
    }
    parts.push({
      text: example.slice(foundIndex, foundIndex + term.length),
      bold: true,
    });
    currentIndex = foundIndex + term.length;
  }

  return (
    <Text className="font-nunito text-sm text-wolf leading-5">
      {parts.map((part, index) =>
        part.bold ? (
          <Text key={index} className="font-nunito-bold text-eel">
            {part.text}
          </Text>
        ) : (
          <Text key={index}>{part.text}</Text>
        )
      )}
    </Text>
  );
}

export default function CardItem({ card, onEdit, onDelete }: CardItemProps) {
  const handleDelete = () => {
    Alert.alert("Delete Card", "Are you sure you want to delete this card?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => onDelete(card.id),
      },
    ]);
  };

  const categoryLabel =
    card.category === "word"
      ? "Definition"
      : card.category === "phrase"
        ? "Definition"
        : "Explanation";

  return (
    <View className="bg-white rounded-2xl p-4 mb-3 border border-swan">
      <View className="flex-row items-start justify-between mb-2">
        <Text className="font-nunito-bold text-base text-eel flex-1 mr-2">
          {card.term}
        </Text>
        <View className="flex-row items-center gap-2">
          <TouchableOpacity onPress={() => onEdit(card)} hitSlop={8}>
            <MaterialCommunityIcons name="pencil" size={18} color="#AFAFAF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} hitSlop={8}>
            <MaterialCommunityIcons name="trash-can" size={18} color="#ff4b4b" />
          </TouchableOpacity>
        </View>
      </View>

      <Text className="font-nunito-semibold text-xs text-hare uppercase tracking-wide mb-1">
        {categoryLabel}
      </Text>
      <Text className="font-nunito text-sm text-eel leading-5 mb-3">
        {card.definition}
      </Text>

      <Text className="font-nunito-semibold text-xs text-hare uppercase tracking-wide mb-1">
        Example
      </Text>
      {renderExampleWithBoldTerm(card.example, card.term)}
    </View>
  );
}
