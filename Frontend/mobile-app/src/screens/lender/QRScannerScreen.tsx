import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Dimensions,
  Animated,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { CameraView, useCameraPermissions, BarcodeScanningResult } from "expo-camera";
import { commonStyles, COLORS } from "../../styles/lender.styles";
import { LenderHeader } from "../../components/lender";

const { width, height } = Dimensions.get("window");
const SCAN_SIZE = width * 0.68;

// ── Main Component ────────────────────────────────────
export default function QRScannerScreen({ navigation }: any) {

  // ── Camera permission ────────────────────────────
  const [permission, requestPermission] = useCameraPermissions();

  // ── Scan state ───────────────────────────────────
  const [scanState, setScanState]     = useState<"scanning" | "scanned" | "error">("scanning");
  const [scannedData, setScannedData] = useState<any>(null);
  const [torchOn, setTorchOn]         = useState(false);
  const [loading, setLoading]         = useState(false);

  // ── Prevent multiple scans firing at once ────────
  const isProcessing = useRef(false);

  // ── Animated scan line ───────────────────────────
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (scanState !== "scanning") return;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scanState]);

  const scanLineY = scanLineAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [0, SCAN_SIZE - 4],
  });

  // ── Handle real QR scan result ───────────────────
  // expo-camera calls this whenever it detects a barcode
  const handleBarCodeScanned = async (result: BarcodeScanningResult) => {
    // Ignore if already processing a scan
    if (isProcessing.current) return;
    isProcessing.current = true;

    try {
      setLoading(true);

      // result.data is the raw string inside the QR code
      // Your borrower app should encode JSON like:
      // { borrowerId, name, loanId, offer, amountDue, dueDate }
      const parsed = JSON.parse(result.data);

      // Validate it's a Smart Credit QR — must have borrowerId
      if (!parsed.borrowerId || !parsed.loanId) {
        setScanState("error");
        return;
      }

      setScannedData(parsed);
      setScanState("scanned");

    } catch {
      // QR data is not valid JSON or missing required fields
      setScanState("error");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = () => {
    navigation.navigate("VerifyPayment", { borrower: scannedData });
  };

  const resetScan = () => {
    isProcessing.current = false;
    setScannedData(null);
    setScanState("scanning");
  };

  // ── Permission not yet determined ────────────────
  if (!permission) {
    return (
      <SafeAreaView style={commonStyles.safe}>
        <LenderHeader
          title="Scan QR Code"
          onBackPress={() => navigation.goBack()}
        />
        <View style={styles.centeredState}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.stateText}>Checking camera permission...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Permission denied ────────────────────────────
  if (!permission.granted) {
    return (
      <SafeAreaView style={commonStyles.safe}>
        <LenderHeader
          title="Scan QR Code"
          onBackPress={() => navigation.goBack()}
        />
        <View style={styles.centeredState}>
          <View style={styles.permissionIconWrap}>
            <Feather name="camera-off" size={48} color={COLORS.textSecondary} />
          </View>
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionSub}>
            Smart Credit needs camera access to scan borrower QR codes for
            payment collection.
          </Text>
          <TouchableOpacity
            style={styles.permissionBtn}
            onPress={requestPermission}
            activeOpacity={0.85}
          >
            <Feather name="camera" size={16} color="#fff" />
            <Text style={styles.permissionBtnText}>Allow Camera Access</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.permissionSecondary}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={styles.permissionSecondaryText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Scanned success screen ───────────────────────
  if (scanState === "scanned" && scannedData) {
    return (
      <SafeAreaView style={commonStyles.safe}>
        <LenderHeader
          title="QR Scanned"
          onBackPress={resetScan}
        />
        <View style={styles.resultScreen}>

          <View style={styles.successIconWrap}>
            <Feather name="check-circle" size={56} color={COLORS.success} />
          </View>
          <Text style={styles.resultTitle}>QR Code Detected!</Text>
          <Text style={styles.resultSub}>
            Borrower information retrieved successfully
          </Text>

          {/* Borrower info card */}
          <View style={styles.resultCard}>
            <View style={styles.resultCardHeader}>
              <View style={styles.resultAvatar}>
                <Text style={styles.resultAvatarText}>
                  {scannedData.name?.[0] ?? "?"}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.resultName}>{scannedData.name}</Text>
                <Text style={styles.resultId}>
                  ID: {scannedData.borrowerId}
                </Text>
              </View>
              {/* Verified badge */}
              <View style={styles.verifiedBadge}>
                <Feather name="shield" size={12} color={COLORS.success} />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            </View>

            <View style={styles.resultDivider} />

            <ResultRow label="Loan Reference" value={scannedData.loanId} />
            <ResultRow label="Loan Offer"     value={scannedData.offer}  />
            <ResultRow
              label="Amount Due"
              value={`LKR ${Number(scannedData.amountDue).toLocaleString()}`}
              highlight
            />
            <ResultRow label="Due Date" value={scannedData.dueDate} />
          </View>

          <View style={styles.resultBtns}>
            <TouchableOpacity
              style={styles.proceedBtn}
              onPress={handleVerify}
              activeOpacity={0.85}
            >
              <Feather name="check" size={18} color="#fff" />
              <Text style={styles.proceedBtnText}>Proceed to Payment</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.rescanBtn}
              onPress={resetScan}
              activeOpacity={0.85}
            >
              <Feather name="refresh-cw" size={18} color={COLORS.primary} />
              <Text style={styles.rescanBtnText}>Scan Again</Text>
            </TouchableOpacity>
          </View>

        </View>
      </SafeAreaView>
    );
  }

  // ── Error screen ─────────────────────────────────
  if (scanState === "error") {
    return (
      <SafeAreaView style={commonStyles.safe}>
        <LenderHeader
          title="Scan Error"
          onBackPress={() => navigation.goBack()}
        />
        <View style={styles.resultScreen}>

          <View style={[styles.successIconWrap, { backgroundColor: "#FEF2F2" }]}>
            <Feather name="x-circle" size={56} color={COLORS.danger} />
          </View>
          <Text style={styles.resultTitle}>Invalid QR Code</Text>
          <Text style={styles.resultSub}>
            This QR code is not a valid Smart Credit payment code. Please make
            sure the borrower is showing their payment QR from the Smart Credit
            app.
          </Text>

          {/* Tips */}
          <View style={styles.tipsCard}>
            <Text style={styles.tipsTitle}>Tips for better scanning:</Text>
            <TipRow icon="sun"        text="Ensure good lighting conditions"          />
            <TipRow icon="maximize"   text="Hold the QR code steady inside the frame" />
            <TipRow icon="zoom-in"    text="Move closer to the QR code"               />
            <TipRow icon="smartphone" text="Ask borrower to refresh their QR code"    />
            <TipRow icon="wifi-off"   text="Check borrower has an active loan"        />
          </View>

          <TouchableOpacity
            style={styles.proceedBtn}
            onPress={resetScan}
            activeOpacity={0.85}
          >
            <Feather name="refresh-cw" size={18} color="#fff" />
            <Text style={styles.proceedBtnText}>Try Again</Text>
          </TouchableOpacity>

        </View>
      </SafeAreaView>
    );
  }

  // ── Main scanner screen ──────────────────────────
  return (
    <SafeAreaView style={styles.scannerSafe}>

      {/* Header */}
      <View style={styles.scannerHeader}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.scannerHeaderTitle}>Scan Payment QR</Text>

        <TouchableOpacity
          style={[styles.headerBtn, torchOn && styles.torchActive]}
          onPress={() => setTorchOn(!torchOn)}
          activeOpacity={0.7}
        >
          <Feather
            name="zap"
            size={20}
            color={torchOn ? "#FFD700" : "#fff"}
          />
        </TouchableOpacity>
      </View>

      {/* ── LIVE CAMERA ─────────────────────────── */}
      <View style={styles.cameraContainer}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          enableTorch={torchOn}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={
            scanState === "scanning" ? handleBarCodeScanned : undefined
          }
        />

        {/* Dark overlay — top */}
        <View style={styles.overlayTop} />

        {/* Middle row with side overlays and scan box */}
        <View style={styles.overlayMiddle}>
          <View style={styles.overlaySide} />

          {/* Scan frame */}
          <View style={styles.scanFrame}>
            {/* Corner brackets */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />

            {/* Animated scan line */}
            {!loading && (
              <Animated.View
                style={[
                  styles.scanLine,
                  { transform: [{ translateY: scanLineY }] },
                ]}
              />
            )}

            {/* Loading spinner while processing */}
            {loading && (
              <View style={styles.scanLoading}>
                <ActivityIndicator size="large" color={COLORS.primary} />
              </View>
            )}
          </View>

          <View style={styles.overlaySide} />
        </View>

        {/* Dark overlay — bottom */}
        <View style={styles.overlayBottom} />
      </View>

      {/* ── INSTRUCTIONS PANEL ──────────────────── */}
      <View style={styles.instructionsPanel}>
        <Text style={styles.instructTitle}>
          Point camera at borrower's QR code
        </Text>
        <Text style={styles.instructSub}>
          The QR code will be detected automatically — no need to tap
        </Text>

        {/* Steps */}
        <View style={styles.stepsRow}>
          <StepChip number="1" label="Borrower opens app"    />
          <StepDivider />
          <StepChip number="2" label="Shows payment QR"      />
          <StepDivider />
          <StepChip number="3" label="Scan & confirm"        />
        </View>

        {/* Info strip */}
        <View style={styles.infoStrip}>
          <Feather name="shield" size={14} color={COLORS.success} />
          <Text style={styles.infoStripText}>
            Only Smart Credit borrower QR codes are accepted
          </Text>
        </View>
      </View>

    </SafeAreaView>
  );
}

// ── Small reusable components ─────────────────────────────

const ResultRow = ({
  label, value, highlight,
}: {
  label: string; value: string; highlight?: boolean;
}) => (
  <View style={resultRowStyles.wrap}>
    <Text style={resultRowStyles.label}>{label}</Text>
    <Text style={[
      resultRowStyles.value,
      highlight && { color: COLORS.primary, fontWeight: "700", fontSize: 15 },
    ]}>
      {value}
    </Text>
  </View>
);

const TipRow = ({ icon, text }: { icon: string; text: string }) => (
  <View style={tipStyles.wrap}>
    <View style={tipStyles.icon}>
      <Feather name={icon as any} size={13} color={COLORS.primary} />
    </View>
    <Text style={tipStyles.text}>{text}</Text>
  </View>
);

const StepChip = ({ number, label }: { number: string; label: string }) => (
  <View style={stepStyles.chip}>
    <View style={stepStyles.numWrap}>
      <Text style={stepStyles.num}>{number}</Text>
    </View>
    <Text style={stepStyles.label}>{label}</Text>
  </View>
);

const StepDivider = () => (
  <View style={stepStyles.divider} />
);

// ── Styles ────────────────────────────────────────────────
const styles = StyleSheet.create({

  // ── Scanner layout (dark background) ──────────────
  scannerSafe: {
    flex: 1,
    backgroundColor: "#000",
  },
  scannerHeader: {
    backgroundColor: "rgba(0,0,0,0.85)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  scannerHeaderTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  torchActive: {
    backgroundColor: "rgba(255,215,0,0.25)",
    borderWidth: 1,
    borderColor: "#FFD700",
  },

  // ── Camera and overlays ────────────────────────────
  cameraContainer: {
    height: height * 0.44,
    position: "relative",
  },
  overlayTop: {
    height: (height * 0.44 - SCAN_SIZE) / 2,
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  overlayMiddle: {
    flexDirection: "row",
    height: SCAN_SIZE,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
  },

  // ── Scan frame ────────────────────────────────────
  scanFrame: {
    width: SCAN_SIZE,
    height: SCAN_SIZE,
    position: "relative",
    overflow: "hidden",
  },
  corner: {
    position: "absolute",
    width: 32,
    height: 32,
    borderColor: "#fff",
  },
  cornerTL: {
    top: 0, left: 0,
    borderTopWidth: 4, borderLeftWidth: 4,
    borderTopLeftRadius: 6,
  },
  cornerTR: {
    top: 0, right: 0,
    borderTopWidth: 4, borderRightWidth: 4,
    borderTopRightRadius: 6,
  },
  cornerBL: {
    bottom: 0, left: 0,
    borderBottomWidth: 4, borderLeftWidth: 4,
    borderBottomLeftRadius: 6,
  },
  cornerBR: {
    bottom: 0, right: 0,
    borderBottomWidth: 4, borderRightWidth: 4,
    borderBottomRightRadius: 6,
  },
  scanLine: {
    position: "absolute",
    left: 8,
    right: 8,
    height: 2,
    backgroundColor: COLORS.primary,
    borderRadius: 1,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 5,
  },
  scanLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },

  // ── Instructions panel ─────────────────────────────
  instructionsPanel: {
    flex: 1,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  instructTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
    textAlign: "center",
    marginBottom: 6,
  },
  instructSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  stepsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  infoStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#ECFDF5",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  infoStripText: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: "500",
  },

  // ── Permission / loading state ─────────────────────
  centeredState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  stateText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  permissionIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  permissionSub: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  permissionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
    width: "100%",
    justifyContent: "center",
  },
  permissionBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  permissionSecondary: {
    paddingVertical: 10,
  },
  permissionSecondaryText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },

  // ── Result / error screens ─────────────────────────
  resultScreen: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 20,
    paddingTop: 24,
    alignItems: "center",
  },
  successIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  resultTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  resultSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  resultCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    width: "100%",
    marginBottom: 20,
    ...commonStyles.shadowSmall,
  },
  resultCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  resultAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EBF4FF",
    alignItems: "center",
    justifyContent: "center",
  },
  resultAvatarText: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.primary,
  },
  resultName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  resultId: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.success,
  },
  resultDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 10,
  },
  resultBtns: {
    width: "100%",
    gap: 10,
  },
  proceedBtn: {
    backgroundColor: COLORS.success,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
  },
  proceedBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  rescanBtn: {
    backgroundColor: "#EBF4FF",
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  rescanBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.primary,
  },

  // Tips card
  tipsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    width: "100%",
    marginBottom: 20,
    ...commonStyles.shadowSmall,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
});

// ── Sub-component styles ──────────────────────────────────
const resultRowStyles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  label: {
    fontSize: 13,
    color: COLORS.textSecondary,
    flex: 1,
  },
  value: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.textPrimary,
    textAlign: "right",
    flex: 1,
  },
});

const tipStyles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  icon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#EBF4FF",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 13,
    color: COLORS.textSecondary,
    flex: 1,
  },
});

const stepStyles = StyleSheet.create({
  chip: {
    alignItems: "center",
    gap: 4,
  },
  numWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  num: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },
  label: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textAlign: "center",
    maxWidth: 70,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 6,
    marginBottom: 14,
  },
});