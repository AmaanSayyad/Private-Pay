import { ethers } from "ethers";

// Axelar Gateway ABI for tokenAddresses function
const gatewayABI = [
  "function tokenAddresses(string symbol) external view returns (address)"
];

// Testnet configurations from our code
const testnets = [
  {
    name: "Ethereum Sepolia",
    chainId: 11155111,
    rpc: "https://ethereum-sepolia-rpc.publicnode.com",
    gateway: "0xe432150cce91c13a887f7D836923d5597adD8E31"
  },
  {
    name: "Polygon Amoy",
    chainId: 80002,
    rpc: "https://rpc-amoy.polygon.technology",
    gateway: "0xe432150cce91c13a887f7D836923d5597adD8E31"
  },
  {
    name: "Avalanche Fuji",
    chainId: 43113,
    rpc: "https://api.avax-test.network/ext/bc/C/rpc",
    gateway: "0xC249632c2D40b9001FE907806902f63038B737Ab"
  },
  {
    name: "Arbitrum Sepolia",
    chainId: 421614,
    rpc: "https://sepolia-rollup.arbitrum.io/rpc",
    gateway: "0xe432150cce91c13a887f7D836923d5597adD8E31"
  },
  {
    name: "Optimism Sepolia",
    chainId: 11155420,
    rpc: "https://sepolia.optimism.io",
    gateway: "0xe432150cce91c13a887f7D836923d5597adD8E31"
  },
  {
    name: "Base Sepolia",
    chainId: 84532,
    rpc: "https://sepolia.base.org",
    gateway: "0xe432150cce91c13a887f7D836923d5597adD8E31"
  },
  {
    name: "BNB Testnet",
    chainId: 97,
    rpc: "https://data-seed-prebsc-1-s1.binance.org:8545",
    gateway: "0xe432150cce91c13a887f7D836923d5597adD8E31"
  },
  {
    name: "Oasis Sapphire Testnet",
    chainId: 23295,
    rpc: "https://testnet.sapphire.oasis.io",
    gateway: "0x9B36f165baB9ebe611d491180418d8De4b8f3a1f"
  }
];

async function checkAUSDC() {
  console.log("Checking aUSDC availability on testnet chains...\n");
  
  for (const testnet of testnets) {
    try {
      const provider = new ethers.JsonRpcProvider(testnet.rpc);
      const gateway = new ethers.Contract(testnet.gateway, gatewayABI, provider);
      
      const aUSDCAddress = await gateway.tokenAddresses("aUSDC");
      
      console.log(`${testnet.name}:`);
      console.log(`  Gateway: ${testnet.gateway}`);
      console.log(`  aUSDC: ${aUSDCAddress}`);
      console.log(`  Status: ${aUSDCAddress === ethers.ZeroAddress ? "❌ NOT AVAILABLE" : "✅ AVAILABLE"}\n`);
    } catch (error) {
      console.log(`${testnet.name}: ❌ ERROR - ${error.message}\n`);
    }
  }
}

checkAUSDC().catch(console.error);
