# Quick Test Script for Lender Module
# Make sure server is running on port 3000

Write-Host "`n=== Testing Lender Module ===" -ForegroundColor Cyan

# Test 1: Register a new lender
Write-Host "`n1. Creating a new lender..." -ForegroundColor Yellow
$body = @{
    name = "Sarah Johnson"
    email = "sarah.johnson@example.com"
    phone = "+1-555-0123"
    investmentCapacity = 250000
    riskPreference = "medium"
    address = "123 Finance Street, New York"
    panNumber = "ABCDE1234F"
    bankAccountNumber = "9876543210"
    ifscCode = "HDFC0001234"
} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
    "x-api-key" = "dev-api-key"
}

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/lender" -Method Post -Body $body -Headers $headers
    $lenderId = $response.id
    
    Write-Host "✓ Success! Lender created" -ForegroundColor Green
    Write-Host "Lender ID: $lenderId" -ForegroundColor White
    Write-Host "Name: $($response.name)" -ForegroundColor White
    Write-Host "Email: $($response.email)" -ForegroundColor White
    Write-Host "Investment Capacity: `$$($response.investmentCapacity)" -ForegroundColor White
    
    # Test 2: Get the lender profile
    Write-Host "`n2. Retrieving lender profile..." -ForegroundColor Yellow
    $profile = Invoke-RestMethod -Uri "http://localhost:3000/lender/$lenderId" -Method Get -Headers $headers
    Write-Host "✓ Success! Retrieved profile for $($profile.name)" -ForegroundColor Green
    
    # Test 3: Create a loan offer
    Write-Host "`n3. Creating loan offer..." -ForegroundColor Yellow
    $offerBody = @{
        amount = 100000
        interestRate = 12.5
        tenure = 24
        minCreditScore = 700
        description = "Home renovation loan"
        termsAndConditions = "Standard terms apply"
    } | ConvertTo-Json
    
    $offer = Invoke-RestMethod -Uri "http://localhost:3000/lender/$lenderId/offers" -Method Post -Body $offerBody -Headers $headers
    Write-Host "✓ Success! Loan offer created" -ForegroundColor Green
    Write-Host "Offer ID: $($offer.id)" -ForegroundColor White
    Write-Host "Amount: `$$($offer.amount)" -ForegroundColor White
    Write-Host "Interest Rate: $($offer.interestRate)%" -ForegroundColor White
    
    # Test 4: Get dashboard stats
    Write-Host "`n4. Getting dashboard statistics..." -ForegroundColor Yellow
    $dashboard = Invoke-RestMethod -Uri "http://localhost:3000/lender/$lenderId/dashboard" -Method Get -Headers $headers
    Write-Host "✓ Success! Dashboard loaded" -ForegroundColor Green
    Write-Host "Total Active Offers: $($dashboard.totalActiveOffers)" -ForegroundColor White
    Write-Host "Total Amount Offered: `$$($dashboard.totalAmountOffered)" -ForegroundColor White
    
    # Test 5: Get all lenders
    Write-Host "`n5. Getting all lenders..." -ForegroundColor Yellow
    $allLenders = Invoke-RestMethod -Uri "http://localhost:3000/lender" -Method Get -Headers $headers
    Write-Host "✓ Success! Found $($allLenders.Count) lender(s)" -ForegroundColor Green
    
    Write-Host "`n=== All Tests Passed! ===" -ForegroundColor Green -BackgroundColor Black
    Write-Host "`nYour lender module is working perfectly!" -ForegroundColor Cyan
    Write-Host "Lender ID for demo: $lenderId" -ForegroundColor Yellow
    
} catch {
    Write-Host "✗ Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "`nMake sure:" -ForegroundColor Yellow
    Write-Host "1. Server is running (npm run start:dev)" -ForegroundColor White
    Write-Host "2. Server is on port 3000" -ForegroundColor White
    Write-Host "3. Firebase is configured correctly" -ForegroundColor White
}
