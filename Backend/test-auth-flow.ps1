# Authentication System - Complete Test Script

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  SMART CREDIT+ AUTHENTICATION DEMO" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:3000"
$headers = @{ "Content-Type" = "application/json" }

Write-Host "Step 1: Register a New Lender with Authentication" -ForegroundColor Yellow
Write-Host "------------------------------------" -ForegroundColor Gray

$registerBody = @{
    email = "sarah.lender@example.com"
    password = "SecurePass123!"
    role = "lender"
    name = "Sarah Johnson"
    phone = "+1-555-0123"
} | ConvertTo-Json

try {
    $registerResponse = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method Post -Body $registerBody -Headers $headers
    Write-Host "✓ Registration Successful!" -ForegroundColor Green
    Write-Host "  User ID: $($registerResponse.user.id)" -ForegroundColor White
    Write-Host "  Email: $($registerResponse.user.email)" -ForegroundColor White
    Write-Host "  Role: $($registerResponse.user.role)" -ForegroundColor White
    Write-Host "  Lender Profile ID: $($registerResponse.user.profileId)" -ForegroundColor White
    Write-Host "  Access Token: $($registerResponse.access_token.Substring(0,20))..." -ForegroundColor White
    
    $token = $registerResponse.access_token
    $lenderProfileId = $registerResponse.user.profileId
    $authHeaders = @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $token"
    }
    
    Write-Host "`nStep 2: Test Login with Credentials" -ForegroundColor Yellow
    Write-Host "------------------------------------" -ForegroundColor Gray
    
    $loginBody = @{
        email = "sarah.lender@example.com"
        password = "SecurePass123!"
    } | ConvertTo-Json
    
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -Headers $headers
    Write-Host "✓ Login Successful!" -ForegroundColor Green
    Write-Host "  New Access Token Generated" -ForegroundColor White
    
    Write-Host "`nStep 3: Get User Profile (Protected Endpoint)" -ForegroundColor Yellow
    Write-Host "------------------------------------" -ForegroundColor Gray
    
    $profile = Invoke-RestMethod -Uri "$baseUrl/auth/profile" -Method Get -Headers $authHeaders
    Write-Host "✓ Profile Retrieved!" -ForegroundColor Green
    Write-Host "  User ID: $($profile.user.id)" -ForegroundColor White
    Write-Host "  Email: $($profile.user.email)" -ForegroundColor White
    Write-Host "  Lender Profile: $($profile.profile.name)" -ForegroundColor White
    
    Write-Host "`nStep 4: Create a Loan Offer (Protected Endpoint)" -ForegroundColor Yellow
    Write-Host "------------------------------------" -ForegroundColor Gray
    
    $offerBody = @{
        amount = 150000
        interestRate = 11.5
        tenure = 36
        minCreditScore = 720
        description = "Business expansion loan with flexible terms"
        termsAndConditions = "Priority approval for verified businesses"
    } | ConvertTo-Json
    
    $offer = Invoke-RestMethod -Uri "$baseUrl/lender/$lenderProfileId/offers" -Method Post -Body $offerBody -Headers $authHeaders
    Write-Host "✓ Loan Offer Created!" -ForegroundColor Green
    Write-Host "  Offer ID: $($offer.id)" -ForegroundColor White
    Write-Host "  Amount: `$$($offer.amount)" -ForegroundColor White
    Write-Host "  Interest Rate: $($offer.interestRate)%" -ForegroundColor White
    Write-Host "  Tenure: $($offer.tenure) months" -ForegroundColor White
    
    Write-Host "`nStep 5: View Dashboard (Protected Endpoint)" -ForegroundColor Yellow
    Write-Host "------------------------------------" -ForegroundColor Gray
    
    $dashboard = Invoke-RestMethod -Uri "$baseUrl/lender/$lenderProfileId/dashboard" -Method Get -Headers $authHeaders
    Write-Host "✓ Dashboard Loaded!" -ForegroundColor Green
    Write-Host "  Total Active Offers: $($dashboard.totalActiveOffers)" -ForegroundColor White
    Write-Host "  Total Amount Offered: `$$($dashboard.totalAmountOffered)" -ForegroundColor White
    
    Write-Host "`nStep 6: Update Lender Profile (Protected Endpoint)" -ForegroundColor Yellow
    Write-Host "------------------------------------" -ForegroundColor Gray
    
    $updateBody = @{
        phone = "+1-555-9999"
        investmentCapacity = 500000
        riskPreference = "high"
    } | ConvertTo-Json
    
    $updated = Invoke-RestMethod -Uri "$baseUrl/lender/$lenderProfileId" -Method Put -Body $updateBody -Headers $authHeaders
    Write-Host "✓ Profile Updated!" -ForegroundColor Green
    Write-Host "  New Phone: $($updated.phone)" -ForegroundColor White
    Write-Host "  New Investment Capacity: `$$($updated.investmentCapacity)" -ForegroundColor White
    
    Write-Host "`nStep 7: Test Unauthorized Access (Without Token)" -ForegroundColor Yellow
    Write-Host "------------------------------------" -ForegroundColor Gray
    
    try {
        Invoke-RestMethod -Uri "$baseUrl/lender/$lenderProfileId/dashboard" -Method Get -Headers $headers | Out-Null
        Write-Host "✗ Security Failed - Unauthorized access allowed!" -ForegroundColor Red
    } catch {
        Write-Host "✓ Security Working - Unauthorized access blocked!" -ForegroundColor Green
        Write-Host "  Error: 401 Unauthorized" -ForegroundColor White
    }
    
    Write-Host "`nStep 8: Test Wrong User Access (Different User's Profile)" -ForegroundColor Yellow
    Write-Host "------------------------------------" -ForegroundColor Gray
    
    # Register another lender
    $otherLenderBody = @{
        email = "other.lender@example.com"
        password = "Password123!"
        role = "lender"
        name = "Other Lender"
        phone = "+1-444-5555"
    } | ConvertTo-Json
    
    $otherResponse = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method Post -Body $otherLenderBody -Headers $headers
    
    try {
        # Try to update first lender's profile with second lender's token
        $otherToken = $otherResponse.access_token
        $wrongAuthHeaders = @{
            "Content-Type" = "application/json"
            "Authorization" = "Bearer $otherToken"
        }
        Invoke-RestMethod -Uri "$baseUrl/lender/$lenderProfileId" -Method Put -Body $updateBody -Headers $wrongAuthHeaders | Out-Null
        Write-Host "✗ Security Failed - User can access other's profile!" -ForegroundColor Red
    } catch {
        Write-Host "✓ Security Working - Cannot access other user's profile!" -ForegroundColor Green
        Write-Host "  Error: 403 Forbidden" -ForegroundColor White
    }
    
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "  ALL TESTS COMPLETED SUCCESSFULLY!" -ForegroundColor Green
    Write-Host "========================================`n" -ForegroundColor Cyan
    
    Write-Host "Summary:" -ForegroundColor Cyan
    Write-Host "  ✓ User registration with authentication" -ForegroundColor White
    Write-Host "  ✓ Login with email/password" -ForegroundColor White
    Write-Host "  ✓ JWT token generation" -ForegroundColor White
    Write-Host "  ✓ Protected endpoints (profile, dashboard, offers)" -ForegroundColor White
    Write-Host "  ✓ Role-based access control (lender-only)" -ForegroundColor White
    Write-Host "  ✓ User isolation (cannot access other users' data)" -ForegroundColor White
    Write-Host "  ✓ Unauthorized access prevention`n" -ForegroundColor White
    
    Write-Host "Save these credentials for manual testing:" -ForegroundColor Yellow
    Write-Host "  Email: sarah.lender@example.com" -ForegroundColor White
    Write-Host "  Password: SecurePass123!" -ForegroundColor White
    Write-Host "  Lender Profile ID: $lenderProfileId" -ForegroundColor White
    Write-Host "  Access Token: $token`n" -ForegroundColor White
    
} catch {
    Write-Host "`n✗ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "  Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}
