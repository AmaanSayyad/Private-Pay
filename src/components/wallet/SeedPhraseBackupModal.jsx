/**
 * Universal Seed Phrase Backup Modal
 * Inspired by Unstoppable Wallet's implementation
 * Forces backup verification before wallet can be used
 */

import { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Chip, Card, CardBody } from '@nextui-org/react';
import { AlertTriangle, Eye, EyeOff, Check, X, Copy, Shield, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SeedPhraseBackupModal({ 
  isOpen, 
  mnemonic, 
  onBackupComplete, 
  onClose,
  walletType = "Wallet",
  canSkip = false // For imports, allow skipping verification
}) {
  const [step, setStep] = useState(1); // 1: Warning, 2: Display, 3: Verify
  const [showPhrase, setShowPhrase] = useState(false);
  const [verificationWords, setVerificationWords] = useState([]);
  const [userSelections, setUserSelections] = useState([]);
  const [shuffledOptions, setShuffledOptions] = useState([]);
  const [hasError, setHasError] = useState(false);

  const words = mnemonic ? mnemonic.split(' ') : [];
  const wordCount = words.length;

  // Initialize verification challenge
  useEffect(() => {
    if (step === 3 && words.length > 0 && mnemonic) {
      initializeVerification();
    }
  }, [step, mnemonic]);

  // Reset state when modal closes or mnemonic changes
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setShowPhrase(false);
      setVerificationWords([]);
      setUserSelections([]);
      setShuffledOptions([]);
      setHasError(false);
    }
  }, [isOpen]);

  const initializeVerification = () => {
    // Safety check
    if (!words || words.length === 0) {
      console.error('Cannot initialize verification: no words available');
      return;
    }

    // Select random words to verify (2 for 12-word, 4 for 24-word)
    const wordsToVerify = wordCount === 24 ? 4 : wordCount === 18 ? 3 : 2;
    const selectedIndices = [];
    
    while (selectedIndices.length < wordsToVerify) {
      const randomIndex = Math.floor(Math.random() * words.length);
      if (!selectedIndices.includes(randomIndex)) {
        selectedIndices.push(randomIndex);
      }
    }
    
    selectedIndices.sort((a, b) => a - b);
    
    const verification = selectedIndices.map(index => ({
      position: index + 1,
      correctWord: words[index],
      userWord: null
    }));
    
    setVerificationWords(verification);
    setUserSelections([]);
    setHasError(false);

    // Create shuffled options for first word
    if (verification.length > 0) {
      createOptionsForWord(0, verification);
    }
  };

  const createOptionsForWord = (verificationIndex, verificationArray = verificationWords) => {
    // Use passed array to avoid race condition with state updates
    if (!verificationArray || !verificationArray[verificationIndex]) {
      console.error('Invalid verification index:', verificationIndex);
      return;
    }

    const correctWord = verificationArray[verificationIndex].correctWord;
    
    // Get 5 random incorrect words
    const incorrectWords = words
      .filter(w => w !== correctWord)
      .sort(() => 0.5 - Math.random())
      .slice(0, 5);
    
    // Combine and shuffle
    const allOptions = [correctWord, ...incorrectWords]
      .sort(() => 0.5 - Math.random());
    
    setShuffledOptions(allOptions);
  };

  const handleWordSelect = (selectedWord) => {
    const currentVerificationIndex = userSelections.length;
    
    // Safety check
    if (!verificationWords || !verificationWords[currentVerificationIndex]) {
      console.error('Invalid verification state');
      return;
    }
    
    const correctWord = verificationWords[currentVerificationIndex].correctWord;
    
    if (selectedWord === correctWord) {
      // Correct!
      const newSelections = [...userSelections, selectedWord];
      setUserSelections(newSelections);
      setHasError(false);
      
      // Check if verification complete
      if (newSelections.length === verificationWords.length) {
        toast.success('Backup verified successfully!');
        setTimeout(() => {
          onBackupComplete();
        }, 1000);
      } else {
        // Load next word options
        createOptionsForWord(currentVerificationIndex + 1);
      }
    } else {
      // Wrong word!
      setHasError(true);
      toast.error('Incorrect word. Please try again.');
      setTimeout(() => {
        // Reset verification
        initializeVerification();
      }, 1500);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(mnemonic);
    toast.success('Recovery phrase copied! Please store it securely offline.');
  };

  const renderWarningStep = () => (
    <>
      <ModalHeader className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-warning-600" />
          <h2 className="text-2xl font-bold">Backup Your Recovery Phrase</h2>
        </div>
      </ModalHeader>
      <ModalBody>
        <div className="flex flex-col gap-4">
          <p className="text-gray-700">
            Your recovery phrase is the <strong>only way</strong> to restore your {walletType}. 
            If you lose it, you lose access to your funds permanently.
          </p>

          <Card className="bg-danger-50 border border-danger-200">
            <CardBody className="gap-3">
              <h3 className="font-bold text-danger-800 flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Critical Security Rules
              </h3>
              <ul className="text-sm text-danger-700 space-y-2">
                <li className="flex items-start gap-2">
                  <X className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span><strong>Never</strong> share your recovery phrase with anyone</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span><strong>Never</strong> store it digitally (screenshots, cloud, email)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-success-600" />
                  <span><strong>Write it down</strong> on paper and store it securely</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-success-600" />
                  <span><strong>Verify</strong> you wrote it correctly</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-success-600" />
                  <span><strong>Store in a safe place</strong> (fireproof safe, safety deposit box)</span>
                </li>
              </ul>
            </CardBody>
          </Card>

          <Card className="bg-warning-50 border border-warning-200">
            <CardBody>
              <p className="text-sm text-warning-800">
                <strong>⚠️ We cannot recover your wallet:</strong> No support team, no recovery option. 
                You are 100% responsible for keeping your recovery phrase safe.
              </p>
            </CardBody>
          </Card>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button
          color="primary"
          size="lg"
          className="font-bold"
          onClick={() => setStep(2)}
          startContent={<Shield className="w-5 h-5" />}
        >
          I Understand - Show Recovery Phrase
        </Button>
      </ModalFooter>
    </>
  );

  const renderDisplayStep = () => (
    <>
      <ModalHeader className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold">Your Recovery Phrase</h2>
        <p className="text-sm text-gray-600 font-normal">
          Write down these {wordCount} words in order. You'll verify them next.
        </p>
      </ModalHeader>
      <ModalBody>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <Chip color="primary" variant="flat">
              {wordCount} Words
            </Chip>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="flat"
                onClick={() => setShowPhrase(!showPhrase)}
                startContent={showPhrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              >
                {showPhrase ? 'Hide' : 'Show'}
              </Button>
              <Button
                size="sm"
                variant="flat"
                onClick={handleCopy}
                startContent={<Copy className="w-4 h-4" />}
                isDisabled={!showPhrase}
              >
                Copy
              </Button>
            </div>
          </div>

          <div className={`relative ${!showPhrase ? 'filter blur-sm' : ''}`}>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-4 bg-gray-50 rounded-xl border-2 border-gray-200">
              {words.map((word, index) => (
                <div key={index} className="flex items-center gap-3 p-2 bg-white rounded-lg">
                  <span className="text-sm font-bold text-gray-500 w-6 text-right">
                    {index + 1}.
                  </span>
                  <span className="text-base font-mono font-semibold text-gray-900">
                    {word}
                  </span>
                </div>
              ))}
            </div>
            
            {!showPhrase && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-xl">
                <Button
                  color="primary"
                  size="lg"
                  onClick={() => setShowPhrase(true)}
                  startContent={<Eye className="w-5 h-5" />}
                >
                  Click to Reveal
                </Button>
              </div>
            )}
          </div>

          <Card className="bg-amber-50 border border-amber-200">
            <CardBody>
              <p className="text-sm text-amber-800">
                <strong>✍️ Write it down now:</strong> Get a pen and paper. Write each word exactly as shown, 
                in the correct order. Double-check your spelling.
              </p>
            </CardBody>
          </Card>
        </div>
      </ModalBody>
      <ModalFooter className="flex justify-between">
        <Button
          variant="light"
          onClick={() => setStep(1)}
        >
          Back
        </Button>
        <Button
          color="success"
          size="lg"
          className="font-bold"
          onClick={() => setStep(3)}
          isDisabled={!showPhrase}
        >
          I've Written It Down - Verify
        </Button>
      </ModalFooter>
    </>
  );

  const renderVerificationStep = () => {
    const currentVerificationIndex = userSelections.length;
    
    // Safety checks
    if (!verificationWords || verificationWords.length === 0) {
      return (
        <ModalBody>
          <p className="text-center text-gray-600">Initializing verification...</p>
        </ModalBody>
      );
    }
    
    const currentWord = verificationWords[currentVerificationIndex];

    if (!currentWord) {
      return (
        <ModalBody>
          <p className="text-center text-gray-600">Loading...</p>
        </ModalBody>
      );
    }

    return (
      <>
        <ModalHeader className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold">Verify Your Backup</h2>
          <p className="text-sm text-gray-600 font-normal">
            Select the correct word for each position to confirm your backup
          </p>
        </ModalHeader>
        <ModalBody>
          <div className="flex flex-col gap-6">
            {/* Progress */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                Progress: {userSelections.length} / {verificationWords.length}
              </span>
              <div className="flex gap-1">
                {verificationWords.map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-8 h-2 rounded-full ${
                      idx < userSelections.length 
                        ? 'bg-success-500' 
                        : idx === userSelections.length 
                        ? 'bg-primary-500' 
                        : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Current Question */}
            <Card className="bg-primary-50 border border-primary-200">
              <CardBody>
                <p className="text-center text-lg font-semibold text-primary-900">
                  What is word #{currentWord.position}?
                </p>
              </CardBody>
            </Card>

            {/* Word Options */}
            <div className="grid grid-cols-2 gap-3">
              {shuffledOptions.map((word, idx) => (
                <Button
                  key={idx}
                  size="lg"
                  variant="flat"
                  color={hasError ? "danger" : "primary"}
                  className={`font-mono text-base h-14 ${
                    hasError ? 'opacity-50' : ''
                  }`}
                  onClick={() => handleWordSelect(word)}
                  isDisabled={hasError}
                >
                  {word}
                </Button>
              ))}
            </div>

            {hasError && (
              <Card className="bg-danger-50 border border-danger-200">
                <CardBody>
                  <p className="text-sm text-danger-800 text-center">
                    <X className="w-4 h-4 inline mr-1" />
                    Incorrect word. Verification restarted. Please try again.
                  </p>
                </CardBody>
              </Card>
            )}

            {/* Previously verified words */}
            {userSelections.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {userSelections.map((word, idx) => (
                  <Chip
                    key={idx}
                    color="success"
                    variant="flat"
                    startContent={<Check className="w-3 h-3" />}
                  >
                    #{verificationWords[idx].position}: {word}
                  </Chip>
                ))}
              </div>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="light"
            onClick={() => {
              setStep(2);
              setUserSelections([]);
              setHasError(false);
            }}
          >
            Back to Recovery Phrase
          </Button>
          {canSkip && (
            <Button
              color="warning"
              variant="flat"
              onClick={onBackupComplete}
            >
              Skip Verification (Not Recommended)
            </Button>
          )}
        </ModalFooter>
      </>
    );
  };

  if (!isOpen || !mnemonic) return null;

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose}
      size="2xl"
      hideCloseButton={false}
      isDismissable={true}
      classNames={{
        backdrop: "bg-black/80",
      }}
    >
      <ModalContent>
        {step === 1 && renderWarningStep()}
        {step === 2 && renderDisplayStep()}
        {step === 3 && renderVerificationStep()}
      </ModalContent>
    </Modal>
  );
}

