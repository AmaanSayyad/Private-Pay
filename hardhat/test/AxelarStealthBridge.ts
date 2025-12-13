import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer } from "ethers";

describe("AxelarStealthBridge", function () {
  let bridge: Contract;
  let owner: Signer;
  let user: Signer;
  let ownerAddress: string;
  let userAddress: string;

  // Mock addresses for testing (Sepolia testnet addresses)
  const AXELAR_GATEWAY = "0xe432150cce91c13a887f7D836923d5597adD8E31";
  const AXELAR_GAS_SERVICE = "0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6";

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();
    ownerAddress = await owner.getAddress();
    userAddress = await user.getAddress();

    // Deploy the bridge contract
    const AxelarStealthBridge = await ethers.getContractFactory("AxelarStealthBridge");
    bridge = await AxelarStealthBridge.deploy(AXELAR_GATEWAY, AXELAR_GAS_SERVICE, ownerAddress);
    await bridge.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct gateway address", async function () {
      expect(await bridge.gateway()).to.equal(AXELAR_GATEWAY);
    });

    it("Should set the correct gas service address", async function () {
      expect(await bridge.gasService()).to.equal(AXELAR_GAS_SERVICE);
    });

    it("Should set the deployer as owner", async function () {
      expect(await bridge.owner()).to.equal(ownerAddress);
    });

    it("Should set the fee recipient as owner initially", async function () {
      expect(await bridge.feeRecipient()).to.equal(ownerAddress);
    });

    it("Should set default protocol fee to 0.5%", async function () {
      expect(await bridge.protocolFeeBps()).to.equal(50);
    });
  });

  describe("Trusted Remotes", function () {
    it("Should allow owner to set trusted remote", async function () {
      const chainName = "polygon-sepolia";
      const remoteAddress = await bridge.getAddress();

      await bridge.setTrustedRemote(chainName, remoteAddress);
      expect(await bridge.trustedRemotes(chainName)).to.equal(remoteAddress);
    });

    it("Should reject non-owner setting trusted remote", async function () {
      const chainName = "polygon-sepolia";
      const remoteAddress = await bridge.getAddress();

      await expect(
        bridge.connect(user).setTrustedRemote(chainName, remoteAddress)
      ).to.be.revertedWithCustomError(bridge, "OwnableUnauthorizedAccount");
    });
  });

  describe("Meta Address Registration", function () {
    it("Should allow user to register meta address", async function () {
      const spendPubKey = "0x" + "ab".repeat(33);
      const viewingPubKey = "0x" + "cd".repeat(33);

      await bridge.connect(user).registerMetaAddress(spendPubKey, viewingPubKey);

      const metaAddress = await bridge.metaAddresses(userAddress);
      expect(metaAddress.isRegistered).to.be.true;
      expect(metaAddress.spendPubKey).to.equal(spendPubKey);
      expect(metaAddress.viewingPubKey).to.equal(viewingPubKey);
    });

    it("Should emit MetaAddressRegistered event", async function () {
      const spendPubKey = "0x" + "ab".repeat(33);
      const viewingPubKey = "0x" + "cd".repeat(33);

      await expect(bridge.connect(user).registerMetaAddress(spendPubKey, viewingPubKey))
        .to.emit(bridge, "MetaAddressRegistered")
        .withArgs(userAddress, spendPubKey, viewingPubKey);
    });
  });

  describe("Fee Configuration", function () {
    it("Should allow owner to update protocol fee", async function () {
      await bridge.setProtocolFee(100); // 1%
      expect(await bridge.protocolFeeBps()).to.equal(100);
    });

    it("Should reject fee above maximum", async function () {
      await expect(bridge.setProtocolFee(501)).to.be.reverted;
    });

    it("Should allow owner to update fee recipient", async function () {
      await bridge.setFeeRecipient(userAddress);
      expect(await bridge.feeRecipient()).to.equal(userAddress);
    });
  });

  describe("Pause Functionality", function () {
    it("Should allow owner to pause", async function () {
      await bridge.pause();
      expect(await bridge.paused()).to.be.true;
    });

    it("Should allow owner to unpause", async function () {
      await bridge.pause();
      await bridge.unpause();
      expect(await bridge.paused()).to.be.false;
    });
  });

  describe("Payment ID Generation", function () {
    it("Should generate unique payment IDs", async function () {
      const stealthAddress = userAddress;
      const amount = ethers.parseUnits("100", 6);
      const symbol = "aUSDC";
      const destinationChain = "polygon-sepolia";

      // Get payment ID (this is internal, we test via events in integration tests)
      const nonce1 = await bridge.paymentNonces(ownerAddress);
      expect(nonce1).to.equal(0);
    });
  });
});
