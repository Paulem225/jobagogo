import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Linking,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Rect } from "react-native-svg";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import {
  getGetPremiumPaymentStatusQueryKey,
  useCreatePremiumPayment,
  useGetPremiumPaymentStatus,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

const FREE_LIMIT = 5;
const MONTHLY_PRICE = "1 000 FCFA";
const ANNUAL_PRICE = "6 000 FCFA";
const ANNUAL_ORIGINAL = "12 000 FCFA";

const BENEFITS = [
  { icon: "unlock" as const, label: "Accès illimité à toutes les offres" },
  { icon: "bell" as const, label: "Alertes en temps réel" },
  { icon: "message-circle" as const, label: "Support prioritaire WhatsApp" },
  { icon: "star" as const, label: "Suggestions personnalisées par IA" },
  { icon: "trending-up" as const, label: "Statistiques avancées de candidature" },
];

function LockIcon({ size = 32, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={11} width={18} height={11} rx={2} stroke={color} strokeWidth={2} />
      <Path d="M7 11V7a5 5 0 0110 0v4" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function StarIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </Svg>
  );
}

type Plan = "monthly" | "annual";

interface PremiumModalProps {
  visible: boolean;
  lockedCount: number;
  onClose: () => void;
}

export function PremiumModal({ visible, lockedCount, onClose }: PremiumModalProps) {
  const colors = useColors();
  const [selectedPlan, setSelectedPlan] = useState<Plan>("annual");
  const [paying, setPaying] = useState(false);
  const [paymentId, setPaymentId] = useState<number | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [paymentEnvironment, setPaymentEnvironment] = useState<"sandbox" | "live" | null>(null);
  const [sandboxTestPhone, setSandboxTestPhone] = useState<string | null>(null);
  const [checkoutOpened, setCheckoutOpened] = useState(false);
  const queryClient = useQueryClient();
  const createPayment = useCreatePremiumPayment();
  const paymentStatus = useGetPremiumPaymentStatus(paymentId ?? 0, {
    query: {
      queryKey: getGetPremiumPaymentStatusQueryKey(paymentId ?? 0),
      enabled: paymentId !== null,
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        return status === "completed" || status === "failed" ? false : 3000;
      },
    },
  });

  async function handlePay() {
    setPaying(true);
    try {
      const payment = await createPayment.mutateAsync({
        data: { plan: selectedPlan },
      });
      setPaymentId(payment.id);
      setCheckoutUrl(payment.checkoutUrl);
      setPaymentEnvironment(payment.environment);
      setSandboxTestPhone(payment.sandboxTestPhone ?? null);
      setCheckoutOpened(true);
      if (payment.environment === "sandbox" && payment.sandboxTestPhone) {
        Alert.alert(
          "Mode test Hub2",
          `Le sandbox Hub2 n’accepte pas les vrais numéros ivoiriens. Utilisez ${payment.sandboxTestPhone} dans le checkout pour simuler un paiement réussi.`,
          [
            { text: "Annuler", style: "cancel" },
            { text: "Ouvrir le paiement", onPress: openCheckout },
          ],
        );
      } else {
        openCheckout();
      }
    } catch {
      Alert.alert(
        "Paiement indisponible",
        "Impossible de créer le paiement Hub2. Vérifiez votre connexion et réessayez.",
      );
    } finally {
      setPaying(false);
    }
  }

  function openCheckout() {
    if (!checkoutUrl) return;

    const openRequest =
      Platform.OS === "web"
        ? Linking.openURL(checkoutUrl)
        : WebBrowser.openBrowserAsync(checkoutUrl);

    openRequest.catch(() => {
      Alert.alert(
        "Ouverture impossible",
        "Le paiement a bien été créé. Utilisez le bouton « Ouvrir le paiement » pour réessayer.",
      );
    });
  }

  function handleRetryPayment() {
    // A failed Hub2 payment link cannot be reused; reset so the user can start
    // a fresh payment from the plan selector.
    if (paymentId !== null) {
      queryClient.removeQueries({ queryKey: getGetPremiumPaymentStatusQueryKey(paymentId) });
    }
    setPaymentId(null);
    setCheckoutUrl(null);
    setPaymentEnvironment(null);
    setSandboxTestPhone(null);
    setCheckoutOpened(false);
  }

  function handleClose() {
    setPaymentId(null);
    setCheckoutUrl(null);
    setPaymentEnvironment(null);
    setSandboxTestPhone(null);
    setCheckoutOpened(false);
    queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleClose} activeOpacity={1} />
        <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
          {/* Drag handle */}
          <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />

          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            {paymentStatus.data?.status === "completed" ? (
              <SuccessScreen onClose={handleClose} colors={colors} />
            ) : paymentStatus.data?.status === "failed" ? (
              <FailedPaymentScreen
                colors={colors}
                failureReason={paymentStatus.data?.failureReason ?? null}
                onRetry={handleRetryPayment}
                onClose={handleClose}
              />
            ) : checkoutOpened ? (
              <PendingPaymentScreen
                onClose={handleClose}
                colors={colors}
                isChecking={paymentStatus.isFetching}
                error={paymentStatus.error}
                onRetry={() => paymentStatus.refetch()}
                onOpenCheckout={openCheckout}
                paymentEnvironment={paymentEnvironment}
                sandboxTestPhone={sandboxTestPhone}
              />
            ) : (
              <>
                {/* Header */}
                <View style={styles.modalHeader}>
                  <View style={[styles.crownBadge, { backgroundColor: "#F59E0B20" }]}>
                    <Text style={styles.crownEmoji}>👑</Text>
                  </View>
                  <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                    Jobagogo Premium
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: colors.mutedForeground }]}>
                    {lockedCount > 0
                      ? `Débloquez ${lockedCount} offre${lockedCount > 1 ? "s" : ""} supplémentaire${lockedCount > 1 ? "s" : ""} et accédez à tous les avantages`
                      : "Retrouvez tous les avantages Premium et accédez à toutes les offres"}
                  </Text>
                </View>

                {/* Benefits */}
                <View style={[styles.benefitsList, { borderColor: colors.border }]}>
                  {BENEFITS.map((b) => (
                    <View key={b.label} style={styles.benefitRow}>
                      <View style={[styles.benefitIcon, { backgroundColor: "#55CD6C15" }]}>
                        <Feather name={b.icon} size={14} color="#55CD6C" />
                      </View>
                      <Text style={[styles.benefitText, { color: colors.foreground }]}>{b.label}</Text>
                    </View>
                  ))}
                </View>

                {/* Plan selector */}
                <View style={styles.planRow}>
                  <TouchableOpacity
                    style={[
                      styles.planCard,
                      { borderColor: selectedPlan === "monthly" ? "#55CD6C" : colors.border, backgroundColor: selectedPlan === "monthly" ? "#55CD6C10" : colors.background },
                    ]}
                    onPress={() => setSelectedPlan("monthly")}
                  >
                    <Text style={[styles.planLabel, { color: colors.mutedForeground }]}>Mensuel</Text>
                    <Text style={[styles.planPrice, { color: colors.foreground }]}>{MONTHLY_PRICE}</Text>
                    <Text style={[styles.planUnit, { color: colors.mutedForeground }]}>/mois</Text>
                    {selectedPlan === "monthly" && (
                      <View style={[styles.planCheck, { backgroundColor: "#55CD6C" }]}>
                        <Feather name="check" size={10} color="#0A0A0A" />
                      </View>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.planCard,
                      { borderColor: selectedPlan === "annual" ? "#55CD6C" : colors.border, backgroundColor: selectedPlan === "annual" ? "#55CD6C10" : colors.background },
                    ]}
                    onPress={() => setSelectedPlan("annual")}
                  >
                    {/* Best value badge */}
                    <View style={styles.bestValueBadge}>
                      <StarIcon color="#F59E0B" />
                      <Text style={styles.bestValueText}>−50%</Text>
                    </View>
                    <Text style={[styles.planLabel, { color: colors.mutedForeground }]}>Annuel</Text>
                    <Text style={[styles.planPrice, { color: colors.foreground }]}>{ANNUAL_PRICE}</Text>
                    <Text style={[styles.planUnit, { color: colors.mutedForeground }]}>/an</Text>
                    <Text style={[styles.planOriginal, { color: colors.mutedForeground }]}>
                      au lieu de {ANNUAL_ORIGINAL}
                    </Text>
                    {selectedPlan === "annual" && (
                      <View style={[styles.planCheck, { backgroundColor: "#55CD6C" }]}>
                        <Feather name="check" size={10} color="#0A0A0A" />
                      </View>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Mobile Money CTA */}
                <TouchableOpacity
                  style={[styles.payBtn, { backgroundColor: "#55CD6C", opacity: paying ? 0.8 : 1 }]}
                  onPress={handlePay}
                  disabled={paying}
                >
                  {paying ? (
                    <ActivityIndicator size="small" color="#0A0A0A" />
                  ) : (
                    <>
                      <Text style={styles.payBtnText}>Payer par Mobile Money</Text>
                      <Text style={styles.payBtnSub}>
                        {selectedPlan === "annual" ? ANNUAL_PRICE : MONTHLY_PRICE}
                        {selectedPlan === "annual" ? " / an" : " / mois"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Providers */}
                <View style={styles.providers}>
                  {["Orange Money", "MTN MoMo", "Wave", "Moov Money"].map((p) => (
                    <View key={p} style={[styles.providerChip, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <Text style={[styles.providerText, { color: colors.mutedForeground }]}>{p}</Text>
                    </View>
                  ))}
                </View>

                <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
                  Annulation à tout moment · Paiement sécurisé · Sans engagement
                </Text>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function SuccessScreen({ onClose, colors }: { onClose: () => void; colors: any }) {
  return (
    <View style={styles.successContainer}>
      <View style={[styles.successIcon, { backgroundColor: "#55CD6C20" }]}>
        <Feather name="check-circle" size={48} color="#55CD6C" />
      </View>
      <Text style={[styles.successTitle, { color: colors.foreground }]}>Redirection en cours…</Text>
      <Text style={[styles.successDesc, { color: colors.mutedForeground }]}>
        Vous allez être redirigé vers votre opérateur Mobile Money pour finaliser le paiement.
      </Text>
      <View style={styles.steps}>
        {[
          "Confirmer le montant sur votre téléphone",
          "Entrer votre code PIN Mobile Money",
          "Recevoir la confirmation par SMS",
        ].map((step, i) => (
          <View key={i} style={styles.stepRow}>
            <View style={[styles.stepNum, { backgroundColor: "#55CD6C20" }]}>
              <Text style={[styles.stepNumText, { color: "#55CD6C" }]}>{i + 1}</Text>
            </View>
            <Text style={[styles.stepText, { color: colors.foreground }]}>{step}</Text>
          </View>
        ))}
      </View>
      <TouchableOpacity style={[styles.doneBtn, { borderColor: colors.border }]} onPress={onClose}>
        <Text style={[styles.doneBtnText, { color: colors.foreground }]}>Retour au feed</Text>
      </TouchableOpacity>
    </View>
  );
}

function PendingPaymentScreen({
  onClose,
  colors,
  isChecking,
  error,
  onRetry,
  onOpenCheckout,
  paymentEnvironment,
  sandboxTestPhone,
}: {
  onClose: () => void;
  colors: any;
  isChecking: boolean;
  error: unknown;
  onRetry: () => void;
  onOpenCheckout: () => void;
  paymentEnvironment: "sandbox" | "live" | null;
  sandboxTestPhone: string | null;
}) {
  return (
    <View style={styles.successContainer}>
      <View style={[styles.successIcon, { backgroundColor: "#F59E0B20" }]}>
        <Feather name="clock" size={42} color="#F59E0B" />
      </View>
      <Text style={[styles.successTitle, { color: colors.foreground }]}>
        Paiement en attente
      </Text>
      <Text style={[styles.successDesc, { color: colors.mutedForeground }]}>
        Finalisez le paiement dans la page Hub2 ouverte. Jobagogo activera Premium dès que Hub2 aura confirmé la transaction.
      </Text>
      {paymentEnvironment === "sandbox" && sandboxTestPhone ? (
        <View style={styles.sandboxNotice}>
          <Text style={styles.sandboxNoticeTitle}>Mode test Hub2</Text>
          <Text style={styles.sandboxNoticeText}>
            Le sandbox n’accepte pas les vrais numéros ivoiriens. Utilisez {sandboxTestPhone} pour simuler un paiement réussi.
          </Text>
          <Text style={styles.sandboxNoticeHint}>
            00000002 = confirmation différée · 00000003 = paiement en attente
          </Text>
        </View>
      ) : null}
      {isChecking && <ActivityIndicator size="small" color="#55CD6C" />}
      <TouchableOpacity
        style={[styles.doneBtn, { borderColor: "#55CD6C" }]}
        onPress={onOpenCheckout}
      >
        <Text style={[styles.doneBtnText, { color: "#55CD6C" }]}>
          Ouvrir le paiement
        </Text>
      </TouchableOpacity>
      {error ? (
        <TouchableOpacity
          style={[styles.doneBtn, { borderColor: colors.border }]}
          onPress={onRetry}
        >
          <Text style={[styles.doneBtnText, { color: colors.foreground }]}>
            Vérifier à nouveau
          </Text>
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity
        style={[styles.doneBtn, { borderColor: colors.border }]}
        onPress={onClose}
      >
        <Text style={[styles.doneBtnText, { color: colors.foreground }]}>
          Retour à l’application
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function FailedPaymentScreen({
  colors,
  failureReason,
  onRetry,
  onClose,
}: {
  colors: any;
  failureReason: string | null;
  onRetry: () => void;
  onClose: () => void;
}) {
  return (
    <View style={styles.successContainer}>
      <View style={[styles.successIcon, { backgroundColor: "#EF444420" }]}>
        <Feather name="x-circle" size={48} color="#EF4444" />
      </View>
      <Text style={[styles.successTitle, { color: colors.foreground }]}>Paiement échoué</Text>
      <Text style={[styles.successDesc, { color: colors.mutedForeground }]}>
        {failureReason ?? "Le paiement Mobile Money a échoué."}
      </Text>
      <Text style={[styles.successDesc, { color: colors.mutedForeground }]}>
        Aucun montant n’a été débité pour ce paiement. Vous pouvez réessayer quand vous voulez.
      </Text>
      <TouchableOpacity style={[styles.doneBtn, { borderColor: "#55CD6C" }]} onPress={onRetry}>
        <Text style={[styles.doneBtnText, { color: "#55CD6C" }]}>Réessayer</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.doneBtn, { borderColor: colors.border }]} onPress={onClose}>
        <Text style={[styles.doneBtnText, { color: colors.foreground }]}>
          Retour à l’application
        </Text>
      </TouchableOpacity>
    </View>
  );
}

interface PremiumGateCardProps {
  lockedCount: number;
}

export function PremiumGateCard({ lockedCount }: PremiumGateCardProps) {
  const colors = useColors();
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={styles.gateCard}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.9}
      >
        <View style={styles.gateInner}>
          {/* Lock */}
          <View style={[styles.lockCircle, { backgroundColor: "#55CD6C20", borderColor: "#55CD6C40" }]}>
            <LockIcon size={28} color="#55CD6C" />
          </View>

          {/* Text */}
          <Text style={[styles.gateCount, { color: colors.foreground }]}>
            +{lockedCount} offres taillées pour vous
          </Text>
          <Text style={[styles.gateDesc, { color: colors.mutedForeground }]}>
            Passez à Premium pour accéder à toutes les offres correspondant à votre profil
          </Text>

          {/* Mini benefits */}
          <View style={styles.miniBenefits}>
            {BENEFITS.slice(0, 3).map((b) => (
              <View key={b.label} style={styles.miniBenefit}>
                <Feather name="check" size={11} color="#55CD6C" />
                <Text style={[styles.miniBenefitText, { color: colors.mutedForeground }]}>{b.label}</Text>
              </View>
            ))}
          </View>

          {/* Price preview */}
          <View style={styles.pricePreview}>
            <Text style={[styles.priceFrom, { color: colors.mutedForeground }]}>À partir de</Text>
            <Text style={[styles.priceValue, { color: "#55CD6C" }]}>1 000 FCFA</Text>
            <Text style={[styles.priceUnit, { color: colors.mutedForeground }]}>/mois</Text>
          </View>

          {/* CTA */}
          <View style={[styles.gateCTA, { backgroundColor: "#55CD6C" }]}>
            <Text style={styles.gateCTAText}>Débloquer Premium</Text>
            <Feather name="arrow-right" size={16} color="#0A0A0A" />
          </View>
        </View>
      </TouchableOpacity>

      <PremiumModal
        visible={modalVisible}
        lockedCount={lockedCount}
        onClose={() => setModalVisible(false)}
      />
    </>
  );
}

export { FREE_LIMIT };

const styles = StyleSheet.create({
  /* Gate card */
  gateCard: {
    borderRadius: 18,
    marginBottom: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#55CD6C30",
  },
  gateInner: {
    padding: 22,
    paddingTop: 24,
    paddingBottom: 24,
    alignItems: "center",
    gap: 14,
    backgroundColor: "#151515F0",
  },
  lockCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    marginBottom: 4,
  },
  gateCount: {
    fontFamily: "Geist_700Bold",
    fontSize: 22,
    letterSpacing: -0.5,
    textAlign: "center",
  },
  gateDesc: {
    fontFamily: "Geist_400Regular",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  miniBenefits: { alignSelf: "stretch", gap: 6 },
  miniBenefit: { flexDirection: "row", alignItems: "center", gap: 8 },
  miniBenefitText: { fontFamily: "Geist_400Regular", fontSize: 12, flex: 1 },
  pricePreview: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 5,
  },
  priceFrom: { fontFamily: "Geist_400Regular", fontSize: 12 },
  priceValue: { fontFamily: "Geist_700Bold", fontSize: 20 },
  priceUnit: { fontFamily: "Geist_400Regular", fontSize: 12 },
  gateCTA: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 4,
  },
  gateCTAText: {
    fontFamily: "Geist_700Bold",
    fontSize: 15,
    color: "#0A0A0A",
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "92%",
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginVertical: 12,
  },
  modalHeader: { alignItems: "center", gap: 10, paddingTop: 4, paddingBottom: 16 },
  crownBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  crownEmoji: { fontSize: 28 },
  modalTitle: { fontFamily: "Geist_700Bold", fontSize: 22, letterSpacing: -0.5 },
  modalSubtitle: {
    fontFamily: "Geist_400Regular",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },

  /* Benefits */
  benefitsList: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
    marginBottom: 20,
  },
  benefitRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  benefitIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  benefitText: { fontFamily: "Geist_500Medium", fontSize: 14, flex: 1 },

  /* Plan selector */
  planRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  planCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 2,
    padding: 14,
    alignItems: "center",
    gap: 4,
    position: "relative",
  },
  planLabel: { fontFamily: "Geist_500Medium", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  planPrice: { fontFamily: "Geist_700Bold", fontSize: 18 },
  planUnit: { fontFamily: "Geist_400Regular", fontSize: 11 },
  planOriginal: { fontFamily: "Geist_400Regular", fontSize: 10, textDecorationLine: "line-through" },
  planCheck: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  bestValueBadge: {
    position: "absolute",
    top: -10,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#F59E0B",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  bestValueText: { fontFamily: "Geist_700Bold", fontSize: 10, color: "#0A0A0A" },

  /* Pay button */
  payBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 14,
    gap: 2,
  },
  payBtnText: { fontFamily: "Geist_700Bold", fontSize: 16, color: "#0A0A0A" },
  payBtnSub: { fontFamily: "Geist_400Regular", fontSize: 12, color: "#0A0A0A80" },

  /* Providers */
  providers: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 14 },
  providerChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  providerText: { fontFamily: "Geist_400Regular", fontSize: 11 },
  disclaimer: { fontFamily: "Geist_400Regular", fontSize: 11, textAlign: "center", lineHeight: 16 },

  /* Success screen */
  successContainer: { alignItems: "center", paddingVertical: 24, gap: 16 },
  successIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  successTitle: { fontFamily: "Geist_700Bold", fontSize: 20 },
  successDesc: {
    fontFamily: "Geist_400Regular",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  sandboxNotice: {
    alignSelf: "stretch",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F59E0B60",
    backgroundColor: "#F59E0B12",
    padding: 12,
    gap: 4,
  },
  sandboxNoticeTitle: {
    fontFamily: "Geist_700Bold",
    fontSize: 13,
    color: "#F59E0B",
  },
  sandboxNoticeText: {
    fontFamily: "Geist_400Regular",
    fontSize: 12,
    lineHeight: 17,
    color: "#FDE68A",
  },
  sandboxNoticeHint: {
    fontFamily: "Geist_400Regular",
    fontSize: 11,
    lineHeight: 15,
    color: "#FCD34D",
  },
  steps: { alignSelf: "stretch", gap: 10, marginTop: 8 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  stepNumText: { fontFamily: "Geist_700Bold", fontSize: 12 },
  stepText: { fontFamily: "Geist_400Regular", fontSize: 13, flex: 1 },
  doneBtn: {
    marginTop: 8,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  doneBtnText: { fontFamily: "Geist_600SemiBold", fontSize: 15 },
});
