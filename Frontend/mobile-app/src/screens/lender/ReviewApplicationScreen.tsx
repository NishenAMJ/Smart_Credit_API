import React, { useState } from 'react';
import { ScrollView, View, TouchableOpacity, Text, StyleSheet, SafeAreaView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { commonStyles, COLORS } from '../../styles/lender.styles';
import { LenderHeader, AlertBanner } from '../../components/lender';

export default function ReviewApplicationScreen({ navigation, route }: any) {
  const appId = route?.params?.appId || 'APP-001';
  const [approvalReason, setApprovalReason] = useState('');

  const app = {
    id: appId,
    borrowerId: 'B-001',
    borrowerName: 'Kasun Silva',
    requestedAmount: 150000,
    roi: 18,
    duration: '12 months',
    creditScore: 720,
    status: 'pending',
    documents: ['Identity Proof', 'Income Certificate', 'Bank Statements'],
  };

  const handleApprove = () => {
    alert(`Application ${appId} approved with ${app.roi}% ROI`);
    navigation.goBack();
  };

  const handleReject = () => {
    alert(`Application ${appId} rejected`);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={commonStyles.safe}>
      <LenderHeader title="Review Application" onBackPress={() => navigation.goBack()} />
      
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <AlertBanner type="info" title="Application Review" message={`Review ${app.borrowerName}'s application`} />

        <View style={commonStyles.card}>
          <Text style={commonStyles.sectionTitle}>Applicant Details</Text>
          <View style={styles.detailRow}>
            <Text style={commonStyles.textSecondary}>Name</Text>
            <Text style={commonStyles.textPrimary}>{app.borrowerName}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={commonStyles.textSecondary}>Borrower ID</Text>
            <Text style={commonStyles.textPrimary}>{app.borrowerId}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={commonStyles.textSecondary}>Credit Score</Text>
            <Text style={[commonStyles.textPrimary, { color: app.creditScore > 700 ? COLORS.success : COLORS.warning }]}>
              {app.creditScore}
            </Text>
          </View>
        </View>

        <View style={commonStyles.card}>
          <Text style={commonStyles.sectionTitle}>Loan Details</Text>
          <View style={styles.detailRow}>
            <Text style={commonStyles.textSecondary}>Requested Amount</Text>
            <Text style={commonStyles.textPrimary}>LKR {(app.requestedAmount / 1000).toFixed(0)}K</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={commonStyles.textSecondary}>Proposed ROI</Text>
            <Text style={commonStyles.textPrimary}>{app.roi}%</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={commonStyles.textSecondary}>Duration</Text>
            <Text style={commonStyles.textPrimary}>{app.duration}</Text>
          </View>
        </View>

        <View style={commonStyles.card}>
          <Text style={commonStyles.sectionTitle}>Documents</Text>
          {app.documents.map((doc, idx) => (
            <View key={idx} style={commonStyles.rowSpaceBetween}>
              <Text style={commonStyles.textSecondary}>{doc}</Text>
              <Feather name="check-circle" size={18} color={COLORS.success} />
            </View>
          ))}
        </View>

        <TouchableOpacity style={commonStyles.primaryButton} onPress={handleApprove}>
          <Feather name="check" size={18} color="#fff" />
          <Text style={commonStyles.buttonText}>Approve Application</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[commonStyles.primaryButton, { backgroundColor: COLORS.danger }]} onPress={handleReject}>
          <Feather name="x" size={18} color="#fff" />
          <Text style={commonStyles.buttonText}>Reject Application</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
});
