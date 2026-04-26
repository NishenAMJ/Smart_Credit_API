import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, SafeAreaView, Alert, ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { commonStyles, COLORS } from '../../styles/lender.styles';
import { AdService } from '../../services/advertisement.service';

const PURPOSES  = ['education', 'business', 'medical', 'personal', 'vehicle', 'home'];
const LOCATIONS = ['Colombo', 'Kandy', 'Galle', 'Negombo', 'Kurunegala', 'Jaffna'];

export default function CreateAdScreen({ navigation }: any) {
  const [loading,    setLoading]    = useState(false);
  const [title,      setTitle]      = useState('');
  const [description,setDescription]= useState('');
  const [minAmount,  setMinAmount]  = useState('');
  const [maxAmount,  setMaxAmount]  = useState('');
  const [rate,       setRate]       = useState('');
  const [minTenure,  setMinTenure]  = useState('');
  const [maxTenure,  setMaxTenure]  = useState('');
  const [capital,    setCapital]    = useState('');
  const [responseHrs,setResponseHrs]= useState('');
  const [location,   setLocation]   = useState('Colombo');
  const [purposes,   setPurposes]   = useState<string[]>([]);

  const togglePurpose = (p: string) => {
    setPurposes((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  };

  const handleSubmit = async () => {
    if (!title || !description || !minAmount || !maxAmount || !rate) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    if (purposes.length === 0) {
      Alert.alert('Error', 'Select at least one purpose');
      return;
    }

    // Expiry date — 6 months from now
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 6);

    try {
      setLoading(true);
      await AdService.createAd({
        title,
        description,
        minAmount:             Number(minAmount),
        maxAmount:             Number(maxAmount),
        preferredInterestRate: Number(rate),
        minTenureMonths:       Number(minTenure) || 6,
        maxTenureMonths:       Number(maxTenure) || 12,
        availableCapital:      Number(capital),
        responseTimeHours:     Number(responseHrs) || 24,
        location,
        preferredPurposes:     purposes,
        expiresAt:             expiresAt.toISOString(),
      });

      Alert.alert('Success', 'Ad created successfully!', [
        { text: 'OK', onPress: () => navigation.navigate('MyAds') },
      ]);
    } catch (e) {
      Alert.alert('Error', 'Failed to create ad');
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
          <Text style={commonStyles.headerTitle}>Create Ad</Text>
          <View style={{ width: 22 }} />
        </View>
      </View>

      <ScrollView style={commonStyles.scrollContainer}>

        <Text style={commonStyles.sectionTitle}>Ad Details</Text>

        <View style={commonStyles.card}>
          <Text style={commonStyles.textPrimary}>Title *</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Quick Personal Loan"
            style={[commonStyles.input, { marginBottom: 12 }]}
            placeholderTextColor={COLORS.textSecondary}
          />

          <Text style={commonStyles.textPrimary}>Description *</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Describe your offer..."
            multiline
            numberOfLines={4}
            style={[commonStyles.input, { marginBottom: 12 }]}
            placeholderTextColor={COLORS.textSecondary}
          />
        </View>

        <Text style={commonStyles.sectionTitle}>Loan Terms</Text>

        <View style={commonStyles.card}>
          <View style={commonStyles.rowSpaceBetween}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={commonStyles.textPrimary}>Min (LKR) *</Text>
              <TextInput
                value={minAmount}
                onChangeText={setMinAmount}
                keyboardType="numeric"
                placeholder="10000"
                style={commonStyles.input}
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={commonStyles.textPrimary}>Max (LKR) *</Text>
              <TextInput
                value={maxAmount}
                onChangeText={setMaxAmount}
                keyboardType="numeric"
                placeholder="500000"
                style={commonStyles.input}
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
          </View>

          <View style={commonStyles.spacer12} />

          <Text style={commonStyles.textPrimary}>Interest Rate (%) *</Text>
          <TextInput
            value={rate}
            onChangeText={setRate}
            keyboardType="numeric"
            placeholder="12"
            style={[commonStyles.input, { marginBottom: 12 }]}
            placeholderTextColor={COLORS.textSecondary}
          />

          <View style={commonStyles.rowSpaceBetween}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={commonStyles.textPrimary}>Min Tenure (mo)</Text>
              <TextInput
                value={minTenure}
                onChangeText={setMinTenure}
                keyboardType="numeric"
                placeholder="6"
                style={commonStyles.input}
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={commonStyles.textPrimary}>Max Tenure (mo)</Text>
              <TextInput
                value={maxTenure}
                onChangeText={setMaxTenure}
                keyboardType="numeric"
                placeholder="24"
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
            placeholder="1000000"
            style={[commonStyles.input, { marginBottom: 12 }]}
            placeholderTextColor={COLORS.textSecondary}
          />

          <Text style={commonStyles.textPrimary}>Response Time (hours)</Text>
          <TextInput
            value={responseHrs}
            onChangeText={setResponseHrs}
            keyboardType="numeric"
            placeholder="24"
            style={commonStyles.input}
            placeholderTextColor={COLORS.textSecondary}
          />
        </View>

        <Text style={commonStyles.sectionTitle}>Location</Text>
        <View style={commonStyles.card}>
          {LOCATIONS.map((loc) => (
            <TouchableOpacity
              key={loc}
              style={[
                commonStyles.row,
                commonStyles.spacer12,
                { paddingVertical: 8 },
              ]}
              onPress={() => setLocation(loc)}
            >
              <View style={{
                width: 20,
                height: 20,
                borderRadius: 4,
                borderWidth: 2,
                borderColor: COLORS.primary,
                backgroundColor: location === loc ? COLORS.primary : 'transparent',
                marginRight: 8,
              }} />
              <Text style={commonStyles.textPrimary}>{loc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={commonStyles.sectionTitle}>Loan Purposes</Text>
        <View style={commonStyles.card}>
          {PURPOSES.map((p) => (
            <TouchableOpacity
              key={p}
              style={[
                commonStyles.row,
                commonStyles.spacer12,
                { paddingVertical: 8 },
              ]}
              onPress={() => togglePurpose(p)}
            >
              <View style={{
                width: 20,
                height: 20,
                borderRadius: 4,
                borderWidth: 2,
                borderColor: COLORS.primary,
                backgroundColor: purposes.includes(p) ? COLORS.primary : 'transparent',
                marginRight: 8,
              }} />
              <Text style={commonStyles.textPrimary}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          style={[commonStyles.primaryButton, { marginVertical: 24 }]}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={commonStyles.buttonText}>Publish Ad</Text>
          }
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}