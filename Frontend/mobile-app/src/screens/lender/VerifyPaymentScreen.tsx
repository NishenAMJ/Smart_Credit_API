import React, { useState } from 'react';
import { ScrollView, View, TouchableOpacity, Text, StyleSheet, SafeAreaView, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { commonStyles, COLORS } from '../../styles/lender.styles';
import { LenderHeader, AlertBanner } from '../../components/lender';

export default function VerifyPaymentScreen({ navigation, route }: any) {
  const loanId = route?.params?.loanId || 'L-2026-001';
  
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');

  const handleVerify = () => {
    if (!amount || !referenceNumber) {
      alert('Please fill all required fields');
      return;
    }
    alert('Payment verified successfully');
    navigation.navigate('ActiveLoans');
  };

  return (
    <SafeAreaView style={commonStyles.safe}>
      <LenderHeader title="Verify Payment" onBackPress={() => navigation.goBack()} />
      
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <AlertBanner 
          type="info" 
          title="Payment Verification" 
          message="Enter payment details to verify and record" 
        />

        <View style={commonStyles.card}>
          <Text style={commonStyles.sectionTitle}>Loan ID</Text>
          <Text style={commonStyles.textPrimary}>{loanId}</Text>
          <Text style={commonStyles.textSecondary}>Amount Due: LKR 4,500</Text>
        </View>

        <View style={commonStyles.card}>
          <Text style={commonStyles.sectionTitle}>Payment Amount</Text>
          <View style={styles.inputGroup}>
            <Text style={commonStyles.textSecondary}>Amount Received</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholderTextColor={COLORS.border}
            />
          </View>
        </View>

        <View style={commonStyles.card}>
          <Text style={commonStyles.sectionTitle}>Payment Method</Text>
          
          {['bank_transfer', 'card', 'cash', 'check'].map((method) => (
            <TouchableOpacity
              key={method}
              style={commonStyles.rowSpaceBetween}
              onPress={() => setPaymentMethod(method)}
              activeOpacity={0.7}
            >
              <Text style={commonStyles.textPrimary}>
                {method.replace('_', ' ').toUpperCase()}
              </Text>
              <View 
                style={[styles.radio, paymentMethod === method && styles.radioActive]} 
              >
                {paymentMethod === method && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={commonStyles.card}>
          <Text style={commonStyles.sectionTitle}>Reference Number</Text>
          <View style={styles.inputGroup}>
            <TextInput
              style={styles.input}
              placeholder="e.g., CHQ12345 or TXN123456"
              value={referenceNumber}
              onChangeText={setReferenceNumber}
              placeholderTextColor={COLORS.border}
            />
          </View>
        </View>

        <View style={commonStyles.card}>
          <Text style={commonStyles.sectionTitle}>Additional Notes</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Add any notes about this payment..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            placeholderTextColor={COLORS.border}
          />
        </View>

        <TouchableOpacity style={commonStyles.primaryButton} onPress={handleVerify}>
          <Feather name="check" size={18} color="#fff" />
          <Text style={commonStyles.buttonText}>Verify Payment</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
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
  textArea: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: COLORS.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
});
