import { useState, useCallback } from "react";
import { settingsService } from "../services/settingsService";

export default function useCoreSettings() {
    const [coreSettings, setCoreSettings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchCoreSettings = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await settingsService.getCoreSettings();
            setCoreSettings(data);
        } catch (err) {
            setError(err.message || "Failed to fetch core settings");
        } finally {
            setLoading(false);
        }
    }, []);

    const updateCoreSetting = async (key, value) => {
        setLoading(true);
        setError(null);
        try {
            const updated = await settingsService.updateCoreSetting(key, value);
            setCoreSettings(prev => prev.map(s => (s.key === key ? updated : s)));
            return updated;
        } catch (err) {
            setError(err.message || `Failed to update core setting: ${key}`);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return {
        coreSettings,
        loading,
        error,
        fetchCoreSettings,
        updateCoreSetting,
    };
}
