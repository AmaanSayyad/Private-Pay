import axios from "axios";
import Cookies from "js-cookie";
import activityLogger from "../lib/activityLogger.js";

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
    const startTime = Date.now();
    req.metadata = { startTime };
    
    let access_token = Cookies.get("access_token");
    req.headers.Authorization = `Bearer ${access_token}`;
    
    // Log network request (async, non-blocking)
    if (import.meta.env.DEV) {
      setTimeout(() => {
        activityLogger.logNetworkRequest(req.url || req.baseURL + req.url, req.method?.toUpperCase() || 'GET', {
          // Minimal info to avoid performance issues
          hasParams: !!req.params,
          hasData: !!req.data,
        });
      }, 0);
    }
    
    return req;
  });

  // Add response interceptor to validate JSON responses
  instance.interceptors.response.use(
    (response) => {
      const duration = Date.now() - (response.config.metadata?.startTime || Date.now());
      
      // Log successful network response (async, non-blocking)
      if (import.meta.env.DEV) {
        setTimeout(() => {
          activityLogger.logNetworkResponse(
            response.config.url || response.config.baseURL + response.config.url,
            response.config.method?.toUpperCase() || 'GET',
            response.status,
            duration,
            { dataSize: JSON.stringify(response.data).length }
          );
        }, 0);
      }
      
      // Validate response data is JSON
      if (response.data && typeof response.data === 'string' && response.data.trim().startsWith('<')) {
        console.error('SQUIDL API returned HTML instead of JSON:', response.data.substring(0, 100));
        throw new Error('Server returned HTML instead of JSON. Backend may be unreachable.');
      }
      return response;
    },
    (error) => {
      const duration = Date.now() - (error.config?.metadata?.startTime || Date.now());
      
      // Log network error
      activityLogger.logNetworkError(
        error.config?.url || error.config?.baseURL + error.config?.url || 'unknown',
        error.config?.method?.toUpperCase() || 'GET',
        error
      );
      
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

  // Add request interceptor for logging
  instance.interceptors.request.use(async (req) => {
    const startTime = Date.now();
    req.metadata = { startTime };
    
    activityLogger.logNetworkRequest(req.url || req.baseURL + req.url, req.method?.toUpperCase() || 'GET', {
      headers: req.headers,
      params: req.params,
      data: req.data,
    });
    
    return req;
  });

  // Add response interceptor to validate JSON responses
  instance.interceptors.response.use(
    (response) => {
      const duration = Date.now() - (response.config.metadata?.startTime || Date.now());
      
      activityLogger.logNetworkResponse(
        response.config.url || response.config.baseURL + response.config.url,
        response.config.method?.toUpperCase() || 'GET',
        response.status,
        duration,
        { dataSize: JSON.stringify(response.data).length }
      );
      
      // Validate response data is JSON
      if (response.data && typeof response.data === 'string' && response.data.trim().startsWith('<')) {
        console.error('SQUIDL Public API returned HTML instead of JSON:', response.data.substring(0, 100));
        throw new Error('Server returned HTML instead of JSON. Backend may be unreachable.');
      }
      return response;
    },
    (error) => {
      const duration = Date.now() - (error.config?.metadata?.startTime || Date.now());
      
      activityLogger.logNetworkError(
        error.config?.url || error.config?.baseURL + error.config?.url || 'unknown',
        error.config?.method?.toUpperCase() || 'GET',
        error
      );
      
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
