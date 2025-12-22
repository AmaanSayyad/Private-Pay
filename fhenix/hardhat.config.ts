import type { HardhatUserConfig } from "hardhat/config";
import { vars } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-verify";
import "cofhe-hardhat-plugin";
import "hardhat-deploy";
import * as dotenv from "dotenv";

// Load .env file from root directory
dotenv.config({ path: "../.env" });

const INFURA_API_KEY: string = process.env.INFURA_API_KEY || vars.get("INFURA_API_KEY", "");
const ARBISCAN_API_KEY: string = process.env.ARBISCAN_API_KEY || vars.get("ARBISCAN_API_KEY", "");
const ARBITRUM_TREASURY_PRIVATE_KEY = process.env.ARBITRUM_TREASURY_PRIVATE_KEY || vars.get("ARBITRUM_TREASURY_PRIVATE_KEY", "");

if (!ARBITRUM_TREASURY_PRIVATE_KEY) {
  throw new Error("ARBITRUM_TREASURY_PRIVATE_KEY environment variable is required. Set it in your .env file or as an environment variable.");
}

const accounts = [ARBITRUM_TREASURY_PRIVATE_KEY];

const config: HardhatUserConfig = {
  defaultNetwork: "arb-sepolia",
  namedAccounts: {
    deployer: 0,
  },
  solidity: {
    version: "0.8.25",
    settings: {
      evmVersion: "cancun",
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    "arb-sepolia": {
      url: INFURA_API_KEY 
        ? `https://arbitrum-sepolia.infura.io/v3/${INFURA_API_KEY}`
        : "https://sepolia-rollup.arbitrum.io/rpc",
      accounts,
      chainId: 421614,
      gasMultiplier: 1.2,
      timeout: 60000,
      httpHeaders: {},
    },
  },
  etherscan: {
    apiKey: ARBISCAN_API_KEY,
    customChains: [
      {
        network: "arb-sepolia",
        chainId: 421614,
        urls: {
          apiURL: "https://api-sepolia.arbiscan.io/api",
          browserURL: "https://sepolia.arbiscan.io/",
        },
      },
    ],
  },
  typechain: {
    outDir: "types",
    target: "ethers-v6",
  },
};

export default config;


