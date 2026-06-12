import { Colors } from "@/constants/theme";
import { fetchCards } from "@/lib/cards";
import { fetchAllQuizRecordsCached } from "@/lib/quizCache";
import {
  CardsAddedDataPoint,
  computeCardsAdded,
  computeQuizCompleted,
  Granularity,
  QuizDataPoint,
} from "@/lib/report";
import { Card, QuizRecord } from "@/lib/types";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { BarChart } from "react-native-gifted-charts";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── Granularity Switcher ────────────────────────────────────

const GRANULARITY_OPTIONS: { key: Granularity; label: string }[] = [
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
];

function GranularitySwitcher({
  value,
  onChange,
}: {
  value: Granularity;
  onChange: (g: Granularity) => void;
}) {
  return (
    <View className="flex-row p-1 bg-polar rounded-xl">
      {GRANULARITY_OPTIONS.map((opt) => (
        <Pressable
          key={opt.key}
          onPress={() => onChange(opt.key)}
          className={`flex-1 items-center py-2 rounded-lg ${
            value === opt.key ? "bg-white" : ""
          }`}
          style={
            value === opt.key
              ? {
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.08,
                  shadowRadius: 2,
                  elevation: 2,
                }
              : undefined
          }
        >
          <Text
            className={`text-xs font-nunito-bold ${
              value === opt.key ? "text-eel" : "text-hare"
            }`}
          >
            {opt.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// ─── Chart Colors & Layout Constants ─────────────────────────

const STACK_COLORS = {
  word: Colors.featherGreen,
  phrase: Colors.macaw,
  pattern: Colors.beetle,
};

const CHART_HEIGHT = 220;
const Y_AXIS_WIDTH = 35;
const TOOLTIP_GAP = 6;

const CARDS_TOOLTIP = { width: 140, height: 88 };
const QUIZ_TOOLTIP = { width: 130, height: 52 };

// ─── Main Component ──────────────────────────────────────────

export default function ReportScreen() {
  const [cards, setCards] = useState<Card[]>([]);
  const [quizRecords, setQuizRecords] = useState<QuizRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [cardsGranularity, setCardsGranularity] =
    useState<Granularity>("daily");
  const [quizGranularity, setQuizGranularity] = useState<Granularity>("daily");
  const [pressedCardsIdx, setPressedCardsIdx] = useState<number | null>(null);
  const [pressedQuizIdx, setPressedQuizIdx] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        try {
          const [cardsData, recordsData] = await Promise.all([
            fetchCards(),
            fetchAllQuizRecordsCached(),
          ]);
          setCards(cardsData);
          setQuizRecords(recordsData);
        } catch {
          // Silently fail — show whatever cached data we have
        } finally {
          setLoading(false);
        }
      };
      load();
    }, []),
  );

  // ─── Compute chart data ──────────────────────────────────

  const cardsData = computeCardsAdded(cards, cardsGranularity);
  const quizData = computeQuizCompleted(quizRecords, quizGranularity);

  // Summary stats
  const totalCards = cards.length;
  const totalQuizCorrect = quizRecords.reduce(
    (sum, r) => sum + r.correct_count,
    0,
  );
  const wordCount = cards.filter((c) => c.category === "word").length;
  const phraseCount = cards.filter((c) => c.category === "phrase").length;
  const patternCount = cards.filter((c) => c.category === "pattern").length;

  // Reset pressed index when granularity changes
  const handleCardsGranularity = (g: Granularity) => {
    setCardsGranularity(g);
    setPressedCardsIdx(null);
  };
  const handleQuizGranularity = (g: Granularity) => {
    setQuizGranularity(g);
    setPressedQuizIdx(null);
  };

  // Chart sizing per granularity
  const chartConfig = getChartConfig(cardsGranularity);
  const quizChartConfig = getChartConfig(quizGranularity);

  // Max values for tooltip positioning
  const cardsMaxValue = Math.max(
    ...cardsData.map((d) => d.word + d.phrase + d.pattern),
    1,
  );
  const quizMaxValue = Math.max(...quizData.map((d) => d.value), 1);

  // Convert to gifted-charts format — Cards Added (stacked)
  const cardsStackData = cardsData.map((d) => ({
    stacks: [
      { value: d.word, color: STACK_COLORS.word },
      { value: d.phrase, color: STACK_COLORS.phrase },
      { value: d.pattern, color: STACK_COLORS.pattern },
    ],
    label: cardsGranularity === "weekly" ? shortenWeekLabel(d.label) : d.label,
  }));

  // Convert to gifted-charts format — Quiz Completed
  const quizBarData = quizData.map((d, i) => ({
    value: d.value,
    label: quizGranularity === "weekly" ? shortenWeekLabel(d.label) : d.label,
    frontColor: pressedQuizIdx === i ? Colors.humpback : Colors.macaw,
  }));

  // Tooltip positions
  const cardsTooltipPos =
    pressedCardsIdx !== null && cardsData[pressedCardsIdx]
      ? getTooltipPosition({
          index: pressedCardsIdx,
          totalBars: cardsData.length,
          barValue:
            cardsData[pressedCardsIdx].word +
            cardsData[pressedCardsIdx].phrase +
            cardsData[pressedCardsIdx].pattern,
          maxValue: cardsMaxValue,
          barWidth: chartConfig.barWidth,
          spacing: chartConfig.spacing,
          initialSpacing: chartConfig.initialSpacing,
          tooltipWidth: CARDS_TOOLTIP.width,
          tooltipHeight: CARDS_TOOLTIP.height,
        })
      : null;

  const quizTooltipPos =
    pressedQuizIdx !== null && quizData[pressedQuizIdx]
      ? getTooltipPosition({
          index: pressedQuizIdx,
          totalBars: quizData.length,
          barValue: quizData[pressedQuizIdx].value,
          maxValue: quizMaxValue,
          barWidth: quizChartConfig.barWidth,
          spacing: quizChartConfig.spacing,
          initialSpacing: quizChartConfig.initialSpacing,
          tooltipWidth: QUIZ_TOOLTIP.width,
          tooltipHeight: QUIZ_TOOLTIP.height,
        })
      : null;

  // ─── Render ────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-snow" edges={["top"]}>
        <View className="items-center justify-center flex-1">
          <ActivityIndicator size="large" color={Colors.macaw} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-snow" edges={["top"]}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Header */}
        <View className="px-6 pt-5 pb-2">
          <View className="flex-row flex-wrap">
            <Text className="text-[22px] font-nunito-extrabold text-eel">
              Hi Timothy,{" "}
            </Text>
            <Text className="text-[22px] font-nunito-extrabold text-feather">
              Here is your report
            </Text>
          </View>
          <Text className="text-[13px] font-nunito-semibold text-hare mt-1">
            Track your learning progress
          </Text>
        </View>

        {/* Summary Stats */}
        <View className="flex-row gap-3 mx-4 mt-3 mb-5">
          <View className="items-center flex-1 py-4 bg-white border rounded-2xl border-swan">
            <Text className="text-2xl font-nunito-extrabold text-eel">
              {totalCards}
            </Text>
            <Text className="text-xs font-nunito-semibold text-hare mt-0.5">
              Total Cards
            </Text>
          </View>
          <View className="items-center flex-1 py-4 border bg-feather rounded-2xl border-swan">
            <Text className="text-2xl text-white font-nunito-extrabold">
              {totalQuizCorrect}
            </Text>
            <Text className="text-xs font-nunito-semibold text-white mt-0.5">
              Quiz Correct
            </Text>
          </View>
        </View>

        {/* Chart 1: Cards Added */}
        <Pressable
          className="p-4 mx-4 mb-5 bg-white border rounded-2xl border-swan"
          onPress={() => setPressedCardsIdx(null)}
        >
          <Text className="text-base font-nunito-extrabold text-eel mb-0.5">
            Cards Added
          </Text>
          <Text className="mb-3 text-xs font-nunito-semibold text-hare">
            {wordCount}W · {phraseCount}P · {patternCount}Pa
          </Text>

          <GranularitySwitcher
            value={cardsGranularity}
            onChange={handleCardsGranularity}
          />

          <View
            className="mt-2"
            style={{ position: "relative", overflow: "visible" }}
          >
            {hasCardsData(cardsData) ? (
              <BarChart
                stackData={cardsStackData}
                height={CHART_HEIGHT}
                barWidth={chartConfig.barWidth}
                spacing={chartConfig.spacing}
                initialSpacing={chartConfig.initialSpacing}
                endSpacing={chartConfig.endSpacing}
                hideRules
                xAxisThickness={1}
                yAxisThickness={0}
                xAxisColor={Colors.swan}
                yAxisTextStyle={{
                  color: Colors.hare,
                  fontSize: 10,
                  fontFamily: "Nunito_600SemiBold",
                }}
                xAxisLabelTextStyle={{
                  color: Colors.wolf,
                  fontSize: chartConfig.labelSize,
                  fontFamily: "Nunito_600SemiBold",
                }}
                noOfSections={4}
                roundedTop
                roundedBottom
                onPress={(_: unknown, index: number) =>
                  setPressedCardsIdx((prev) => (prev === index ? null : index))
                }
              />
            ) : (
              <EmptyChart message="No cards added in this period" />
            )}

            {/* Dismiss overlay — captures taps on chart canvas to close tooltip */}
            {pressedCardsIdx !== null && (
              <Pressable
                onPress={() => setPressedCardsIdx(null)}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 999,
                }}
              />
            )}

            {/* Tooltip overlay */}
            {cardsTooltipPos &&
              pressedCardsIdx !== null &&
              cardsData[pressedCardsIdx] && (
                <View
                  style={{
                    position: "absolute",
                    left: cardsTooltipPos.left,
                    top: cardsTooltipPos.top,
                    zIndex: 1000,
                    elevation: 10,
                  }}
                  pointerEvents="none"
                >
                  <CardsTooltip data={cardsData[pressedCardsIdx]} />
                </View>
              )}
          </View>

          {/* Legend */}
          <View className="flex-row justify-center gap-4 mt-3">
            <LegendDot color={STACK_COLORS.word} label="Words" />
            <LegendDot color={STACK_COLORS.phrase} label="Phrases" />
            <LegendDot color={STACK_COLORS.pattern} label="Patterns" />
          </View>
        </Pressable>

        {/* Chart 2: Quiz Completed */}
        <Pressable
          className="p-4 mx-4 mb-5 bg-white border rounded-2xl border-swan"
          onPress={() => setPressedQuizIdx(null)}
        >
          <Text className="text-base font-nunito-extrabold text-eel mb-0.5">
            Quiz Completed
          </Text>
          <Text className="mb-3 text-xs font-nunito-semibold text-hare">
            {totalQuizCorrect} correct answers total
          </Text>

          <GranularitySwitcher
            value={quizGranularity}
            onChange={handleQuizGranularity}
          />

          <View
            className="mt-2"
            style={{ position: "relative", overflow: "visible" }}
          >
            {hasQuizData(quizData) ? (
              <BarChart
                data={quizBarData}
                height={CHART_HEIGHT}
                barWidth={quizChartConfig.barWidth}
                spacing={quizChartConfig.spacing}
                initialSpacing={quizChartConfig.initialSpacing}
                endSpacing={quizChartConfig.endSpacing}
                hideRules
                xAxisThickness={1}
                yAxisThickness={0}
                xAxisColor={Colors.swan}
                yAxisTextStyle={{
                  color: Colors.hare,
                  fontSize: 10,
                  fontFamily: "Nunito_600SemiBold",
                }}
                xAxisLabelTextStyle={{
                  color: Colors.wolf,
                  fontSize: quizChartConfig.labelSize,
                  fontFamily: "Nunito_600SemiBold",
                }}
                noOfSections={4}
                roundedTop
                frontColor={Colors.macaw}
                onPress={(_: unknown, index: number) =>
                  setPressedQuizIdx((prev) => (prev === index ? null : index))
                }
              />
            ) : (
              <EmptyChart message="No quiz activity in this period" />
            )}

            {/* Dismiss overlay */}
            {pressedQuizIdx !== null && (
              <Pressable
                onPress={() => setPressedQuizIdx(null)}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 999,
                }}
              />
            )}

            {/* Tooltip overlay */}
            {quizTooltipPos &&
              pressedQuizIdx !== null &&
              quizData[pressedQuizIdx] && (
                <View
                  style={{
                    position: "absolute",
                    left: quizTooltipPos.left,
                    top: quizTooltipPos.top,
                    zIndex: 1000,
                    elevation: 10,
                  }}
                  pointerEvents="none"
                >
                  <QuizTooltip data={quizData[pressedQuizIdx]} />
                </View>
              )}
          </View>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Tooltip Components ──────────────────────────────────────

function CardsTooltip({ data }: { data: CardsAddedDataPoint }) {
  return (
    <View
      className="px-3 py-2 bg-white rounded-xl"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 10,
        width: CARDS_TOOLTIP.width,
      }}
    >
      <Text className="mb-1 text-xs font-nunito-extrabold text-eel">
        {data.fullLabel}
      </Text>
      <Text
        className="text-[11px] font-nunito-bold"
        style={{ color: STACK_COLORS.word }}
      >
        Words: {data.word}
      </Text>
      <Text
        className="text-[11px] font-nunito-bold"
        style={{ color: STACK_COLORS.phrase }}
      >
        Phrases: {data.phrase}
      </Text>
      <Text
        className="text-[11px] font-nunito-bold"
        style={{ color: STACK_COLORS.pattern }}
      >
        Patterns: {data.pattern}
      </Text>
    </View>
  );
}

function QuizTooltip({ data }: { data: QuizDataPoint }) {
  return (
    <View
      className="px-3 py-2 bg-white rounded-xl"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 10,
        width: QUIZ_TOOLTIP.width,
      }}
    >
      <Text className="text-xs font-nunito-extrabold text-eel mb-0.5">
        {data.fullLabel}
      </Text>
      <Text
        className="text-[11px] font-nunito-bold"
        style={{ color: Colors.bee }}
      >
        Correct: {data.value}
      </Text>
    </View>
  );
}

// ─── Small Components ────────────────────────────────────────

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View
        className="w-3 h-3 rounded-full"
        style={{ backgroundColor: color }}
      />
      <Text className="text-xs font-nunito-semibold text-wolf">{label}</Text>
    </View>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <View className="items-center justify-center py-10">
      <Text className="text-sm font-nunito-semibold text-hare">{message}</Text>
    </View>
  );
}

// ─── Helpers ─────────────────────────────────────────────────

function getChartConfig(granularity: Granularity) {
  switch (granularity) {
    case "daily":
      return {
        barWidth: 28,
        spacing: 18,
        initialSpacing: 12,
        endSpacing: 20,
        labelSize: 12,
      };
    case "weekly":
      return {
        barWidth: 36,
        spacing: 30,
        initialSpacing: 25,
        endSpacing: 20,
        labelSize: 10,
      };
    case "monthly":
      return {
        barWidth: 40,
        spacing: 36,
        initialSpacing: 25,
        endSpacing: 20,
        labelSize: 12,
      };
  }
}

function getTooltipPosition(params: {
  index: number;
  totalBars: number;
  barValue: number;
  maxValue: number;
  barWidth: number;
  spacing: number;
  initialSpacing: number;
  tooltipWidth: number;
  tooltipHeight: number;
}): { left: number; top: number } {
  const {
    index,
    totalBars,
    barValue,
    maxValue,
    barWidth,
    spacing,
    initialSpacing,
    tooltipWidth,
    tooltipHeight,
  } = params;

  // Bar edges (x relative to chart wrapper, including y-axis offset)
  const barLeftX = Y_AXIS_WIDTH + initialSpacing + index * (barWidth + spacing);
  const barRightX = barLeftX + barWidth;

  // Left half vs right half of chart
  const isLeft = index < totalBars / 2;

  // Short (≤50% max height) vs high (>50%)
  const isShort = barValue <= maxValue * 0.5;

  // Bar top Y (from top of chart, y-down coordinate system)
  const barPixelHeight =
    maxValue > 0 ? (barValue / maxValue) * CHART_HEIGHT : 0;
  const barTopY = CHART_HEIGHT - barPixelHeight;

  let left: number;
  let top: number;

  if (isShort) {
    // Center tooltip vertically on bar top, clamped within chart
    top = barTopY - tooltipHeight / 2;
    top = Math.max(0, Math.min(top, CHART_HEIGHT - tooltipHeight));
    left = isLeft
      ? barRightX + TOOLTIP_GAP
      : barLeftX - tooltipWidth - TOOLTIP_GAP;
  } else {
    // Tooltip centered at 40% from top (≈60% chart height from bottom)
    top = CHART_HEIGHT * 0.4 - tooltipHeight / 2;
    if (top < 0) top = 0;
    left = isLeft
      ? barRightX + TOOLTIP_GAP
      : barLeftX - tooltipWidth - TOOLTIP_GAP;
  }

  if (left < 0) left = 0;

  return { left, top };
}

function shortenWeekLabel(label: string): string {
  const parts = label.split("-");
  if (parts.length === 2) return `${parts[0]}\n${parts[1]}`;
  return label;
}

function hasCardsData(data: CardsAddedDataPoint[]): boolean {
  return data.some((d) => d.word + d.phrase + d.pattern > 0);
}

function hasQuizData(data: QuizDataPoint[]): boolean {
  return data.some((d) => d.value > 0);
}
