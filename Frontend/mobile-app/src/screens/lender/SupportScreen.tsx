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
    question: 'How do I create a new loan offer?',
    answer:
      'Go to your Dashboard and tap "New Offer" under Quick Actions, or navigate to ' +
      'My Offers and tap the + button. Fill in the loan type, amount range, interest ' +
      'rate, and tenure, then publish your offer.',
  },
  {
    id: 'q2',
    question: 'How does boosting an advertisement work?',
    answer:
      'Boosting moves your ad to the top of search results for a set period. Open ' +
      'My Ads, select an ad, tap Boost, choose a package, make the payment, and enter ' +
      'the payment reference number to activate it.',
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
      'You can send a reminder directly from the app. If payments remain overdue for an ' +
      'extended period, you can escalate the case under Legal Actions.',
  },
  {
    id: 'q5',
    question: 'Can I edit a loan offer after publishing?',
    answer:
      'Yes. Go to My Offers, select the offer you want to change, and tap Edit. You can ' +
      'update the interest rate, amount range, and other details unless the offer ' +
      'already has active loans tied to specific terms.',
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
    question: 'Is there a fee for creating advertisements?',
    answer:
      'No, creating and publishing standard advertisements is completely free. Fees only ' +
      'apply when you choose to boost an ad for increased visibility.',
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