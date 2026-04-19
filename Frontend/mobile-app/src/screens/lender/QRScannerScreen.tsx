import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

// ── Design Tokens ────────────────────────────────────
const COLORS = {
  primary: '#007AFF',
  background: '#F5F6FA',
  surface: '#FFFFFF',
  textPrimary: '#1A1A1A',
  textSecondary: '#6B7280',
  border: '#F3F4F6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
};

// ── Main Component ────────────────────────────────────
export default function QRScannerScreen({ navigation }: any) {
  const [scannedFile, setScannedFile] = useState<string | null>(null);

  const handleScanQR = () => {
    Alert.alert(
      'QR Scanner',
      'QR scanning feature coming soon.\n\nYou can scan payment receipts or borrower codes.',
      [{ text: 'OK' }]
    );
  };

  const handleUploadPayment = () => {
    setScannedFile('PAYMENT_RECEIPT_001');
    Alert.alert('Success', 'Payment receipt uploaded successfully!');
  };

  const handleVerifyBorrower = () => {
    navigation.navigate('MyBorrowers');
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── HEADER ────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>QR Scanner</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
        {/* ── SCANNER PLACEHOLDER ────────────────────── */}
        <View style={styles.scannerBox}>
          <View style={styles.scannerFrame}>
            <Feather name="maximize" size={48} color={COLORS.primary} />
          </View>
          <Text style={styles.scannerLabel}>Position QR Code Here</Text>
          <Text style={styles.scannerSub}>
            Keep the QR code within the frame
          </Text>
        </View>

        {/* ── ACTION BUTTONS ────────────────────────── */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleScanQR}
          activeOpacity={0.8}
        >
          <Feather name="camera" size={20} color="#fff" />
          <Text style={styles.buttonText}>Start Scanning</Text>
        </TouchableOpacity>

        {/* ── QUICK ACTIONS ──────────────────────────── */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={handleUploadPayment}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#ECFDF5' }]}>
              <Feather name="upload" size={24} color={COLORS.success} />
            </View>
            <Text style={styles.actionTitle}>Upload Payment</Text>
            <Text style={styles.actionDesc}>Verify payment receipt</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={handleVerifyBorrower}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#EBF4FF' }]}>
              <Feather name="user-check" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.actionTitle}>Verify Borrower</Text>
            <Text style={styles.actionDesc}>Check borrower details</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('ReviewApplication')}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#FFFBEB' }]}>
              <Feather name="check-square" size={24} color={COLORS.warning} />
            </View>
            <Text style={styles.actionTitle}>Review Application</Text>
            <Text style={styles.actionDesc}>Process new requests</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('ApplicationsReceived')}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#FEF2F2' }]}>
              <Feather name="inbox" size={24} color={COLORS.danger} />
            </View>
            <Text style={styles.actionTitle}>Pending Requests</Text>
            <Text style={styles.actionDesc}>5 applications waiting</Text>
          </TouchableOpacity>
        </View>

        {/* ── SCANNED FILE INFO ──────────────────────── */}
        {scannedFile && (
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Feather name="check-circle" size={20} color={COLORS.success} />
              <Text style={styles.infoTitle}>Scan Successful</Text>
            </View>
            <Text style={styles.infoContent}>File: {scannedFile}</Text>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setScannedFile(null)}
            >
              <Text style={styles.secondaryButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── INFO SECTION ──────────────────────────── */}
        <View style={styles.infoSection}>
          <Text style={styles.infoSectionTitle}>How to Use</Text>
          
          <View style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>Position QR Code</Text>
              <Text style={styles.stepDesc}>
                Place any valid QR code within the frame
              </Text>
            </View>
          </View>

          <View style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>Automatic Detection</Text>
              <Text style={styles.stepDesc}>
                Camera will automatically scan and detect the code
              </Text>
            </View>
          </View>

          <View style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>Instant Processing</Text>
              <Text style={styles.stepDesc}>
                Process or verify the scanned information immediately
              </Text>
            </View>
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Header
  header: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },

  // Content
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  // Scanner
  scannerBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  scannerFrame: {
    width: 200,
    height: 200,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  scannerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  scannerSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  // Buttons
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: COLORS.border,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  secondaryButtonText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Section
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },

  // Action Grid
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  actionCard: {
    width: '48%',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 2,
  },
  actionDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  // Info Card
  infoCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#047857',
  },
  infoContent: {
    fontSize: 13,
    color: '#065F46',
    marginBottom: 12,
  },

  // Info Section
  infoSection: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  infoSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },

  // Step Card
  stepCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  stepDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});
