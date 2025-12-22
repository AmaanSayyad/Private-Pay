import axios from "axios";
import activityLogger from "../../activityLogger.js";

// Create axios instance with JSON validation
const cBridgeAxios = axios.create({
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  responseType: 'json',
});

// Add request interceptor for logging
cBridgeAxios.interceptors.request.use(async (req) => {
  const startTime = Date.now();
  req.metadata = { startTime };
  
  // Log network request (async, non-blocking)
  if (import.meta.env.DEV) {
    setTimeout(() => {
      activityLogger.logNetworkRequest(req.url || req.baseURL + req.url, req.method?.toUpperCase() || 'GET', {
        service: 'cBridge',
        hasParams: !!req.params,
        hasData: !!req.data,
      });
    }, 0);
  }
  
  return req;
});

// Add response interceptor to validate JSON responses
cBridgeAxios.interceptors.response.use(
  (response) => {
    const duration = Date.now() - (response.config.metadata?.startTime || Date.now());
    
    // Log network response (async, non-blocking)
    if (import.meta.env.DEV) {
      setTimeout(() => {
        activityLogger.logNetworkResponse(
          response.config.url || response.config.baseURL + response.config.url,
          response.config.method?.toUpperCase() || 'GET',
          response.status,
          duration,
          { service: 'cBridge', dataSize: JSON.stringify(response.data).length }
        );
      }, 0);
    }
    
    // Validate response data is JSON
    if (response.data && typeof response.data === 'string' && response.data.trim().startsWith('<')) {
      console.error('cBridge API returned HTML instead of JSON:', response.data.substring(0, 100));
      throw new Error('cBridge API returned HTML instead of JSON');
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
      console.error('cBridge API returned HTML error page:', error.response.data.substring(0, 200));
      return Promise.reject(new Error('cBridge API is unreachable or returned an error page'));
    }
    return Promise.reject(error);
  }
);

export async function getTransferConfigsForAll({ baseUrl }) {
  try {
    const response = await cBridgeAxios.get(`${baseUrl}/v2/getTransferConfigsForAll`);

    if (response.status === 200 && !response.data.err) {
      return response.data;
    } else {
      throw new Error(`API Error: ${response.data.err || "Unknown error"}`);
    }
  } catch (e) {
    console.error("Error fetching transfer configs:", e.message);
    return [];
  }
}

export async function getTransferStatus({ baseUrl, transferId }) {
  try {
    const url = `${baseUrl}/v2/getTransferStatus`;

    const response = await cBridgeAxios.post(
      url,
      { transfer_id: transferId },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error in getTransferStatus:", error);
    throw error;
  }
}
