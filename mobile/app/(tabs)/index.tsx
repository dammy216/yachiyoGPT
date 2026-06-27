import { View } from "react-native";

import { ConversationScreen } from "@/src/features/conversation";

export default function ConversationIndex() {
  return (
    <View style={{ flex: 1 }}>
      <ConversationScreen />
    </View>
  );
}
