import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, SafeAreaView, Alert, ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { commonStyles, COLORS } from '../../styles/lender.styles';
import { AdService } from '../../services/advertisement.service';

export default function EditAdScreen({ route, navigation }: any) {
  const { ad } = route.params;

  const [loading,    setLoading]    = useState(false);
  const [title,      setTitle]      = useState(ad.title);
  const [description,setDescription]= useState(ad.description);
  const [minAmount,  setMinAmount]  = useState(String(ad.minAmount));
  const [maxAmount,  setMaxAmount]  = useState(String(ad.maxAmount));
  const [rate,       setRate]       = useState(String(ad.preferredInterestRate));
  const [minTenure,  setMinTenure]  = useState(String(ad.minTenureMonths));
  const [maxTenure,  setMaxTenure]  = useState(String(ad.maxTenureMonths));
  const [capital,    setCapital]    = useState(String(ad.availableCapital));
  const [responseHrs,setResponseHrs]= useState(String(ad.responseTimeHours));
  const [location,   setLocation]   = useState(ad.location);

  const handleUpdate = async () => {
    try {
      setLoading(true);
      await AdService.updateAd(ad.adId, {
        title,
        description,
        minAmount:             Number(minAmount),
        maxAmount:             Number(maxAmount),
        preferredInterestRate: Number(rate),
        minTenureMonths:       Number(minTenure),
        maxTenureMonths:       Number(maxTenure),
        availableCapital:      Number(capital),
        responseTimeHours:     Number(responseHrs),
        location,
      });

      Alert.alert('Success', 'Ad updated!', [
        { text: 'OK', onPress: () => navigation.navigate('MyAds') },
      ]);
    } catch (e) {
      Alert.alert('Error', 'Failed to update ad');
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
          <Text style={commonStyles.headerTitle}>Edit Ad</Text>
          <View style={{ width: 22 }} />
        </View>
      </View>

      <ScrollView style={commonStyles.scrollContainer}>

        <Text style={commonStyles.sectionTitle}>Ad Details</Text>
        <View style={commonStyles.card}>
          <Text style={commonStyles.textPrimary}>Title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            style={[commonStyles.input, { marginBottom: 12 }]}
            placeholderTextColor={COLORS.textSecondary}
          />

          <Text style={commonStyles.textPrimary}>Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            style={commonStyles.input}
            placeholderTextColor={COLORS.textSecondary}
          />
        </View>

        <Text style={commonStyles.sectionTitle}>Loan Terms</Text>
        <View style={commonStyles.card}>
          <View style={commonStyles.rowSpaceBetween}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={commonStyles.textPrimary}>Min Amount (LKR)</Text>
              <TextInput
                value={minAmount}
                onChangeText={setMinAmount}
                keyboardType="numeric"
                style={commonStyles.input}
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={commonStyles.textPrimary}>Max Amount (LKR)</Text>
              <TextInput
                value={maxAmount}
                onChangeText={setMaxAmount}
                keyboardType="numeric"
                style={commonStyles.input}
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
          </View>

          <View style={commonStyles.spacer12} />

          <Text style={commonStyles.textPrimary}>Interest Rate (%)</Text>
          <TextInput
            value={rate}
            onChangeText={setRate}
            keyboardType="numeric"
            style={[commonStyles.input, { marginBottom: 12 }]}
            placeholderTextColor={COLORS.textSecondary}
          />

          <View style={commonStyles.rowSpaceBetween}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={commonStyles.textPrimary}>Min Tenure (months)</Text>
              <TextInput
                value={minTenure}
                onChangeText={setMinTenure}
                keyboardType="numeric"
                style={commonStyles.input}
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={commonStyles.textPrimary}>Max Tenure (months)</Text>
              <TextInput
                value={maxTenure}
                onChangeText={setMaxTenure}
                keyboardType="numeric"
                style={commonStyles.input}
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
          </View>
        </View>

        <Text style={commonStyles.sectionTitle}>Availability</Text>
        <View style={commonStyles.card}>
          <Text style={commonStyles.textPrimary}>Available Capital (LKR)</Text>
          <TextInput
            value={capital}
            onChangeText={setCapital}
            keyboardType="numeric"
            style={[commonStyles.input, { marginBottom: 12 }]}
            placeholderTextColor={COLORS.textSecondary}
          />

          <Text style={commonStyles.textPrimary}>Response Time (hours)</Text>
          <TextInput
            value={responseHrs}
            onChangeText={setResponseHrs}
            keyboardType="numeric"
            style={commonStyles.input}
            placeholderTextColor={COLORS.textSecondary}
          />
        </View>

        <Text style={commonStyles.sectionTitle}>Location</Text>
        <View style={commonStyles.card}>
          <View style={[commonStyles.row, { paddingHorizontal: 12, paddingVertical: 12, borderRadius: 10, backgroundColor: COLORS.background }]}>
            <Feather name="map-pin" size={18} color={COLORS.primary} />
            <Text style={[commonStyles.textPrimary, { marginLeft: 8 }]}>{location}</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleUpdate}
          disabled={loading}
          style={[commonStyles.primaryButton, { marginVertical: 24 }]}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={commonStyles.buttonText}>Save Changes</Text>
          }
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}