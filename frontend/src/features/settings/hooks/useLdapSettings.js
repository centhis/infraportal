import { useState, useCallback } from "react";
import { settingsService } from "../services/settingsService";

export default function useLdapSettings() {
    const [ldapSettings, setLdapSettings] = useState([]);
    const [ldapEnabled, setLdapEnabled] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchLdapEnabled = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await settingsService.isLdapEnabled();
            setLdapEnabled(data.enabled);
            return data.enabled;
        } catch (err) {
            setError(err.message || "Failed to fetch LDAP status");
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchLdapSettings = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await settingsService.getLdapSettings();
            setLdapSettings(data);
        } catch (err) {
            setError(err.message || "Failed to fetch LDAP settings");
        } finally {
            setLoading(false);
        }
    }, []);

    const updateLdapSettingsBulk = async (settingsDict) => {
        setLoading(true);
        setError(null);
        try {
            const updatedList = await settingsService.updateLdapSettingsBulk(settingsDict);
            
            // Merge the updated settings into the existing state
            // to avoid losing settings not part of the bulk update (like LDAP_SYNC_SCHEDULE)
            setLdapSettings(prevSettings => {
                const newSettings = [...prevSettings];
                updatedList.forEach(updatedItem => {
                    const index = newSettings.findIndex(s => s.key === updatedItem.key);
                    if (index !== -1) {
                        newSettings[index] = updatedItem;
                    }
                });
                return newSettings;
            });

            if ('LDAP_ENABLED' in settingsDict) {
                setLdapEnabled(settingsDict['LDAP_ENABLED'] === 'true' || settingsDict['LDAP_ENABLED'] === true);
            }
            return updatedList;
        } catch (err) {
            setError(err.message || "Failed to bulk update LDAP settings");
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const updateLdapSetting = async (key, value) => {
        setLoading(true);
        setError(null);
        try {
            const updated = await settingsService.updateLdapSetting(key, value);
            setLdapSettings(prev => prev.map(s => (s.key === key ? updated : s)));
            if (key === 'LDAP_ENABLED') {
                setLdapEnabled(value === 'true' || value === true);
            }
            return updated;
        } catch (err) {
            setError(err.message || `Failed to update LDAP setting: ${key}`);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const testLdapConnection = async (settingsData) => {
        setLoading(true);
        setError(null);
        try {
            return await settingsService.testLdapConnection(settingsData);
        } catch (err) {
            setError(err.message || "LDAP connection test failed");
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return {
        ldapSettings,
        ldapEnabled,
        loading,
        error,
        fetchLdapEnabled,
        fetchLdapSettings,
        updateLdapSetting,
        updateLdapSettingsBulk,
        testLdapConnection,
    };
}
