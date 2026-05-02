import React, { useState } from 'react';
import {
  ScrollView, View, TouchableOpacity, Text, StyleSheet,
  SafeAreaView, TextInput, Switch, ActivityIndicator, Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { commonStyles, COLORS } from '../../styles/lender.styles';
import { LenderHeader } from '../../components/lender';
import { LoanOffersService } from '../../services/lender.service';

const LOAN_TYPES = [
  { id: 'personal',  label: 'Personal',  icon: 'user'      },
  { id: 'business',  label: 'Business',  icon: 'briefcase' },
  { id: 'education', label: 'Education', icon: 'book'       },
  { id: 'vehicle',   label: 'Vehicle',   icon: 'truck'      },
];

export default function CreateLoanOfferScreen({ navigation }: any) {
  const [loanType, setLoanType]       = useState('personal');
  const [minAmount, setMinAmount]     = useState('');
  const [maxAmount, setMaxAmount]     = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [tenure, setTenure]           = useState('12');
  const [active, setActive]           = useState(true);
  const [submitting, setSubmitting]   = useState(false);

  const handleCreate = async () => {
    if (!minAmount || !maxAmount || !interestRate) {
      Alert.alert('Validation', 'Please fill all fields');
      return;
    }
    setSubmitting(true);
    try {
      await LoanOffersService.createOffer({
        loanType,
        minAmount: Number(minAmount.replace(/,/g, '')),
        maxAmount: Number(maxAmount.replace(/,/g, '')),
        interestRate: Number(interestRate),
        tenureMonths: Number(tenure),
        active,
      });
      Alert.alert('Success', 'Loan offer created successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? 'Failed to create offer');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={commonStyles.safe}>
      <LenderHeader title="Create Loan Offer" onBackPress={() => navigation.goBack()} />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

        <View style={commonStyles.card}>
          <Text style={commonStyles.sectionTitle}>Select Loan Type</Text>
          <View style={styles.typeGrid}>
            {LOAN_TYPES.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[styles.typeBtn, loanType === type.id && styles.typeBtnActive]}
                onPress={() => setLoanType(type.id)}
              >
                <Feather name={type.icon as any} size={24}
                  color={loanType === type.id ? COLORS.primary : COLORS.textSecondary} />
                <Text style={[styles.typeLabel, loanType === type.id && styles.typeLabelActive]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={commonStyles.card}>
          <Text style={commonStyles.sectionTitle}>Loan Amount (LKR)</Text>
          <View style={styles.inputGroup}>
            <Text style={commonStyles.textSecondary}>Minimum</Text>
            <TextInput style={styles.input} placeholder="10000" value={minAmount}
              onChangeText={setMinAmount} keyboardType="numeric" placeholderTextColor={COLORS.border} />
          </View>
          <View style={styles.inputGroup}>
            <Text style={commonStyles.textSecondary}>Maximum</Text>
            <TextInput style={styles.input} placeholder="500000" value={maxAmount}
              onChangeText={setMaxAmount} keyboardType="numeric" placeholderTextColor={COLORS.border} />
          </View>
        </View>

        <View style={commonStyles.card}>
          <Text style={commonStyles.sectionTitle}>Interest Rate</Text>
          <View style={styles.inputGroup}>
            <TextInput style={styles.input} placeholder="12" value={interestRate}
              onChangeText={setInterestRate} keyboardType="decimal-pad" placeholderTextColor={COLORS.border} />
            <Text style={styles.suffix}>% per annum</Text>
          </View>
        </View>

        <View style={commonStyles.card}>
          <View style={commonStyles.rowSpaceBetween}>
            <View>
              <Text style={commonStyles.textPrimary}>Tenure</Text>
              <Text style={commonStyles.textSecondary}>{tenure} months</Text>
            </View>
            <TextInput
              style={[styles.input, { width: 60, textAlign: 'center' }]}
              value={tenure}
              onChangeText={setTenure}
              keyboardType="numeric"
            />
          </View>
          <View style={[commonStyles.divider, { marginVertical: 16 }]} />
          <View style={commonStyles.rowSpaceBetween}>
            <Text style={commonStyles.textPrimary}>Active</Text>
            <Switch value={active} onValueChange={setActive}
              trackColor={{ false: COLORS.border, true: COLORS.primary }} />
          </View>
        </View>

        {submitting ? (
          <ActivityIndicator style={{ marginVertical: 20 }} color={COLORS.primary} />
        ) : (
          <TouchableOpacity style={commonStyles.primaryButton} onPress={handleCreate}>
            <Feather name="plus" size={18} color="#fff" />
            <Text style={commonStyles.buttonText}>Create Offer</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 12 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginVertical: 12 },
  typeBtn: {
    flex: 1, minWidth: '45%', alignItems: 'center', paddingVertical: 16,
    borderRadius: 12, borderWidth: 2, borderColor: COLORS.border,
  },
  typeBtnActive: { borderColor: COLORS.primary, backgroundColor: '#EBF4FF' },
  typeLabel: { fontSize: 12, fontWeight: '500', color: COLORS.textSecondary, marginTop: 8 },
  typeLabelActive: { color: COLORS.primary, fontWeight: '600' },
  inputGroup: { marginVertical: 12 },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
    padding: 12, marginTop: 8, fontSize: 14, color: COLORS.textPrimary,
  },
  suffix: { fontSize: 12, color: COLORS.textSecondary, marginTop: 8 },
});
