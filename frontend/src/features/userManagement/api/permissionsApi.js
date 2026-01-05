import AxiosInstance from "../../../shared/api/AxiosInstance";
import { API_ENDPOINTS } from "../../../shared/constants/apiEndpoints";

export const permissionsApi = {
    list: async () => {
        const response = await AxiosInstance.get(API_ENDPOINTS.USER_MANAGEMENT.PERMISSIONS, { params: {} });
        return response.data;
    },
};
