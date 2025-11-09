import AxiosInstance from "../../../shared/api/AxiosInstance";
import { API_ENDPOINTS } from "../../../shared/constants/apiEndpoints";

export const usersApi = {
    list: async (params) => {
        const response = await AxiosInstance.get(API_ENDPOINTS.USER_MANAGEMENT.USERS, { params });
        return response.data;
    },
    create: async (userData) => {
        const response = await AxiosInstance.post(`${API_ENDPOINTS.USER_MANAGEMENT.USERS}/`, userData);
        return response.data;
    },
    update: async (userId, userData) => {
        const response = await AxiosInstance.put(`${API_ENDPOINTS.USER_MANAGEMENT.USERS}/${userId}`, userData);
        return response.data;
    },
    remove: async (userId) => {
        const response = await AxiosInstance.delete(`${API_ENDPOINTS.USER_MANAGEMENT.USERS}/${userId}`);
        return response.data;
    },
};