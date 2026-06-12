import AddEditCardModal from "@/components/dictionary/AddEditCardModal";
import CardItem from "@/components/dictionary/CardItem";
import CardSkeleton from "@/components/dictionary/CardSkeleton";
import CategoryTabs from "@/components/dictionary/CategoryTabs";
import FloatingActionButton from "@/components/dictionary/FloatingActionButton";
import { useAlert } from "@/components/ui/CustomAlert";
import { addCard, deleteCard, fetchCards, updateCard } from "@/lib/cards";
import { getSyncQueue } from "@/lib/localStorage";
import { syncCards } from "@/lib/sync";
import { Card, CardCategory } from "@/lib/types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const headerBgMap: Record<CardCategory, string> = {
  word: "bg-feather",
  phrase: "bg-macaw",
  pattern: "bg-beetle",
};

export default function DictionaryScreen() {
  const { showAlert } = useAlert();
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<CardCategory>("word");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [modalKey, setModalKey] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const isFirstLoad = useRef(true);

  const loadCards = useCallback(async () => {
    try {
      const data = await fetchCards();
      setCards(data);
    } catch {
      showAlert({ type: "error", title: "Error", message: "Failed to load cards" });
    } finally {
      setLoading(false);
    }
    getSyncQueue().then((q) => setPendingCount(q.length));
  }, [showAlert]);

  const doSync = useCallback(async (silent: boolean) => {
    setSyncing(true);
    try {
      const result = await syncCards();
      const data = await fetchCards();
      setCards(data);
      setPendingCount(0);

      if (!silent) {
        const parts: string[] = [];
        if (result.pushed > 0) parts.push(`${result.pushed} pushed`);
        if (result.pulled > 0) parts.push(`${result.pulled} pulled`);
        if (result.updated > 0) parts.push(`${result.updated} updated`);
        if (result.deleted > 0) parts.push(`${result.deleted} deleted`);

        showAlert({
          type: "success",
          title: "Sync Complete",
          message: parts.length > 0 ? parts.join(", ") : "Everything is up to date",
        });
      }
    } catch {
      if (silent) {
        // Fall back to local data when sync fails silently (e.g. no internet)
        try {
          const data = await fetchCards();
          setCards(data);
        } catch {}
      } else {
        showAlert({
          type: "error",
          title: "Sync Failed",
          message: "Check your internet connection and try again",
        });
      }
    } finally {
      setSyncing(false);
      setLoading(false);
    }
  }, [showAlert]);

  useFocusEffect(
    useCallback(() => {
      if (isFirstLoad.current) {
        isFirstLoad.current = false;
        // Always sync on first app launch — reconcile local + cloud
        // Falls back to local data if no internet
        doSync(true);
      } else {
        loadCards();
      }
    }, [loadCards, doSync]),
  );

  const counts = useMemo<Record<CardCategory, number>>(
    () => ({
      word: cards.filter((c) => c.category === "word").length,
      phrase: cards.filter((c) => c.category === "phrase").length,
      pattern: cards.filter((c) => c.category === "pattern").length,
    }),
    [cards],
  );

  const filteredCards = useMemo(() => {
    const byCategory = cards.filter((c) => c.category === activeTab);
    const q = searchQuery.trim().toLowerCase();
    if (!q) return byCategory;
    return byCategory.filter(
      (c) =>
        c.term.toLowerCase().includes(q) ||
        c.definition.toLowerCase().includes(q),
    );
  }, [cards, activeTab, searchQuery]);

  const handleAdd = () => {
    setEditingCard(null);
    setModalKey((k) => k + 1);
    setModalVisible(true);
  };

  const handleEdit = (card: Card) => {
    setEditingCard(card);
    setModalKey((k) => k + 1);
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCard(id);
      setCards((prev) => prev.filter((c) => c.id !== id));
    } catch {
      showAlert({ type: "error", title: "Error", message: "Failed to delete card" });
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
      showAlert({ type: "error", title: "Error", message: `Failed to ${editingCard ? "update" : "add"} card` });
    }
  };

  return (
    <SafeAreaView
      className={`flex-1 ${headerBgMap[activeTab]}`}
      edges={["top"]}
    >
      {/* Header */}
      <View className={headerBgMap[activeTab]}>
        <View className="flex-row items-center justify-between px-8 pt-4 pb-2">
          <View className="flex-row items-center">
            <Text className="text-2xl font-nunito-extrabold text-snow">
              Hello,
            </Text>
            <Text className="ml-2 text-2xl text-[#FFD700] font-nunito-extrabold">
              Timothy!
            </Text>
          </View>

          {/* Sync Button */}
          <Pressable
            onPress={() => doSync(false)}
            disabled={syncing}
            className="items-center justify-center w-10 h-10 rounded-full bg-white/20"
          >
            {syncing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <MaterialCommunityIcons
                name="cloud-sync"
                size={22}
                color="#FFFFFF"
              />
            )}
            {pendingCount > 0 && !syncing && (
              <View className="absolute -top-1 -right-1 items-center justify-center w-5 h-5 rounded-full bg-cardinal">
                <Text className="text-[10px] font-nunito-bold text-white">
                  {pendingCount > 9 ? "9+" : pendingCount}
                </Text>
              </View>
            )}
          </Pressable>
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

        {/* Search Bar */}
        <View className="mx-5 mb-4">
          <View className="flex-row items-center px-3 bg-white border rounded-xl border-swan">
            <MaterialCommunityIcons name="magnify" size={20} color="#AFAFAF" />
            <TextInput
              className="flex-1 py-2.5 ml-2 text-sm font-nunito text-eel"
              placeholder="Search cards..."
              placeholderTextColor="#AFAFAF"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
                <MaterialCommunityIcons
                  name="close-circle"
                  size={18}
                  color="#AFAFAF"
                />
              </Pressable>
            )}
          </View>
        </View>

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
                  {searchQuery.trim()
                    ? "No matching cards found"
                    : `No ${activeTab === "word" ? "words" : activeTab === "phrase" ? "phrases" : "patterns"} yet`}
                </Text>
                {!searchQuery.trim() && (
                  <Text className="mt-1 text-sm font-nunito text-hare">
                    Tap + to add your first one
                  </Text>
                )}
              </View>
            }
            showsVerticalScrollIndicator={false}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews
          />
        )}

        {/* FAB */}
        <FloatingActionButton onPress={handleAdd} category={activeTab} />

        {/* Modal */}
        <AddEditCardModal
          key={modalKey}
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
