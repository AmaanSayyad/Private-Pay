/**
 * Check if Aleo programs are deployed on testnet
 */

const ENDPOINT = 'https://api.explorer.provable.com/v1';

const PROGRAMS = [
    'testpoolenliven.aleo',
    'shielded_amm.aleo',
    'compliance_module.aleo',
    'treasury_management.aleo',
    'zk_credit.aleo',
    'private_lending.aleo',
    'cross_chain_vault.aleo',
];

async function checkProgram(programName) {
    try {
        const response = await fetch(`${ENDPOINT}/program/${programName}`);
        if (response.ok) {
            const data = await response.text();
            return { name: programName, deployed: true, size: data.length };
        }
        return { name: programName, deployed: false };
    } catch (e) {
        return { name: programName, deployed: false, error: e.message };
    }
}

async function main() {
    console.log('🔍 Checking Aleo programs on testnet...\n');
    
    for (const program of PROGRAMS) {
        const result = await checkProgram(program);
        const icon = result.deployed ? '✅' : '❌';
        console.log(`${icon} ${program}`);
        if (result.deployed) {
            console.log(`   https://explorer.provable.com/program/${program}`);
        }
    }
}

main();
