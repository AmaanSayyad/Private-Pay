/**
 * Aleo Program Deployment - REST API approach
 * Uses Leo CLI for transaction building, REST API for submission
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG = {
    endpoint: 'https://api.explorer.provable.com/v1',
    privateKey: 'APrivateKey1zkpGqYAo63eaw9rJCQLLD8MqNHVLiSSWinU6dULEvq4oBRS',
};

const PROGRAMS = [
    'dark_pool',
    'shielded_amm', 
    'compliance_module',
    'treasury_management',
    'zk_credit',
    'private_lending',
    'cross_chain_vault',
];

async function checkProgramExists(programName) {
    try {
        const response = await fetch(`${CONFIG.endpoint}/program/${programName}`);
        return response.ok;
    } catch (e) {
        return false;
    }
}

async function deployProgram(programDir) {
    const programPath = path.join(__dirname, 'programs', programDir);
    const buildPath = path.join(programPath, 'build', 'main.aleo');
    
    if (!fs.existsSync(buildPath)) {
        console.log(`❌ Build not found for ${programDir}. Building...`);
        try {
            execSync('leo build', { cwd: programPath, stdio: 'inherit' });
        } catch (e) {
            console.error(`Failed to build ${programDir}`);
            return null;
        }
    }
    
    const programSource = fs.readFileSync(buildPath, 'utf8');
    const programNameMatch = programSource.match(/program\s+(\w+\.aleo)/);
    const programName = programNameMatch ? programNameMatch[1] : null;
    
    if (!programName) {
        console.error(`Could not extract program name from ${programDir}`);
        return null;
    }
    
    console.log(`\n${'='.repeat(50)}`);
    console.log(`📦 Program: ${programName}`);
    console.log(`${'='.repeat(50)}`);
    
    // Check if exists
    const exists = await checkProgramExists(programName);
    if (exists) {
        console.log(`⚠️  Already deployed: https://explorer.provable.com/program/${programName}`);
        return { programName, status: 'exists' };
    }
    
    console.log(`🚀 Deploying ${programName}...`);
    console.log(`   Using Leo CLI with --broadcast flag`);
    
    try {
        // Use Leo deploy with --yes to auto-confirm
        const cmd = `leo deploy --network testnet --private-key ${CONFIG.privateKey} --endpoint ${CONFIG.endpoint} --broadcast --yes`;
        
        console.log(`   Running: leo deploy...`);
        const output = execSync(cmd, { 
            cwd: programPath, 
            encoding: 'utf8',
            timeout: 600000, // 10 minutes
            stdio: ['pipe', 'pipe', 'pipe']
        });
        
        console.log(output);
        
        // Extract transaction ID from output
        const txMatch = output.match(/Transaction ID:\s*(\w+)/i) || output.match(/at1\w+/);
        const txId = txMatch ? txMatch[1] || txMatch[0] : null;
        
        if (txId) {
            console.log(`✅ Deployed! TX: ${txId}`);
            return { programName, status: 'deployed', txId };
        }
        
        return { programName, status: 'deployed' };
        
    } catch (error) {
        console.error(`❌ Deploy failed: ${error.message}`);
        if (error.stderr) console.error(error.stderr);
        return { programName, status: 'failed', error: error.message };
    }
}

async function main() {
    console.log(`
╔════════════════════════════════════════════════╗
║     ALEO DEPLOYMENT - Leo CLI + REST API       ║
╚════════════════════════════════════════════════╝
`);
    
    const target = process.argv[2];
    const programsToDeploy = target 
        ? PROGRAMS.filter(p => p === target)
        : PROGRAMS;
    
    if (target && programsToDeploy.length === 0) {
        console.error(`Program "${target}" not found.`);
        console.log('Available:', PROGRAMS.join(', '));
        process.exit(1);
    }
    
    console.log(`Programs: ${programsToDeploy.join(', ')}\n`);
    
    const results = [];
    for (const program of programsToDeploy) {
        const result = await deployProgram(program);
        if (result) results.push(result);
    }
    
    // Summary
    console.log(`\n${'='.repeat(50)}`);
    console.log('SUMMARY');
    console.log(`${'='.repeat(50)}`);
    
    results.forEach(r => {
        const icon = r.status === 'deployed' ? '✅' : r.status === 'exists' ? '⏭️' : '❌';
        console.log(`${icon} ${r.programName}: ${r.status}`);
    });
    
    fs.writeFileSync(
        path.join(__dirname, 'deploy-results.json'),
        JSON.stringify({ timestamp: new Date().toISOString(), results }, null, 2)
    );
}

main().catch(console.error);
