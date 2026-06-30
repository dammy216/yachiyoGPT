import React, { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { GlassPanel, colors } from "@/shared";

type Props = {
  isRecording: boolean;
  onToggleMic: () => void;
};

type OvalButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  active?: boolean;
};

const ICON_SIZE = 28;

const OvalButton = ({ icon, onPress, active }: OvalButtonProps) => (
  <GlassPanel
    radius={999}
    intensity={active ? 60 : 28}
    style={[styles.oval, active && styles.activeGlass]}
  >
    <TouchableOpacity style={styles.buttonInner} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={ICON_SIZE} color={active ? colors.recording : colors.text} />
    </TouchableOpacity>
  </GlassPanel>
);

export const BottomControls = ({ isRecording, onToggleMic }: Props) => {
  const [muted, setMuted] = useState(false);

  return (
    <View style={styles.row}>
      <OvalButton icon="settings-outline" onPress={() => {}} />
      <OvalButton icon="happy-outline" onPress={() => {}} />
      <OvalButton
        icon={muted ? "volume-mute" : "volume-high"}
        onPress={() => setMuted((m) => !m)}
      />
      <OvalButton
        icon={isRecording ? "mic" : "mic-outline"}
        onPress={onToggleMic}
        active={isRecording}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    marginHorizontal: 14,
    gap: 8,
  },
  oval: {
    flex: 1,
  },
  buttonInner: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  activeGlass: {
    borderColor: colors.recording,
    borderWidth: 1.5,
  },
});
