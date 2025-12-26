/**
 * Aleo Program Deployment using Provable SDK
 * Based on official documentation: https://developer.aleo.org/sdk/guides/deploy_programs
 */

import { Account, AleoNetworkClient, ProgramManager, AleoKeyProvider, initThreadPool } from '@provablehq/sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
    network: 'https://api.explorer.provable.com/v1',
    privateKey: 'APrivateKey1zkpGqYAo63eaw9rJCQLLD8MqNHVLiSSWinU6dULEvq4oBRS',
};

// Programs to deploy
const PROGRAMS = [
    { dir: 'dark_pool', fee: 5.0 },
    { dir: 'shielded_amm', fee: 10.0 },
    { dir: 'compliance_module', fee: 10.0 },
    { dir: 'treasury_management', fee: 10.0 },
    { dir: 'zk_credit', fee: 10.0 },
    { dir: 'private_lending', fee: 10.0 },
    { dir: 'cross_chain_vault', fee: 8.0 },
];

async function deployProgram(programManager, networkClient, programDir, fee) {
    const programPath = path.join(__dirname, 'programs', programDir, 'build', 'main.aleo');
    
    if (!fs.existsSync(programPath)) {
        console.log(`❌ Build not found for ${programDir}. Run 'leo build' first.`);
        return null;
    }
    
    const programSource = fs.readFileSync(programPath, 'utf8');
    const programNameMatch = programSource.match(/program\s+(\w+\.aleo)/);
    const programName = programNameMatch ? programNameMatch[1] : 'unknown';
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📦 Deploying: ${programName}`);
    console.log(`   Source: ${programDir}/build/main.aleo`);
    console.log(`   Size: ${programSource.length} bytes`);
    console.log(`${'='.repeat(60)}`);
    
    // Check if program already exists
    try {
        const existingProgram = await networkClient.getProgram(programName);
        if (existingProgram) {
            console.log(`⚠️  Program ${programName} already exists on network!`);
            console.log(`   View at: https://explorer.provable.com/program/${programName}`);
            return { programName, status: 'exists' };
        }
    } catch (e) {
        console.log(`   Program does not exist, proceeding...`);
    }
    
    // Estimate fee
    try {
        const estimatedFee = await ProgramManager.estimateDeploymentFee(programSource);
        console.log(`💵 Estimated fee: ${estimatedFee} credits`);
        fee = Math.max(fee, estimatedFee * 1.2); // Add 20% buffer
    } catch (e) {
        console.log(`   Using default fee: ${fee} credits`);
    }
    
    console.log(`🚀 Deploying with fee: ${fee} credits...`);
    console.log(`   This may take several minutes...\n`);
    
    try {
        // Build deployment transaction
        const tx = await programManager.buildDeploymentTransaction(programSource, fee, false);
        console.log(`✅ Transaction built successfully`);
        
        // Submit transaction
        const transactionId = await networkClient.submitTransaction(tx);
        console.log(`✅ Transaction submitted!`);
        console.log(`📋 Transaction ID: ${transactionId}`);
        console.log(`🔍 Explorer: https://explorer.provable.com/transaction/${transactionId}`);
        
        return { programName, transactionId, status: 'deployed' };
    } catch (error) {
        console.error(`❌ Deployment failed: ${error.message}`);
        return { programName, status: 'failed', error: error.message };
    }
}

async function main() {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║         ALEO PROGRAM DEPLOYMENT - Provable SDK               ║
║         Network: Testnet                                     ║
╚══════════════════════════════════════════════════════════════╝
`);
    
    try {
        // Initialize WASM thread pool
        console.log('⏳ Initializing WASM thread pool...');
        await initThreadPool();
        console.log('✅ Thread pool initialized\n');
        
        // Create account
        const account = new Account({ privateKey: CONFIG.privateKey });
        console.log(`📍 Deployer: ${account.address()}`);
        
        // Create network client
        const networkClient = new AleoNetworkClient(CONFIG.network);
        console.log(`🌐 Network: ${CONFIG.network}`);
        
        // Create key provider with caching
        const keyProvider = new AleoKeyProvider();
        keyProvider.useCache(true);
        
        // Create program manager
        const programManager = new ProgramManager(networkClient, keyProvider);
        programManager.setAccount(account);
        
        // Get target program from args or deploy all
        const targetProgram = process.argv[2];
        let programsToDeploy = PROGRAMS;
        
        if (targetProgram) {
            programsToDeploy = PROGRAMS.filter(p => p.dir === targetProgram);
            if (programsToDeploy.length === 0) {
                console.error(`❌ Program "${targetProgram}" not found.`);
                console.log('Available:', PROGRAMS.map(p => p.dir).join(', '));
                process.exit(1);
            }
        }
        
        console.log(`\n📋 Programs to deploy: ${programsToDeploy.map(p => p.dir).join(', ')}`);
        
        // Deploy each program
        const results = [];
        for (const program of programsToDeploy) {
            const result = await deployProgram(programManager, networkClient, program.dir, program.fee);
            if (result) results.push(result);
            
            // Wait between deployments
            if (programsToDeploy.indexOf(program) < programsToDeploy.length - 1) {
                console.log('\n⏳ Waiting 10 seconds before next deployment...');
                await new Promise(r => setTimeout(r, 10000));
            }
        }
        
        // Summary
        console.log(`\n${'='.repeat(60)}`);
        console.log('📊 DEPLOYMENT SUMMARY');
        console.log(`${'='.repeat(60)}`);
        
        const deployed = results.filter(r => r.status === 'deployed');
        const existing = results.filter(r => r.status === 'exists');
        const failed = results.filter(r => r.status === 'failed');
        
        if (deployed.length > 0) {
            console.log(`\n✅ Deployed: ${deployed.length}`);
            deployed.forEach(r => console.log(`   - ${r.programName}: ${r.transactionId}`));
        }
        
        if (existing.length > 0) {
            console.log(`\n⏭️  Already exists: ${existing.length}`);
            existing.forEach(r => console.log(`   - ${r.programName}`));
        }
        
        if (failed.length > 0) {
            console.log(`\n❌ Failed: ${failed.length}`);
            failed.forEach(r => console.log(`   - ${r.programName}: ${r.error}`));
        }
        
        // Save results
        fs.writeFileSync(
            path.join(__dirname, 'deployment-results.json'),
            JSON.stringify({ timestamp: new Date().toISOString(), results }, null, 2)
        );
        
    } catch (error) {
        console.error('\n❌ Fatal error:', error.message);
        console.error(error.stack);
    }
}

main();
