import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Switch,
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

// ── Loan types ───────────────────────────────────────
const LOAN_TYPES = [
  { id: 'personal',  label: 'Personal',  icon: 'user',      color: COLORS.primary, bg: '#EBF4FF' },
  { id: 'business',  label: 'Business',  icon: 'briefcase', color: COLORS.success, bg: '#ECFDF5' },
  { id: 'education', label: 'Education', icon: 'book',      color: COLORS.warning, bg: '#FFFBEB' },
  { id: 'vehicle',   label: 'Vehicle',   icon: 'truck',     color: '#8B5CF6',      bg: '#F5F3FF' },
];

// ── Repayment options ────────────────────────────────
const REPAYMENT_OPTIONS = [
  { id: 'weekly',  label: 'Weekly'  },
  { id: 'monthly', label: 'Monthly' },
];

// ── Main Component ────────────────────────────────────
// KEY DIFFERENCE from CreateLoanOffer:
// This screen receives existing offer data via route.params
// and pre-fills all form fields with that data
export default function EditOfferScreen({ route, navigation }: any) {

  // ── Get existing offer from previous screen ──────
  // MyOffersScreen passes the offer object when navigating here
  const existingOffer = route?.params?.offer || {
    id: '1',
    title: 'Quick Personal Loan',
    type: 'personal',
    rate: '12',
    min: '10,000',
    max: '100,000',
    applications: 8,
    active: true,
  };

  // ── Form state PRE-FILLED with existing data ─────
  // Notice how we use existingOffer values as defaults
  // This is the key difference from CreateLoanOfferScreen
  const [loanType,     setLoanType]     = useState(existingOffer.type      || 'personal');
  const [title,        setTitle]        = useState(existingOffer.title      || '');
  const [minAmount,    setMinAmount]    = useState(existingOffer.min?.replace(',', '') || '');
  const [maxAmount,    setMaxAmount]    = useState(existingOffer.max?.replace(',', '') || '');
  const [interestRate, setInterestRate] = useState(existingOffer.rate       || '');
  const [tenure,       setTenure]       = useState('12');
  const [repayment,    setRepayment]    = useState('monthly');
  const [description,  setDescription]  = useState('');
  const [isActive,     setIsActive]     = useState(existingOffer.active ?? true);
  const [isLoading,    setIsLoading]    = useState(false);
  const [isSaved,      setIsSaved]      = useState(false);

  // ── Track if anything changed ────────────────────
  // Compare current values to original
  const hasChanges =
    title        !== existingOffer.title ||
    interestRate !== existingOffer.rate  ||
    isActive     !== existingOffer.active;

  // ── Validation ───────────────────────────────────
  const validate = () => {
    if (!title.trim()) {
      Alert.alert('Missing Field', 'Please enter an offer title');
      return false;
    }
    if (!minAmount.trim()) {
      Alert.alert('Missing Field', 'Please enter minimum amount');
      return false;
    }
    if (!maxAmount.trim()) {
      Alert.alert('Missing Field', 'Please enter maximum amount');
      return false;
    }
    if (!interestRate.trim()) {
      Alert.alert('Missing Field', 'Please enter interest rate');
      return false;
    }
    if (!tenure.trim()) {
      Alert.alert('Missing Field', 'Please enter tenure');
      return false;
    }
    return true;
  };

  // ── Save changes ─────────────────────────────────
  const handleSave = () => {
    if (!validate()) return;
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsSaved(true);
    }, 1500);
  };

  // ── Delete offer ─────────────────────────────────
  const handleDelete = () => {
    Alert.alert(
      'Delete Offer',
      `Are you sure you want to delete "${existingOffer.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // In real app call delete API here
            navigation.navigate('MyOffers');
          },
        },
      ]
    );
  };

  // ── Discard changes ──────────────────────────────
  const handleBack = () => {
    if (hasChanges) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to go back?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard',      style: 'destructive', onPress: () => navigation.goBack() },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  // ── Success screen ───────────────────────────────
  if (isSaved) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.successScreen}>

          <View style={styles.successIconWrap}>
            <Feather name="check-circle" size={64} color={COLORS.success} />
          </View>

          <Text style={styles.successTitle}>Changes Saved!</Text>
          <Text style={styles.successSub}>
            Your loan offer has been updated successfully
          </Text>

          {/* Updated offer summary */}
          <View style={styles.successCard}>
            <SummaryRow label="Offer Title"   value={title}                                    />
            <SummaryRow label="Loan Type"     value={loanType.charAt(0).toUpperCase() + loanType.slice(1)} />
            <SummaryRow label="Amount Range"  value={`LKR ${minAmount} – ${maxAmount}`}        />
            <SummaryRow label="Interest Rate" value={`${interestRate}% p.a.`}                  />
            <SummaryRow label="Tenure"        value={`${tenure} months`}                       />
            <SummaryRow label="Status"        value={isActive ? 'Active' : 'Inactive'}         />
          </View>

          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => navigation.navigate('MyOffers')}
            activeOpacity={0.85}
          >
            <Text style={styles.doneBtnText}>Back to My Offers</Text>
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
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Edit Offer</Text>

        {/* Delete button in header */}
        <TouchableOpacity
          style={styles.deleteHeaderBtn}
          onPress={handleDelete}
          activeOpacity={0.7}
        >
          <Feather name="trash-2" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >

        {/* ── OFFER INFO BANNER ────────────────── */}
        {/* Shows original offer info at the top */}
        <View style={styles.infoBanner}>
          <View style={styles.infoLeft}>
            <Feather name="info" size={16} color={COLORS.primary} />
            <View>
              <Text style={styles.infoTitle}>
                Editing: {existingOffer.title}
              </Text>
              <Text style={styles.infoSub}>
                {existingOffer.applications} applications received
              </Text>
            </View>
          </View>
          <View style={[
            styles.infoBadge,
            { backgroundColor: existingOffer.active ? '#ECFDF5' : COLORS.border }
          ]}>
            <Text style={[
              styles.infoBadgeText,
              { color: existingOffer.active ? COLORS.success : COLORS.textSecondary }
            ]}>
              {existingOffer.active ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        {/* ── LOAN TYPE ───────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Loan Type</Text>

          <View style={styles.typeGrid}>
            {LOAN_TYPES.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.typeCard,
                  loanType === type.id && {
                    borderColor: type.color,
                    borderWidth: 2,
                  },
                ]}
                onPress={() => setLoanType(type.id)}
                activeOpacity={0.8}
              >
                <View style={[
                  styles.typeIconWrap,
                  { backgroundColor: loanType === type.id ? type.bg : COLORS.background }
                ]}>
                  <Feather
                    name={type.icon as any}
                    size={22}
                    color={loanType === type.id ? type.color : COLORS.textSecondary}
                  />
                </View>

                <Text style={[
                  styles.typeLabel,
                  loanType === type.id && { color: type.color, fontWeight: '600' }
                ]}>
                  {type.label}
                </Text>

                {loanType === type.id && (
                  <View style={[styles.typeCheck, { backgroundColor: type.color }]}>
                    <Feather name="check" size={10} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── OFFER DETAILS ────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Offer Details</Text>

          <InputField
            label="Offer Title *"
            placeholder="e.g. Quick Personal Loan"
            value={title}
            onChangeText={setTitle}
            icon="tag"
          />

          <View style={styles.amountRow}>
            <View style={styles.amountField}>
              <InputField
                label="Min Amount (LKR) *"
                placeholder="e.g. 10000"
                value={minAmount}
                onChangeText={setMinAmount}
                keyboardType="numeric"
                icon="arrow-down-circle"
              />
            </View>
            <View style={{ width: 12 }} />
            <View style={styles.amountField}>
              <InputField
                label="Max Amount (LKR) *"
                placeholder="e.g. 100000"
                value={maxAmount}
                onChangeText={setMaxAmount}
                keyboardType="numeric"
                icon="arrow-up-circle"
              />
            </View>
          </View>

          <View style={styles.amountRow}>
            <View style={styles.amountField}>
              <InputField
                label="Interest Rate (%) *"
                placeholder="e.g. 12"
                value={interestRate}
                onChangeText={setInterestRate}
                keyboardType="numeric"
                icon="percent"
              />
            </View>
            <View style={{ width: 12 }} />
            <View style={styles.amountField}>
              <InputField
                label="Tenure (months) *"
                placeholder="e.g. 12"
                value={tenure}
                onChangeText={setTenure}
                keyboardType="numeric"
                icon="clock"
              />
            </View>
          </View>
        </View>

        {/* ── REPAYMENT TYPE ───────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Repayment Type</Text>

          <View style={styles.repaymentRow}>
            {REPAYMENT_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={[
                  styles.repaymentBtn,
                  repayment === opt.id && styles.repaymentBtnActive,
                ]}
                onPress={() => setRepayment(opt.id)}
                activeOpacity={0.8}
              >
                <Feather
                  name={opt.id === 'weekly' ? 'calendar' : 'refresh-cw'}
                  size={18}
                  color={repayment === opt.id ? COLORS.primary : COLORS.textSecondary}
                />
                <Text style={[
                  styles.repaymentText,
                  repayment === opt.id && styles.repaymentTextActive,
                ]}>
                  {opt.label}
                </Text>
                {repayment === opt.id && (
                  <Feather name="check-circle" size={16} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── DESCRIPTION ──────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description & Terms</Text>
          <Text style={styles.fieldLabel}>Description (optional)</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Describe your loan offer..."
            placeholderTextColor={COLORS.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* ── SETTINGS ─────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Offer Settings</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Active</Text>
              <Text style={styles.settingSub}>
                {isActive
                  ? 'Borrowers can see and apply for this offer'
                  : 'This offer is hidden from borrowers'}
              </Text>
            </View>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{
                false: COLORS.border,
                true: COLORS.primary,
              }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* ── CHANGES INDICATOR ────────────────── */}
        {hasChanges && (
          <View style={styles.changesAlert}>
            <Feather name="edit-3" size={14} color={COLORS.warning} />
            <Text style={styles.changesText}>
              You have unsaved changes
            </Text>
          </View>
        )}

        {/* ── SAVE BUTTON ──────────────────────── */}
        <TouchableOpacity
          style={[
            styles.saveBtn,
            !hasChanges && { opacity: 0.5 },
            isLoading && { opacity: 0.7 },
          ]}
          onPress={handleSave}
          disabled={isLoading}
          activeOpacity={0.85}
        >
          {isLoading ? (
            <Text style={styles.saveBtnText}>Saving...</Text>
          ) : (
            <>
              <Feather name="save" size={18} color="#fff" />
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>

        {/* ── DELETE BUTTON ────────────────────── */}
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={handleDelete}
          activeOpacity={0.85}
        >
          <Feather name="trash-2" size={18} color={COLORS.danger} />
          <Text style={styles.deleteBtnText}>Delete This Offer</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── InputField component ──────────────────────────────
const InputField = ({
  label,
  placeholder,
  value,
  onChangeText,
  keyboardType = 'default',
  icon,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: any;
  icon: string;
}) => (
  <View style={inputStyles.wrap}>
    <Text style={inputStyles.label}>{label}</Text>
    <View style={inputStyles.inputWrap}>
      <Feather
        name={icon as any}
        size={16}
        color={COLORS.textSecondary}
        style={inputStyles.icon}
      />
      <TextInput
        style={inputStyles.input}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textSecondary}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
      />
    </View>
  </View>
);

// ── SummaryRow component ──────────────────────────────
const SummaryRow = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <View style={summaryStyles.wrap}>
    <Text style={summaryStyles.label}>{label}</Text>
    <Text style={summaryStyles.value}>{value}</Text>
  </View>
);

// ── Styles ────────────────────────────────────────────
const styles = StyleSheet.create({

  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  header: {
    backgroundColor: COLORS.primary,
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
  deleteHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  scroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  // Info banner
  infoBanner: {
    backgroundColor: '#EBF4FF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  infoSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  infoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  infoBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  section: {
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
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },

  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typeCard: {
    width: '47%',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
  },
  typeIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  typeLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  typeCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  amountRow: {
    flexDirection: 'row',
  },
  amountField: {
    flex: 1,
  },

  repaymentRow: {
    gap: 10,
  },
  repaymentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  repaymentBtnActive: {
    backgroundColor: '#EBF4FF',
    borderColor: COLORS.primary,
  },
  repaymentText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  repaymentTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },

  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  textArea: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: COLORS.textPrimary,
    minHeight: 100,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  settingSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Changes indicator
  changesAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.warning,
  },
  changesText: {
    fontSize: 13,
    color: '#92400E',
    fontWeight: '500',
  },

  // Save button
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },

  // Delete button
  deleteBtn: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.danger,
    marginBottom: 12,
  },
  deleteBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.danger,
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
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  successSub: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  successCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  doneBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    width: '100%',
  },
  doneBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});

// ── InputField styles ─────────────────────────────────
const inputStyles = StyleSheet.create({
  wrap: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
    paddingVertical: 12,
  },
});

// ── SummaryRow styles ─────────────────────────────────
const summaryStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  label: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  value: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
});