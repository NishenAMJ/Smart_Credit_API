import React, { useState } from 'react';
import { ScrollView, View, TouchableOpacity, Text, StyleSheet, SafeAreaView, TextInput, Switch } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { commonStyles, COLORS } from '../../styles/lender.styles';
import { LenderHeader, AlertBanner } from '../../components/lender';

// ── Main Component ──────────────────────────────────
export default function EditOfferScreen({ navigation, route }: any) {
  const offerId = route?.params?.offerId || '1';
  
  // Pre-filled from existing offer
  const [loanType] = useState('personal');
  const [minAmount, setMinAmount] = useState('10,000');
  const [maxAmount, setMaxAmount] = useState('100,000');
  const [interestRate, setInterestRate] = useState('12');
  const [tenure, setTenure] = useState('12');
  const [active, setActive] = useState(true);

  const handleSave = () => {
    alert('Offer updated successfully');
    navigation.goBack();
  };

  return (
    <SafeAreaView style={commonStyles.safe}>
      <LenderHeader title="Edit Offer" onBackPress={() => navigation.goBack()} />
      
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <AlertBanner type="info" title="Editing offer" message="Changes will be effective immediately" />

        {/* Loan Type (Read-only) */}
        <View style={commonStyles.card}>
          <Text style={commonStyles.sectionTitle}>Loan Type</Text>
          <View style={styles.readOnly}>
            <Feather name="briefcase" size={18} color={COLORS.primary} />
            <Text style={commonStyles.textPrimary}>{loanType}</Text>
          </View>
        </View>

        {/* Amount Details */}
        <View style={commonStyles.card}>
          <Text style={commonStyles.sectionTitle}>Loan Amount</Text>
          
          <View style={styles.inputGroup}>
            <Text style={commonStyles.textSecondary}>Minimum</Text>
            <TextInput
              style={styles.input}
              value={minAmount}
              onChangeText={setMinAmount}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={commonStyles.textSecondary}>Maximum</Text>
            <TextInput
              style={styles.input}
              value={maxAmount}
              onChangeText={setMaxAmount}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Interest Rate */}
        <View style={commonStyles.card}>
          <Text style={commonStyles.sectionTitle}>Interest Rate</Text>
          <View style={styles.inputGroup}>
            <TextInput
              style={styles.input}
              value={interestRate}
              onChangeText={setInterestRate}
              keyboardType="decimal-pad"
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

        {/* Save Button */}
        <TouchableOpacity style={commonStyles.primaryButton} onPress={handleSave}>
          <Feather name="save" size={18} color="#fff" />
          <Text style={commonStyles.buttonText}>Save Changes</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  readOnly: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
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
