import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  SafeAreaView, Alert, ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { commonStyles, COLORS } from '../../styles/lender.styles';
import { AdService } from '../../services/advertisement.service';

export default function MyAdsScreen({ navigation }: any) {
  const [ads,     setAds]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('all');

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadAds);
    return unsubscribe;
  }, [navigation]);

  const loadAds = async () => {
    try {
      setLoading(true);
      const data = await AdService.getMyAds();
      setAds(data);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to load ads');
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async (adId: string) => {
    try {
      await AdService.pauseAd(adId);
      loadAds();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to pause ad');
    }
  };

  const handleActivate = async (adId: string) => {
    try {
      await AdService.activateAd(adId);
      loadAds();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to activate ad');
    }
  };

  const handleDelete = (adId: string) => {
    Alert.alert('Delete Ad', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await AdService.deleteAd(adId);
            loadAds();
          } catch (e: any) {
            Alert.alert('Error', e?.response?.data?.message || 'Failed to delete ad');
          }
        },
      },
    ]);
  };

  const filtered = ads.filter((ad: any) => {
    if (filter === 'active') return ad.status === 'active';
    if (filter === 'paused') return ad.status === 'paused';
    return true;
  });

  const renderFilterBar = () => (
    <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12, marginTop: 12 }}>
      {['all', 'active', 'paused'].map((f) => (
        <TouchableOpacity
          key={f}
          onPress={() => setFilter(f)}
          style={[
            { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, flex: 1 },
            filter === f
              ? { backgroundColor: COLORS.primary }
              : { backgroundColor: COLORS.border },
          ]}
        >
          <Text style={{
            textAlign: 'center',
            fontWeight: '600',
            fontSize: 12,
            color: filter === f ? '#fff' : COLORS.textPrimary,
          }}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderAd = ({ item }: any) => (
    <View style={[commonStyles.card, { marginHorizontal: 16, marginBottom: 12 }]}>
      <View style={commonStyles.rowSpaceBetween}>
        <View style={{ flex: 1 }}>
          <Text style={commonStyles.textPrimary}>{item.title}</Text>
          <Text style={[commonStyles.textSecondary, { marginTop: 4 }]}>
            {item.location}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          {item.isBoosted && (
            <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.warning, marginBottom: 4 }}>
              ⚡ Boosted
            </Text>
          )}
          <Text style={[
            { fontSize: 12, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
            item.status === 'active'
              ? { backgroundColor: '#D1F9E6', color: COLORS.success }
              : { backgroundColor: '#FEF2F2', color: COLORS.danger },
          ]}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
      </View>

      <View style={commonStyles.divider} />

      <View style={commonStyles.rowSpaceBetween}>
        <View>
          <Text style={commonStyles.textSmall}>Amount Range</Text>
          <Text style={commonStyles.textPrimary}>
            LKR {item.minAmount.toLocaleString()} – {item.maxAmount.toLocaleString()}
          </Text>
        </View>
        <View>
          <Text style={commonStyles.textSmall}>Interest</Text>
          <Text style={commonStyles.textPrimary}>{item.preferredInterestRate}% p.a.</Text>
        </View>
      </View>

      <View style={commonStyles.spacer12} />

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
          <Text style={commonStyles.textSmall}>Applications</Text>
          <Text style={commonStyles.textPrimary}>{item.applicationCount}</Text>
        </View>
      </View>

      <View style={commonStyles.spacer12} />

      <View style={commonStyles.row}>
        <TouchableOpacity
          style={[commonStyles.secondaryButton, { flex: 1, marginRight: 6 }]}
          onPress={() => navigation.navigate('EditAd', { ad: item })}
        >
          <View style={commonStyles.row}>
            <Feather name="edit-2" size={14} color={COLORS.textPrimary} />
            <Text style={{ marginLeft: 4, color: COLORS.textPrimary, fontWeight: '600' }}>Edit</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[commonStyles.secondaryButton, { flex: 1, marginRight: 6 }]}
          onPress={() => navigation.navigate('AdAnalytics', { adId: item.adId })}
        >
          <View style={commonStyles.row}>
            <Feather name="bar-chart-2" size={14} color={COLORS.textPrimary} />
            <Text style={{ marginLeft: 4, color: COLORS.textPrimary, fontWeight: '600' }}>Stats</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[commonStyles.secondaryButton, { flex: 1, marginRight: 6 }]}
          onPress={() => navigation.navigate('BoostAd', { ad: item })}
        >
          <View style={commonStyles.row}>
            <Feather name="trending-up" size={14} color={COLORS.textPrimary} />
            <Text style={{ marginLeft: 4, color: COLORS.textPrimary, fontWeight: '600' }}>Boost</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={commonStyles.secondaryButton}
          onPress={() =>
            item.status === 'active'
              ? handlePause(item.adId)
              : handleActivate(item.adId)
          }
        >
          <View style={commonStyles.row}>
            <Feather
              name={item.status === 'active' ? 'pause-circle' : 'play-circle'}
              size={14}
              color={COLORS.textPrimary}
            />
          </View>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[commonStyles.secondaryButton, { marginTop: 8, backgroundColor: '#FEF2F2' }]}
        onPress={() => handleDelete(item.adId)}
      >
        <View style={commonStyles.row}>
          <Feather name="trash-2" size={14} color={COLORS.danger} />
          <Text style={{ marginLeft: 6, color: COLORS.danger, fontWeight: '600' }}>Delete</Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  if (loading) return (
    <SafeAreaView style={commonStyles.safe}>
      <View style={commonStyles.header}>
        <View style={commonStyles.headerFlexRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={commonStyles.headerTitle}>My Ads</Text>
          <View style={{ width: 22 }} />
        </View>
      </View>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
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
          <Text style={commonStyles.headerTitle}>My Ads</Text>
          <TouchableOpacity onPress={() => navigation.navigate('CreateAd')}>
            <Feather name="plus" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item: any) => item.adId}
        renderItem={renderAd}
        onRefresh={loadAds}
        refreshing={loading}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListHeaderComponent={renderFilterBar}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Feather name="inbox" size={40} color={COLORS.textSecondary} />
            <Text style={[commonStyles.textSecondary, { marginTop: 12 }]}>No ads found</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}