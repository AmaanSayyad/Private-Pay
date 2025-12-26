import { Account, AleoNetworkClient, ProgramManager, AleoKeyProvider } from '@provablehq/sdk';
import fs from 'fs';
import path from 'path';

async function deployProgram(programPath, programName) {
    try {
        console.log(`\n🚀 Deploying ${programName}...`);
        
        // Read the .env file for private key
        const envPath = path.join(programPath, '.env');
        const envContent = fs.readFileSync(envPath, 'utf8');
        const privateKeyMatch = envContent.match(/PRIVATE_KEY=(.+)/);
        
        if (!privateKeyMatch) {
            throw new Error('Private key not found in .env file');
        }
        
        const privateKey = privateKeyMatch[1].trim();
        console.log('✅ Private key loaded');
        
        // Create account
        const account = new Account({ privateKey });
        console.log(`📍 Account address: ${account.address()}`);
        
        // Create network client
        const networkClient = new AleoNetworkClient("https://api.explorer.aleo.org/v1");
        console.log('🌐 Network client initialized');
        
        // Create key provider
        const keyProvider = new AleoKeyProvider();
        keyProvider.useCache(true);
        console.log('🔑 Key provider initialized');
        
        // Create program manager
        const programManager = new ProgramManager(networkClient, keyProvider);
        programManager.setAccount(account);
        console.log('📋 Program manager initialized');
        
        // Read the compiled program
        const buildPath = path.join(programPath, 'build');
        const programFiles = fs.readdirSync(buildPath).filter(f => f.endsWith('.aleo'));
        
        if (programFiles.length === 0) {
            throw new Error('No compiled .aleo files found in build directory');
        }
        
        const programFile = programFiles[0];
        const programSource = fs.readFileSync(path.join(buildPath, programFile), 'utf8');
        console.log(`📄 Program source loaded: ${programFile}`);
        console.log(`📝 Program content preview:\n${programSource.substring(0, 200)}...`);
        
        // Deploy the program with a fixed fee
        console.log('🚀 Starting deployment...');
        const fee = 3.5; // Fixed fee in credits
        console.log(`💳 Using fee: ${fee} credits`);
        
        const transactionId = await programManager.deploy(programSource, fee);
        console.log(`✅ Deployment successful!`);
        console.log(`📋 Transaction ID: ${transactionId}`);
        console.log(`🔍 Explorer: https://explorer.provable.com/transaction/${transactionId}`);
        
        return transactionId;
        
    } catch (error) {
        console.error(`❌ Deployment failed for ${programName}:`, error.message);
        console.error('Full error:', error);
        throw error;
    }
}

// Deploy all programs
async function deployAllPrograms() {
    const programsDir = './programs';
    const programs = [
        { path: './programs/dark_pool', name: 'testpoolenliven' }
    ];
    
    for (const program of programs) {
        try {
            await deployProgram(program.path, program.name);
            console.log(`\n✅ ${program.name} deployed successfully!\n`);
        } catch (error) {
            console.error(`\n❌ Failed to deploy ${program.name}:`, error.message);
        }
    }
}

// Run deployment
deployAllPrograms().catch(console.error);