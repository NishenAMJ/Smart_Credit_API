import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Animated,
  Dimensions,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");
const SCAN_SIZE = width * 0.7;

// ── Design Tokens ────────────────────────────────────
const COLORS = {
  primary: "#007AFF",
  background: "#F5F6FA",
  surface: "#FFFFFF",
  textPrimary: "#1A1A1A",
  textSecondary: "#6B7280",
  border: "#F3F4F6",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
};

// ── Mock borrower data ───────────────────────────────
// In real app this comes from scanning the actual QR
const MOCK_SCANNED_DATA = {
  borrowerId: "B-001",
  name: "Kasun Silva",
  loanId: "L-2026-001",
  offer: "Quick Personal Loan",
  amountDue: 4707,
  dueDate: "15 Apr 2026",
};

// ── Main Component ────────────────────────────────────
export default function QRScannerScreen({ navigation }: any) {
  // ── State ────────────────────────────────────────
  const [scanState, setScanState] = useState<"scanning" | "scanned" | "error">(
    "scanning",
  );
  const [torchOn, setTorchOn] = useState(false);
  const [scannedData, setScannedData] = useState<
    typeof MOCK_SCANNED_DATA | null
  >(null);

  
  // This creates the moving red scan line effect
  const scanLineAnim = new Animated.Value(0);

  useEffect(() => {
    // Loop the scan line animation up and down
    const animate = () => {
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]).start(() => animate()); // loop forever
    };

    if (scanState === "scanning") {
      animate();
    }
  }, [scanState]);

  
  // Moves from top to bottom of scan box
  const scanLineY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SCAN_SIZE - 4],
  });

  
  // In real app this is triggered by camera detecting QR
  const simulateScan = () => {
    setScanState("scanned");
    setScannedData(MOCK_SCANNED_DATA);
  };

  
  const simulateError = () => {
    setScanState("error");
  };

  
  const resetScan = () => {
    setScanState("scanning");
    setScannedData(null);
  };

  
  const handleVerify = () => {
    navigation.navigate("VerifyPayment", {
      borrower: scannedData,
    });
  };

  
  if (scanState === "scanned" && scannedData) {
    return (
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>QR Scanned</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.scannedScreen}>
          {/* Success icon */}
          <View style={styles.scannedIconWrap}>
            <Feather name="check-circle" size={64} color={COLORS.success} />
          </View>

          <Text style={styles.scannedTitle}>QR Code Detected!</Text>
          <Text style={styles.scannedSub}>
            Borrower information retrieved successfully
          </Text>

          {/* Borrower info card */}
          <View style={styles.scannedCard}>
            {/* Borrower header */}
            <View style={styles.scannedCardHeader}>
              <View style={styles.scannedAvatar}>
                <Text style={styles.scannedAvatarText}>
                  {scannedData.name[0]}
                </Text>
              </View>
              <View>
                <Text style={styles.scannedName}>{scannedData.name}</Text>
                <Text style={styles.scannedId}>
                  ID: {scannedData.borrowerId}
                </Text>
              </View>
            </View>

            <View style={styles.scannedDivider} />

            {/* Loan details */}
            <ScannedRow label="Loan Reference" value={scannedData.loanId} />
            <ScannedRow label="Loan Offer" value={scannedData.offer} />
            <ScannedRow
              label="Amount Due"
              value={`LKR ${scannedData.amountDue.toLocaleString()}`}
              highlight
            />
            <ScannedRow label="Due Date" value={scannedData.dueDate} />
          </View>

          {/* Action buttons */}
          <View style={styles.scannedBtns}>
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

  
  if (scanState === "error") {
    return (
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scan Error</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.scannedScreen}>
          <View
            style={[styles.scannedIconWrap, { backgroundColor: "#FEF2F2" }]}
          >
            <Feather name="x-circle" size={64} color={COLORS.danger} />
          </View>

          <Text style={styles.scannedTitle}>Invalid QR Code</Text>
          <Text style={styles.scannedSub}>
            The QR code could not be recognized. Please make sure you are
            scanning a valid Smart Credit borrower QR code.
          </Text>

          <View style={styles.errorTips}>
            <Text style={styles.errorTipsTitle}>Tips for better scanning:</Text>
            <ErrorTip icon="sun" text="Ensure good lighting" />
            <ErrorTip
              icon="maximize"
              text="Hold QR code steady within the frame"
            />
            <ErrorTip icon="zoom-in" text="Move closer to the QR code" />
            <ErrorTip
              icon="refresh-cw"
              text="Ask borrower to refresh their QR"
            />
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


  return (
    <SafeAreaView style={styles.safe}>
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Scan QR Code</Text>

        {/* Torch toggle */}
        <TouchableOpacity
          style={[styles.torchBtn, torchOn && styles.torchBtnOn]}
          onPress={() => setTorchOn(!torchOn)}
          activeOpacity={0.7}
        >
          <Feather name="zap" size={20} color={torchOn ? "#FFD700" : "#fff"} />
        </TouchableOpacity>
      </View>

      {/* CAMERA AREA */}
      <View style={styles.cameraArea}>
        {/* Dark overlay — top */}
        <View style={styles.overlayTop} />

        {/* Middle row */}
        <View style={styles.overlayMiddle}>
          {/* Dark overlay — left */}
          <View style={styles.overlaySide} />

          {/* Scan box */}
          <View style={styles.scanBox}>
            {/* Corner brackets */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />

            {/* Animated scan line */}
            <Animated.View
              style={[
                styles.scanLine,
                { transform: [{ translateY: scanLineY }] },
              ]}
            />

            {/* QR placeholder icon in center */}
            <View style={styles.qrPlaceholder}>
              <Feather
                name="maximize"
                size={48}
                color="rgba(255,255,255,0.3)"
              />
            </View>
          </View>

          {/* Dark overlay — right */}
          <View style={styles.overlaySide} />
        </View>

        {/* Dark overlay — bottom */}
        <View style={styles.overlayBottom} />
      </View>

      {/*  INSTRUCTIONS  */}
      <View style={styles.instructions}>
        <Text style={styles.instructTitle}>
          Position QR code within the frame
        </Text>
        <Text style={styles.instructSub}>
          Ask the borrower to open their Smart Credit app and show their payment
          QR code
        </Text>

        {/* Instruction steps */}
        <View style={styles.steps}>
          <Step number="1" text="Borrower opens Smart Credit app" />
          <Step number="2" text="Borrower taps 'Show Payment QR'" />
          <Step number="3" text="Point camera at their QR code" />
          <Step number="4" text="Payment details appear automatically" />
        </View>

        {/* Demo buttons — remove in production */}
        <View style={styles.demoRow}>
          <TouchableOpacity
            style={styles.demoBtn}
            onPress={simulateScan}
            activeOpacity={0.85}
          >
            <Feather name="maximize" size={16} color="#fff" />
            <Text style={styles.demoBtnText}>Simulate Scan ✓</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.demoBtn, { backgroundColor: COLORS.danger }]}
            onPress={simulateError}
            activeOpacity={0.85}
          >
            <Feather name="x" size={16} color="#fff" />
            <Text style={styles.demoBtnText}>Simulate Error ✗</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ScannedRow component 
const ScannedRow = ({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) => (
  <View style={scannedRowStyles.wrap}>
    <Text style={scannedRowStyles.label}>{label}</Text>
    <Text
      style={[
        scannedRowStyles.value,
        highlight && { color: COLORS.primary, fontWeight: "700", fontSize: 16 },
      ]}
    >
      {value}
    </Text>
  </View>
);

// ErrorTip component 
const ErrorTip = ({ icon, text }: { icon: string; text: string }) => (
  <View style={errorTipStyles.wrap}>
    <View style={errorTipStyles.iconWrap}>
      <Feather name={icon as any} size={14} color={COLORS.primary} />
    </View>
    <Text style={errorTipStyles.text}>{text}</Text>
  </View>
);

//  Step component 
const Step = ({ number, text }: { number: string; text: string }) => (
  <View style={stepStyles.wrap}>
    <View style={stepStyles.numWrap}>
      <Text style={stepStyles.num}>{number}</Text>
    </View>
    <Text style={stepStyles.text}>{text}</Text>
  </View>
);

// Styles 
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#000",
  },

  // Header
  header: {
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  torchBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  torchBtnOn: {
    backgroundColor: "rgba(255,215,0,0.3)",
  },

  // Camera area
  cameraArea: {
    height: height * 0.42,
    backgroundColor: "#111",
  },
  overlayTop: {
    height: (height * 0.42 - SCAN_SIZE) / 2,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  overlayMiddle: {
    flexDirection: "row",
    height: SCAN_SIZE,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
  },

  // Scan box
  scanBox: {
    width: SCAN_SIZE,
    height: SCAN_SIZE,
    position: "relative",
    overflow: "hidden",
  },

  // Corner brackets
  corner: {
    position: "absolute",
    width: 28,
    height: 28,
    borderColor: COLORS.primary,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 4,
  },

  // Scan line
  scanLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: COLORS.primary,
    opacity: 0.8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 5,
  },

  // QR placeholder
  qrPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  // Instructions
  instructions: {
    flex: 1,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 20,
    paddingTop: 20,
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
    marginBottom: 16,
  },

  // Steps
  steps: {
    gap: 10,
    marginBottom: 20,
  },

  // Demo buttons
  demoRow: {
    flexDirection: "row",
    gap: 10,
  },
  demoBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  demoBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
  },

  // Scanned screen
  scannedScreen: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 20,
    paddingTop: 24,
    alignItems: "center",
  },
  scannedIconWrap: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  scannedTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  scannedSub: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  scannedCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    width: "100%",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  scannedCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  scannedAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#EBF4FF",
    alignItems: "center",
    justifyContent: "center",
  },
  scannedAvatarText: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.primary,
  },
  scannedName: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  scannedId: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  scannedDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 12,
  },
  scannedBtns: {
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

  // Error tips
  errorTips: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    width: "100%",
    marginBottom: 20,
  },
  errorTipsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
});

// ── ScannedRow styles ─────────────────────────────────
const scannedRowStyles = StyleSheet.create({
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

//  ErrorTip styles
const errorTipStyles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  iconWrap: {
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

//  Step styles 
const stepStyles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  numWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  num: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },
  text: {
    fontSize: 13,
    color: COLORS.textSecondary,
    flex: 1,
  },
});
