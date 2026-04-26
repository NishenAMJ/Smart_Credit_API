import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  SafeAreaView, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { commonStyles, COLORS } from '../../styles/lender.styles';
import { AdService } from '../../services/advertisement.service';

export default function BoostAdScreen({ route, navigation }: any) {
  const { ad } = route.params;

  const [packages,   setPackages]   = useState([]);
  const [selected,   setSelected]   = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [loading,    setLoading]    = useState(false);

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    try {
      const data = await AdService.getBoostPackages();
      setPackages(data);
    } catch (e) {
      Alert.alert('Error', 'Failed to load packages');
    }
  };

  const handleBoost = async () => {
    if (!selected) {
      Alert.alert('Error', 'Please select a package');
      return;
    }

    if (!paymentRef.trim()) {
      Alert.alert('Error', 'Please enter payment reference');
      return;
    }

    const pkg: any = packages.find(
      (p: any) => p.package === selected,
    );

    try {
      setLoading(true);
      await AdService.boostAd(ad.adId, {
        package:          selected,
        amount:           pkg.price,
        paymentReference: paymentRef,
      });

      Alert.alert('Success', 'Ad boosted successfully!', [
        { text: 'OK', onPress: () => navigation.navigate('MyAds') },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to boost');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={commonStyles.safe}>
      <View style={commonStyles.header}>
        <View style={commonStyles.headerFlexRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={commonStyles.headerTitle}>Boost Ad</Text>
          <View style={{ width: 22 }} />
        </View>
      </View>

      <ScrollView style={commonStyles.scrollContainer}>

        <View style={commonStyles.card}>
          <Text style={commonStyles.sectionTitle}>Current Ad</Text>
          <Text style={commonStyles.textPrimary}>{ad.title}</Text>
          <Text style={commonStyles.textSecondary}>
            LKR {ad.minAmount.toLocaleString()} – {ad.maxAmount.toLocaleString()}
          </Text>
        </View>

        <Text style={commonStyles.sectionTitle}>Select Package</Text>
        {packages.map((pkg: any) => (
          <TouchableOpacity
            key={pkg.package}
            onPress={() => setSelected(pkg.package)}
            style={[
              commonStyles.card,
              {
                borderWidth: 2,
                borderColor: selected === pkg.package ? COLORS.primary : 'transparent',
                backgroundColor: selected === pkg.package ? '#EBF4FF' : COLORS.surface,
              }
            ]}
          >
            <View style={commonStyles.rowSpaceBetween}>
              <View>
                <Text style={commonStyles.textPrimary}>{pkg.description}</Text>
                <Text style={[commonStyles.textSecondary, { marginTop: 4 }]}>
                  {pkg.days || pkg.package} days
                </Text>
              </View>
              <View>
                <Text style={[commonStyles.textPrimary, { fontSize: 18 }]}>
                  LKR {pkg.price.toLocaleString()}
                </Text>
              </View>
            </View>
            {selected === pkg.package && (
              <View style={[commonStyles.row, { marginTop: 12 }]}>
                <Feather name="check-circle" size={16} color={COLORS.primary} />
                <Text style={[commonStyles.textPrimary, { marginLeft: 6, color: COLORS.primary }]}>
                  Selected
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}

        <Text style={commonStyles.sectionTitle}>Payment Details</Text>
        <View style={commonStyles.card}>
          <Text style={commonStyles.textPrimary}>Payment Reference *</Text>
          <TextInput
            value={paymentRef}
            onChangeText={setPaymentRef}
            placeholder="Bank transfer ref or receipt no."
            style={commonStyles.input}
            placeholderTextColor={COLORS.textSecondary}
          />
          <Text style={[commonStyles.textSmall, { marginTop: 8 }]}>
            Enter your bank transfer reference or payment receipt number
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleBoost}
          disabled={loading || !selected}
          style={[commonStyles.primaryButton, { marginVertical: 24, opacity: !selected ? 0.5 : 1 }]}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : (
              <>
                <Feather name="trending-up" size={18} color="#fff" />
                <Text style={commonStyles.buttonText}>Confirm Boost</Text>
              </>
            )
          }
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}