import AxiosInstance from "../../../shared/api/AxiosInstance";
import { API_ENDPOINTS } from "../../../shared/constants/apiEndpoints";

export const rolesApi = {
    list: async (params) => {
        const response = await AxiosInstance.get(API_ENDPOINTS.USER_MANAGEMENT.ROLES, { params });
        return response.data;
    },
    create: async (roleData) => {
        const response = await AxiosInstance.post(`${API_ENDPOINTS.USER_MANAGEMENT.ROLES}/`, roleData);
        return response.data;
    },
    update: async (roleId, roleData) => {
        const response = await AxiosInstance.put(`${API_ENDPOINTS.USER_MANAGEMENT.ROLES}/${roleId}`, roleData);
        return response.data;
    },
    remove: async (roleId) => {
        const response = await AxiosInstance.delete(`${API_ENDPOINTS.USER_MANAGEMENT.ROLES}/${roleId}`);
        return response.data;
    },
};
