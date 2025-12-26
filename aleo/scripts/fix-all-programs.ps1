# Fix all Aleo programs for Leo 3.3.1 compatibility
# This script fixes common issues across all programs

Write-Host "Fixing all Aleo programs for Leo 3.3.1..." -ForegroundColor Cyan

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
    Write-Host "`nProcessing $program..." -ForegroundColor Yellow
    
    $path = "aleo\programs\$program\src\main.leo"
    
    if (!(Test-Path $path)) {
        Write-Host "  File not found: $path" -ForegroundColor Red
        continue
    }
    
    # Read file
    $content = Get-Content $path -Raw
    
    # Fix 1: Replace self.caller with self.signer
    $content = $content -replace 'self\.caller', 'self.signer'
    
    # Fix 2: Replace block.height with current_timestamp (will need manual parameter addition)
    # We'll just mark these for now
    $blockHeightCount = ([regex]::Matches($content, 'block\.height')).Count
    
    if ($blockHeightCount -gt 0) {
        Write-Host "  Found $blockHeightCount block.height usages - needs manual fix" -ForegroundColor Yellow
    }
    
    # Save file
    $content | Set-Content $path -NoNewline
    
    Write-Host "  Fixed self.caller usages" -ForegroundColor Green
}

Write-Host "`nDone! Now you need to:" -ForegroundColor Cyan
Write-Host "1. Add current_timestamp: u32 parameter to transitions with block.height" -ForegroundColor White
Write-Host "2. Replace block.height with current_timestamp" -ForegroundColor White
Write-Host "3. Add 'owner: address' field to records that are missing it" -ForegroundColor White
Write-Host "4. Build each program with 'leo build'" -ForegroundColor White
