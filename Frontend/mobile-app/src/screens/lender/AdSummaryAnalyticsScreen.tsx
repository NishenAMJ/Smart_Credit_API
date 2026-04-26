import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  SafeAreaView, ActivityIndicator, Alert, FlatList,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { commonStyles, COLORS } from '../../styles/lender.styles';
import { AdService } from '../../services/advertisement.service';

export default function AdSummaryAnalyticsScreen({ navigation }: any) {
  const [data,    setData]    = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    try {
      setLoading(true);
      const result = await AdService.getAnalyticsSummary();
      setData(result);
    } catch (e) {
      Alert.alert('Error', 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <SafeAreaView style={commonStyles.safe}>
      <ActivityIndicator />
    </SafeAreaView>
  );

  if (!data) return (
    <SafeAreaView style={commonStyles.safe}>
      <View style={commonStyles.header}>
        <View style={commonStyles.headerFlexRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={commonStyles.headerTitle}>Analytics Overview</Text>
          <View style={{ width: 22 }} />
        </View>
      </View>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={commonStyles.textSecondary}>No data available</Text>
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={commonStyles.safe}>
      <View style={commonStyles.header}>
        <View style={commonStyles.headerFlexRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={commonStyles.headerTitle}>Analytics Overview</Text>
          <View style={{ width: 22 }} />
        </View>
      </View>

      <ScrollView style={commonStyles.scrollContainer}>

        <Text style={commonStyles.sectionTitle}>Portfolio Summary</Text>
        <View style={commonStyles.card}>
          <View style={[commonStyles.rowSpaceBetween, { marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border }]}>
            <View>
              <Text style={commonStyles.textSmall}>Total Ads</Text>
              <Text style={commonStyles.textPrimary}>{data.totalAds}</Text>
            </View>
            <View>
              <Text style={commonStyles.textSmall}>Active</Text>
              <Text style={commonStyles.textPrimary}>{data.activeAds}</Text>
            </View>
            <View>
              <Text style={commonStyles.textSmall}>Paused</Text>
              <Text style={commonStyles.textPrimary}>{data.pausedAds}</Text>
            </View>
            <View>
              <Text style={commonStyles.textSmall}>Expired</Text>
              <Text style={commonStyles.textPrimary}>{data.expiredAds}</Text>
            </View>
          </View>

          <View style={commonStyles.rowSpaceBetween}>
            <View>
              <Text style={commonStyles.textSmall}>Boosted</Text>
              <Text style={commonStyles.textPrimary}>{data.boostedAds}</Text>
            </View>
            <View>
              <Text style={commonStyles.textSmall}>Total Spent</Text>
              <Text style={[commonStyles.textPrimary, { color: COLORS.warning }]}>
                LKR {data.totalBoostSpent.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        <Text style={commonStyles.sectionTitle}>Engagement</Text>
        <View style={commonStyles.card}>
          <View style={[commonStyles.rowSpaceBetween, { marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border }]}>
            <View style={commonStyles.iconBox}>
              <Feather name="eye" size={24} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={commonStyles.textSmall}>Total Views</Text>
              <Text style={commonStyles.textPrimary}>{data.totalViews}</Text>
            </View>
          </View>

          <View style={[commonStyles.rowSpaceBetween, { marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border }]}>
            <View style={commonStyles.iconBox}>
              <Feather name="mouse-pointer" size={24} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={commonStyles.textSmall}>Total Clicks</Text>
              <Text style={commonStyles.textPrimary}>{data.totalClicks}</Text>
            </View>
          </View>

          <View style={commonStyles.rowSpaceBetween}>
            <View style={commonStyles.iconBox}>
              <Feather name="activity" size={24} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={commonStyles.textSmall}>Average CTR</Text>
              <Text style={commonStyles.textPrimary}>{data.avgCTR}</Text>
            </View>
          </View>
        </View>

        <Text style={commonStyles.sectionTitle}>Conversion</Text>
        <View style={commonStyles.card}>
          <View style={[commonStyles.rowSpaceBetween, { marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border }]}>
            <View>
              <Text style={commonStyles.textSmall}>Total Applications</Text>
              <Text style={commonStyles.textPrimary}>{data.totalApplications}</Text>
            </View>
            <View>
              <Text style={commonStyles.textSmall}>Total Funded</Text>
              <Text style={[commonStyles.textPrimary, { color: COLORS.success }]}>
                {data.totalFunded}
              </Text>
            </View>
          </View>

          <View>
            <Text style={commonStyles.textSmall}>Conversion Rate</Text>
            <Text style={commonStyles.textPrimary}>
              {data.totalApplications > 0
                ? ((data.totalFunded / data.totalApplications) * 100).toFixed(1)
                : 0}%
            </Text>
          </View>
        </View>

        <Text style={commonStyles.sectionTitle}>Per Ad Breakdown</Text>
        <View style={{ marginHorizontal: -16, paddingHorizontal: 0 }}>
          <FlatList
            data={data.ads}
            keyExtractor={(item: any) => item.adId}
            scrollEnabled={false}
            renderItem={({ item }: any) => (
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('AdAnalytics', { adId: item.adId })
                }
                style={[commonStyles.card, { marginHorizontal: 16, marginBottom: 12 }]}
              >
                <View style={commonStyles.rowSpaceBetween}>
                  <View style={{ flex: 1 }}>
                    <Text style={commonStyles.textPrimary}>{item.title}</Text>
                    <Text style={[commonStyles.textSecondary, { marginTop: 4, fontSize: 12 }]}>
                      Status: {item.status}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={20} color={COLORS.textSecondary} />
                </View>

                <View style={commonStyles.divider} />

                <View style={commonStyles.rowSpaceBetween}>
                  <View>
                    <Text style={commonStyles.textSmall}>Views</Text>
                    <Text style={commonStyles.textPrimary}>{item.views}</Text>
                  </View>
                  <View>
                    <Text style={commonStyles.textSmall}>Clicks</Text>
                    <Text style={commonStyles.textPrimary}>{item.clicks}</Text>
                  </View>
                  <View>
                    <Text style={commonStyles.textSmall}>CTR</Text>
                    <Text style={commonStyles.textPrimary}>{item.ctr}</Text>
                  </View>
                </View>

                <View style={commonStyles.spacer8} />

                <View style={commonStyles.rowSpaceBetween}>
                  <View>
                    <Text style={commonStyles.textSmall}>Applications</Text>
                    <Text style={commonStyles.textPrimary}>{item.applicationCount}</Text>
                  </View>
                  <View>
                    <Text style={commonStyles.textSmall}>Funded</Text>
                    <Text style={[commonStyles.textPrimary, { color: COLORS.success }]}>
                      {item.fundedLoansCount}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}