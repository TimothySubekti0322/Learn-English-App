import { useAlert } from "@/components/ui/CustomAlert";
import { Card, CardCategory } from "@/lib/types";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { memo } from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface CardItemProps {
  card: Card;
  onEdit: (card: Card) => void;
  onDelete: (id: string) => void;
}

const borderColorMap: Record<CardCategory, string> = {
  word: "border-l-feather",
  phrase: "border-l-macaw",
  pattern: "border-l-beetle",
};

const shadowColorMap: Record<CardCategory, string> = {
  word: "shadow-feather",
  phrase: "shadow-macaw",
  pattern: "shadow-beetle",
};

const exampleBgMap: Record<CardCategory, string> = {
  word: "bg-[#f0fde4]",
  phrase: "bg-[#e8f7fe]",
  pattern: "bg-[#f5eeff]",
};

const exampleTextMap: Record<CardCategory, string> = {
  word: "text-feather",
  phrase: "text-macaw",
  pattern: "text-beetle",
};

function buildBoldParts(example: string, term: string) {
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

  return parts;
}

function buildPatternBoldParts(example: string, term: string) {
  // Split pattern by "..." to get individual keywords, e.g. "Not only ... But Also ..." → ["not only", "but also"]
  const keywords = term
    .split("...")
    .map((k) => k.trim())
    .filter((k) => k.length > 0);

  if (keywords.length === 0) {
    return [{ text: example, bold: false }];
  }

  // Find all keyword matches with their positions
  const lowerExample = example.toLowerCase();
  const matches: { start: number; end: number }[] = [];

  for (const keyword of keywords) {
    const lowerKeyword = keyword.toLowerCase();
    let searchFrom = 0;
    while (searchFrom < example.length) {
      const foundIndex = lowerExample.indexOf(lowerKeyword, searchFrom);
      if (foundIndex === -1) break;
      matches.push({ start: foundIndex, end: foundIndex + keyword.length });
      searchFrom = foundIndex + keyword.length;
    }
  }

  if (matches.length === 0) {
    return [{ text: example, bold: false }];
  }

  // Sort by position and merge overlapping ranges
  matches.sort((a, b) => a.start - b.start);

  const parts: { text: string; bold: boolean }[] = [];
  let currentIndex = 0;

  for (const match of matches) {
    if (match.start < currentIndex) continue; // skip overlapping
    if (match.start > currentIndex) {
      parts.push({
        text: example.slice(currentIndex, match.start),
        bold: false,
      });
    }
    parts.push({ text: example.slice(match.start, match.end), bold: true });
    currentIndex = match.end;
  }

  if (currentIndex < example.length) {
    parts.push({ text: example.slice(currentIndex), bold: false });
  }

  return parts;
}

function renderExampleWithBoldTerm(
  example: string,
  term: string,
  category: string,
) {
  if (!example || !term) {
    return (
      <Text className="text-sm leading-5 font-nunito text-wolf">{example}</Text>
    );
  }

  const parts =
    category === "pattern"
      ? buildPatternBoldParts(example, term)
      : buildBoldParts(example, term);

  return (
    <Text className="text-sm leading-5 font-nunito text-wolf">
      {parts.map((part, index) =>
        part.bold ? (
          <Text key={index} className="font-nunito-bold text-eel">
            {part.text}
          </Text>
        ) : (
          <Text key={index}>{part.text}</Text>
        ),
      )}
    </Text>
  );
}

export default memo(function CardItem({ card, onEdit, onDelete }: CardItemProps) {
  const { showAlert } = useAlert();

  const handleDelete = () => {
    showAlert({
      type: "confirm",
      title: "Delete Card",
      message: "Are you sure you want to delete this card?",
      buttons: [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => onDelete(card.id) },
      ],
    });
  };

  return (
    <View
      className={`p-5 mb-6 bg-white border border-l-8 shadow ${borderColorMap[card.category]} drop-shadow-xl rounded-2xl border-swan ${shadowColorMap[card.category]}`}
    >
      <View className="flex-row items-start justify-between mb-2">
        <Text className="flex-1 mr-6 text-xl font-nunito-extrabold text-eel">
          {card.term}
        </Text>
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={() => onEdit(card)}
            hitSlop={8}
            className="p-1 rounded-lg bg-bee"
          >
            <MaterialCommunityIcons name="pencil" size={18} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDelete}
            hitSlop={8}
            className="p-1 rounded-lg bg-[#ff4b4b]"
          >
            <MaterialCommunityIcons
              name="trash-can"
              size={18}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>
      </View>
      <Text className="mt-3 mb-3 text-base leading-5 font-nunito text-eel">
        {card.definition}
      </Text>

      <View
        className={`px-2 py-3 mt-2 rounded-lg ${exampleBgMap[card.category]}`}
      >
        <Text
          className={`mb-1 text-sm tracking-wide uppercase font-nunito-bold ${exampleTextMap[card.category]}`}
        >
          Example
        </Text>
        <Text className="text-sm leading-5 font-nunito text-wolf">
          {'"'}
          {renderExampleWithBoldTerm(card.example, card.term, card.category)}
          {'"'}
        </Text>
      </View>
    </View>
  );
})
