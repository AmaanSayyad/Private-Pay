/**
 * Photon Storage Utility
 * Handles persistence of Photon user data and tokens in localStorage
 */

const PHOTON_USER_KEY = 'photon_user';

/**
 * Save Photon user data to localStorage
 * @param {Object} photonUser - The Photon user object to persist
 * @param {string} photonUser.id - User ID
 * @param {string} photonUser.name - User name
 * @param {string} photonUser.avatar - User avatar URL
 * @param {string} photonUser.walletAddress - Embedded wallet address
 * @param {string} photonUser.accessToken - Access token for API calls
 * @param {string} photonUser.refreshToken - Refresh token for token renewal
 * @param {string} photonUser.tokenType - Token type (usually "Bearer")
 * @param {string} photonUser.expiresAt - Token expiration timestamp
 */
export function savePhotonUser(photonUser) {
  if (!photonUser) {
    throw new Error('photonUser is required');
  }

  try {
    const userData = JSON.stringify(photonUser);
    localStorage.setItem(PHOTON_USER_KEY, userData);
  } catch (error) {
    console.error('Failed to save Photon user to localStorage:', error);
    throw error;
  }
}

/**
 * Retrieve Photon user data from localStorage
 * @returns {Object|null} The Photon user object or null if not found
 */
export function getPhotonUser() {
  try {
    const userData = localStorage.getItem(PHOTON_USER_KEY);
    
    if (!userData) {
      return null;
    }

    // Validate that the data is valid JSON before parsing
    if (typeof userData !== 'string' || !userData.trim().startsWith('{')) {
      console.warn('Invalid Photon user data in localStorage, clearing...');
      clearPhotonUser();
      return null;
    }

    return JSON.parse(userData);
  } catch (error) {
    console.error('Failed to retrieve Photon user from localStorage:', error);
    // Clear corrupted data
    try {
      localStorage.removeItem(PHOTON_USER_KEY);
    } catch (clearError) {
      console.error('Failed to clear corrupted Photon user data:', clearError);
    }
    return null;
  }
}

/**
 * Clear Photon user data from localStorage
 */
export function clearPhotonUser() {
  try {
    localStorage.removeItem(PHOTON_USER_KEY);
  } catch (error) {
    console.error('Failed to clear Photon user from localStorage:', error);
    throw error;
  }
}
