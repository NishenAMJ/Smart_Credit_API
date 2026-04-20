import React, { useState } from 'react';
import { ScrollView, View, TouchableOpacity, Text, StyleSheet, SafeAreaView, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { commonStyles, COLORS } from '../../styles/lender.styles';
import { LenderHeader } from '../../components/lender';

// ── Main Component ──────────────────────────────────
export default function ApproveRejectScreen({ navigation, route }: any) {
  const { appId, action } = route?.params || {};
  const [reason, setReason] = useState('');
  const isRejecting = action === 'reject';

  const handleSubmit = () => {
    if (!reason.trim()) {
      alert('Please provide a reason');
      return;
    }
    alert(`Application ${isRejecting ? 'rejected' : 'approved'} successfully`);
    navigation.navigate('ApplicationsReceived');
  };

  return (
    <SafeAreaView style={commonStyles.safe}>
      <LenderHeader 
        title={isRejecting ? "Reject Application" : "Confirm Approval"} 
        onBackPress={() => navigation.goBack()} 
      />
      
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

        {/* Decision Circle */}
        <View style={styles.decisionBox}>
          <View style={[styles.decisionIcon, { backgroundColor: isRejecting ? '#FEF2F2' : '#ECFDF5' }]}>
            <Feather 
              name={isRejecting ? "x-circle" : "check-circle"} 
              size={48} 
              color={isRejecting ? COLORS.danger : COLORS.success} 
            />
          </View>
          <Text style={styles.decisionTitle}>
            {isRejecting ? "Reject Application?" : "Approve Application?"}
          </Text>
          <Text style={commonStyles.textSecondary}>
            {isRejecting ? "Please provide a reason for rejection" : "Confirm your decision to approve"}
          </Text>
        </View>

        {/* Reason Input */}
        <View style={commonStyles.card}>
          <Text style={commonStyles.sectionTitle}>
            {isRejecting ? "Reason for Rejection" : "Additional Notes"}
          </Text>
          <TextInput
            style={styles.textArea}
            placeholder={isRejecting ? "Explain why you're rejecting this application..." : "Add any notes about this approval..."}
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            placeholderTextColor={COLORS.border}
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonGroup}>
          <TouchableOpacity style={[commonStyles.primaryButton, { backgroundColor: COLORS.textSecondary }]} onPress={() => navigation.goBack()}>
            <Text style={commonStyles.buttonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              commonStyles.primaryButton, 
              { backgroundColor: isRejecting ? COLORS.danger : COLORS.success }
            ]} 
            onPress={handleSubmit}
          >
            <Feather name={isRejecting ? "x" : "check"} size={18} color="#fff" />
            <Text style={commonStyles.buttonText}>
              {isRejecting ? "Reject" : "Approve"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  decisionBox: {
    alignItems: 'center',
    marginVertical: 32,
  },
  decisionIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  decisionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  textArea: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
    minHeight: 120,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
});
