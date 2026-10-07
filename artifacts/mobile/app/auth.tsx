import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetMatchesQueryKey,
  getGetProfileQueryKey,
  useRequestAuthCode,
  useVerifyAuthCode,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { saveAuthToken as persistAuthToken } from "@/lib/authSession";

function haptic() {
  if (Platform.OS !== "web") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

function errorMessage(error: unknown, fallback: string): string {
  const apiError = error as { data?: { error?: string }; message?: string };
  return apiError.data?.error ?? apiError.message ?? fallback;
}

export default function AuthScreen() {
  const colors = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const requestCode = useRequestAuthCode();
  const verifyCode = useVerifyAuthCode();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [message, setMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  async function handleRequestCode() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      setMessage("Saisis une adresse email valide.");
      return;
    }

    setMessage(null);
    try {
      await requestCode.mutateAsync({ data: { email: normalizedEmail } });
      setEmail(normalizedEmail);
      setCode("");
      setStep("code");
      setCooldown(60);
      haptic();
      const interval = setInterval(() => {
        setCooldown((current) => {
          if (current <= 1) {
            clearInterval(interval);
            return 0;
          }
          return current - 1;
        });
      }, 1000);
    } catch (error) {
      setMessage(errorMessage(error, "Le code n'a pas pu être envoyé. Réessaie."));
    }
  }

  async function handleVerifyCode() {
    if (!/^\d{6}$/.test(code)) {
      setMessage("Saisis le code à six chiffres reçu par email.");
      return;
    }

    setMessage(null);
    try {
      const session = await verifyCode.mutateAsync({
        data: { email: email.trim().toLowerCase(), code },
      });
      await persistAuthToken(session.accessToken);
      queryClient.clear();
      await queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey() });
      await queryClient.invalidateQueries({ queryKey: getGetMatchesQueryKey() });
      haptic();
      router.replace(session.user.hasProfile ? "/(tabs)" : "/onboarding");
    } catch (error) {
      setMessage(errorMessage(error, "Code invalide ou expiré."));
    }
  }

  const busy = requestCode.isPending || verifyCode.isPending;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
        pointerEvents="none"
        style={[
          styles.ambientOrb,
          styles.ambientOrbPrimary,
          { backgroundColor: colors.primary + "18" },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.ambientOrb,
          styles.ambientOrbAccent,
          { backgroundColor: colors.accent + "12" },
        ]}
      />
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brandHeader}>
          <Image
            source={require("../assets/images/jobagogo-logo-transparent.png")}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="Jobagogo"
          />
          <View style={[styles.brandPill, { backgroundColor: colors.primary + "18" }]}>
            <View style={[styles.brandPillDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.brandPillText, { color: colors.primary }]}>MATCHING EMPLOI</Text>
          </View>
        </View>

        <View style={styles.hero}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>TON PROCHAIN MATCH</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Le bon métier.
            {"\n"}
            Au bon moment.
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {step === "email"
              ? "Connecte-toi pour retrouver ton profil et découvrir les offres qui te ressemblent."
              : `Ton code de connexion a été envoyé à ${email}.`}
          </Text>
        </View>

        <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.formHeader}>
            <View style={[styles.formIcon, { backgroundColor: colors.primary + "18" }]}>
              <Feather
                name={step === "email" ? "mail" : "shield"}
                size={20}
                color={colors.primary}
              />
            </View>
            <View style={styles.formHeaderCopy}>
              <Text style={[styles.formTitle, { color: colors.foreground }]}>
                {step === "email" ? "Accéder à mon espace" : "Confirme ton identité"}
              </Text>
              <Text style={[styles.formHint, { color: colors.mutedForeground }]}>
                {step === "email" ? "Un code sécurisé, sans mot de passe." : "Saisis le code reçu par email."}
              </Text>
            </View>
          </View>

          {step === "email" ? (
            <>
              <Text style={[styles.label, { color: colors.foreground }]}>Adresse email</Text>
              <View style={[styles.inputShell, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
                <Feather name="at-sign" size={18} color={colors.mutedForeground} />
                <TextInput
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);
                    setMessage(null);
                  }}
                  placeholder="toi@exemple.com"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="send"
                  onSubmitEditing={handleRequestCode}
                  style={[styles.input, { color: colors.foreground }]}
                />
              </View>
              <Pressable
                onPress={handleRequestCode}
                disabled={busy}
                style={({ pressed }) => [
                  styles.button,
                  { backgroundColor: colors.primary, opacity: busy ? 0.6 : pressed ? 0.82 : 1 },
                ]}
              >
                {busy ? <ActivityIndicator color={colors.primaryForeground} /> : (
                  <>
                    <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>
                      Recevoir mon code
                    </Text>
                    <Feather name="arrow-up-right" size={18} color={colors.primaryForeground} />
                  </>
                )}
              </Pressable>
            </>
          ) : (
            <>
              <Text style={[styles.label, { color: colors.foreground }]}>Code à six chiffres</Text>
              <View style={[styles.inputShell, styles.codeShell, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
                <Feather name="hash" size={18} color={colors.mutedForeground} />
                <TextInput
                  value={code}
                  onChangeText={(value) => {
                    setCode(value.replace(/\D/g, "").slice(0, 6));
                    setMessage(null);
                  }}
                  placeholder="000000"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                  style={[
                    styles.input,
                    styles.codeInput,
                    { color: colors.foreground },
                  ]}
                />
              </View>
              <Pressable
                onPress={handleVerifyCode}
                disabled={busy}
                style={({ pressed }) => [
                  styles.button,
                  { backgroundColor: colors.primary, opacity: busy ? 0.6 : pressed ? 0.82 : 1 },
                ]}
              >
                {busy ? <ActivityIndicator color={colors.primaryForeground} /> : (
                  <>
                    <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>
                      Valider et continuer
                    </Text>
                    <Feather name="arrow-right" size={18} color={colors.primaryForeground} />
                  </>
                )}
              </Pressable>
              <View style={styles.actionsRow}>
                <Pressable onPress={() => setStep("email")} disabled={busy} style={styles.secondaryAction}>
                  <Feather name="edit-2" size={14} color={colors.primary} />
                  <Text style={[styles.secondaryText, { color: colors.primary }]}>Modifier l’email</Text>
                </Pressable>
                <Pressable
                  onPress={handleRequestCode}
                  disabled={busy || cooldown > 0}
                  style={styles.secondaryAction}
                >
                  <Feather name="refresh-cw" size={14} color={cooldown > 0 ? colors.mutedForeground : colors.primary} />
                  <Text style={[styles.secondaryText, { color: cooldown > 0 ? colors.mutedForeground : colors.primary }]}>
                    {cooldown > 0 ? `${cooldown}s` : "Renvoyer"}
                  </Text>
                </Pressable>
              </View>
            </>
          )}

          {message ? (
            <View style={[styles.message, { backgroundColor: colors.destructive + "14" }]}>
              <Feather name="alert-circle" size={16} color={colors.destructive} />
              <Text style={[styles.error, { color: colors.destructive }]}>{message}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.footer}>
          <Feather name="lock" size={13} color={colors.mutedForeground} />
          <Text style={[styles.legal, { color: colors.mutedForeground }]}>
            Connexion sécurisée. Ton email sert à retrouver ton espace professionnel.
          </Text>
        </View>
      </KeyboardAwareScrollViewCompat>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: "hidden" },
  ambientOrb: {
    borderRadius: 999,
    height: 260,
    position: "absolute",
    width: 260,
  },
  ambientOrbPrimary: { right: -120, top: -70 },
  ambientOrbAccent: { bottom: -150, left: -100 },
  content: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  brandHeader: {
    alignItems: "flex-start",
    gap: 18,
    paddingTop: 12,
  },
  logo: { height: 43, width: 160 },
  brandPill: {
    alignItems: "center",
    borderRadius: 99,
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  brandPillDot: { borderRadius: 99, height: 6, width: 6 },
  brandPillText: { fontFamily: "Geist_700Bold", fontSize: 10, letterSpacing: 1.2 },
  hero: { marginTop: 38 },
  eyebrow: { fontFamily: "Geist_700Bold", fontSize: 11, letterSpacing: 1.8, marginBottom: 12 },
  title: { fontFamily: "Geist_700Bold", fontSize: 38, letterSpacing: -1.2, lineHeight: 42 },
  subtitle: { fontFamily: "Geist_400Regular", fontSize: 15, lineHeight: 23, marginTop: 16, maxWidth: 340 },
  formCard: {
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 34,
    padding: 18,
  },
  formHeader: { alignItems: "center", flexDirection: "row", gap: 12, marginBottom: 24 },
  formIcon: { alignItems: "center", borderRadius: 14, height: 44, justifyContent: "center", width: 44 },
  formHeaderCopy: { flex: 1 },
  formTitle: { fontFamily: "Geist_600SemiBold", fontSize: 17 },
  formHint: { fontFamily: "Geist_400Regular", fontSize: 13, lineHeight: 19, marginTop: 3 },
  label: { fontFamily: "Geist_600SemiBold", fontSize: 13, marginBottom: 8 },
  inputShell: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 56,
    paddingHorizontal: 15,
  },
  input: {
    flex: 1,
    fontFamily: "Geist_400Regular",
    fontSize: 16,
    minHeight: 54,
    paddingHorizontal: 0,
  },
  codeShell: { gap: 8 },
  codeInput: { fontFamily: "Geist_700Bold", fontSize: 25, letterSpacing: 7, textAlign: "left" },
  button: {
    alignItems: "center",
    borderRadius: 14,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    marginTop: 16,
    minHeight: 56,
  },
  buttonText: { fontFamily: "Geist_700Bold", fontSize: 15 },
  actionsRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  secondaryAction: { alignItems: "center", flexDirection: "row", gap: 6, paddingVertical: 12 },
  secondaryText: { fontFamily: "Geist_600SemiBold", fontSize: 13 },
  message: { alignItems: "flex-start", borderRadius: 12, flexDirection: "row", gap: 8, marginTop: 14, padding: 11 },
  error: { flex: 1, fontFamily: "Geist_400Regular", fontSize: 13, lineHeight: 19 },
  footer: { alignItems: "center", flexDirection: "row", gap: 6, justifyContent: "center", marginTop: 22 },
  legal: { fontFamily: "Geist_400Regular", fontSize: 11, lineHeight: 16, textAlign: "center" },
});