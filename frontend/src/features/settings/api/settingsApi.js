import AxiosInstance from "../../../shared/api/AxiosInstance";
import { API_ENDPOINTS } from "../../../shared/constants/apiEndpoints";

export const settingsApi = {
    // Core Settings
    getCoreSettings: async () => {
        const response = await AxiosInstance.get(API_ENDPOINTS.SETTINGS.CORE);
        return response.data;
    },
    updateCoreSetting: async (key, value) => {
        const response = await AxiosInstance.put(`${API_ENDPOINTS.SETTINGS.CORE}/${key}`, { value });
        return response.data;
    },

    // LDAP Settings
    getLdapSettings: async () => {
        const response = await AxiosInstance.get(API_ENDPOINTS.SETTINGS.LDAP);
        return response.data;
    },
    updateLdapSetting: async (key, value) => {
        const response = await AxiosInstance.put(`${API_ENDPOINTS.SETTINGS.LDAP}/${key}`, { value });
        return response.data;
    },
    updateLdapSettingsBulk: async (settings) => {
        const response = await AxiosInstance.patch(API_ENDPOINTS.SETTINGS.LDAP, { settings });
        return response.data;
    },
    testLdapConnection: async (settingsData) => {
        const response = await AxiosInstance.post(API_ENDPOINTS.SETTINGS.LDAP_TEST, { settings: settingsData });
        return response.data;
    },
    isLdapEnabled: async () => {
        const response = await AxiosInstance.get(API_ENDPOINTS.SETTINGS.LDAP_IS_ENABLED);
        return response.data;
    },
};
