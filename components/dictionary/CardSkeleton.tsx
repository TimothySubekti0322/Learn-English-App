import { useEffect, useMemo } from "react";
import { View, Animated, type DimensionValue } from "react-native";

function SkeletonBlock({ width, height }: { width: DimensionValue; height: number }) {
  const opacity = useMemo(() => new Animated.Value(0.3), []);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={{ opacity, width, height, borderRadius: 6, backgroundColor: "#E5E5E5" }}
    />
  );
}

export default function CardSkeleton() {
  return (
    <View className="px-5">
      {[1, 2, 3].map((i) => (
        <View
          key={i}
          className="p-4 mb-6 bg-white border rounded-2xl border-swan"
        >
          <SkeletonBlock width="60%" height={18} />
          <View className="mt-3">
            <SkeletonBlock width="30%" height={12} />
          </View>
          <View className="mt-2">
            <SkeletonBlock width="100%" height={14} />
          </View>
          <View className="mt-1">
            <SkeletonBlock width="80%" height={14} />
          </View>
          <View className="mt-3">
            <SkeletonBlock width="25%" height={12} />
          </View>
          <View className="mt-2">
            <SkeletonBlock width="100%" height={14} />
          </View>
        </View>
      ))}
    </View>
  );
}
