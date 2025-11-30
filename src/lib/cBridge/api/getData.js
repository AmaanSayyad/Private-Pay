import axios from "axios";

// Create axios instance with JSON validation
const cBridgeAxios = axios.create({
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  responseType: 'json',
});

// Add response interceptor to validate JSON responses
cBridgeAxios.interceptors.response.use(
  (response) => {
    // Validate response data is JSON
    if (response.data && typeof response.data === 'string' && response.data.trim().startsWith('<')) {
      console.error('cBridge API returned HTML instead of JSON:', response.data.substring(0, 100));
      throw new Error('cBridge API returned HTML instead of JSON');
    }
    return response;
  },
  (error) => {
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
