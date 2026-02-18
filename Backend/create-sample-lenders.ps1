# Simple Manual Test - Create Lenders One by One
# Run this to manually test and see each step

Write-Host "`n===========================================" -ForegroundColor Cyan
Write-Host "  CREATE LENDERS MANUALLY - STEP BY STEP" -ForegroundColor Cyan  
Write-Host "===========================================`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:3000"

# Test 1: Register First Lender
Write-Host "[1] Creating Lender #1: Sarah Johnson..." -ForegroundColor Yellow
$body1 = @{
    email = "sarah.johnson@example.com"
    password = "SecurePass123!"
    role = "lender"
    name = "Sarah Johnson"
    phone = "+1-555-0101"
    investmentCapacity = 500000
    riskPreference = "low"
    address = "123 Wall Street, New York"
    panNumber = "AABCS1234A"
    bankAccountNumber = "1234567890"
    ifscCode = "HDFC0001234"
} | ConvertTo-Json

try {
    $lender1 = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method Post -Body $body1 -Headers @{"Content-Type"="application/json"} -TimeoutSec 10
    Write-Host "[OK] Created!" -ForegroundColor Green
    Write-Host "    Email: sarah.johnson@example.com" -ForegroundColor White
    Write-Host "    Lender ID: $($lender1.user.profileId)" -ForegroundColor White
    Write-Host "    Password: SecurePass123!" -ForegroundColor White
    Write-Host ""
    
    # Create loan offer for lender 1
    Write-Host "    Creating loan offer..." -ForegroundColor Yellow
    $offer1 = @{
        amount = 200000
        interestRate = 8.5
        tenure = 240
        minCreditScore = 750
        description = "Prime Home Loan - Fixed Rate"
        termsAndConditions = "Low risk, prime customers only"
    } | ConvertTo-Json
    
    $authHeaders1 = @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $($lender1.access_token)"
    }
    
    $offer1Result = Invoke-RestMethod -Uri "$baseUrl/lender/$($lender1.user.profileId)/offers" -Method Post -Body $offer1 -Headers $authHeaders1 -TimeoutSec 10
    Write-Host "    [OK] Loan offer created! Amount: `$$($offer1Result.amount), Rate: $($offer1Result.interestRate)%" -ForegroundColor Green
    Write-Host ""
    
} catch {
    Write-Host "[ERROR] Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Register Second Lender
Write-Host "[2] Creating Lender #2: Michael Chen..." -ForegroundColor Yellow
$body2 = @{
    email = "michael.chen@example.com"
    password = "SecurePass456!"
    role = "lender"
    name = "Michael Chen"
    phone = "+1-555-0102"
    investmentCapacity = 1000000
    riskPreference = "medium"
    address = "456 Market Street, San Francisco"
    panNumber = "BBCDS2345B"
    bankAccountNumber = "2345678901"
    ifscCode = "ICIC0002345"
} | ConvertTo-Json

try {
    $lender2 = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method Post -Body $body2 -Headers @{"Content-Type"="application/json"} -TimeoutSec 10
    Write-Host "[OK] Created!" -ForegroundColor Green
    Write-Host "    Email: michael.chen@example.com" -ForegroundColor White
    Write-Host "    Lender ID: $($lender2.user.profileId)" -ForegroundColor White
    Write-Host "    Password: SecurePass456!" -ForegroundColor White
    Write-Host ""
    
    # Create loan offers for lender 2
    Write-Host "    Creating 2 loan offers..." -ForegroundColor Yellow
    
    $authHeaders2 = @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $($lender2.access_token)"
    }
    
    $offer2a = @{
        amount = 500000
        interestRate = 11.5
        tenure = 60
        minCreditScore = 700
        description = "Business Expansion Loan"
        termsAndConditions = "Business must be operational for 3+ years"
    } | ConvertTo-Json
    
    $offer2aResult = Invoke-RestMethod -Uri "$baseUrl/lender/$($lender2.user.profileId)/offers" -Method Post -Body $offer2a -Headers $authHeaders2 -TimeoutSec 10
    Write-Host "    [OK] Offer 1: `$$($offer2aResult.amount) @ $($offer2aResult.interestRate)%" -ForegroundColor Green
    
    $offer2b = @{
        amount = 300000
        interestRate = 10.8
        tenure = 48
        minCreditScore = 680
        description = "Working Capital Loan"
        termsAndConditions = "Quarterly financial statements required"
    } | ConvertTo-Json
    
    $offer2bResult = Invoke-RestMethod -Uri "$baseUrl/lender/$($lender2.user.profileId)/offers" -Method Post -Body $offer2b -Headers $authHeaders2 -TimeoutSec 10
    Write-Host "    [OK] Offer 2: `$$($offer2bResult.amount) @ $($offer2bResult.interestRate)%" -ForegroundColor Green
    Write-Host ""
    
} catch {
    Write-Host "[ERROR] Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Register Third Lender
Write-Host "[3] Creating Lender #3: Priya Sharma..." -ForegroundColor Yellow
$body3 = @{
    email = "priya.sharma@example.in"
    password = "SecurePass789!"
    role = "lender"
    name = "Priya Sharma"
    phone = "+91-98765-43210"
    investmentCapacity = 750000
    riskPreference = "high"
    address = "789 MG Road, Bangalore"
    panNumber = "CCDEF3456C"
    bankAccountNumber = "3456789012"
    ifscCode = "SBIN0003456"
} | ConvertTo-Json

try {
    $lender3 = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method Post -Body $body3 -Headers @{"Content-Type"="application/json"} -TimeoutSec 10
    Write-Host "[OK] Created!" -ForegroundColor Green
    Write-Host "    Email: priya.sharma@example.in" -ForegroundColor White
    Write-Host "    Lender ID: $($lender3.user.profileId)" -ForegroundColor White
    Write-Host "    Password: SecurePass789!" -ForegroundColor White
    Write-Host ""
    
    # Create loan offer for lender 3
    Write-Host "    Creating loan offer..." -ForegroundColor Yellow
    
    $authHeaders3 = @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $($lender3.access_token)"
    }
    
    $offer3 = @{
        amount = 100000
        interestRate = 16.5
        tenure = 36
        minCreditScore = 600
        description = "Quick Business Loan - High Risk"
        termsAndConditions = "Fast approval for startups"
    } | ConvertTo-Json
    
    $offer3Result = Invoke-RestMethod -Uri "$baseUrl/lender/$($lender3.user.profileId)/offers" -Method Post -Body $offer3 -Headers $authHeaders3 -TimeoutSec 10
    Write-Host "    [OK] Loan offer created! Amount: `$$($offer3Result.amount), Rate: $($offer3Result.interestRate)%" -ForegroundColor Green
    Write-Host ""
    
} catch {
    Write-Host "[ERROR] Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Summary
Write-Host "`n===========================================" -ForegroundColor Green
Write-Host "           SUMMARY" -ForegroundColor Green
Write-Host "===========================================`n" -ForegroundColor Green

Write-Host "You now have 3 lenders created with different profiles:" -ForegroundColor White
Write-Host ""
Write-Host "1. Sarah Johnson (Low Risk) - `$500K capacity" -ForegroundColor Cyan
Write-Host "   Email: sarah.johnson@example.com | Password: SecurePass123!" -ForegroundColor White
Write-Host ""
Write-Host "2. Michael Chen (Medium Risk) - `$1M capacity" -ForegroundColor Cyan
Write-Host "   Email: michael.chen@example.com | Password:  SecurePass456!" -ForegroundColor White
Write-Host ""
Write-Host "3. Priya Sharma (High Risk) - `$750K capacity" -ForegroundColor Cyan
Write-Host "   Email: priya.sharma@example.in | Password: SecurePass789!" -ForegroundColor White
Write-Host ""

Write-Host "`nNext Steps:" -ForegroundColor Yellow
Write-Host "1. Open Firebase Console and check 'users', 'lenders', 'loanOffers' collections" -ForegroundColor White
Write-Host "2. Test login with any of these credentials" -ForegroundColor White
Write-Host "3. Use Smart_Credit_Lender_Auth.postman_collection.json for more tests" -ForegroundColor White
Write-Host ""
