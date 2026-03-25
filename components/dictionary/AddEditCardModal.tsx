import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Card, CardCategory } from "@/lib/types";

interface AddEditCardModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    category: CardCategory;
    term: string;
    definition: string;
    example: string;
  }) => void;
  editCard?: Card | null;
  defaultCategory: CardCategory;
}

const categories: { key: CardCategory; label: string }[] = [
  { key: "word", label: "Word" },
  { key: "phrase", label: "Phrase" },
  { key: "pattern", label: "Pattern" },
];

export default function AddEditCardModal({
  visible,
  onClose,
  onSubmit,
  editCard,
  defaultCategory,
}: AddEditCardModalProps) {
  const [category, setCategory] = useState<CardCategory>(defaultCategory);
  const [term, setTerm] = useState("");
  const [definition, setDefinition] = useState("");
  const [example, setExample] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const exampleInputRef = useRef<TextInput>(null);

  const isEditing = !!editCard;

  useEffect(() => {
    if (visible) {
      if (editCard) {
        setCategory(editCard.category);
        setTerm(editCard.term);
        setDefinition(editCard.definition);
        setExample(editCard.example);
      } else {
        setCategory(defaultCategory);
        setTerm("");
        setDefinition("");
        setExample("");
      }
      setSubmitting(false);
    }
  }, [visible, editCard, defaultCategory]);

  const termLabel =
    category === "word"
      ? "Word"
      : category === "phrase"
        ? "Phrase"
        : "Pattern";

  const definitionLabel =
    category === "pattern" ? "Explanation" : "Definition";

  const handleInsertTerm = () => {
    if (!term.trim()) {
      Alert.alert("No term", `Please enter a ${termLabel.toLowerCase()} first`);
      return;
    }
    setExample((prev) => {
      const trimmed = prev.trimEnd();
      const needsSpace = trimmed.length > 0 && !trimmed.endsWith(" ");
      return trimmed + (needsSpace ? " " : "") + term;
    });
    exampleInputRef.current?.focus();
  };

  const handleSubmit = async () => {
    if (!term.trim()) {
      Alert.alert("Required", `Please enter a ${termLabel.toLowerCase()}`);
      return;
    }
    if (!definition.trim()) {
      Alert.alert("Required", `Please enter a ${definitionLabel.toLowerCase()}`);
      return;
    }
    if (!example.trim()) {
      Alert.alert("Required", "Please enter an example");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        category,
        term: term.trim(),
        definition: definition.trim(),
        example: example.trim(),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-3xl pt-4 pb-8 px-5 max-h-[90%]">
            {/* Header */}
            <View className="flex-row items-center justify-between mb-4">
              <Text className="font-nunito-bold text-xl text-eel">
                {isEditing ? "Edit Card" : "Add Card"}
              </Text>
              <TouchableOpacity onPress={onClose} hitSlop={8}>
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color="#AFAFAF"
                />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Category Selector */}
              {!isEditing && (
                <View className="mb-4">
                  <Text className="font-nunito-semibold text-sm text-eel mb-2">
                    Category
                  </Text>
                  <View className="flex-row bg-polar rounded-xl p-1">
                    {categories.map((cat) => {
                      const isActive = category === cat.key;
                      return (
                        <TouchableOpacity
                          key={cat.key}
                          onPress={() => setCategory(cat.key)}
                          className={`flex-1 py-2.5 rounded-lg items-center ${isActive ? "bg-feather" : ""}`}
                          activeOpacity={0.7}
                        >
                          <Text
                            className={`font-nunito-bold text-sm ${isActive ? "text-white" : "text-wolf"}`}
                          >
                            {cat.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Term Input */}
              <View className="mb-4">
                <Text className="font-nunito-semibold text-sm text-eel mb-2">
                  {termLabel}
                </Text>
                <TextInput
                  value={term}
                  onChangeText={setTerm}
                  placeholder={`Enter ${termLabel.toLowerCase()}...`}
                  placeholderTextColor="#AFAFAF"
                  multiline
                  className="font-nunito text-sm text-eel border border-swan rounded-xl px-4 py-3"
                  style={{ maxHeight: 100, textAlignVertical: "top" }}
                />
              </View>

              {/* Definition Input */}
              <View className="mb-4">
                <Text className="font-nunito-semibold text-sm text-eel mb-2">
                  {definitionLabel}
                </Text>
                <TextInput
                  value={definition}
                  onChangeText={setDefinition}
                  placeholder={`Enter ${definitionLabel.toLowerCase()}...`}
                  placeholderTextColor="#AFAFAF"
                  multiline
                  className="font-nunito text-sm text-eel border border-swan rounded-xl px-4 py-3"
                  style={{ maxHeight: 120, textAlignVertical: "top" }}
                />
              </View>

              {/* Example Input */}
              <View className="mb-6">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="font-nunito-semibold text-sm text-eel">
                    Example
                  </Text>
                  <TouchableOpacity
                    onPress={handleInsertTerm}
                    className="flex-row items-center bg-macaw/10 px-3 py-1.5 rounded-lg"
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons
                      name="format-bold"
                      size={14}
                      color="#1cb0f6"
                    />
                    <Text className="font-nunito-semibold text-xs text-macaw ml-1">
                      Insert {termLabel}
                    </Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  ref={exampleInputRef}
                  value={example}
                  onChangeText={setExample}
                  placeholder="Enter example sentence..."
                  placeholderTextColor="#AFAFAF"
                  multiline
                  className="font-nunito text-sm text-eel border border-swan rounded-xl px-4 py-3"
                  style={{ maxHeight: 120, textAlignVertical: "top" }}
                />
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={submitting}
                className={`py-4 rounded-xl items-center ${submitting ? "bg-hare" : "bg-feather"}`}
                activeOpacity={0.8}
              >
                <Text className="font-nunito-bold text-base text-white">
                  {submitting
                    ? "Saving..."
                    : isEditing
                      ? "Update Card"
                      : "Add Card"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
