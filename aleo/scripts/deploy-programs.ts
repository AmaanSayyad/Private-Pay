import { Account, AleoNetworkClient, initThreadPool, ProgramManager, AleoKeyProvider } from '@provablehq/sdk';
import * as fs from 'fs';
import * as path from 'path';

// Initialize WebAssembly thread pool
await initThreadPool();

// Configuration
const PRIVATE_KEY = process.env.ALEO_PRIVATE_KEY || 'APrivateKey1zkpCjSLpLtMf7xtQrygrZgCJuaY5iC5D2yNQpmS8PkAyqqr';
const NETWORK_URL = 'https://api.explorer.provable.com/v1';

// Programs to deploy
const PROGRAMS = [
    'dark_pool',
    'shielded_amm',
    'zk_credit',
    'private_lending',
    'cross_chain_vault',
    'treasury_management',
    'compliance_module'
];

async function deployProgram(programName: string) {
    console.log(`\n🚀 Deploying ${programName}...`);

    try {
        // Initialize account
        const account = new Account({ privateKey: PRIVATE_KEY });
        console.log(`📍 Deploying from address: ${account.address()}`);

        // Create network client
        const networkClient = new AleoNetworkClient(NETWORK_URL);

        // Create key provider with caching
        const keyProvider = new AleoKeyProvider();
        keyProvider.useCache(true);

        // Initialize program manager
        const programManager = new ProgramManager(networkClient, keyProvider);
        programManager.setAccount(account);

        // Read program source
        const programPath = path.join('aleo', 'programs', programName, 'build', 'main.aleo');
        const programSource = fs.readFileSync(programPath, 'utf8');

        console.log(`📄 Program loaded: ${programSource.split('\n')[0]}`);

        // Estimate deployment fee
        console.log('💰 Estimating deployment fee...');
        const estimatedFee = await ProgramManager.estimateDeploymentFee(programSource);
        console.log(`   Estimated fee: ${estimatedFee} microcredits (${estimatedFee / 1_000_000} credits)`);

        // Add 10% buffer to fee
        const fee = (estimatedFee / 1_000_000) * 1.1;
        console.log(`   Using fee: ${fee} credits (with 10% buffer)`);

        // Deploy program
        console.log('📤 Building and submitting deployment transaction...');
        const transactionId = await programManager.deploy(programSource, fee, false);

        console.log(`✅ Transaction submitted: ${transactionId}`);
        console.log(`🔍 View on explorer: https://explorer.provable.com/transaction/${transactionId}`);

        // Wait for confirmation
        console.log('⏳ Waiting for confirmation...');
        let attempts = 0;
        const maxAttempts = 30;

        while (attempts < maxAttempts) {
            try {
                const transaction = await programManager.networkClient.getTransaction(transactionId);
                if (transaction) {
                    console.log(`✅ ${programName} deployed successfully!`);
                    console.log(`   Transaction: ${transactionId}`);
                    return {
                        success: true,
                        programName,
                        transactionId,
                        fee
                    };
                }
            } catch (error) {
                // Transaction not yet confirmed
            }

            await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
            attempts++;
            console.log(`   Attempt ${attempts}/${maxAttempts}...`);
        }

        console.log(`⚠️  Timeout waiting for confirmation. Check transaction manually.`);
        return {
            success: false,
            programName,
            transactionId,
            fee,
            error: 'Timeout'
        };

    } catch (error) {
        console.error(`❌ Error deploying ${programName}:`, error);
        return {
            success: false,
            programName,
            error: error.message
        };
    }
}

async function deployAll() {
    console.log('🎯 Aleo Programs Deployment');
    console.log('============================\n');

    const results = [];

    for (const program of PROGRAMS) {
        const result = await deployProgram(program);
        results.push(result);

        // Wait between deployments to avoid rate limiting
        if (program !== PROGRAMS[PROGRAMS.length - 1]) {
            console.log('\n⏸️  Waiting 30 seconds before next deployment...');
            await new Promise(resolve => setTimeout(resolve, 30000));
        }
    }

    // Summary
    console.log('\n\n📊 Deployment Summary');
    console.log('=====================\n');

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`✅ Successful: ${successful.length}/${PROGRAMS.length}`);
    successful.forEach(r => {
        console.log(`   - ${r.programName}: ${r.transactionId}`);
    });

    if (failed.length > 0) {
        console.log(`\n❌ Failed: ${failed.length}/${PROGRAMS.length}`);
        failed.forEach(r => {
            console.log(`   - ${r.programName}: ${r.error}`);
        });
    }

    // Save results
    const resultsPath = path.join('aleo', 'deployment-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log(`\n💾 Results saved to: ${resultsPath}`);

    // Generate constants update
    if (successful.length > 0) {
        console.log('\n📝 Update src/lib/aleo/constants.js with:');
        console.log('\nexport const DEPLOYED_PROGRAMS = {');
        successful.forEach(r => {
            const programId = `${r.programName}.aleo`; // Actual program ID from transaction
            console.log(`    ${r.programName.toUpperCase()}: '${programId}',`);
        });
        console.log('};');
    }
}

// Run deployment
deployAll().catch(console.error);
