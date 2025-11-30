import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { registerUser, sendRewardedEvent, sendUnrewardedEvent, refreshToken } from '../api/photonService';
import { savePhotonUser, getPhotonUser, clearPhotonUser } from '../utils/photonStorage';
import { generateUserJWT } from '../utils/jwtGenerator';
import { PHOTON_CONFIG } from '../config';
import toast from 'react-hot-toast';
import { 
  queueEvent, 
  processEventQueue, 
  clearEventQueue,
  getQueueStats 
} from '../utils/photonEventQueue';

const PhotonContext = createContext({
  photonUser: null,
  isAuthenticated: false,
  walletAddress: null,
  isLoading: true,
  isEnabled: false,
  isDemo: false,
  registerWithPhoton: async () => {},
  trackRewardedEvent: async () => {},
  trackUnrewardedEvent: async () => {},
  logout: () => {},
  retryFailedEvents: async () => {},
  getQueueStats: () => {},
});

export default function PhotonProvider({ children }) {
  const [photonUser, setPhotonUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const retryIntervalRef = useRef(null);

  // Session restoration with improved error handling
  useEffect(() => {
    const restoreSession = async () => {
      // Check if Photon is in demo mode
      if (PHOTON_CONFIG.isDemo) {
        console.info('🎭 Photon is running in DEMO mode. Add valid API keys to enable real functionality.');
        setIsLoading(false);
        return;
      }

      try {
        const storedUser = getPhotonUser();
        
        if (storedUser) {
          const expiresAt = new Date(storedUser.expiresAt);
          const now = new Date();
          
          if (expiresAt > now) {
            setPhotonUser(storedUser);
          } else {
            // Token expired, attempt refresh
            try {
              console.log('Token expired, attempting refresh...');
              const tokenResponse = await refreshToken(storedUser.refreshToken);
              
              const updatedUser = {
                ...storedUser,
                accessToken: tokenResponse.data.access_token,
                tokenType: tokenResponse.data.token_type,
                expiresAt: tokenResponse.data.expires_at,
              };
              
              savePhotonUser(updatedUser);
              setPhotonUser(updatedUser);
              console.log('Token refreshed successfully');
            } catch (refreshError) {
              console.error('Failed to refresh Photon token:', refreshError);
              // Clear invalid session
              clearPhotonUser();
              setPhotonUser(null);
              toast.error('Your Photon session expired. Please reconnect.');
            }
          }
        }
      } catch (error) {
        console.error('Error restoring Photon session:', error);
        // Don't crash the app, just log the error
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  // Automatic event queue processing
  useEffect(() => {
    if (!photonUser || !PHOTON_CONFIG.enabled) {
      return;
    }

    // Process queue immediately on mount
    retryFailedEventsInternal();

    // Set up periodic retry (every 30 seconds)
    retryIntervalRef.current = setInterval(() => {
      retryFailedEventsInternal();
    }, 30000);

    return () => {
      if (retryIntervalRef.current) {
        clearInterval(retryIntervalRef.current);
      }
    };
  }, [photonUser]);

  // Internal retry function
  const retryFailedEventsInternal = async () => {
    if (!photonUser) return;

    try {
      const stats = getQueueStats();
      if (stats.readyForRetry > 0) {
        console.log(`Retrying ${stats.readyForRetry} failed events...`);
        
        const result = await processEventQueue(
          (eventData) => sendRewardedEvent(eventData),
          (eventData) => sendUnrewardedEvent(eventData)
        );

        if (result.success > 0) {
          console.log(`Successfully retried ${result.success} events`);
        }
      }
    } catch (error) {
      console.error('Error processing event queue:', error);
    }
  };

  const registerWithPhoton = useCallback(async (userData) => {
    if (!PHOTON_CONFIG.enabled) {
      throw new Error('Photon is not configured');
    }

    if (!userData || !userData.userId || !userData.email) {
      throw new Error('userId and email are required for registration');
    }

    try {
      const jwt = generateUserJWT(userData.userId, userData.email, userData.name);

      const response = await registerUser({
        jwt,
        userId: userData.userId,
        email: userData.email,
        name: userData.name,
      });

      const photonUserData = {
        id: response.data.user.user.id,
        name: response.data.user.user.name,
        avatar: response.data.user.user.avatar,
        walletAddress: response.data.wallet.walletAddress,
        accessToken: response.data.tokens.access_token,
        refreshToken: response.data.tokens.refresh_token,
        tokenType: response.data.tokens.token_type,
        expiresAt: response.data.tokens.expires_at,
      };

      savePhotonUser(photonUserData);
      setPhotonUser(photonUserData);

      return photonUserData;
    } catch (error) {
      console.error('Photon registration failed:', error);
      throw error;
    }
  }, []);

  const trackRewardedEvent = useCallback(async (eventType, metadata = {}) => {
    if (!photonUser) {
      console.warn('Cannot track rewarded event: User not authenticated with Photon');
      return;
    }

    if (!PHOTON_CONFIG.enabled) {
      console.warn('Cannot track rewarded event: Photon is not configured');
      return;
    }

    const eventData = {
      eventType,
      userId: photonUser.id,
      accessToken: photonUser.accessToken,
      metadata,
    };

    try {
      const response = await sendRewardedEvent(eventData);

      if (response.data.success && response.data.token_amount > 0) {
        toast.success(
          `You earned ${response.data.token_amount} ${response.data.token_symbol}!`,
          {
            duration: 4000,
            icon: '🎉',
          }
        );
      }

      return response;
    } catch (error) {
      console.error('Failed to track rewarded event:', error);
      
      // Queue for retry if it's a network error or server error
      if (!error.response || error.response.status >= 500 || error.code === 'ECONNABORTED') {
        console.log('Queueing rewarded event for retry...');
        queueEvent('rewarded', eventData);
        toast.error('Event tracking failed. Will retry automatically.', {
          duration: 2000,
        });
      }
      
      // Don't throw - requirement 2.5: don't block user workflow
    }
  }, [photonUser]);

  const trackUnrewardedEvent = useCallback(async (eventType, metadata = {}) => {
    if (!photonUser) {
      console.warn('Cannot track unrewarded event: User not authenticated with Photon');
      return;
    }

    if (!PHOTON_CONFIG.enabled) {
      console.warn('Cannot track unrewarded event: Photon is not configured');
      return;
    }

    const eventData = {
      eventType,
      userId: photonUser.id,
      accessToken: photonUser.accessToken,
      metadata,
    };

    try {
      const response = await sendUnrewardedEvent(eventData);
      return response;
    } catch (error) {
      console.error('Failed to track unrewarded event:', error);
      
      // Queue for retry if it's a network error or server error
      if (!error.response || error.response.status >= 500 || error.code === 'ECONNABORTED') {
        console.log('Queueing unrewarded event for retry...');
        queueEvent('unrewarded', eventData);
      }
      
      // Don't throw or show user notification - requirement 3.4: don't interrupt user experience
    }
  }, [photonUser]);

  const logout = useCallback(() => {
    clearPhotonUser();
    clearEventQueue();
    setPhotonUser(null);
    
    if (retryIntervalRef.current) {
      clearInterval(retryIntervalRef.current);
    }
  }, []);

  // Manual retry function exposed to components
  const retryFailedEvents = useCallback(async () => {
    return retryFailedEventsInternal();
  }, [photonUser]);

  const value = {
    photonUser,
    isAuthenticated: !!photonUser,
    walletAddress: photonUser?.walletAddress || null,
    isLoading,
    isEnabled: PHOTON_CONFIG.enabled,
    isDemo: PHOTON_CONFIG.isDemo,
    registerWithPhoton,
    trackRewardedEvent,
    trackUnrewardedEvent,
    logout,
    retryFailedEvents,
    getQueueStats,
  };

  return (
    <PhotonContext.Provider value={value}>
      {children}
    </PhotonContext.Provider>
  );
}

export const usePhoton = () => {
  const context = useContext(PhotonContext);
  
  if (!context) {
    throw new Error('usePhoton must be used within a PhotonProvider');
  }
  
  return context;
};
