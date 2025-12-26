# Aleo Programs Deployment Script
# Deploy all Leo programs to Aleo Testnet

Write-Host "Aleo Programs Deployment Script" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

# Check if Leo is installed
Write-Host "Checking prerequisites..." -ForegroundColor Yellow
try {
    $leoVersion = leo --version 2>&1
    Write-Host "Leo compiler found: $leoVersion" -ForegroundColor Green
} catch {
    Write-Host "Leo compiler not found!" -ForegroundColor Red
    Write-Host "Please install Leo: curl -L https://raw.githubusercontent.com/AleoHQ/leo/testnet/install.sh | bash" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Programs to deploy
$programs = @(
    "dark_pool",
    "shielded_amm",
    "zk_credit",
    "private_lending",
    "cross_chain_vault",
    "treasury_management",
    "compliance_module"
)

$deployedPrograms = @{}
$failedPrograms = @()

# Deploy each program
foreach ($program in $programs) {
    Write-Host "Deploying $program..." -ForegroundColor Cyan
    
    $programPath = "aleo\programs\$program"
    
    if (!(Test-Path $programPath)) {
        Write-Host "  Program directory not found: $programPath" -ForegroundColor Yellow
        $failedPrograms += $program
        continue
    }
    
    Push-Location $programPath
    
    try {
        # Build the program first
        Write-Host "  Building..." -ForegroundColor Gray
        $buildOutput = leo build 2>&1
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  Build failed for $program" -ForegroundColor Red
            Write-Host "  Error: $buildOutput" -ForegroundColor Red
            $failedPrograms += $program
            Pop-Location
            continue
        }
        
        Write-Host "  Build successful" -ForegroundColor Green
        
        # Deploy to testnet
        Write-Host "  Deploying to testnet..." -ForegroundColor Gray
        Write-Host "  NOTE: Deployment requires Aleo credits and may take several minutes" -ForegroundColor Yellow
        Write-Host "  Make sure you have Leo Wallet configured with testnet credits" -ForegroundColor Yellow
        
        # Note: Actual deployment command would be:
        # $deployOutput = leo deploy --network testnet 2>&1
        
        # For now, we'll simulate deployment since it requires wallet setup
        Write-Host "  Deployment command: leo deploy --network testnet" -ForegroundColor Cyan
        Write-Host "  Run this command manually after setting up your wallet" -ForegroundColor Cyan
        
        # Store program info
        $deployedPrograms[$program] = @{
            status = "ready_to_deploy"
            path = $programPath
            command = "leo deploy --network testnet"
        }
        
        Write-Host "  $program is ready for deployment" -ForegroundColor Green
        
    } catch {
        Write-Host "  Error processing $program : $_" -ForegroundColor Red
        $failedPrograms += $program
    } finally {
        Pop-Location
    }
    
    Write-Host ""
}

# Summary
Write-Host "Deployment Summary" -ForegroundColor Cyan
Write-Host "=====================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Programs ready to deploy: $($deployedPrograms.Count)" -ForegroundColor Green
foreach ($key in $deployedPrograms.Keys) {
    Write-Host "  - $key" -ForegroundColor Green
}

if ($failedPrograms.Count -gt 0) {
    Write-Host ""
    Write-Host "Failed programs: $($failedPrograms.Count)" -ForegroundColor Red
    foreach ($program in $failedPrograms) {
        Write-Host "  - $program" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Set up Leo Wallet with testnet credits" -ForegroundColor White
Write-Host "   - Download: https://leo.app/" -ForegroundColor Gray
Write-Host "   - Get testnet credits: https://faucet.aleo.org" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Deploy each program manually:" -ForegroundColor White
foreach ($key in $deployedPrograms.Keys) {
    $info = $deployedPrograms[$key]
    Write-Host "   cd $($info.path)" -ForegroundColor Gray
    Write-Host "   $($info.command)" -ForegroundColor Gray
    Write-Host ""
}
Write-Host "3. Update program IDs in src/lib/aleo/constants.js" -ForegroundColor White
Write-Host ""
Write-Host "4. Test the deployment:" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host "   Open http://localhost:5173/aleo" -ForegroundColor Gray
Write-Host ""

# Create deployment log
$logFile = "aleo\deployment-log.json"
$logData = @{
    timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    deployedPrograms = $deployedPrograms
    failedPrograms = $failedPrograms
    totalPrograms = $programs.Count
    successCount = $deployedPrograms.Count
    failureCount = $failedPrograms.Count
} | ConvertTo-Json -Depth 10

$logData | Out-File -FilePath $logFile -Encoding UTF8

Write-Host "Deployment log saved to: $logFile" -ForegroundColor Cyan
Write-Host ""
Write-Host "Deployment preparation complete!" -ForegroundColor Green
