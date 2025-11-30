import axios from "axios";
import Cookies from "js-cookie";

const apiWithSession = () => {
  const instance = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_URL,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    responseType: 'json',
  });
  
  instance.interceptors.request.use(async (req) => {
    let access_token = Cookies.get("access_token");
    req.headers.Authorization = `Bearer ${access_token}`;
    return req;
  });

  // Add response interceptor to validate JSON responses
  instance.interceptors.response.use(
    (response) => {
      // Validate response data is JSON
      if (response.data && typeof response.data === 'string' && response.data.trim().startsWith('<')) {
        console.error('SQUIDL API returned HTML instead of JSON:', response.data.substring(0, 100));
        throw new Error('Server returned HTML instead of JSON. Backend may be unreachable.');
      }
      return response;
    },
    (error) => {
      // Check if we received HTML instead of JSON
      if (error.response?.data && typeof error.response.data === 'string' && error.response.data.trim().startsWith('<')) {
        console.error('SQUIDL API returned HTML error page:', error.response.data.substring(0, 200));
        return Promise.reject(new Error('SQUIDL backend is unreachable or returned an error page'));
      }
      return Promise.reject(error);
    }
  );

  return instance;
};

const apiNoSession = () => {
  const instance = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_URL,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    responseType: 'json',
  });

  // Add response interceptor to validate JSON responses
  instance.interceptors.response.use(
    (response) => {
      // Validate response data is JSON
      if (response.data && typeof response.data === 'string' && response.data.trim().startsWith('<')) {
        console.error('SQUIDL Public API returned HTML instead of JSON:', response.data.substring(0, 100));
        throw new Error('Server returned HTML instead of JSON. Backend may be unreachable.');
      }
      return response;
    },
    (error) => {
      // Check if we received HTML instead of JSON
      if (error.response?.data && typeof error.response.data === 'string' && error.response.data.trim().startsWith('<')) {
        console.error('SQUIDL Public API returned HTML error page:', error.response.data.substring(0, 200));
        return Promise.reject(new Error('SQUIDL backend is unreachable or returned an error page'));
      }
      return Promise.reject(error);
    }
  );

  return instance;
};

export const squidlAPI = apiWithSession();
export const squidlPublicAPI = apiNoSession();
