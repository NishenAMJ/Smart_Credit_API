import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  SafeAreaView, ActivityIndicator, Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { commonStyles, COLORS } from '../../styles/lender.styles';
import { AdService } from '../../services/advertisement.service';

export default function AdAnalyticsScreen({ route, navigation }: any) {
  const { adId } = route.params;
  const [data,    setData]    = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const result = await AdService.getAdAnalytics(adId);
      setData(result);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const Header = () => (
    <View style={commonStyles.header}>
      <View style={commonStyles.headerFlexRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={commonStyles.headerTitle}>Ad Analytics</Text>
        <View style={{ width: 22 }} />
      </View>
    </View>
  );

  if (loading) return (
    <SafeAreaView style={commonStyles.safe}>
      <Header />
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    </SafeAreaView>
  );

  if (!data) return (
    <SafeAreaView style={commonStyles.safe}>
      <Header />
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Feather name="bar-chart-2" size={40} color={COLORS.textSecondary} />
        <Text style={[commonStyles.textSecondary, { marginTop: 12 }]}>No data available</Text>
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={commonStyles.safe}>
      <Header />

      <ScrollView style={commonStyles.scrollContainer}>

        <View style={commonStyles.card}>
          <View style={commonStyles.rowSpaceBetween}>
            <View>
              <Text style={commonStyles.textPrimary}>{data.title}</Text>
              <Text style={[commonStyles.textSecondary, { marginTop: 4 }]}>
                Status: {data.status}
              </Text>
            </View>
            {data.isBoosted && (
              <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.warning }}>
                ⚡ Boosted
              </Text>
            )}
          </View>
        </View>

        <Text style={commonStyles.sectionTitle}>Engagement Metrics</Text>
        <View style={commonStyles.card}>
          <View style={[commonStyles.rowSpaceBetween, { marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border }]}>
            <View style={commonStyles.iconBox}>
              <Feather name="eye" size={24} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={commonStyles.textSmall}>Total Views</Text>
              <Text style={commonStyles.textPrimary}>{data.views}</Text>
            </View>
          </View>

          <View style={[commonStyles.rowSpaceBetween, { marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border }]}>
            <View style={commonStyles.iconBox}>
              <Feather name="mouse-pointer" size={24} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={commonStyles.textSmall}>Total Clicks</Text>
              <Text style={commonStyles.textPrimary}>{data.clicks}</Text>
            </View>
          </View>

          <View style={[commonStyles.rowSpaceBetween, { marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border }]}>
            <View style={commonStyles.iconBox}>
              <Feather name="activity" size={24} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={commonStyles.textSmall}>Click-Through Rate (CTR)</Text>
              <Text style={commonStyles.textPrimary}>{data.clickThroughRate}</Text>
            </View>
          </View>

          <View style={commonStyles.rowSpaceBetween}>
            <View style={commonStyles.iconBox}>
              <Feather name="trending-up" size={24} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={commonStyles.textSmall}>Engagement Rate</Text>
              <Text style={commonStyles.textPrimary}>{data.conversionRate}</Text>
            </View>
          </View>
        </View>

        <Text style={commonStyles.sectionTitle}>Conversion Metrics</Text>
        <View style={commonStyles.card}>
          <View style={[commonStyles.rowSpaceBetween, { marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border }]}>
            <View>
              <Text style={commonStyles.textSmall}>Applications Received</Text>
              <Text style={commonStyles.textPrimary}>{data.applicationCount}</Text>
            </View>
            <View>
              <Text style={commonStyles.textSmall}>Loans Funded</Text>
              <Text style={commonStyles.textPrimary}>{data.fundedLoansCount}</Text>
            </View>
          </View>

          <View>
            <Text style={commonStyles.textSmall}>Funding Rate</Text>
            <Text style={commonStyles.textPrimary}>{data.fundingRate}</Text>
          </View>
        </View>

        <Text style={commonStyles.sectionTitle}>Boost Information</Text>
        <View style={commonStyles.card}>
          <View style={[commonStyles.rowSpaceBetween, { marginBottom: 12 }]}>
            <Text style={commonStyles.textPrimary}>Amount Spent</Text>
            
            <Text style={commonStyles.textPrimary}>
              LKR {(data.boostAmount ?? 0).toLocaleString()}
            </Text>
          </View>
          {data.boostExpiry && (
            <View style={commonStyles.rowSpaceBetween}>
              <Text style={commonStyles.textPrimary}>Boost Expires</Text>
              <Text style={commonStyles.textSecondary}>
                {new Date(data.boostExpiry).toLocaleDateString()}
              </Text>
            </View>
          )}
          {!data.isBoosted && (
            <Text style={[commonStyles.textSmall, { marginTop: 4 }]}>
              This ad is not currently boosted
            </Text>
          )}
        </View>

        <Text style={commonStyles.sectionTitle}>Timeline</Text>
        <View style={commonStyles.card}>
          <View style={[commonStyles.rowSpaceBetween, { marginBottom: 12 }]}>
            <Text style={commonStyles.textPrimary}>Created</Text>
            <Text style={commonStyles.textSecondary}>
              {new Date(data.createdAt).toLocaleDateString()}
            </Text>
          </View>
          <View style={commonStyles.rowSpaceBetween}>
            <Text style={commonStyles.textPrimary}>Expires</Text>
            <Text style={commonStyles.textSecondary}>
              {new Date(data.expiresAt).toLocaleDateString()}
            </Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}