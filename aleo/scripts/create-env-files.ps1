# Create .env files for all Aleo programs
$PRIVATE_KEY = $env:ALEO_PRIVATE_KEY

$programs = @(
    "dark_pool",
    "shielded_amm", 
    "zk_credit",
    "private_lending",
    "cross_chain_vault",
    "treasury_management",
    "compliance_module"
)

foreach ($program in $programs) {
    $envPath = "aleo\programs\$program\.env"
    $envContent = @"
NETWORK=testnet
PRIVATE_KEY=$PRIVATE_KEY
"@
    
    Set-Content -Path $envPath -Value $envContent -Encoding UTF8
    Write-Host "Created .env for $program" -ForegroundColor Green
}

Write-Host "`nAll .env files created!" -ForegroundColor Cyan
