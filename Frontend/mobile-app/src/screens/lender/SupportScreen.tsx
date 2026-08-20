import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, TextInput,
  Alert, Linking, ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { commonStyles, COLORS } from '../../styles/lender.styles';
import { LenderHeader } from '../../components/lender';

// ── Quick contact options ─────────────────────────────────
const CONTACT_OPTIONS = [
  {
    icon: 'phone',
    label: 'Call Support',
    sub: '+94 11 234 5678',
    color: COLORS.success,
    bg: '#ECFDF5',
    action: 'call',
    value: '+94112345678',
  },
  {
    icon: 'mail',
    label: 'Email Support',
    sub: 'support@smartcredit.lk',
    color: COLORS.primary,
    bg: '#EBF4FF',
    action: 'email',
    value: 'support@smartcredit.lk',
  },
  {
    icon: 'message-circle',
    label: 'Live Chat',
    sub: 'Avg reply time: 5 mins',
    color: '#8B5CF6',
    bg: '#F5F3FF',
    action: 'chat',
    value: '',
  },
];

// ── FAQ data ───────────────────────────────────────────────
const FAQ_ITEMS = [
  {
    id: 'q1',
    question: 'How do I create a new advertisement?',
    answer:
      'Open My Ads and tap the + button, or select Create Ad from your lender dashboard. ' +
      'Enter the amount range, annual interest rate, tenure, borrower focus, and requirements. ' +
      'The advertisement is submitted for admin review before it becomes active.',
  },
  {
    id: 'q2',
    question: 'How do I check advertisement performance?',
    answer:
      'Open My Ads to see the applications and funded loans linked to each advertisement. ' +
      'Tap Analytics on an advertisement to review its application statuses, funded-loan ' +
      'statuses, and funding rate.',
  },
  {
    id: 'q3',
    question: 'How do I verify a borrower payment?',
    answer:
      'Use the QR Scanner from your Dashboard to scan the borrower\'s payment QR code. ' +
      'Verify the amount shown matches what you received, then confirm to record the ' +
      'payment in their loan history.',
  },
  {
    id: 'q4',
    question: 'What happens if a borrower misses a payment?',
    answer:
      'Missed payments appear under Payment Reminders with the number of days overdue. ' +
      'You can contact the borrower using the available reminder tools. If the problem ' +
      'continues, use Help & Support to report the issue for assistance.',
  },
  {
    id: 'q5',
    question: 'Can I edit an advertisement after publishing?',
    answer:
      'Yes. Open My Ads and tap Edit on the advertisement. Content changes are submitted ' +
      'for admin review again. Existing loans keep the financial terms already accepted ' +
      'in their agreements.',
  },
  {
    id: 'q6',
    question: 'How is my credit exposure calculated?',
    answer:
      'Your Portfolio screen shows total lent, total collected, and outstanding amounts ' +
      'across all active loans. Analytics provides a breakdown by loan type and ' +
      'repayment performance over time.',
  },
  {
    id: 'q7',
    question: 'Where can I review loan agreements?',
    answer:
      'Open Agreements from the lender dashboard to review agreements connected to your ' +
      'loans. The agreement status shows whether the required parties have accepted it.',
  },
];

// ── Main Component ────────────────────────────────────────
export default function SupportScreen({ navigation }: any) {
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [subject,     setSubject]     = useState('');
  const [message,     setMessage]     = useState('');
  const [sending,     setSending]     = useState(false);
  const [sent,        setSent]        = useState(false);

  const toggleFaq = (id: string) => {
    setExpandedFaq((prev) => (prev === id ? null : id));
  };

  const handleContactPress = (option: any) => {
    if (option.action === 'call') {
      Linking.openURL(`tel:${option.value}`);
    } else if (option.action === 'email') {
      Linking.openURL(`mailto:${option.value}`);
    } else if (option.action === 'chat') {
      Alert.alert('Live Chat', 'Live chat support is coming soon.');
    }
  };

  const handleSendMessage = async () => {
    if (!subject.trim()) {
      Alert.alert('Error', 'Please enter a subject');
      return;
    }
    if (!message.trim()) {
      Alert.alert('Error', 'Please describe your issue');
      return;
    }

    try {
      setSending(true);
      // TODO: connect to real support ticket API
      // await SupportService.submitTicket({ subject, message });
      await new Promise((resolve) => setTimeout(resolve, 1200));
      setSent(true);
      setSubject('');
      setMessage('');
    } catch {
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={commonStyles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── HEADER ──────────────────────────────── */}
        <LenderHeader
          title="Help & Support"
          onBackPress={() => navigation.goBack()}
        />

        {/* ── INTRO ───────────────────────────────── */}
        <View style={styles.introCard}>
          <View style={styles.introIconWrap}>
            <Feather name="life-buoy" size={24} color={COLORS.primary} />
          </View>
          <Text style={styles.introTitle}>We're Here to Help</Text>
          <Text style={[commonStyles.textSecondary, styles.introDesc]}>
            Browse common questions below, or reach out directly and our
            team will get back to you.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.assistantCard}
          onPress={() => navigation.navigate('AiAssistant')}
          activeOpacity={0.8}
        >
          <View style={styles.assistantIcon}>
            <Feather name="message-circle" size={21} color={COLORS.primary} />
          </View>
          <View style={styles.assistantCopy}>
            <Text style={styles.assistantTitle}>Ask the AI Assistant</Text>
            <Text style={commonStyles.textSecondary}>
              Review your loans, borrowers, payments, collections, and advertisements.
            </Text>
          </View>
          <Feather name="chevron-right" size={19} color={COLORS.textSecondary} />
        </TouchableOpacity>

        {/* ── CONTACT OPTIONS ─────────────────────── */}
        <Text style={commonStyles.sectionTitle}>Contact Us</Text>
        <View style={styles.contactList}>
          {CONTACT_OPTIONS.map((option, idx) => (
            <TouchableOpacity
              key={option.label}
              onPress={() => handleContactPress(option)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  commonStyles.rowSpaceBetween,
                  styles.contactItem,
                  idx === CONTACT_OPTIONS.length - 1 && styles.contactItemLast,
                ]}
              >
                <View style={commonStyles.row}>
                  <View
                    style={[
                      styles.contactIcon,
                      { backgroundColor: option.bg },
                    ]}
                  >
                    <Feather
                      name={option.icon as any}
                      size={18}
                      color={option.color}
                    />
                  </View>
                  <View>
                    <Text style={commonStyles.textPrimary}>
                      {option.label}
                    </Text>
                    <Text style={commonStyles.textSecondary}>
                      {option.sub}
                    </Text>
                  </View>
                </View>
                <Feather
                  name="chevron-right"
                  size={18}
                  color={COLORS.textSecondary}
                />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── FAQ ──────────────────────────────────── */}
        <Text style={commonStyles.sectionTitle}>
          Frequently Asked Questions
        </Text>
        <View style={styles.sectionsList}>
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = expandedFaq === item.id;
            return (
              <View key={item.id}>
                <TouchableOpacity
                  style={[
                    styles.faqHeader,
                    idx === FAQ_ITEMS.length - 1 &&
                      !isOpen &&
                      styles.faqHeaderLast,
                  ]}
                  onPress={() => toggleFaq(item.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.faqQIcon}>
                    <Feather
                      name="help-circle"
                      size={14}
                      color={COLORS.primary}
                    />
                  </View>
                  <Text style={styles.faqQuestion}>{item.question}</Text>
                  <Feather
                    name={isOpen ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={COLORS.textSecondary}
                  />
                </TouchableOpacity>

                {isOpen && (
                  <View
                    style={[
                      styles.faqBody,
                      idx === FAQ_ITEMS.length - 1 && styles.faqBodyLast,
                    ]}
                  >
                    <Text style={styles.faqAnswer}>{item.answer}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* ── SUBMIT A TICKET ─────────────────────── */}
        <Text style={commonStyles.sectionTitle}>Still Need Help?</Text>

        {sent ? (
          <View style={styles.successCard}>
            <Feather name="check-circle" size={32} color={COLORS.success} />
            <Text style={styles.successTitle}>Message Sent!</Text>
            <Text style={commonStyles.textSecondary}>
              Our support team will respond within 24 hours.
            </Text>
            <TouchableOpacity
              style={styles.successBtn}
              onPress={() => setSent(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.successBtnText}>Send Another Message</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.formCard}>
            <Text style={styles.fieldLabel}>Subject</Text>
            <TextInput
              style={styles.input}
              value={subject}
              onChangeText={setSubject}
              placeholder="e.g. Issue with boosting an ad"
              placeholderTextColor={COLORS.textSecondary}
            />

            <Text style={styles.fieldLabel}>Describe Your Issue</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={message}
              onChangeText={setMessage}
              placeholder="Tell us what's happening in as much detail as possible..."
              placeholderTextColor={COLORS.textSecondary}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.sendBtn, sending && { opacity: 0.7 }]}
              onPress={handleSendMessage}
              disabled={sending}
              activeOpacity={0.85}
            >
              {sending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Feather name="send" size={16} color="#fff" />
                  <Text style={styles.sendBtnText}>Send Message</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ── RESOURCES ────────────────────────────── */}
        <Text style={commonStyles.sectionTitle}>Other Resources</Text>
        <View style={styles.settingsList}>
          <TouchableOpacity
            onPress={() => navigation.navigate('TermsConditions')}
            activeOpacity={0.7}
          >
            <View style={[commonStyles.rowSpaceBetween, styles.settingItem]}>
              <View style={commonStyles.row}>
                <View
                  style={[styles.contactIcon, { backgroundColor: '#EBF4FF' }]}
                >
                  <Feather
                    name="file-text"
                    size={18}
                    color={COLORS.primary}
                  />
                </View>
                <Text style={commonStyles.textPrimary}>
                  Terms & Conditions
                </Text>
              </View>
              <Feather
                name="chevron-right"
                size={18}
                color={COLORS.textSecondary}
              />
            </View>
          </TouchableOpacity>

          <View
            style={[
              commonStyles.rowSpaceBetween,
              styles.settingItem,
              styles.settingItemLast,
            ]}
          >
            <View style={commonStyles.row}>
              <View
                style={[styles.contactIcon, { backgroundColor: '#ECFDF5' }]}
              >
                <Feather name="clock" size={18} color={COLORS.success} />
              </View>
              <View>
                <Text style={commonStyles.textPrimary}>Support Hours</Text>
                <Text style={commonStyles.textSecondary}>
                  Mon – Sat, 8:00 AM – 8:00 PM
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={commonStyles.spacer32} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────
const styles = StyleSheet.create({
  introCard: {
    marginHorizontal: 16,
    marginVertical: 20,
    padding: 20,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    alignItems: 'center',
    ...commonStyles.shadowSmall,
  },
  introIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EBF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  introTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  introDesc: {
    textAlign: 'center',
    lineHeight: 20,
  },
  assistantCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CFE2FF',
    backgroundColor: '#F4F8FF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  assistantIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E3EFFF',
  },
  assistantCopy: {
    flex: 1,
  },
  assistantTitle: {
    marginBottom: 3,
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },

  // Contact list
  contactList: {
    marginHorizontal: 16,
    marginBottom: 20,
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    ...commonStyles.shadowSmall,
  },
  contactItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  contactItemLast: { borderBottomWidth: 0 },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  // FAQ accordion
  sectionsList: {
    marginHorizontal: 16,
    marginBottom: 20,
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    ...commonStyles.shadowSmall,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 10,
  },
  faqHeaderLast: { borderBottomWidth: 0 },
  faqQIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#EBF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  faqQuestion: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  faqBody: {
    paddingHorizontal: 16,
    paddingLeft: 52,
    paddingBottom: 16,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  faqBodyLast: { borderBottomWidth: 0 },
  faqAnswer: {
    fontSize: 13,
    lineHeight: 21,
    color: COLORS.textSecondary,
  },

  // Form card
  formCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    ...commonStyles.shadowSmall,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: { minHeight: 110 },
  sendBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  sendBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // Success card
  successCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    ...commonStyles.shadowSmall,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  successBtn: {
    marginTop: 8,
    backgroundColor: '#EBF4FF',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  successBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // Resources list
  settingsList: {
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    ...commonStyles.shadowSmall,
  },
  settingItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  settingItemLast: { borderBottomWidth: 0 },
});
