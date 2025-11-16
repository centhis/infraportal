import React, { createContext, useContext, useEffect, useState } from "react";
import { I18nextProvider } from "react-i18next";
import i18n from "../../i18n/i18n";
import { I18N_LNG_KEY } from "../../shared/constants/keys";


const I18nContext = createContext({
    currentLanguage: "en",
    changeLanguage: (lng) => {},
});

export const useI18n = () => useContext(I18nContext);

export const I18nProvider = ({ children }) => {
    const [currentLanguage, setCurrentLanguage] = useState(i18n.language || "en");

    const changeLanguage = (lng) => {
        i18n.changeLanguage(lng);
    };

    useEffect(() => {
        const handleLanguageChanged = (lng) => {
            setCurrentLanguage(lng);
            localStorage.setItem(I18N_LNG_KEY, lng);
        };

        i18n.on('languageChanged', handleLanguageChanged);

        // Initial check
        const storedLng = localStorage.getItem(I18N_LNG_KEY);
        if (storedLng && storedLng !== i18n.language) {
            i18n.changeLanguage(storedLng);
        }

        return () => {
            i18n.off('languageChanged', handleLanguageChanged);
        };
    }, []);

    return (
        <I18nContext.Provider value={{ currentLanguage, changeLanguage }}>
            <I18nextProvider i18n={i18n}>
                {children}
            </I18nextProvider>
        </I18nContext.Provider>
    )
}