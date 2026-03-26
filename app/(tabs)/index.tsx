import AddEditCardModal from "@/components/dictionary/AddEditCardModal";
import CardItem from "@/components/dictionary/CardItem";
import CardSkeleton from "@/components/dictionary/CardSkeleton";
import CategoryTabs from "@/components/dictionary/CategoryTabs";
import FloatingActionButton from "@/components/dictionary/FloatingActionButton";
import { addCard, deleteCard, fetchCards, updateCard } from "@/lib/cards";
import { Card, CardCategory } from "@/lib/types";
import { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function DictionaryScreen() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<CardCategory>("word");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);

  const headerBgMap: Record<CardCategory, string> = {
    word: "bg-feather",
    phrase: "bg-macaw",
    pattern: "bg-beetle",
  };

  const loadCards = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchCards();
      setCards(data);
    } catch {
      Alert.alert("Error", "Failed to load cards");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const filteredCards = cards.filter((c) => c.category === activeTab);

  const counts: Record<CardCategory, number> = {
    word: cards.filter((c) => c.category === "word").length,
    phrase: cards.filter((c) => c.category === "phrase").length,
    pattern: cards.filter((c) => c.category === "pattern").length,
  };

  const handleAdd = () => {
    setEditingCard(null);
    setModalVisible(true);
  };

  const handleEdit = (card: Card) => {
    setEditingCard(card);
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCard(id);
      setCards((prev) => prev.filter((c) => c.id !== id));
    } catch {
      Alert.alert("Error", "Failed to delete card");
    }
  };

  const handleSubmit = async (data: {
    category: CardCategory;
    term: string;
    definition: string;
    example: string;
  }) => {
    try {
      if (editingCard) {
        const updated = await updateCard(editingCard.id, {
          term: data.term,
          definition: data.definition,
          example: data.example,
        });
        setCards((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c)),
        );
      } else {
        const newCard = await addCard(data);
        setCards((prev) => [newCard, ...prev]);
      }
      setModalVisible(false);
    } catch {
      Alert.alert("Error", `Failed to ${editingCard ? "update" : "add"} card`);
    }
  };

  return (
    <SafeAreaView
      className={`flex-1 ${headerBgMap[activeTab]}`}
      edges={["top"]}
    >
      {/* Header */}
      <View className={headerBgMap[activeTab]}>
        <View className="flex-row items-center px-8 pt-4 pb-2">
          <Text className="text-2xl font-nunito-extrabold text-snow">
            Hello,
          </Text>
          <Text className="ml-2 text-2xl text-[#FFD700] font-nunito-extrabold">
            Timothy! 👋
          </Text>
        </View>

        {/* Stats */}
        <View className="flex-row gap-4 mx-8 mt-4 mb-8">
          <View className="items-center flex-1 py-3 bg-white border rounded-xl border-swan">
            <Text className="text-lg font-nunito-bold text-feather">
              {counts.word}
            </Text>
            <Text className="text-sm font-medium font-nunito text-feather">
              Words
            </Text>
          </View>
          <View className="items-center flex-1 py-3 bg-white border rounded-xl border-swan">
            <Text className="text-lg font-nunito-bold text-macaw">
              {counts.phrase}
            </Text>
            <Text className="text-sm font-medium font-nunito text-macaw">
              Phrases
            </Text>
          </View>
          <View className="items-center flex-1 py-3 bg-white border rounded-xl border-swan">
            <Text className="text-lg font-nunito-bold text-beetle">
              {counts.pattern}
            </Text>
            <Text className="text-sm font-medium font-nunito text-beetle">
              Patterns
            </Text>
          </View>
        </View>
      </View>

      <View className="flex-1 px-3 bg-neutral-100">
        {/* Tabs */}
        <CategoryTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          counts={counts}
        />

        {/* Card List */}
        {loading ? (
          <CardSkeleton />
        ) : (
          <FlatList
            data={filteredCards}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <CardItem
                card={item}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            )}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingBottom: 100,
            }}
            ListEmptyComponent={
              <View className="items-center justify-center py-16">
                <Text className="text-base font-nunito-semibold text-hare">
                  No{" "}
                  {activeTab === "word"
                    ? "words"
                    : activeTab === "phrase"
                      ? "phrases"
                      : "patterns"}{" "}
                  yet
                </Text>
                <Text className="mt-1 text-sm font-nunito text-hare">
                  Tap + to add your first one
                </Text>
              </View>
            }
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* FAB */}
        <FloatingActionButton onPress={handleAdd} category={activeTab} />

        {/* Modal */}
        <AddEditCardModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onSubmit={handleSubmit}
          editCard={editingCard}
          defaultCategory={activeTab}
        />
      </View>
    </SafeAreaView>
  );
}
