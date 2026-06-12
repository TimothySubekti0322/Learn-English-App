import { Colors } from "@/constants/theme";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// ─── Types ──────────────────────────────────────────────────

type AlertType = "success" | "error" | "info" | "confirm";

interface AlertButton {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void;
}

interface AlertConfig {
  title: string;
  message: string;
  type?: AlertType;
  buttons?: AlertButton[];
}

interface AlertContextType {
  showAlert: (config: AlertConfig) => void;
}

// ─── Context ────────────────────────────────────────────────

const AlertContext = createContext<AlertContextType | null>(null);

export function useAlert() {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error("useAlert must be used within AlertProvider");
  return ctx;
}

// ─── Icon config per type ───────────────────────────────────

const ICON_MAP: Record<
  AlertType,
  {
    name: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
    color: string;
    bg: string;
  }
> = {
  success: { name: "check-circle", color: Colors.featherGreen, bg: "#f0fde4" },
  error: { name: "alert-circle", color: Colors.cardinal, bg: "#fff0f0" },
  info: { name: "information", color: Colors.macaw, bg: "#e8f7fe" },
  confirm: { name: "help-circle", color: Colors.bee, bg: "#fff8e0" },
};

// ─── Provider ───────────────────────────────────────────────

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<AlertConfig | null>(null);
  const scaleAnim = useRef(new Animated.Value(0.88)).current;

  const showAlert = useCallback((cfg: AlertConfig) => {
    setConfig(cfg);
    setVisible(true);
  }, []);

  // Scale-in animation when visible
  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.88);
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 65,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, scaleAnim]);

  const dismiss = useCallback(() => {
    setVisible(false);
    setConfig(null);
  }, []);

  const handleButton = useCallback(
    (button: AlertButton) => {
      setVisible(false);
      if (button.onPress) {
        setTimeout(() => {
          button.onPress?.();
          setConfig(null);
        }, 250);
      } else {
        setConfig(null);
      }
    },
    [],
  );

  const type = config?.type ?? "info";
  const icon = ICON_MAP[type];
  const buttons = config?.buttons ?? [{ text: "OK", style: "default" as const }];

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={dismiss}
      >
        <Pressable
          className="flex-1 items-center justify-center bg-black/45"
          onPress={dismiss}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <Animated.View
              className="bg-white rounded-3xl py-7 px-6 items-center"
              style={{
                width: 310,
                transform: [{ scale: scaleAnim }],
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.12,
                shadowRadius: 24,
                elevation: 12,
              }}
            >
              {/* Icon */}
              <View
                className="w-16 h-16 rounded-full items-center justify-center mb-3.5"
                style={{ backgroundColor: icon.bg }}
              >
                <MaterialCommunityIcons
                  name={icon.name}
                  size={34}
                  color={icon.color}
                />
              </View>

              {/* Title */}
              <Text className="text-[18px] font-nunito-extrabold text-eel mb-1.5 text-center">
                {config?.title}
              </Text>

              {/* Message */}
              <Text
                className="text-[13px] font-nunito-semibold text-wolf text-center mb-6"
                style={{ lineHeight: 20 }}
              >
                {config?.message}
              </Text>

              {/* Buttons */}
              <View
                className={`w-full ${buttons.length > 1 ? "flex-row gap-3" : ""}`}
              >
                {buttons.map((btn, i) => {
                  const isCancel = btn.style === "cancel";
                  const isDestructive = btn.style === "destructive";

                  let bgColor = icon.color;
                  let textColor = "#FFFFFF";
                  let shadowColor = icon.color;

                  if (isCancel) {
                    bgColor = Colors.polar;
                    textColor = Colors.wolf;
                    shadowColor = "transparent";
                  } else if (isDestructive) {
                    bgColor = Colors.cardinal;
                    shadowColor = "#d43d3d";
                  }

                  return (
                    <TouchableOpacity
                      key={i}
                      onPress={() => handleButton(btn)}
                      className={`py-[13px] rounded-[14px] items-center ${buttons.length > 1 ? "flex-1" : "w-full"}`}
                      style={{
                        backgroundColor: bgColor,
                        shadowColor,
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: isCancel ? 0 : 1,
                        shadowRadius: 0,
                        elevation: isCancel ? 0 : 4,
                      }}
                      activeOpacity={0.8}
                    >
                      <Text
                        className="text-[14px] font-nunito-extrabold"
                        style={{ color: textColor }}
                      >
                        {btn.text}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Animated.View>
          </Pressable>
        </Pressable>
      </Modal>
    </AlertContext.Provider>
  );
}
