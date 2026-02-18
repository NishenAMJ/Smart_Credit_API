# Simple API Test - Lender Registration
$headers = @{
    "Content-Type" = "application/json"
    "x-api-key" = "dev-api-key"
}

$body = @{
    name = "Sarah Johnson"
    email = "sarah.johnson@example.com"
    phone = "+1-555-0123"
    investmentCapacity = 150000
    riskPreference = "medium"
} | ConvertTo-Json

Write-Host "`nTesting Lender Registration..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/lender" -Method Post -Body $body -Headers $headers
    
    Write-Host "`n✓ SUCCESS! Lender Created:" -ForegroundColor Green
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host "ID: $($response.id)" -ForegroundColor Yellow
    Write-Host "Name: $($response.name)" -ForegroundColor White
    Write-Host "Email: $($response.email)" -ForegroundColor White
    Write-Host "Phone: $($response.phone)" -ForegroundColor White
    Write-Host "Investment Capacity: `$$($response.investmentCapacity)" -ForegroundColor White
    Write-Host "Risk Preference: $($response.riskPreference)" -ForegroundColor White
    Write-Host "Status: $($response.status)" -ForegroundColor Green
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    
    Write-Host "`n🎉 Your Lender API is working perfectly!" -ForegroundColor Cyan
    Write-Host "`nSave this ID for testing: $($response.id)" -ForegroundColor Yellow
    
} catch {
    Write-Host "`n✗ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Status Code: $statusCode" -ForegroundColor Red
    }
}
