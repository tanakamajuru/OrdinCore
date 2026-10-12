import React, { useLayoutEffect } from 'react';
import { View, Platform, Pressable, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Sharing from 'expo-sharing';
import { Feather } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/ui';

// In-app PDF viewer. The caller downloads the (authenticated) PDF to a local file first and
// passes its file:// uri here, so no credentials are ever placed in a URL. iOS and Android
// WebViews both render a local PDF when file access is enabled. A Share action stays available
// in the header so the brief can still be saved or sent on.
export function PdfViewerScreen() {
  const { c } = useTheme();
  const route = useRoute<any>();
  const nav = useNavigation<any>();
  const { uri, title } = (route.params || {}) as { uri?: string; title?: string };

  const share = async () => {
    if (!uri) return;
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
      }
    } catch { /* user dismissed the share sheet — nothing to do */ }
  };

  useLayoutEffect(() => {
    nav.setOptions({
      title: title || 'Report',
      headerRight: () => (
        <Pressable onPress={share} hitSlop={10} style={{ paddingHorizontal: 8 }}>
          <Feather name="share" size={20} color={c.ink} />
        </Pressable>
      ),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nav, title, uri]);

  if (!uri) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.card }}>
        <Text muted>No document to display.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.card }}>
      <WebView
        source={{ uri }}
        style={{ flex: 1, backgroundColor: c.card }}
        originWhitelist={['*']}
        allowFileAccess
        allowFileAccessFromFileURLs
        allowUniversalAccessFromFileURLs
        // Android needs the document viewer; iOS renders PDFs natively.
        androidLayerType={Platform.OS === 'android' ? 'hardware' : undefined}
        startInLoadingState
        renderLoading={() => (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={c.accent} />
          </View>
        )}
      />
    </View>
  );
}
