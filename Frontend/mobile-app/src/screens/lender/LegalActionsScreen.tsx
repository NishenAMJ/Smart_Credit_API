import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
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

// ── Defaulted borrowers data ──────────────────────────
const DEFAULTED = [
  {
    id: '1',
    name: 'Nimal Perera',
    amount: 160000,
    daysOverdue: 45,
    phone: '+94 71 234 5678',
    offer: 'SME Business Boost',
    lastContact: '20 Mar 2026',
    stage: 'second_notice',
  },
  {
    id: '2',
    name: 'Amal Bandara',
    amount: 25000,
    daysOverdue: 32,
    phone: '+94 77 123 4567',
    offer: 'Quick Personal Loan',
    lastContact: '25 Mar 2026',
    stage: 'first_notice',
  },
  {
    id: '3',
    name: 'Ravi Kumar',
    amount: 90000,
    daysOverdue: 67,
    phone: '+94 76 987 6543',
    offer: 'Vehicle Loan',
    lastContact: '10 Mar 2026',
    stage: 'legal_filed',
  },
];

// ── Legal action stages ───────────────────────────────
const STAGES = [
  {
    id: 'first_notice',
    label: '1st Notice',
    icon: 'mail',
    desc: 'Formal written notice sent to borrower',
  },
  {
    id: 'second_notice',
    label: '2nd Notice',
    icon: 'alert-circle',
    desc: 'Final warning before legal proceedings',
  },
  {
    id: 'legal_filed',
    label: 'Legal Filing',
    icon: 'file-text',
    desc: 'Case filed in Magistrate Court',
  },
  {
    id: 'asset_recovery',
    label: 'Asset Recovery',
    icon: 'home',
    desc: 'Asset recovery proceedings initiated',
  },
];

// ── Format number ─────────────────────────────────────
const fmtFull = (num: number) =>
  num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

// ── Get stage index ───────────────────────────────────
const getStageIndex = (stage: string) =>
  STAGES.findIndex((s) => s.id === stage);

// ── Main Component ────────────────────────────────────
export default function LegalActionsScreen({ route, navigation }: any) {

  // ── Can receive a specific borrower from reminders ──
  const preselected = route?.params?.borrower || null;

  // ── State ────────────────────────────────────────
  const [selectedId,  setSelectedId]  = useState<string>(
    preselected ? preselected.id : DEFAULTED[0].id
  );
  const [notes,       setNotes]       = useState('');
  const [isLoading,   setIsLoading]   = useState(false);
  const [actionDone,  setActionDone]  = useState<string | null>(null);

  // ── Get selected borrower ────────────────────────
  const selected = DEFAULTED.find((d) => d.id === selectedId) || DEFAULTED[0];
  const stageIndex = getStageIndex(selected.stage);

  // ── Next stage ───────────────────────────────────
  const nextStage = STAGES[stageIndex + 1] || null;

  // ── Escalate to next stage ───────────────────────
  const handleEscalate = () => {
    if (!nextStage) return;

    Alert.alert(
      `Escalate to ${nextStage.label}?`,
      `This will escalate ${selected.name}'s case to "${nextStage.label}". This action is recorded and cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Escalate',
          style: 'destructive',
          onPress: () => {
            setIsLoading(true);
            setTimeout(() => {
              setIsLoading(false);
              setActionDone(nextStage.label);
            }, 1500);
          },
        },
      ]
    );
  };

  // ── Close case ───────────────────────────────────
  const handleClose = () => {
    Alert.alert(
      'Close Case',
      `Mark ${selected.name}'s case as resolved? This means the debt has been settled.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close Case',
          onPress: () => {
            setIsLoading(true);
            setTimeout(() => {
              setIsLoading(false);
              setActionDone('Case Closed');
            }, 1000);
          },
        },
      ]
    );
  };

  // ── Success screen ───────────────────────────────
  if (actionDone) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.successScreen}>

          <View style={styles.successIconWrap}>
            <Feather
              name={actionDone === 'Case Closed' ? 'check-circle' : 'alert-circle'}
              size={64}
              color={actionDone === 'Case Closed' ? COLORS.success : COLORS.danger}
            />
          </View>

          <Text style={styles.successTitle}>
            {actionDone === 'Case Closed' ? 'Case Resolved!' : 'Action Escalated!'}
          </Text>

          <Text style={styles.successSub}>
            {actionDone === 'Case Closed'
              ? `${selected.name}'s case has been marked as resolved`
              : `${selected.name}'s case has been escalated to "${actionDone}"`}
          </Text>

          {/* Case reference */}
          <View style={styles.refCard}>
            <Text style={styles.refLabel}>Case Reference</Text>
            <Text style={styles.refValue}>
              LC-2026-{selected.id}00{Math.floor(Math.random() * 9) + 1}
            </Text>
            <Text style={styles.refDate}>
              {new Date().toLocaleDateString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric'
              })}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => {
              setActionDone(null);
              navigation.goBack();
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>

        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>

      {/* ── HEADER ──────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Legal Actions</Text>

        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >

        {/* ── ALERT BANNER ─────────────────────── */}
        <View style={styles.alertBanner}>
          <Feather name="alert-triangle" size={18} color={COLORS.danger} />
          <Text style={styles.alertText}>
            {DEFAULTED.length} borrowers have defaulted loans requiring legal attention
          </Text>
        </View>

        {/* ── BORROWER SELECTOR ────────────────── */}
        <Text style={styles.selectorTitle}>Select Borrower</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.selectorRow}
        >
          {DEFAULTED.map((borrower) => (
            <TouchableOpacity
              key={borrower.id}
              style={[
                styles.selectorCard,
                selectedId === borrower.id && styles.selectorCardActive,
              ]}
              onPress={() => {
                setSelectedId(borrower.id);
                setActionDone(null);
                setNotes('');
              }}
              activeOpacity={0.8}
            >
              {/* Avatar */}
              <View style={[
                styles.selectorAvatar,
                selectedId === borrower.id && { backgroundColor: COLORS.primary }
              ]}>
                <Text style={[
                  styles.selectorAvatarText,
                  selectedId === borrower.id && { color: '#fff' }
                ]}>
                  {borrower.name[0]}
                </Text>
              </View>

              <Text style={[
                styles.selectorName,
                selectedId === borrower.id && { color: COLORS.primary }
              ]}>
                {borrower.name.split(' ')[0]}
              </Text>

              <Text style={styles.selectorDays}>
                {borrower.daysOverdue}d
              </Text>

            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── BORROWER DETAILS ──────────────────── */}
        <View style={styles.detailCard}>
          <View style={styles.detailHeader}>
            <View style={styles.detailAvatar}>
              <Text style={styles.detailAvatarText}>{selected.name[0]}</Text>
            </View>
            <View style={styles.detailInfo}>
              <Text style={styles.detailName}>{selected.name}</Text>
              <Text style={styles.detailOffer}>{selected.offer}</Text>
              <Text style={styles.detailPhone}>{selected.phone}</Text>
            </View>
            <View style={styles.detailRight}>
              <Text style={[styles.detailAmount, { color: COLORS.danger }]}>
                LKR {fmtFull(selected.amount)}
              </Text>
              <Text style={styles.detailDays}>
                {selected.daysOverdue} days overdue
              </Text>
            </View>
          </View>

          <View style={styles.detailDivider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Last Contact</Text>
            <Text style={styles.detailValue}>{selected.lastContact}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Current Stage</Text>
            <View style={[
              styles.stageBadge,
              { backgroundColor: '#FEF2F2' }
            ]}>
              <Text style={[styles.stageBadgeText, { color: COLORS.danger }]}>
                {STAGES[stageIndex]?.label || 'Unknown'}
              </Text>
            </View>
          </View>
        </View>

        {/* ── LEGAL ACTION TIMELINE ─────────────── */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Action Timeline</Text>

          {STAGES.map((stage, index) => {
            const isDone    = index <= stageIndex;
            const isCurrent = index === stageIndex;
            const isNext    = index === stageIndex + 1;

            return (
              <View key={stage.id} style={styles.timelineItem}>

                {/* Left — icon + line */}
                <View style={styles.timelineLeft}>

                  {/* Stage icon */}
                  <View style={[
                    styles.timelineIcon,
                    isDone
                      ? { backgroundColor: isCurrent ? COLORS.danger : COLORS.success }
                      : { backgroundColor: COLORS.border },
                  ]}>
                    <Feather
                      name={stage.icon as any}
                      size={16}
                      color={isDone ? '#fff' : COLORS.textSecondary}
                    />
                  </View>

                  {/* Connecting line */}
                  {index < STAGES.length - 1 && (
                    <View style={[
                      styles.timelineLine,
                      { backgroundColor: index < stageIndex ? COLORS.success : COLORS.border }
                    ]} />
                  )}

                </View>

                {/* Right — stage info */}
                <View style={styles.timelineRight}>
                  <View style={styles.timelineHeader}>
                    <Text style={[
                      styles.timelineLabel,
                      isDone && { color: isCurrent ? COLORS.danger : COLORS.success },
                    ]}>
                      {stage.label}
                    </Text>

                    {/* Status tags */}
                    {isCurrent && (
                      <View style={styles.currentTag}>
                        <Text style={styles.currentTagText}>Current</Text>
                      </View>
                    )}
                    {isDone && !isCurrent && (
                      <View style={styles.doneTag}>
                        <Feather name="check" size={10} color={COLORS.success} />
                        <Text style={styles.doneTagText}>Done</Text>
                      </View>
                    )}
                    {isNext && (
                      <View style={styles.nextTag}>
                        <Text style={styles.nextTagText}>Next</Text>
                      </View>
                    )}

                  </View>

                  <Text style={styles.timelineDesc}>{stage.desc}</Text>
                </View>

              </View>
            );
          })}

        </View>

        {/* ── CASE NOTES ───────────────────────── */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Case Notes</Text>
          <Text style={styles.notesLabel}>
            Add notes about this legal case
          </Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Document proceedings, conversations, agreements..."
            placeholderTextColor={COLORS.textSecondary}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <Text style={styles.notesHint}>
            {notes.length} characters
          </Text>
        </View>

        {/* ── QUICK ACTIONS ────────────────────── */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <View style={styles.quickGrid}>

            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => navigation.navigate('PaymentReminders', {
                borrower: selected
              })}
              activeOpacity={0.8}
            >
              <View style={[styles.quickIcon, { backgroundColor: '#EBF4FF' }]}>
                <Feather name="bell" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.quickLabel}>Send Reminder</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickBtn}
              activeOpacity={0.8}
            >
              <View style={[styles.quickIcon, { backgroundColor: '#ECFDF5' }]}>
                <Feather name="phone" size={20} color={COLORS.success} />
              </View>
              <Text style={styles.quickLabel}>Call Borrower</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickBtn}
              activeOpacity={0.8}
            >
              <View style={[styles.quickIcon, { backgroundColor: '#FFFBEB' }]}>
                <Feather name="file" size={20} color={COLORS.warning} />
              </View>
              <Text style={styles.quickLabel}>Generate Notice</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickBtn}
              onPress={handleClose}
              activeOpacity={0.8}
            >
              <View style={[styles.quickIcon, { backgroundColor: '#F5F3FF' }]}>
                <Feather name="check-circle" size={20} color="#8B5CF6" />
              </View>
              <Text style={styles.quickLabel}>Close Case</Text>
            </TouchableOpacity>

          </View>
        </View>

        {/* ── ESCALATE BUTTON ──────────────────── */}
        {nextStage ? (
          <TouchableOpacity
            style={[
              styles.escalateBtn,
              isLoading && { opacity: 0.7 }
            ]}
            onPress={handleEscalate}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            <Feather name="arrow-up-circle" size={20} color="#fff" />
            <Text style={styles.escalateBtnText}>
              {isLoading
                ? 'Processing...'
                : `Escalate to ${nextStage.label}`}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.maxStageCard}>
            <Feather name="alert-octagon" size={20} color={COLORS.danger} />
            <Text style={styles.maxStageText}>
              This case is at the highest escalation level
            </Text>
          </View>
        )}

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
    backgroundColor: COLORS.danger,
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
    paddingTop: 16,
    paddingBottom: 24,
  },

  // Alert banner
  alertBanner: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.danger,
  },
  alertText: {
    flex: 1,
    fontSize: 13,
    color: '#991B1B',
    fontWeight: '500',
    lineHeight: 20,
  },

  // Borrower selector
  selectorTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  selectorRow: {
    gap: 10,
    paddingBottom: 4,
    marginBottom: 16,
  },
  selectorCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    width: 90,
    borderWidth: 2,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  selectorCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#EBF4FF',
  },
  selectorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EBF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  selectorAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  selectorName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  selectorDays: {
    fontSize: 11,
    color: COLORS.danger,
    fontWeight: '600',
  },

  // Detail card
  detailCard: {
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
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  detailAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailAvatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.danger,
  },
  detailInfo: {
    flex: 1,
  },
  detailName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  detailOffer: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  detailPhone: {
    fontSize: 12,
    color: COLORS.primary,
    marginTop: 2,
  },
  detailRight: {
    alignItems: 'flex-end',
  },
  detailAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  detailDays: {
    fontSize: 11,
    color: COLORS.danger,
    marginTop: 2,
  },
  detailDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  detailLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  stageBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  stageBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Section card
  sectionCard: {
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
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },

  // Timeline
  timelineItem: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 0,
  },
  timelineLeft: {
    alignItems: 'center',
    width: 36,
  },
  timelineIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 20,
    marginVertical: 4,
  },
  timelineRight: {
    flex: 1,
    paddingBottom: 20,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  timelineLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  timelineDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  currentTag: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  currentTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.danger,
  },
  doneTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  doneTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.success,
  },
  nextTag: {
    backgroundColor: '#EBF4FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  nextTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
  },

  // Notes
  notesLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  notesInput: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 14,
    fontSize: 14,
    color: COLORS.textPrimary,
    minHeight: 100,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 6,
  },
  notesHint: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'right',
  },

  // Quick actions grid
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickBtn: {
    width: '47%',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingVertical: 14,
  },
  quickIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  // Escalate button
  escalateBtn: {
    backgroundColor: COLORS.danger,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
  },
  escalateBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },

  // Max stage card
  maxStageCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  maxStageText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.danger,
    fontWeight: '500',
  },

  // Success screen
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
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
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
    padding: 20,
    alignItems: 'center',
    width: '100%',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  refLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  refValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.danger,
    marginBottom: 4,
  },
  refDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  doneBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    width: '100%',
  },
  doneBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});