import AxiosInstance from "../../../shared/api/AxiosInstance";
import { API_ENDPOINTS } from "../../../shared/constants/apiEndpoints";

export const groupsApi = {
    list: async (params) => {
        const response = await AxiosInstance.get(API_ENDPOINTS.USER_MANAGEMENT.GROUPS, { params });
        return response.data;
    },
    get: async (groupId) => {
        const response = await AxiosInstance.get(`${API_ENDPOINTS.USER_MANAGEMENT.GROUPS}/${groupId}`);
        return response.data;
    },
    create: async (groupData) => {
        const response = await AxiosInstance.post(API_ENDPOINTS.USER_MANAGEMENT.GROUPS, groupData);
        return response.data;
    },
    update: async (groupId, groupData) => {
        const response = await AxiosInstance.put(`${API_ENDPOINTS.USER_MANAGEMENT.GROUPS}/${groupId}`, groupData);
        return response.data;
    },
    remove: async (groupId) => {
        const response = await AxiosInstance.delete(`${API_ENDPOINTS.USER_MANAGEMENT.GROUPS}/${groupId}`);
        return response.data;
    },
};
