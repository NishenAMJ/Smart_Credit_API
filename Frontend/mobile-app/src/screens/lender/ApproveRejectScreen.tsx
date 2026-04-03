import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  ScrollView,
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
// This screen receives:
// route.params.application — the borrower application data
// route.params.action      — 'approve' or 'reject'
export default function ApproveRejectScreen({ route, navigation }: any) {

  // ── Get data from previous screen ───────────────
  // When ReviewApplicationScreen navigates here it
  // passes the application object and action string
  const application = route?.params?.application || {
    id: '1',
    name: 'Kasun Silva',
    offer: 'Quick Personal Loan',
    amount: '50,000',
    score: 820,
  };
  const action = route?.params?.action || 'approve';
  const isApprove = action === 'approve';

  // ── State ────────────────────────────────────────
  const [note, setNote]           = useState('');
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isLoading, setIsLoading]   = useState(false);

  // ── Confirm action ───────────────────────────────
  // Simulates an API call with a short delay
  const handleConfirm = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsConfirmed(true);
    }, 1500);
  };

  // ── Go back after success ────────────────────────
  const handleDone = () => {
    // Go back 2 screens — back to ApplicationsReceived
    navigation.pop(2);
  };

  // ── Success screen ───────────────────────────────
  if (isConfirmed) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.successScreen}>

          {/* Success icon */}
          <View style={[
            styles.successIconWrap,
            { backgroundColor: isApprove ? '#ECFDF5' : '#FEF2F2' }
          ]}>
            <Feather
              name={isApprove ? 'check-circle' : 'x-circle'}
              size={64}
              color={isApprove ? COLORS.success : COLORS.danger}
            />
          </View>

          {/* Success message */}
          <Text style={styles.successTitle}>
            {isApprove ? 'Application Approved!' : 'Application Rejected'}
          </Text>
          <Text style={styles.successSub}>
            {isApprove
              ? `You have approved ${application.name}'s loan request of LKR ${application.amount}`
              : `You have rejected ${application.name}'s loan request`}
          </Text>

          {/* Reference number */}
          <View style={styles.refCard}>
            <Text style={styles.refLabel}>Reference Number</Text>
            <Text style={styles.refValue}>
              SC-2026-{application.id}00{Math.floor(Math.random() * 9) + 1}
            </Text>
          </View>

          {/* What happens next */}
          <View style={styles.nextStepsCard}>
            <Text style={styles.nextStepsTitle}>What happens next?</Text>
            {isApprove ? (
              <>
                <NextStep icon="mail"       text="Borrower will be notified via email and SMS" />
                <NextStep icon="dollar-sign" text="Loan will be disbursed within 24 hours"      />
                <NextStep icon="clock"       text="Repayment schedule will be activated"         />
              </>
            ) : (
              <>
                <NextStep icon="mail"    text="Borrower will be notified of the rejection" />
                <NextStep icon="file-text" text="They can apply again after 30 days"       />
              </>
            )}
          </View>

          {/* Done button */}
          <TouchableOpacity
            style={[
              styles.doneBtn,
              { backgroundColor: isApprove ? COLORS.success : COLORS.primary }
            ]}
            onPress={handleDone}
            activeOpacity={0.85}
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>

        </View>
      </SafeAreaView>
    );
  }

  // ── Main confirmation screen ─────────────────────
  return (
    <SafeAreaView style={styles.safe}>

      {/* ── HEADER ──────────────────────────────── */}
      <View style={[
        styles.header,
        { backgroundColor: isApprove ? COLORS.success : COLORS.danger }
      ]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          {isApprove ? 'Approve Application' : 'Reject Application'}
        </Text>

        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >

        {/* ── ACTION ICON ─────────────────────── */}
        <View style={styles.iconSection}>
          <View style={[
            styles.actionIconWrap,
            { backgroundColor: isApprove ? '#ECFDF5' : '#FEF2F2' }
          ]}>
            <Feather
              name={isApprove ? 'check-circle' : 'x-circle'}
              size={52}
              color={isApprove ? COLORS.success : COLORS.danger}
            />
          </View>
          <Text style={styles.actionTitle}>
            {isApprove
              ? 'Confirm Approval'
              : 'Confirm Rejection'}
          </Text>
          <Text style={styles.actionSub}>
            {isApprove
              ? 'Please review the details before approving'
              : 'Please provide a reason for rejection'}
          </Text>
        </View>

        {/* ── APPLICATION SUMMARY ──────────────── */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Application Summary</Text>

          <Row label="Borrower"      value={application.name}           />
          <Row label="Loan Offer"    value={application.offer}          />
          <Row
            label="Amount Requested"
            value={`LKR ${application.amount}`}
            highlight
          />
          <Row
            label="Credit Score"
            value={String(application.score)}
            highlight
          />
        </View>

        {/* ── TERMS (approve only) ─────────────── */}
        {isApprove && (
          <View style={styles.termsCard}>
            <Text style={styles.termsTitle}>Loan Terms</Text>
            <Row label="Interest Rate"    value="12% p.a."     />
            <Row label="Tenure"           value="12 months"    />
            <Row label="Monthly Payment"  value="LKR 4,707"    highlight />
            <Row label="Disbursement"     value="Within 24hrs" />
          </View>
        )}

        {/* ── NOTE / REASON ────────────────────── */}
        <View style={styles.noteSection}>
          <Text style={styles.noteLabel}>
            {isApprove ? 'Add a note (optional)' : 'Reason for rejection *'}
          </Text>
          <TextInput
            style={styles.noteInput}
            placeholder={
              isApprove
                ? 'Add any notes for this approval...'
                : 'Please explain why you are rejecting this application...'
            }
            placeholderTextColor={COLORS.textSecondary}
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* ── WARNING BOX ──────────────────────── */}
        <View style={[
          styles.warningBox,
          { backgroundColor: isApprove ? '#FFFBEB' : '#FEF2F2' }
        ]}>
          <Feather
            name="alert-triangle"
            size={16}
            color={isApprove ? COLORS.warning : COLORS.danger}
          />
          <Text style={[
            styles.warningText,
            { color: isApprove ? '#92400E' : '#991B1B' }
          ]}>
            {isApprove
              ? 'This action will approve the loan and notify the borrower. This cannot be undone.'
              : 'This action will reject the application and notify the borrower. This cannot be undone.'}
          </Text>
        </View>

        {/* ── ACTION BUTTONS ───────────────────── */}
        <View style={styles.btnRow}>

          {/* Cancel button */}
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>

          {/* Confirm button */}
          <TouchableOpacity
            style={[
              styles.confirmBtn,
              { backgroundColor: isApprove ? COLORS.success : COLORS.danger },
              isLoading && { opacity: 0.7 },
            ]}
            onPress={handleConfirm}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <Text style={styles.confirmBtnText}>Processing...</Text>
            ) : (
              <>
                <Feather
                  name={isApprove ? 'check' : 'x'}
                  size={18}
                  color="#fff"
                />
                <Text style={styles.confirmBtnText}>
                  {isApprove ? 'Approve' : 'Reject'}
                </Text>
              </>
            )}
          </TouchableOpacity>

        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Reusable Row component ────────────────────────────
// Shows a label on the left and value on the right
const Row = ({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) => (
  <View style={rowStyles.wrap}>
    <Text style={rowStyles.label}>{label}</Text>
    <Text style={[
      rowStyles.value,
      highlight && { color: COLORS.primary, fontWeight: '700' }
    ]}>
      {value}
    </Text>
  </View>
);

// ── Reusable NextStep component ───────────────────────
// Shows an icon + text for the success screen
const NextStep = ({
  icon,
  text,
}: {
  icon: string;
  text: string;
}) => (
  <View style={nextStyles.wrap}>
    <View style={nextStyles.iconWrap}>
      <Feather name={icon as any} size={14} color={COLORS.primary} />
    </View>
    <Text style={nextStyles.text}>{text}</Text>
  </View>
);

// ── Styles ────────────────────────────────────────────
const styles = StyleSheet.create({

  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },

  scroll: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  // Icon section
  iconSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  actionIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  actionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  actionSub: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  // Summary card
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },

  // Terms card
  termsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  termsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },

  // Note input
  noteSection: {
    marginBottom: 12,
  },
  noteLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  noteInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: COLORS.textPrimary,
    minHeight: 100,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  // Warning box
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },

  // Buttons
  btnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },

  // ── Success screen ───────────────────────────────
  successScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  successIconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  successSub: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  refCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  refLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  refValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  nextStepsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 24,
  },
  nextStepsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  doneBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});

// ── Row styles ────────────────────────────────────────
const rowStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  label: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
});

// ── NextStep styles ───────────────────────────────────
const nextStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EBF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});