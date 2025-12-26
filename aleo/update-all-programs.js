import fs from 'fs';
import path from 'path';

// Program mappings: folder -> new program name (unique names)
const programMappings = {
    'dark_pool': 'darkpoolenliven',
    'shielded_amm': 'shieldammenliven', 
    'zk_credit': 'zkcreditenliven',
    'private_lending': 'lendingenliven',
    'cross_chain_vault': 'vaultenliven',
    'treasury_management': 'treasuryenliven',
    'compliance_module': 'complianceenliven'
};

function updateProgram(folderName, newProgramName) {
    const programPath = `./programs/${folderName}`;
    
    if (!fs.existsSync(programPath)) {
        console.log(`❌ Program folder not found: ${folderName}`);
        return;
    }
    
    console.log(`\n🔄 Updating ${folderName} -> ${newProgramName}`);
    
    // Update program.json
    const programJsonPath = path.join(programPath, 'program.json');
    if (fs.existsSync(programJsonPath)) {
        const programJson = JSON.parse(fs.readFileSync(programJsonPath, 'utf8'));
        programJson.program = `${newProgramName}.aleo`;
        fs.writeFileSync(programJsonPath, JSON.stringify(programJson, null, 4));
        console.log(`✅ Updated program.json`);
    }
    
    // Update main.leo
    const mainLeoPath = path.join(programPath, 'src/main.leo');
    if (fs.existsSync(mainLeoPath)) {
        let content = fs.readFileSync(mainLeoPath, 'utf8');
        
        // Replace program declaration
        content = content.replace(/program\s+\w+\.aleo\s*{/, `program ${newProgramName}.aleo {`);
        
        fs.writeFileSync(mainLeoPath, content);
        console.log(`✅ Updated main.leo`);
    }
    
    // Copy .env if it doesn't exist
    const envPath = path.join(programPath, '.env');
    if (!fs.existsSync(envPath)) {
        const templateEnv = `NETWORK=testnet
PRIVATE_KEY=APrivateKey1zkpGqYAo63eaw9rJCQLLD8MqNHVLiSSWinU6dULEvq4oBRS`;
        fs.writeFileSync(envPath, templateEnv);
        console.log(`✅ Created .env file`);
    }
}

// Update all programs
console.log('🚀 Updating all Aleo programs with unique names...\n');

for (const [folderName, newProgramName] of Object.entries(programMappings)) {
    updateProgram(folderName, newProgramName);
}

console.log('\n✅ All programs updated!');
console.log('\nProgram mappings:');
for (const [folderName, newProgramName] of Object.entries(programMappings)) {
    console.log(`  ${folderName} -> ${newProgramName}.aleo`);
}