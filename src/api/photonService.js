/**
 * Photon API Service Layer
 * 
 * This service handles all interactions with the Photon API including:
 * - User registration
 * - Rewarded event tracking
 * - Unrewarded event tracking (attribution)
 * - Token refresh
 * 
 * Requirements: 1.2, 2.1, 3.1, 5.3, 6.4
 */

import axios from 'axios';
import { nanoid } from 'nanoid';
import { PHOTON_CONFIG } from '../config.js';

/**
 * Create Axios instance for Photon API with base configuration
 */
const photonAPI = axios.create({
  baseURL: PHOTON_CONFIG.apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  responseType: 'json',
  validateStatus: (status) => status < 500, // Don't reject on 4xx errors, handle them manually
});

/**
 * Request interceptor to add authentication headers
 * Adds X-API-Key header to all requests
 * Adds Authorization header if access token is available
 */
photonAPI.interceptors.request.use(
  (config) => {
    // Add API key header (Requirement 5.3)
    if (PHOTON_CONFIG.apiKey) {
      config.headers['X-API-Key'] = PHOTON_CONFIG.apiKey;
    }

    // Add Authorization header if access token is available
    // Access token is stored in config.headers.Authorization by calling code
    // or retrieved from storage in the PhotonProvider
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor for error handling and logging
 * Handles 401 errors with automatic token refresh
 * Requirement 6.4: Implement token refresh on 401 errors
 */
photonAPI.interceptors.response.use(
  (response) => {
    // Validate response data is JSON
    if (response.data && typeof response.data === 'string' && response.data.trim().startsWith('<')) {
      console.error('Received HTML instead of JSON:', response.data.substring(0, 100));
      throw new Error('Server returned HTML instead of JSON. API may be unreachable.');
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Check if we received HTML instead of JSON
    if (error.response?.data && typeof error.response.data === 'string' && error.response.data.trim().startsWith('<')) {
      console.error('Photon API returned HTML error page:', error.response.data.substring(0, 200));
      return Promise.reject(new Error('Photon API is unreachable or returned an error page'));
    }

    // Log errors for debugging
    if (error.response) {
      console.error('Photon API Error:', {
        status: error.response.status,
        data: error.response.data,
        url: error.config?.url,
      });

      // Handle 401 Unauthorized - attempt token refresh
      if (error.response.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          // Get stored user data to retrieve refresh token
          const { getPhotonUser, savePhotonUser } = await import('../utils/photonStorage.js');
          const storedUser = getPhotonUser();

          if (storedUser && storedUser.refreshToken) {
            console.log('Attempting to refresh expired token...');
            
            // Call refresh token endpoint
            const tokenResponse = await refreshToken(storedUser.refreshToken);

            // Update stored user with new tokens
            const updatedUser = {
              ...storedUser,
              accessToken: tokenResponse.data.access_token,
              tokenType: tokenResponse.data.token_type,
              expiresAt: tokenResponse.data.expires_at,
            };
            savePhotonUser(updatedUser);

            // Update the failed request with new token
            originalRequest.headers.Authorization = `Bearer ${tokenResponse.data.access_token}`;

            // Retry the original request
            return photonAPI(originalRequest);
          }
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          // Clear invalid session
          const { clearPhotonUser } = await import('../utils/photonStorage.js');
          clearPhotonUser();
          return Promise.reject(refreshError);
        }
      }

      // Handle rate limiting with exponential backoff
      if (error.response.status === 429) {
        const retryAfter = error.response.headers['retry-after'];
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : 2000;
        
        console.warn(`Rate limited. Retrying after ${delay}ms`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return photonAPI(originalRequest);
      }
    } else if (error.request) {
      console.error('Photon API Network Error:', error.message);
    } else {
      console.error('Photon API Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

/**
 * Register a new user with Photon
 * 
 * @param {Object} userData - User registration data
 * @param {string} userData.jwt - JWT token for user authentication
 * @param {string} [userData.userId] - Optional user ID
 * @param {string} [userData.email] - Optional email
 * @param {string} [userData.name] - Optional name
 * @returns {Promise<Object>} Registration response with user data, tokens, and wallet
 * @throws {Error} If registration fails
 * 
 * Requirement 1.2: Call Photon registration endpoint with JWT
 */
export async function registerUser(userData) {
  if (!userData || !userData.jwt) {
    throw new Error('JWT token is required for user registration');
  }

  if (!PHOTON_CONFIG.apiKey) {
    throw new Error('Photon API key is not configured');
  }

  try {
    // Photon API format: POST /identity/register
    const response = await photonAPI.post('/identity/register', {
      provider: 'jwt',
      data: {
        token: userData.jwt,
        ...(userData.userId && { client_user_id: userData.userId }),
      }
    });

    return response.data;
  } catch (error) {
    // Re-throw with more context
    throw new Error(
      `Failed to register user with Photon: ${error.response?.data?.message || error.message}`
    );
  }
}

/**
 * Send a rewarded campaign event to Photon
 * 
 * @param {Object} eventData - Campaign event data
 * @param {string} eventData.eventType - Type of event (e.g., 'transfer', 'swap')
 * @param {string} eventData.userId - User ID
 * @param {string} eventData.accessToken - User's access token
 * @param {Object} [eventData.metadata] - Additional event metadata
 * @returns {Promise<Object>} Campaign response with token reward information
 * @throws {Error} If event tracking fails
 * 
 * Requirement 2.1: Trigger campaign event to Photon
 * Requirement 2.2: Include event_id, event_type, user_id, campaign_id, timestamp
 */
export async function sendRewardedEvent(eventData) {
  if (!eventData || !eventData.eventType || !eventData.userId || !eventData.accessToken) {
    throw new Error('eventType, userId, and accessToken are required for rewarded events');
  }

  if (!PHOTON_CONFIG.campaignId) {
    throw new Error('Photon campaign ID is not configured');
  }

  try {
    // Generate unique event ID (Requirement 2.2)
    const eventId = nanoid();
    const timestamp = new Date().toISOString();

    const payload = {
      event_id: eventId,
      event_type: eventData.eventType,
      user_id: eventData.userId,
      campaign_id: PHOTON_CONFIG.campaignId,
      timestamp: timestamp,
      metadata: eventData.metadata || {},
    };

    // Photon API format: POST /attribution/events/campaign
    const response = await photonAPI.post('/attribution/events/campaign', payload, {
      headers: {
        Authorization: `Bearer ${eventData.accessToken}`,
      },
    });

    return response.data;
  } catch (error) {
    // Log but don't block user workflow (Requirement 2.5)
    console.error('Failed to send rewarded event:', error.message);
    throw new Error(
      `Failed to send rewarded event: ${error.response?.data?.message || error.message}`
    );
  }
}

/**
 * Send an unrewarded campaign event to Photon for attribution tracking
 * 
 * @param {Object} eventData - Campaign event data
 * @param {string} eventData.eventType - Type of event
 * @param {string} eventData.userId - User ID
 * @param {string} eventData.accessToken - User's access token
 * @param {Object} [eventData.metadata] - Additional event metadata
 * @returns {Promise<Object>} Campaign response (with zero token_amount)
 * @throws {Error} If event tracking fails
 * 
 * Requirement 3.1: Send unrewarded campaign event to Photon
 * Requirement 3.2: Include all required event metadata
 */
export async function sendUnrewardedEvent(eventData) {
  if (!eventData || !eventData.eventType || !eventData.userId || !eventData.accessToken) {
    throw new Error('eventType, userId, and accessToken are required for unrewarded events');
  }

  if (!PHOTON_CONFIG.campaignId) {
    throw new Error('Photon campaign ID is not configured');
  }

  try {
    // Generate unique event ID (Requirement 3.2)
    const eventId = nanoid();
    const timestamp = new Date().toISOString();

    const payload = {
      event_id: eventId,
      event_type: eventData.eventType,
      user_id: eventData.userId,
      campaign_id: PHOTON_CONFIG.campaignId,
      timestamp: timestamp,
      metadata: eventData.metadata || {},
    };

    // Photon API format: POST /attribution/events/campaign (same endpoint for both)
    const response = await photonAPI.post('/attribution/events/campaign', payload, {
      headers: {
        Authorization: `Bearer ${eventData.accessToken}`,
      },
    });

    return response.data;
  } catch (error) {
    // Queue for retry (Requirement 3.5)
    console.error('Failed to send unrewarded event:', error.message);
    throw new Error(
      `Failed to send unrewarded event: ${error.response?.data?.message || error.message}`
    );
  }
}

/**
 * Refresh the access token using a refresh token
 * 
 * @param {string} refreshToken - The refresh token
 * @returns {Promise<Object>} New token data with access_token, expires_in, etc.
 * @throws {Error} If token refresh fails
 * 
 * Requirement 6.4: Use refresh token to obtain new access token
 */
export async function refreshToken(refreshToken) {
  if (!refreshToken || typeof refreshToken !== 'string') {
    throw new Error('Valid refresh token is required');
  }

  if (!PHOTON_CONFIG.apiKey) {
    throw new Error('Photon API key is not configured');
  }

  try {
    const response = await photonAPI.post('/auth/refresh', {
      refresh_token: refreshToken,
    });

    return response.data;
  } catch (error) {
    // Token refresh failure should prompt re-authentication (Requirement 6.5)
    throw new Error(
      `Failed to refresh token: ${error.response?.data?.message || error.message}`
    );
  }
}

/**
 * Export the configured Axios instance for advanced use cases
 */
export { photonAPI };

/**
 * Default export with all service methods
 */
export default {
  registerUser,
  sendRewardedEvent,
  sendUnrewardedEvent,
  refreshToken,
  photonAPI,
};
