/**
 * Example usage of PhotonOnboardingButton component
 * 
 * This file demonstrates how to integrate the PhotonOnboardingButton
 * into your application.
 */

import PhotonOnboardingButton from './PhotonOnboardingButton';
import { useAuth } from '../../providers/AuthProvider';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';

// Example 1: Basic usage with existing user data
export function BasicExample() {
  const { userData } = useAuth();

  return (
    <PhotonOnboardingButton
      userData={{
        userId: userData?.id || userData?.address,
        email: userData?.email || `${userData?.address}@squidl.me`,
        name: userData?.username || userData?.name,
      }}
    />
  );
}

// Example 2: Custom styling and callbacks
export function CustomExample() {
  const { user } = useDynamicContext();

  const handleSuccess = (photonUser) => {
    console.log('Photon registration successful:', photonUser);
    // Navigate to dashboard or show welcome message
  };

  const handleError = (error) => {
    console.error('Photon registration failed:', error);
    // Log to analytics or show custom error UI
  };

  return (
    <PhotonOnboardingButton
      userData={{
        userId: user?.userId,
        email: user?.email,
        name: user?.alias,
      }}
      onSuccess={handleSuccess}
      onError={handleError}
      className="shadow-lg"
      color="secondary"
      size="md"
      fullWidth
    >
      Get Started with Photon Rewards
    </PhotonOnboardingButton>
  );
}

// Example 3: Integration in a dashboard or profile page
export function DashboardIntegration() {
  const { userData } = useAuth();
  const { user } = useDynamicContext();

  return (
    <div className="flex flex-col gap-4 p-6 bg-white rounded-2xl border border-neutral-200">
      <h3 className="text-lg font-semibold">Earn Rewards</h3>
      <p className="text-sm text-gray-600">
        Connect with Photon to earn PAT tokens for your activities
      </p>
      
      <PhotonOnboardingButton
        userData={{
          userId: user?.userId || userData?.address,
          email: user?.email || userData?.email,
          name: user?.alias || userData?.username,
        }}
        fullWidth
      />
    </div>
  );
}

// Example 4: Inline button in a feature
export function InlineExample() {
  const { userData } = useAuth();

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600">
        Want to earn rewards?
      </span>
      <PhotonOnboardingButton
        userData={{
          userId: userData?.address,
          email: `${userData?.address}@squidl.me`,
          name: userData?.username,
        }}
        size="sm"
        variant="bordered"
      >
        Connect Photon
      </PhotonOnboardingButton>
    </div>
  );
}
