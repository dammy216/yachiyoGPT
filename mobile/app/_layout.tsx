import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { MenuProvider } from "react-native-popup-menu";
import "react-native-reanimated";

import { HeaderMenu, HeaderTitle } from "@/src/shared/components/HeaderMenu";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={DefaultTheme}>
        <MenuProvider>
          <Stack>
            <Stack.Screen
              name="(tabs)"
              options={{
                headerShown: true,
                headerStyle: { backgroundColor: "white" },
                headerTitle: () => <HeaderTitle />,
                headerRight: () => <HeaderMenu />,
              }}
            />
          </Stack>
          <StatusBar style="auto" />
        </MenuProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
