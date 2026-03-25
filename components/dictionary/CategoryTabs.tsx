import { View, Text, TouchableOpacity } from "react-native";
import { CardCategory } from "@/lib/types";

interface CategoryTabsProps {
  activeTab: CardCategory;
  onTabChange: (tab: CardCategory) => void;
  counts: Record<CardCategory, number>;
}

const tabs: { key: CardCategory; label: string }[] = [
  { key: "word", label: "Words" },
  { key: "phrase", label: "Phrase" },
  { key: "pattern", label: "Pattern" },
];

export default function CategoryTabs({
  activeTab,
  onTabChange,
  counts,
}: CategoryTabsProps) {
  return (
    <View className="flex-row mx-5 mb-4 bg-polar rounded-xl p-1">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            onPress={() => onTabChange(tab.key)}
            className={`flex-1 py-2.5 rounded-lg items-center ${isActive ? "bg-feather" : ""}`}
            activeOpacity={0.7}
          >
            <Text
              className={`font-nunito-bold text-sm ${isActive ? "text-white" : "text-wolf"}`}
            >
              {tab.label} ({counts[tab.key]})
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
