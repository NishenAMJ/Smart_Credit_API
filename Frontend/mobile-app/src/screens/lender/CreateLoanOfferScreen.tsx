import React, { useState } from 'react';
import { ScrollView, View, TouchableOpacity, Text, StyleSheet, SafeAreaView, TextInput, Switch } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { commonStyles, COLORS } from '../../styles/lender.styles';
import { LenderHeader } from '../../components/lender';

// ── Loan Types ───────────────────────────────────────
const LOAN_TYPES = [
  { id: 'personal', label: 'Personal', icon: 'user' },
  { id: 'business', label: 'Business', icon: 'briefcase' },
  { id: 'education', label: 'Education', icon: 'book' },
  { id: 'vehicle', label: 'Vehicle', icon: 'truck' },
];

// ── Main Component ──────────────────────────────────
export default function CreateLoanOfferScreen({ navigation }: any) {
  const [loanType, setLoanType] = useState('personal');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [tenure, setTenure] = useState('12');
  const [active, setActive] = useState(true);

  const handleCreate = () => {
    if (!minAmount || !maxAmount || !interestRate) {
      alert('Please fill all fields');
      return;
    }
    alert('Loan offer created successfully');
    navigation.goBack();
  };

  return (
    <SafeAreaView style={commonStyles.safe}>
      <LenderHeader title="Create Loan Offer" onBackPress={() => navigation.goBack()} />
      
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Loan Type Selection */}
        <View style={commonStyles.card}>
          <Text style={commonStyles.sectionTitle}>Select Loan Type</Text>
          <View style={styles.typeGrid}>
            {LOAN_TYPES.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[styles.typeBtn, loanType === type.id && styles.typeBtnActive]}
                onPress={() => setLoanType(type.id)}
              >
                <Feather name={type.icon as any} size={24} color={loanType === type.id ? COLORS.primary : COLORS.textSecondary} />
                <Text style={[styles.typeLabel, loanType === type.id && styles.typeLabelActive]}>{type.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Amount Details */}
        <View style={commonStyles.card}>
          <Text style={commonStyles.sectionTitle}>Loan Amount</Text>
          
          <View style={styles.inputGroup}>
            <Text style={commonStyles.textSecondary}>Minimum</Text>
            <TextInput
              style={styles.input}
              placeholder="10,000"
              value={minAmount}
              onChangeText={setMinAmount}
              keyboardType="numeric"
              placeholderTextColor={COLORS.border}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={commonStyles.textSecondary}>Maximum</Text>
            <TextInput
              style={styles.input}
              placeholder="500,000"
              value={maxAmount}
              onChangeText={setMaxAmount}
              keyboardType="numeric"
              placeholderTextColor={COLORS.border}
            />
          </View>
        </View>

        {/* Interest Rate */}
        <View style={commonStyles.card}>
          <Text style={commonStyles.sectionTitle}>Interest Rate</Text>
          <View style={styles.inputGroup}>
            <TextInput
              style={styles.input}
              placeholder="12"
              value={interestRate}
              onChangeText={setInterestRate}
              keyboardType="decimal-pad"
              placeholderTextColor={COLORS.border}
            />
            <Text style={styles.suffix}>% per annum</Text>
          </View>
        </View>

        {/* Tenure & Status */}
        <View style={commonStyles.card}>
          <View style={commonStyles.rowSpaceBetween}>
            <View>
              <Text style={commonStyles.textPrimary}>Tenure</Text>
              <Text style={commonStyles.textSecondary}>{tenure} months</Text>
            </View>
            <Text style={styles.tenureValue}>{tenure}</Text>
          </View>
          
          <View style={[commonStyles.divider, { marginVertical: 16 }]} />
          
          <View style={commonStyles.rowSpaceBetween}>
            <Text style={commonStyles.textPrimary}>Active</Text>
            <Switch value={active} onValueChange={setActive} trackColor={{ false: COLORS.border, true: COLORS.primary }} />
          </View>
        </View>

        {/* Create Button */}
        <TouchableOpacity style={commonStyles.primaryButton} onPress={handleCreate}>
          <Feather name="plus" size={18} color="#fff" />
          <Text style={commonStyles.buttonText}>Create Offer</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginVertical: 12,
  },
  typeBtn: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  typeBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#EBF4FF',
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  typeLabelActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  inputGroup: {
    marginVertical: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  suffix: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  tenureValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
});
