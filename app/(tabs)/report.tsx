import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ReportScreen() {
  return (
    <SafeAreaView className="flex-1 bg-snow">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="font-nunito-bold text-2xl text-eel">
          Hi Timothy, Here is your report
        </Text>
        <Text className="font-nunito text-base text-wolf mt-2">
          Report screen - coming soon
        </Text>
      </View>
    </SafeAreaView>
  );
}
