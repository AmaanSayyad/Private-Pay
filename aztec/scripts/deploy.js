#!/usr/bin/env node
/**
 * Aztec Contract Deployment Script
 * 
 * Deploys ZcashBridge, DummyZEC, and PZUSD contracts to Aztec network
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkAztecCLI() {
  try {
    execSync('aztec --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

function buildContracts() {
  log('🔨 Building contracts...', 'yellow');
  try {
    execSync('aztec build', { 
      cwd: rootDir,
      stdio: 'inherit'
    });
    log('✅ Build successful', 'green');
    return true;
  } catch (error) {
    log('❌ Build failed', 'red');
    return false;
  }
}

function deployContract(contractName, network, config = {}) {
  log(`🚀 Deploying ${contractName} to ${network}...`, 'yellow');
  
  try {
    let onChainAddress = 'UNKNOWN';

    // If Aztec CLI is available, perform a real deployment
    if (checkAztecCLI()) {
      const cliCmd = `aztec deploy ${contractName} --network ${network}`;
      log(`   ▶ Running: ${cliCmd}`, 'blue');

      // We expect the CLI to print the deployed address to stdout.
      // Capture stdout so we can persist the address alongside metadata.
      const stdout = execSync(cliCmd, {
        cwd: rootDir,
        stdio: ['ignore', 'pipe', 'inherit'],
        encoding: 'utf8',
      });

      // Very simple heuristic to extract an address from stdout, if present.
      // This keeps the script generic across Aztec CLI versions.
      const addressMatch =
        stdout.match(/address[:\s]+(0x[a-fA-F0-9]{40})/) ||
        stdout.match(/(0x[a-fA-F0-9]{40})/);

      if (addressMatch && addressMatch[1]) {
        onChainAddress = addressMatch[1];
        log(`   ✅ Deployed at: ${onChainAddress}`, 'green');
      } else {
        log(
          '   ⚠️  Deployment succeeded but no address could be parsed from CLI output.',
          'yellow',
        );
      }
    } else {
      log(
        '   ⚠️  Aztec CLI not available, skipping on-chain deployment and only writing config.',
        'yellow',
      );
    }

    const deploymentConfig = {
      contract: contractName,
      network,
      address: onChainAddress,
      timestamp: new Date().toISOString(),
      ...config,
    };

    const deploymentsDir = path.join(rootDir, 'deployments');
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    const deploymentFile = path.join(
      deploymentsDir,
      `${contractName}-${network}-${Date.now()}.json`
    );

    fs.writeFileSync(
      deploymentFile,
      JSON.stringify(deploymentConfig, null, 2)
    );

    log(`✅ ${contractName} deployment config created`, 'green');
    log(`   📝 Config saved to: ${deploymentFile}`, 'blue');
    
    return deploymentConfig;
  } catch (error) {
    log(`❌ Failed to deploy ${contractName}: ${error.message}`, 'red');
    return null;
  }
}

async function main() {
  log('╔═══════════════════════════════════════╗', 'green');
  log('║  Aztec Contract Deployment Script    ║', 'green');
  log('╚═══════════════════════════════════════╝', 'green');
  log('');

  // Get network from command line
  const network = process.argv[2] || 'testnet';

  if (network !== 'testnet' && network !== 'mainnet') {
    log('❌ Invalid network. Use "testnet" or "mainnet"', 'red');
    process.exit(1);
  }

  if (network === 'mainnet') {
    log('⚠️  DEPLOYING TO MAINNET!', 'red');
    log('Are you sure? (This is a placeholder - actual deployment requires Aztec SDK)', 'yellow');
  }

  // Check Aztec CLI
  if (!checkAztecCLI()) {
    log('⚠️  Aztec CLI not found', 'yellow');
    log('   Install with: npm install -g @aztec/cli', 'blue');
    log('   Continuing with deployment config generation...', 'yellow');
  } else {
    log('✅ Aztec CLI found', 'green');
  }

  log('');
  log(`📡 Deploying to: ${network}`, 'yellow');
  log('');

  // Build contracts
  if (checkAztecCLI()) {
    if (!buildContracts()) {
      log('⚠️  Build failed, but continuing with config generation...', 'yellow');
    }
  }

  log('');

  // Deploy contracts
  const contracts = [
    { name: 'DummyZEC', config: { minter: 'TBD' } },
    { name: 'ZcashBridge', config: { operator: 'TBD' } },
    { name: 'PZUSD', config: { oracle: 'TBD', zecAssetId: 'TBD' } }
  ];

  const deployments = [];

  for (const contract of contracts) {
    const deployment = deployContract(contract.name, network, contract.config);
    if (deployment) {
      deployments.push(deployment);
    }
    log('');
  }

  // Create deployment summary
  const summary = {
    network,
    timestamp: new Date().toISOString(),
    contracts: deployments.map(d => ({
      name: d.contract,
      config: d
    }))
  };

  const summaryFile = path.join(rootDir, 'deployments', `deployment-${network}-${Date.now()}.json`);
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));

  log('╔═══════════════════════════════════════╗', 'green');
  log('║     ✅ Deployment Complete!           ║', 'green');
  log('╚═══════════════════════════════════════╝', 'green');
  log('');
  log('📝 Deployment Summary:', 'green');
  log(`   Network: ${network}`, 'blue');
  log(`   Contracts: ${deployments.length}`, 'blue');
  log(`   Summary: ${summaryFile}`, 'blue');
  log('');
  log('📋 Next Steps:', 'green');
  log('1. Update contract addresses in your application configuration (frontend/backend).', 'blue');
  log('2. Configure bridge operator, oracle, and governance addresses as needed.', 'blue');
  log('3. Test contract interactions against the Aztec testnet.', 'blue');
  log('');
  log('⚠️  Note: If the Aztec CLI is not installed, this script will only write deployment configs and skip on-chain deployment.', 'yellow');
}

main().catch(error => {
  log(`❌ Deployment failed: ${error.message}`, 'red');
  process.exit(1);
});



