import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { commonStyles, COLORS } from '../../styles/lender.styles';
import { LenderHeader } from '../../components/lender';

// ── Terms sections data ───────────────────────────────────
const TERMS_SECTIONS = [
  {
    id: 'acceptance',
    title: '1. Acceptance of Terms',
    content:
      'By registering as a lender on Smart Credit, you agree to be bound by these Terms and Conditions. ' +
      'If you do not agree with any part of these terms, you must not use the platform to create loan offers, ' +
      'advertisements, or engage with borrowers.',
  },
  {
    id: 'eligibility',
    title: '2. Lender Eligibility',
    content:
      'To register as a lender, you must be at least 18 years old, provide accurate personal and financial ' +
      'information, and complete the KYC verification process. Smart Credit reserves the right to suspend or ' +
      'reject any lender account that fails to meet these requirements.',
  },
  {
    id: 'responsibilities',
    title: '3. Lender Responsibilities',
    content:
      'Lenders are responsible for setting fair and transparent loan terms, including interest rates, tenure, ' +
      'and repayment schedules. You must not engage in predatory lending practices, charge undisclosed fees, ' +
      'or mislead borrowers about the terms of any loan offer or advertisement.',
  },
  {
    id: 'fees',
    title: '4. Platform Fees & Boosting',
    content:
      'Smart Credit charges a service fee for boosting advertisements to increase visibility. All boost ' +
      'payments are non-refundable once the boost period has started. Standard loan offers and advertisements ' +
      'remain free to create and publish.',
  },
  {
    id: 'repayments',
    title: '5. Loan Repayments & Collections',
    content:
      'Lenders are responsible for tracking repayments and verifying payments made via QR scan, bank transfer, ' +
      'or other supported methods. Smart Credit provides tools for collection tracking but does not guarantee ' +
      'repayment by borrowers. Disputes must be raised through the in-app support system within 30 days.',
  },
  {
    id: 'data',
    title: '6. Data Privacy & Usage',
    content:
      'Your personal and business data is processed in accordance with our Privacy Policy. Borrower information ' +
      'accessed through the platform must only be used for purposes directly related to the loan agreement and ' +
      'must not be shared with third parties without consent.',
  },
  {
    id: 'suspension',
    title: '7. Account Suspension & Termination',
    content:
      'Smart Credit reserves the right to suspend or terminate any lender account found to be in violation of ' +
      'these terms, engaging in fraudulent activity, or receiving repeated borrower complaints. Suspended ' +
      'accounts may forfeit any pending boost payments.',
  },
  {
    id: 'liability',
    title: '8. Limitation of Liability',
    content:
      'Smart Credit acts as a facilitating platform connecting lenders and borrowers. We are not liable for ' +
      'losses arising from loan defaults, borrower misconduct, or disputes between parties. Lenders engage in ' +
      'lending activities at their own risk and discretion.',
  },
  {
    id: 'changes',
    title: '9. Changes to These Terms',
    content:
      'We may update these Terms and Conditions from time to time. Continued use of the platform after changes ' +
      'are published constitutes acceptance of the revised terms. Significant changes will be communicated via ' +
      'in-app notification or email.',
  },
  {
    id: 'contact',
    title: '10. Contact Us',
    content:
      'For questions regarding these Terms and Conditions, please reach out through the Help & Support section ' +
      'of the app, or email us at legal@smartcredit.lk.',
  },
];

// ── Main Component ────────────────────────────────────────
export default function TermsConditionsScreen({ navigation }: any) {
  const [expandedId, setExpandedId] = useState<string | null>(
    TERMS_SECTIONS[0].id,
  );

  const toggleSection = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <SafeAreaView style={commonStyles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── HEADER ──────────────────────────────── */}
        <LenderHeader
          title="Terms & Conditions"
          onBackPress={() => navigation.goBack()}
        />

        {/* ── INTRO CARD ──────────────────────────── */}
        <View style={styles.introCard}>
          <View style={styles.introIconWrap}>
            <Feather name="file-text" size={24} color={COLORS.primary} />
          </View>
          <Text style={styles.introTitle}>Lender Terms & Conditions</Text>
          <Text style={styles.introSub}>
            Last updated: January 1, 2026
          </Text>
          <Text style={[commonStyles.textSecondary, styles.introDesc]}>
            Please read these terms carefully before using Smart Credit as a
            lender. By continuing to use the platform, you agree to these
            terms.
          </Text>
        </View>

        {/* ── ACCORDION SECTIONS ──────────────────── */}
        <Text style={commonStyles.sectionTitle}>Full Terms</Text>
        <View style={styles.sectionsList}>
          {TERMS_SECTIONS.map((section, idx) => {
            const isOpen = expandedId === section.id;
            return (
              <View key={section.id}>
                <TouchableOpacity
                  style={[
                    styles.sectionHeader,
                    idx === TERMS_SECTIONS.length - 1 &&
                      !isOpen &&
                      styles.sectionHeaderLast,
                  ]}
                  onPress={() => toggleSection(section.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.sectionHeaderText}>
                    {section.title}
                  </Text>
                  <Feather
                    name={isOpen ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={COLORS.textSecondary}
                  />
                </TouchableOpacity>

                {isOpen && (
                  <View
                    style={[
                      styles.sectionBody,
                      idx === TERMS_SECTIONS.length - 1 &&
                        styles.sectionBodyLast,
                    ]}
                  >
                    <Text style={styles.sectionBodyText}>
                      {section.content}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* ── FOOTER ───────────────────────────────── */}
        <View style={styles.footerCard}>
          <Feather name="shield" size={16} color={COLORS.success} />
          <Text style={styles.footerText}>
            By using Smart Credit you confirm that you have read,
            understood, and agree to these Terms & Conditions.
          </Text>
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
    marginBottom: 4,
    textAlign: 'center',
  },
  introSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  introDesc: {
    textAlign: 'center',
    lineHeight: 20,
  },

  sectionsList: {
    marginHorizontal: 16,
    marginBottom: 20,
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    ...commonStyles.shadowSmall,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionHeaderLast: {
    borderBottomWidth: 0,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: 10,
  },
  sectionBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionBodyLast: {
    borderBottomWidth: 0,
  },
  sectionBodyText: {
    fontSize: 13,
    lineHeight: 21,
    color: COLORS.textSecondary,
  },

  footerCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
  },
  footerText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
});