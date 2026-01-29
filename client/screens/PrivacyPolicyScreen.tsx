import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Colors, Spacing, BorderRadius, Typography } from "@/constants/theme";

export default function PrivacyPolicyScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: headerHeight + Spacing.lg, paddingBottom: insets.bottom + Spacing["2xl"] },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText style={styles.title}>Privacy Policy</ThemedText>
        <ThemedText style={styles.lastUpdated}>Last Updated: January 2026</ThemedText>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>1. Information We Collect</ThemedText>
          <ThemedText style={styles.paragraph}>
            HiddenGem collects information you provide directly, including your email address for account authentication, item photos for AI analysis, and inventory data you create within the App.
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>2. How We Use Your Information</ThemedText>
          <ThemedText style={styles.paragraph}>
            We use the information we collect to provide and improve the App, process your inventory items through AI services, generate marketplace listings, and communicate with you about your account.
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>3. Data Storage</ThemedText>
          <ThemedText style={styles.paragraph}>
            Your API keys and marketplace credentials are stored securely on your device using encrypted storage. Item data and images are stored in our secure cloud database. We do not sell your personal information to third parties.
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>4. Third-Party Services</ThemedText>
          <ThemedText style={styles.paragraph}>
            The App integrates with third-party services including Google Gemini for AI analysis, Supabase for authentication, and marketplace platforms (WooCommerce, eBay). Your data shared with these services is subject to their respective privacy policies.
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>5. Image Data</ThemedText>
          <ThemedText style={styles.paragraph}>
            Photos you capture are sent to AI services for analysis. These images may be temporarily processed by our AI providers. We recommend not including personally identifiable information in item photos.
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>6. Data Security</ThemedText>
          <ThemedText style={styles.paragraph}>
            We implement industry-standard security measures to protect your data. Sensitive credentials are encrypted on your device. However, no method of transmission over the internet is 100% secure.
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>7. Your Rights</ThemedText>
          <ThemedText style={styles.paragraph}>
            You have the right to access, correct, or delete your personal data. You can disconnect marketplace integrations and remove API keys at any time through the App settings. To delete your account, please contact us.
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>8. Children's Privacy</ThemedText>
          <ThemedText style={styles.paragraph}>
            The App is not intended for users under 18 years of age. We do not knowingly collect personal information from children.
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>9. Changes to This Policy</ThemedText>
          <ThemedText style={styles.paragraph}>
            We may update this Privacy Policy from time to time. We will notify you of any changes by updating the "Last Updated" date and, where appropriate, through in-app notifications.
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>10. Contact Us</ThemedText>
          <ThemedText style={styles.paragraph}>
            If you have questions about this Privacy Policy or our data practices, please contact us at privacy@therelicshop.com.
          </ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundRoot,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  title: {
    ...Typography.h2,
    color: Colors.dark.text,
    marginBottom: Spacing.sm,
  },
  lastUpdated: {
    ...Typography.caption,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing["2xl"],
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.h4,
    color: Colors.dark.primary,
    marginBottom: Spacing.sm,
  },
  paragraph: {
    ...Typography.body,
    color: Colors.dark.textSecondary,
    lineHeight: 24,
  },
});
