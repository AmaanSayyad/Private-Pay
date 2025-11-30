/**
 * PhotonWalletDisplay Component
 * 
 * Displays the user's Photon embedded wallet information including:
 * - Wallet address in a readable format (truncated)
 * - PAT token balance
 * - User profile information (name and avatar)
 * 
 * Features:
 * - Copy wallet address to clipboard
 * - Loading state while data is being fetched
 * - Graceful handling of unauthenticated state
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { usePhoton } from '../../providers/PhotonProvider';
import { Icons } from './Icons';
import { Spinner, Button } from '@nextui-org/react';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import PhotonErrorBoundary from './PhotonErrorBoundary';
import { useAptos } from '../../providers/AptosProvider';

function PhotonWalletDisplayInner() {
  const { photonUser, isAuthenticated, walletAddress, isLoading, isEnabled, isDemo } = usePhoton();
  const { account } = useAptos();
  const [copied, setCopied] = useState(false);
  const [username, setUsername] = useState('');

  useEffect(() => {
    if (account) {
      const savedUsername = localStorage.getItem(`aptos_username_${account}`);
      setUsername(savedUsername || account.slice(2, 8));
    }
  }, [account]);

  // Graceful degradation: Don't render if Photon is not configured
  if (!isEnabled) {
    return null;
  }

  const handleCopyAddress = async () => {
    if (!walletAddress) return;

    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      toast.success('Wallet address copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy address:', error);
      toast.error('Failed to copy address');
    }
  };

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6 bg-white rounded-2xl border border-neutral-200 w-full max-w-lg">
        <Spinner size="md" color="primary" />
      </div>
    );
  }

  // Demo Mode Display
  if (isDemo) {
    return (
      <div className="flex flex-col gap-4 p-6 bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl border-2 border-dashed border-purple-300 w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-100">
            <WalletIcon className="w-5 h-5 text-purple-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-800">Photon Wallet</h3>
            <p className="text-xs text-purple-600 font-medium">🎭 DEMO MODE</p>
          </div>
        </div>

        {/* Demo Info */}
        <div className="flex flex-col gap-3 p-4 bg-white/80 rounded-lg">
          <div className="flex items-start gap-2">
            <span className="text-lg">💡</span>
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-700 mb-1">Demo Mode Active</p>
              <p className="text-xs text-gray-600">
                Add your Photon API keys to .env file to enable real rewards and wallet functionality.
              </p>
            </div>
          </div>
          
          <div className="flex flex-col gap-2 pt-2 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Demo Wallet:</span>
              <span className="text-xs font-mono text-gray-800">0x1234...5678</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Demo PAT Balance:</span>
              <span className="text-xs font-semibold text-purple-600">100 PAT</span>
            </div>
          </div>
        </div>

        {/* Setup Instructions */}
        <div className="flex flex-col gap-1 p-3 bg-purple-100/50 rounded-lg">
          <p className="text-xs font-medium text-purple-900">To enable real Photon:</p>
          <ol className="text-xs text-purple-800 space-y-1 ml-4 list-decimal">
            <li>Get API key from Photon dashboard</li>
            <li>Add to .env: VITE_PHOTON_API_KEY</li>
            <li>Add to .env: VITE_PHOTON_CAMPAIGN_ID</li>
            <li>Restart dev server</li>
          </ol>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !photonUser) {
    // Don't show onboarding if user hasn't connected Aptos wallet
    if (!account) {
      return null;
    }

    const { registerWithPhoton } = usePhoton();
    const [isRegistering, setIsRegistering] = useState(false);

    const handleConnect = async () => {
      setIsRegistering(true);
      try {
        await registerWithPhoton({
          userId: account,
          email: `${username || account.slice(2, 8)}@privatepay.me`,
          name: username || account.slice(2, 8)
        });
        toast.success('Successfully connected to Photon!', {
          icon: '🎉',
          duration: 3000,
        });
      } catch (error) {
        console.error('Photon registration error:', error);
        toast.error(error.message || 'Failed to connect with Photon');
      } finally {
        setIsRegistering(false);
      }
    };

    return (
      <div className="flex flex-col items-center justify-center gap-4 p-6 bg-white rounded-2xl border border-neutral-200 w-full max-w-lg">
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary-50">
            <WalletIcon className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-gray-800">Photon Rewards</h3>
          <p className="text-xs text-center text-gray-500">
            Connect to Photon to earn PAT tokens for your activities
          </p>
        </div>
        <Button
          onClick={handleConnect}
          isLoading={isRegistering}
          isDisabled={isRegistering}
          className="w-full bg-primary text-white rounded-full h-12"
          size="lg"
        >
          Connect Photon Wallet
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6 bg-white rounded-2xl border border-neutral-200 w-full max-w-lg">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary-50">
          <WalletIcon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Photon Wallet</h3>
          <p className="text-xs text-gray-500">Embedded Wallet</p>
        </div>
      </div>

      {/* Wallet Address */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-gray-600">Wallet Address</label>
        <div className="flex items-center gap-2 p-3 bg-neutral-50 rounded-lg">
          <span className="flex-1 text-sm font-mono text-gray-800 truncate">
            {formatAddress(walletAddress)}
          </span>
          <button
            onClick={handleCopyAddress}
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-neutral-200 transition-colors"
            title="Copy address"
          >
            <Icons.copy className={`w-4 h-4 ${copied ? 'text-green-600' : 'text-gray-600'}`} />
          </button>
        </div>
      </div>

      {/* PAT Token Balance */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-gray-600">PAT Token Balance</label>
        <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-primary-50 to-purple-50 rounded-lg">
          <TokenIcon className="w-5 h-5 text-primary flex-shrink-0" />
          <span className="flex-1 text-lg font-semibold text-gray-800">
            {photonUser.patBalance || 0} PAT
          </span>
        </div>
      </div>

      {/* User Info */}
      {photonUser.name && (
        <div className="pt-3 border-t border-neutral-200">
          <div className="flex items-center gap-2">
            {photonUser.avatar ? (
              <img
                src={photonUser.avatar}
                alt={photonUser.name}
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="text-sm font-semibold text-primary">
                  {photonUser.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <span className="text-sm text-gray-700">{photonUser.name}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Wallet Icon Component
const WalletIcon = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M21 18V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V6M21 6H17C16.2044 6 15.4413 6.31607 14.8787 6.87868C14.3161 7.44129 14 8.20435 14 9V15C14 15.7956 14.3161 16.5587 14.8787 17.1213C15.4413 17.6839 16.2044 18 17 18H21V6Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M17 12H17.01"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Token Icon Component
const TokenIcon = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12 2L2 7L12 12L22 7L12 2Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M2 17L12 22L22 17"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M2 12L12 17L22 12"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Wrap with error boundary
export default function PhotonWalletDisplay() {
  return (
    <PhotonErrorBoundary
      title="Wallet Display Error"
      message="Unable to display Photon wallet information."
      showReset={false}
    >
      <PhotonWalletDisplayInner />
    </PhotonErrorBoundary>
  );
}
