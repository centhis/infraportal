import axios from 'axios'
import { API_ENDPOINTS } from '../constants/apiEndpoints';
import { ROUTES } from '../constants/routes';

const baseURL = import.meta.env.VITE_API_URL

const AxiosInstance = axios.create({
    baseURL: baseURL,
    timeout: 5000,
    headers: {
        "Content-Type":"application/json",
        accept: "application/json"
    },
    withCredentials: true
});

AxiosInstance.interceptors.request.use(
    (config) => {
        const accessToken = localStorage.getItem("Token");
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`
        }
        return config;
    },
    (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        }
        else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

AxiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            // Do not intercept for login requests, just pass the error through
            if (originalRequest._isLogin) {
                return Promise.reject(error);
            }

            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then((token) => {
                    originalRequest.headers.Authorization = "Bearer " + token;
                    return AxiosInstance(originalRequest);
                }).catch((err) => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const response = await axios.get(
                    `${baseURL}${API_ENDPOINTS.AUTH.REFRESH}`,
                    {withCredentials: true} 
                );

                const newAccessToken = response.data.access_token;
                localStorage.setItem("Token", newAccessToken);
                AxiosInstance.defaults.headers.Authorization = `Bearer ${newAccessToken}`;

                processQueue(null, newAccessToken);
                return AxiosInstance(originalRequest);
            } catch (err) {
                processQueue(err, null);
                localStorage.removeItem("Token");
                if (window.location.pathname !== ROUTES.LOGIN) {
                    window.location.href = ROUTES.LOGIN;
                }
                return Promise.reject(err);
            } finally {
                isRefreshing = false
            }
        }
        return Promise.reject(error)
    }
)

export default AxiosInstance