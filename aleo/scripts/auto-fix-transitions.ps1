# Automated Leo 3.3.1 Compatibility Fixer
# Adds current_timestamp parameter to all transitions

Write-Host "Fixing remaining programs..." -ForegroundColor Cyan

$programs = @("private_lending", "cross_chain_vault", "treasury_management", "compliance_module")

foreach ($program in $programs) {
    Write-Host "`nProcessing $program..." -ForegroundColor Yellow
    
    $path = "aleo\programs\$program\src\main.leo"
    
    if (!(Test-Path $path)) {
        Write-Host "  Skipping - file not found" -ForegroundColor Gray
        continue
    }
    
    # Read file
    $content = Get-Content $path -Raw
    
    # Count transitions
    $transitionCount = ([regex]::Matches($content, 'transition\s+\w+')).Count
    Write-Host "  Found $transitionCount transitions" -ForegroundColor Gray
    
    # Add current_timestamp: u32 parameter to all transitions
    # This regex finds transition signatures and adds the parameter
    $content = $content -replace '(\s+transition\s+\w+\([^)]*)\)', '$1, current_timestamp: u32)'
    
    # Fix cases where we added it twice
    $content = $content -replace ', current_timestamp: u32, current_timestamp: u32\)', ', current_timestamp: u32)'
    
    # Fix empty parameter lists
    $content = $content -replace 'transition\s+(\w+)\(\s*,\s*current_timestamp: u32\)', 'transition $1(current_timestamp: u32)'
    
    # Save
    $content | Set-Content $path -NoNewline
    
    Write-Host "  Updated transition signatures" -ForegroundColor Green
    
    # Try to build
    Push-Location "aleo\programs\$program"
    Write-Host "  Building..." -ForegroundColor Gray
    $buildResult = leo build 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Build successful!" -ForegroundColor Green
    } else {
        Write-Host "  Build failed - manual fixes needed" -ForegroundColor Yellow
    }
    
    Pop-Location
}

Write-Host "`nDone!" -ForegroundColor Cyan
