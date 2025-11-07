import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { toast } from 'react-hot-toast';
import { router } from '../router';

// Define API response type
export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  statusCode?: number;
}

// Extend AxiosRequestConfig to include our custom response type
declare module 'axios' {
  export interface AxiosInstance {
    request<T = any, R = ApiResponse<T>> (config: AxiosRequestConfig): Promise<R>;
    get<T = any, R = ApiResponse<T>>(url: string, config?: AxiosRequestConfig): Promise<R>;
    delete<T = any, R = ApiResponse<T>>(url: string, config?: AxiosRequestConfig): Promise<R>;
    head<T = any, R = ApiResponse<T>>(url: string, config?: AxiosRequestConfig): Promise<R>;
    post<T = any, R = ApiResponse<T>>(url: string, data?: any, config?: AxiosRequestConfig): Promise<R>;
    put<T = any, R = ApiResponse<T>>(url: string, data?: any, config?: AxiosRequestConfig): Promise<R>;
    patch<T = any, R = ApiResponse<T>>(url: string, data?: any, config?: AxiosRequestConfig): Promise<R>;
  }
}

// Create an axios instance
const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

export { api };

// Request interceptor to include the token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // If data is FormData, remove Content-Type header to let axios set it with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors and response structure
api.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    // Return the response data which is already unwrapped by the interceptor
    return response.data;
  },
  (error) => {
    if (error.response) {
      // Handle 401 Unauthorized
      if (error.response.status === 401) {
        // Clear auth data and redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Only redirect if not already on the login page
        if (window.location.pathname !== '/login') {
          router.navigate({ to: '/login' });
          toast.error('Your session has expired. Please log in again.');
        }
      } else {
        // Handle other errors
        const errorMessage = error.response.data?.message || 'An error occurred';
        toast.error(errorMessage);
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          baseURL: error.config?.baseURL,
        }
      });
      toast.error('Network Error: Unable to connect to the server. Please ensure the backend server is running.');
    } else {
      // Something happened in setting up the request
      console.error('Request setup error:', error.message);
      toast.error('An error occurred while setting up the request.');
    }
    
    return Promise.reject(error);
  }
);
