// Simple deployment script without WebAssembly issues
import fs from 'fs';

async function simpleDeployment() {
    try {
        console.log('🚀 Starting simple deployment...');
        
        // Read the compiled program
        const programPath = './programs/dark_pool/build/main.aleo';
        
        if (!fs.existsSync(programPath)) {
            console.log('❌ Program not found. Building first...');
            return;
        }
        
        const programSource = fs.readFileSync(programPath, 'utf8');
        console.log('📄 Program loaded:');
        console.log(programSource);
        
        console.log('\n✅ Program is ready for deployment!');
        console.log('📋 Program name: testpoolenliven.aleo');
        console.log('🔍 You can deploy this manually using Leo Wallet or other tools');
        
        // Save deployment info
        const deploymentInfo = {
            programName: 'testpoolenliven.aleo',
            programSource: programSource,
            timestamp: new Date().toISOString(),
            status: 'ready_for_deployment'
        };
        
        fs.writeFileSync('./deployment-info.json', JSON.stringify(deploymentInfo, null, 2));
        console.log('💾 Deployment info saved to deployment-info.json');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

simpleDeployment();