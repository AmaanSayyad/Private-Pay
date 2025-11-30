/**
 * PhotonOnboardingButton Component
 * 
 * A button component that triggers Photon user registration.
 * Handles the complete onboarding flow including:
 * - User registration with Photon
 * - Loading states during registration
 * - Error handling and display
 * - Success feedback
 * 
 * Requirements: 1.1, 1.2, 1.5
 */

import { useState } from 'react';
import { Button } from '@nextui-org/react';
import { usePhoton } from '../../providers/PhotonProvider';
import toast from 'react-hot-toast';
import PhotonErrorBoundary from './PhotonErrorBoundary';

function PhotonOnboardingButtonInner({ 
  userData,
  onSuccess,
  onError,
  className = '',
  children = 'Connect with Photon',
  variant = 'solid',
  color = 'primary',
  size = 'lg',
  fullWidth = false,
}) {
  const { registerWithPhoton, isAuthenticated, isEnabled, isDemo } = usePhoton();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Graceful degradation: Don't render if Photon is not configured
  if (!isEnabled) {
    return null;
  }

  const handleRegister = async () => {
    // Clear any previous errors
    setError(null);

    // Demo mode handling
    if (isDemo) {
      toast('🎭 Demo Mode: Add Photon API keys to enable real registration', {
        icon: '💡',
        duration: 4000,
      });
      return;
    }

    // Validate user data
    if (!userData || !userData.userId || !userData.email) {
      const errorMsg = 'User data with userId and email is required';
      setError(errorMsg);
      toast.error(errorMsg);
      if (onError) onError(new Error(errorMsg));
      return;
    }

    setIsLoading(true);

    try {
      // Trigger registration
      const photonUser = await registerWithPhoton(userData);

      // Show success message
      toast.success('Successfully connected to Photon!', {
        icon: '🎉',
        duration: 3000,
      });

      // Call success callback if provided
      if (onSuccess) {
        onSuccess(photonUser);
      }
    } catch (err) {
      console.error('Photon registration error:', err);
      
      // Extract error message
      const errorMessage = err.response?.data?.message 
        || err.message 
        || 'Failed to connect with Photon. Please try again.';
      
      setError(errorMessage);
      toast.error(errorMessage);

      // Call error callback if provided
      if (onError) {
        onError(err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Don't show button if already authenticated
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      <Button
        onClick={handleRegister}
        isLoading={isLoading}
        isDisabled={isLoading}
        className={`${fullWidth ? 'w-full' : ''} ${className} ${isDemo ? 'opacity-75' : ''}`}
        variant={variant}
        color={isDemo ? 'secondary' : color}
        size={size}
      >
        {isDemo ? '🎭 ' : ''}{children}
      </Button>
      {isDemo && (
        <p className="text-xs text-center text-gray-500">
          Demo mode - Add API keys to enable
        </p>
      )}
      
      {error && (
        <div className="text-sm text-red-600 px-2">
          {error}
        </div>
      )}
    </div>
  );
}

// Wrap with error boundary
export default function PhotonOnboardingButton(props) {
  return (
    <PhotonErrorBoundary
      title="Onboarding Error"
      message="Unable to connect with Photon. Please try again later."
      showReset={true}
    >
      <PhotonOnboardingButtonInner {...props} />
    </PhotonErrorBoundary>
  );
}
