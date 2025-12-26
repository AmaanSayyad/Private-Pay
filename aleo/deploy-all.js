/**
 * Aleo Programs Deployment Script
 * Deploys all Leo programs to Aleo Testnet using @provablehq/sdk
 * 
 * Usage: node deploy-all.js [program_name]
 * - Without arguments: deploys all programs
 * - With program name: deploys only that program
 */

import { Account, AleoNetworkClient, ProgramManager, AleoKeyProvider } from '@provablehq/sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
    network: 'https://api.explorer.provable.com/v1',
    privateKey: process.env.ALEO_PRIVATE_KEY || 'APrivateKey1zkpGqYAo63eaw9rJCQLLD8MqNHVLiSSWinU6dULEvq4oBRS',
    baseFee: 5.0, // Base fee in credits
    programsDir: path.join(__dirname, 'programs'),
};

// All programs to deploy
const PROGRAMS = [
    {
        name: 'dark_pool',
        dir: 'dark_pool',
        programId: 'testpoolenliven.aleo',
        description: 'Private order matching and dark pool trading',
        fee: 5.0,
    },
    {
        name: 'shielded_amm',
        dir: 'shielded_amm',
        programId: 'shielded_amm.aleo',
        description: 'Automated market maker with encrypted liquidity positions',
        fee: 8.0, // Larger program needs more fee
    },
    {
        name: 'compliance_module',
        dir: 'compliance_module',
        programId: 'compliance_module.aleo',
        description: 'KYC verification and compliance with privacy protection',
        fee: 8.0,
    },
    {
        name: 'treasury_management',
        dir: 'treasury_management',
        programId: 'treasury_management.aleo',
        description: 'Multi-sig wallet and DAO treasury management',
        fee: 8.0,
    },
    {
        name: 'zk_credit',
        dir: 'zk_credit',
        programId: 'zk_credit.aleo',
        description: 'Privacy-preserving credit scoring system',
        fee: 8.0,
    },
    {
        name: 'private_lending',
        dir: 'private_lending',
        programId: 'private_lending.aleo',
        description: 'Private lending pools with encrypted positions',
        fee: 8.0,
    },
    {
        name: 'cross_chain_vault',
        dir: 'cross_chain_vault',
        programId: 'cross_chain_vault.aleo',
        description: 'Cross-chain vault for private yield farming',
        fee: 6.0,
    },
];

// Build a Leo program
async function buildProgram(programDir) {
    const fullPath = path.join(CONFIG.programsDir, programDir);
    console.log(`\n📦 Building program in ${programDir}...`);
    
    try {
        execSync('leo build', { 
            cwd: fullPath, 
            stdio: 'inherit',
            encoding: 'utf8'
        });
        console.log(`✅ Build successful for ${programDir}`);
        return true;
    } catch (error) {
        console.error(`❌ Build failed for ${programDir}:`, error.message);
        return false;
    }
}

// Read compiled program source
function readProgramSource(programDir) {
    const buildPath = path.join(CONFIG.programsDir, programDir, 'build', 'main.aleo');
    
    if (!fs.existsSync(buildPath)) {
        throw new Error(`Compiled program not found at ${buildPath}`);
    }
    
    return fs.readFileSync(buildPath, 'utf8');
}

// Check if program already exists on network
async function checkProgramExists(networkClient, programId) {
    try {
        const program = await networkClient.getProgram(programId);
        return program !== null;
    } catch (error) {
        return false;
    }
}

// Deploy a single program
async function deployProgram(program, account, networkClient, keyProvider) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🚀 Deploying: ${program.name}`);
    console.log(`   Program ID: ${program.programId}`);
    console.log(`   Description: ${program.description}`);
    console.log(`${'='.repeat(60)}`);
    
    try {
        // Check if program already exists
        const exists = await checkProgramExists(networkClient, program.programId);
        if (exists) {
            console.log(`⚠️  Program ${program.programId} already exists on network. Skipping...`);
            return { success: true, skipped: true, programId: program.programId };
        }
        
        // Build the program
        const buildSuccess = await buildProgram(program.dir);
        if (!buildSuccess) {
            throw new Error('Build failed');
        }
        
        // Read compiled source
        const programSource = readProgramSource(program.dir);
        console.log(`📄 Program source loaded (${programSource.length} bytes)`);
        
        // Create program manager
        const programManager = new ProgramManager(networkClient, keyProvider);
        programManager.setAccount(account);
        
        // Estimate fee
        console.log(`💰 Using fee: ${program.fee} credits`);
        
        // Deploy
        console.log(`📤 Submitting deployment transaction...`);
        const transactionId = await programManager.deploy(programSource, program.fee);
        
        console.log(`\n✅ Deployment submitted successfully!`);
        console.log(`📋 Transaction ID: ${transactionId}`);
        console.log(`🔍 Explorer: https://explorer.provable.com/transaction/${transactionId}`);
        console.log(`🔍 Program: https://explorer.provable.com/program/${program.programId}`);
        
        return { 
            success: true, 
            skipped: false,
            programId: program.programId, 
            transactionId 
        };
        
    } catch (error) {
        console.error(`\n❌ Deployment failed for ${program.name}:`);
        console.error(`   Error: ${error.message}`);
        return { 
            success: false, 
            programId: program.programId, 
            error: error.message 
        };
    }
}

// Main deployment function
async function main() {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║           ALEO PROGRAMS DEPLOYMENT SCRIPT                    ║
║           Network: Aleo Testnet                              ║
╚══════════════════════════════════════════════════════════════╝
`);
    
    // Parse command line arguments
    const targetProgram = process.argv[2];
    
    // Initialize account
    console.log('🔑 Initializing account...');
    const account = new Account({ privateKey: CONFIG.privateKey });
    console.log(`📍 Deployer address: ${account.address()}`);
    
    // Initialize network client
    console.log('🌐 Connecting to Aleo network...');
    const networkClient = new AleoNetworkClient(CONFIG.network);
    
    // Initialize key provider
    const keyProvider = new AleoKeyProvider();
    keyProvider.useCache(true);
    console.log('✅ SDK initialized successfully\n');
    
    // Filter programs if specific one requested
    let programsToDeploy = PROGRAMS;
    if (targetProgram) {
        programsToDeploy = PROGRAMS.filter(p => 
            p.name === targetProgram || p.dir === targetProgram
        );
        if (programsToDeploy.length === 0) {
            console.error(`❌ Program "${targetProgram}" not found.`);
            console.log('Available programs:', PROGRAMS.map(p => p.name).join(', '));
            process.exit(1);
        }
    }
    
    console.log(`📋 Programs to deploy: ${programsToDeploy.map(p => p.name).join(', ')}\n`);
    
    // Deploy each program
    const results = [];
    for (const program of programsToDeploy) {
        const result = await deployProgram(program, account, networkClient, keyProvider);
        results.push(result);
        
        // Wait between deployments to avoid rate limiting
        if (programsToDeploy.indexOf(program) < programsToDeploy.length - 1) {
            console.log('\n⏳ Waiting 5 seconds before next deployment...');
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
    
    // Print summary
    console.log(`\n${'='.repeat(60)}`);
    console.log('📊 DEPLOYMENT SUMMARY');
    console.log(`${'='.repeat(60)}`);
    
    const successful = results.filter(r => r.success && !r.skipped);
    const skipped = results.filter(r => r.success && r.skipped);
    const failed = results.filter(r => !r.success);
    
    console.log(`\n✅ Successfully deployed: ${successful.length}`);
    successful.forEach(r => {
        console.log(`   - ${r.programId}`);
        console.log(`     TX: ${r.transactionId}`);
    });
    
    if (skipped.length > 0) {
        console.log(`\n⏭️  Skipped (already exists): ${skipped.length}`);
        skipped.forEach(r => console.log(`   - ${r.programId}`));
    }
    
    if (failed.length > 0) {
        console.log(`\n❌ Failed: ${failed.length}`);
        failed.forEach(r => {
            console.log(`   - ${r.programId}`);
            console.log(`     Error: ${r.error}`);
        });
    }
    
    // Save deployment results
    const deploymentLog = {
        timestamp: new Date().toISOString(),
        network: CONFIG.network,
        deployer: account.address().toString(),
        results: results,
    };
    
    fs.writeFileSync(
        path.join(__dirname, 'deployment-results.json'),
        JSON.stringify(deploymentLog, null, 2)
    );
    console.log('\n💾 Deployment results saved to deployment-results.json');
    
    return failed.length === 0;
}

// Run
main()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
