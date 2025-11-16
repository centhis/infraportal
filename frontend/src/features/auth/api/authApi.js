import AxiosInstance from "../../../shared/api/AxiosInstance";
import { API_ENDPOINTS } from "../../../shared/constants/apiEndpoints";

export const authApi = {
    login: async (login, password) => {
        const response = await AxiosInstance.post(API_ENDPOINTS.AUTH.LOGIN, {
            login,
            password,
        }, { _isLogin: true });
        return response.data;
    },
    getCurrentUser: async() => {
        const response = await AxiosInstance.get(API_ENDPOINTS.AUTH.PROFILE);
        return response.data
    },
    logout: async() => {
        await AxiosInstance.post(API_ENDPOINTS.AUTH.LOGOUT);
    },
};