import { useTranslation as useNextTranslation } from 'next-i18next';
import { useRouter } from 'next/router';

export const useTranslation = (namespaces?: string | string[]) => {
  const { t, i18n } = useNextTranslation(namespaces);
  const router = useRouter();

  const changeLanguage = async (locale: string) => {
    const { pathname, asPath, query } = router;
    await router.push({ pathname, query }, asPath, { locale });
  };

  const currentLanguage = i18n.language;

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'pt', name: 'Português', flag: '🇵🇹' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' }
  ];

  return {
    t,
    i18n,
    changeLanguage,
    currentLanguage,
    languages
  };
};