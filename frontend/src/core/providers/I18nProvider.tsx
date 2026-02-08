import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n/i18n';
import { I18N_LNG_KEY } from '@shared/constants/keys';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import 'dayjs/locale/en';

export interface I18nContextValue {
    currentLanguage: string;
    changeLanguage: (lng: string) => void;
    availableLanguages: string[];
}

const I18nContext = createContext<I18nContextValue>({
    currentLanguage: 'en',
    changeLanguage: () => { },
    availableLanguages: ['en', 'ru'],
});

// eslint-disable-next-line react-refresh/only-export-components
export function useI18n(): I18nContextValue {
    return useContext(I18nContext);
}

export interface I18nProviderProps {
    children: ReactNode;
    /** Доступные языки */
    availableLanguages?: string[];
    /** Язык по умолчанию */
    defaultLanguage?: string;
}

export function I18nProvider({
    children,
    availableLanguages = ['en', 'ru'],
    defaultLanguage = 'en',
}: I18nProviderProps) {
    const [currentLanguage, setCurrentLanguage] = useState<string>(
        (i18n.language as string) || defaultLanguage
    );

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
    };

    useEffect(() => {
        const handleLanguageChanged = (lng: string) => {
            setCurrentLanguage(lng);
            localStorage.setItem(I18N_LNG_KEY, lng);
            dayjs.locale(lng);
        };

        i18n.on('languageChanged', handleLanguageChanged);

        // Начальная проверка
        const storedLng = localStorage.getItem(I18N_LNG_KEY);
        if (storedLng && storedLng !== i18n.language) {
            i18n.changeLanguage(storedLng);
        } else {
            // Синхронизируем dayjs, если язык уже совпадает
            dayjs.locale(i18n.language);
        }

        return () => {
            i18n.off('languageChanged', handleLanguageChanged);
        };
    }, []);

    const contextValue: I18nContextValue = {
        currentLanguage,
        changeLanguage,
        availableLanguages,
    };

    return (
        <I18nContext.Provider value={contextValue}>
            <I18nextProvider i18n={i18n}>
                {children}
            </I18nextProvider>
        </I18nContext.Provider>
    );
}
