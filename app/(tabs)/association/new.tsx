import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import { createAssociation } from '../../../firebase/associations';
import { AssociationStatus } from '../../../types';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

export default function NewAssociationScreen() {
  const [loading, setLoading] = useState(false);
  const { userData, refreshUser } = useAuth();
  const router = useRouter();
  const { t } = useTranslation('association');

  // Form state
  const [name, setName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [anvisaAuthorization, setAnvisaAuthorization] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('Brasil');
  const [responsiblePersonName, setResponsiblePersonName] = useState('');
  const [responsiblePersonCpf, setResponsiblePersonCpf] = useState('');
  const [responsiblePersonRole, setResponsiblePersonRole] = useState('President');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = t('errors.nameRequired');
    if (!legalName.trim()) newErrors.legalName = t('errors.legalNameRequired');
    if (!address.trim()) newErrors.address = t('errors.addressRequired');
    if (!city.trim()) newErrors.city = t('errors.cityRequired');
    if (!state.trim()) newErrors.state = t('errors.stateRequired');
    if (!responsiblePersonName.trim()) newErrors.responsiblePersonName = t('errors.responsibleRequired');
    if (!responsiblePersonCpf.trim()) newErrors.responsiblePersonCpf = t('errors.cpfRequired');
    if (!contactEmail.trim()) newErrors.contactEmail = t('errors.emailRequired');
    if (contactEmail && !contactEmail.includes('@')) newErrors.contactEmail = t('errors.emailInvalid');
    if (!contactPhone.trim()) newErrors.contactPhone = t('errors.phoneRequired');

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (!userData) return;

    setLoading(true);

    try {
      const associationData = {
        name: name.trim(),
        legalName: legalName.trim(),
        cnpj: cnpj.trim() || undefined,
        anvisaAuthorization: anvisaAuthorization.trim() || undefined,
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        postalCode: postalCode.trim() || undefined,
        country: country.trim(),
        foundingDate: Date.now(),
        responsiblePersonName: responsiblePersonName.trim(),
        responsiblePersonCpf: responsiblePersonCpf.trim(),
        responsiblePersonRole: responsiblePersonRole.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim(),
        website: website.trim() || undefined,
        description: description.trim() || undefined,
        status: 'active' as AssociationStatus,
        createdBy: userData.uid,
      };

      const { associationId } = await createAssociation(
        associationData,
        userData.uid,
        userData.email,
        userData.displayName
      );

      // Refresh user data to get updated associations
      await refreshUser();

      const successMessage = t('createSuccess');
      if (Platform.OS === 'web') {
        window.alert(successMessage);
      } else {
        Alert.alert(t('success'), successMessage);
      }

      router.replace(`/(tabs)/association/${associationId}`);
    } catch (error: any) {
      console.error('[NewAssociation] Error creating association:', error);
      const errorMessage = error.message || t('createError');
      if (Platform.OS === 'web') {
        window.alert(errorMessage);
      } else {
        Alert.alert(t('error'), errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Basic Information */}
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="business" size={24} color="#4CAF50" />
              <Text style={styles.cardTitle}>{t('basicInfo')}</Text>
            </View>

            <Input
              label={t('fields.name')}
              placeholder={t('placeholders.name')}
              value={name}
              onChangeText={setName}
              error={errors.name}
            />

            <Input
              label={t('fields.legalName')}
              placeholder={t('placeholders.legalName')}
              value={legalName}
              onChangeText={setLegalName}
              error={errors.legalName}
            />

            <Input
              label={t('fields.cnpj')}
              placeholder={t('placeholders.cnpj')}
              value={cnpj}
              onChangeText={setCnpj}
              keyboardType="numeric"
            />

            <Input
              label={t('fields.anvisaAuthorization')}
              placeholder={t('placeholders.anvisaAuthorization')}
              value={anvisaAuthorization}
              onChangeText={setAnvisaAuthorization}
            />

            <Input
              label={t('fields.description')}
              placeholder={t('placeholders.description')}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />
          </Card>

          {/* Address */}
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="location" size={24} color="#4CAF50" />
              <Text style={styles.cardTitle}>{t('addressInfo')}</Text>
            </View>

            <Input
              label={t('fields.address')}
              placeholder={t('placeholders.address')}
              value={address}
              onChangeText={setAddress}
              error={errors.address}
            />

            <View style={styles.row}>
              <View style={styles.flex2}>
                <Input
                  label={t('fields.city')}
                  placeholder={t('placeholders.city')}
                  value={city}
                  onChangeText={setCity}
                  error={errors.city}
                />
              </View>
              <View style={styles.flex1}>
                <Input
                  label={t('fields.state')}
                  placeholder={t('placeholders.state')}
                  value={state}
                  onChangeText={setState}
                  error={errors.state}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.flex1}>
                <Input
                  label={t('fields.postalCode')}
                  placeholder={t('placeholders.postalCode')}
                  value={postalCode}
                  onChangeText={setPostalCode}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.flex1}>
                <Input
                  label={t('fields.country')}
                  placeholder={t('placeholders.country')}
                  value={country}
                  onChangeText={setCountry}
                />
              </View>
            </View>
          </Card>

          {/* Responsible Person */}
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="person" size={24} color="#4CAF50" />
              <Text style={styles.cardTitle}>{t('responsiblePerson')}</Text>
            </View>

            <Input
              label={t('fields.responsibleName')}
              placeholder={t('placeholders.responsibleName')}
              value={responsiblePersonName}
              onChangeText={setResponsiblePersonName}
              error={errors.responsiblePersonName}
            />

            <Input
              label={t('fields.responsibleCpf')}
              placeholder={t('placeholders.responsibleCpf')}
              value={responsiblePersonCpf}
              onChangeText={setResponsiblePersonCpf}
              keyboardType="numeric"
              error={errors.responsiblePersonCpf}
            />

            <Input
              label={t('fields.responsibleRole')}
              placeholder={t('placeholders.responsibleRole')}
              value={responsiblePersonRole}
              onChangeText={setResponsiblePersonRole}
            />
          </Card>

          {/* Contact */}
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="call" size={24} color="#4CAF50" />
              <Text style={styles.cardTitle}>{t('contactInfo')}</Text>
            </View>

            <Input
              label={t('fields.email')}
              placeholder={t('placeholders.email')}
              value={contactEmail}
              onChangeText={setContactEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.contactEmail}
            />

            <Input
              label={t('fields.phone')}
              placeholder={t('placeholders.phone')}
              value={contactPhone}
              onChangeText={setContactPhone}
              keyboardType="phone-pad"
              error={errors.contactPhone}
            />

            <Input
              label={t('fields.website')}
              placeholder={t('placeholders.website')}
              value={website}
              onChangeText={setWebsite}
              keyboardType="url"
              autoCapitalize="none"
            />
          </Card>

          {/* Submit */}
          <View style={styles.submitContainer}>
            <Button
              title={loading ? t('creating') : t('createAssociation')}
              onPress={handleSubmit}
              disabled={loading}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    marginBottom: 16,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  flex2: {
    flex: 2,
  },
  submitContainer: {
    marginTop: 8,
  },
});


