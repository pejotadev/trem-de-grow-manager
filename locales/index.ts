import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

// English translations
import enCommon from './en/common.json';
import enAuth from './en/auth.json';
import enPlants from './en/plants.json';
import enEnvironments from './en/environments.json';
import enLogs from './en/logs.json';
import enFriends from './en/friends.json';
import enMenu from './en/menu.json';
import enProfile from './en/profile.json';
import enPatients from './en/patients.json';
import enExtracts from './en/extracts.json';
import enDistributions from './en/distributions.json';
import enHarvests from './en/harvests.json';
import enAdmin from './en/admin.json';

// Portuguese translations
import ptCommon from './pt/common.json';
import ptAuth from './pt/auth.json';
import ptPlants from './pt/plants.json';
import ptEnvironments from './pt/environments.json';
import ptLogs from './pt/logs.json';
import ptFriends from './pt/friends.json';
import ptMenu from './pt/menu.json';
import ptProfile from './pt/profile.json';
import ptPatients from './pt/patients.json';
import ptExtracts from './pt/extracts.json';
import ptDistributions from './pt/distributions.json';
import ptHarvests from './pt/harvests.json';
import ptAdmin from './pt/admin.json';

export const LANGUAGE_STORAGE_KEY = '@grow_manager_language';

export const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    plants: enPlants,
    environments: enEnvironments,
    logs: enLogs,
    friends: enFriends,
    menu: enMenu,
    profile: enProfile,
    patients: enPatients,
    extracts: enExtracts,
    distributions: enDistributions,
    harvests: enHarvests,
    admin: enAdmin,
  },
  pt: {
    common: ptCommon,
    auth: ptAuth,
    plants: ptPlants,
    environments: ptEnvironments,
    logs: ptLogs,
    friends: ptFriends,
    menu: ptMenu,
    profile: ptProfile,
    patients: ptPatients,
    extracts: ptExtracts,
    distributions: ptDistributions,
    harvests: ptHarvests,
    admin: ptAdmin,
  },
};

export const supportedLanguages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
];

// Get the device language or default to English
const getDeviceLanguage = (): string => {
  const deviceLocale = Localization.getLocales()[0]?.languageCode || 'en';
  // Map pt-BR, pt-PT, etc. to 'pt'
  if (deviceLocale.startsWith('pt')) return 'pt';
  if (deviceLocale.startsWith('en')) return 'en';
  return 'en'; // Default to English for unsupported languages
};

// Initialize i18n with stored language or device language
export const initI18n = async () => {
  let storedLanguage: string | null = null;
  
  try {
    storedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
  } catch (error) {
    console.log('Error reading language from storage:', error);
  }

  const language = storedLanguage || getDeviceLanguage();

  await i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: language,
      fallbackLng: 'en',
      ns: [
        'common',
        'auth',
        'plants',
        'environments',
        'logs',
        'friends',
        'menu',
        'profile',
        'patients',
        'extracts',
        'distributions',
        'harvests',
        'admin',
      ],
      defaultNS: 'common',
      interpolation: {
        escapeValue: false,
      },
      react: {
        useSuspense: false,
      },
    });

  return i18n;
};

// Change language and persist to storage
export const changeLanguage = async (languageCode: string) => {
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, languageCode);
    await i18n.changeLanguage(languageCode);
  } catch (error) {
    console.log('Error changing language:', error);
  }
};

export default i18n;

