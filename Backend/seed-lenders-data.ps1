# Seed Script - Create Multiple Lenders with Diverse Data
# This creates 10 different lenders with various profiles and loan offers

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     SMART CREDIT+ DATA SEEDING SCRIPT                    ║" -ForegroundColor Cyan
Write-Host "║     Creating Multiple Lenders & Loan Offers              ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:3000"
$headers = @{ "Content-Type" = "application/json" }
$createdLenders = @()
$createdOffers = @()

# Define 10 diverse lenders
$lendersData = @(
    @{
        email = "sarah.johnson@wealthbank.com"
        password = "SecurePass123!"
        role = "lender"
        name = "Sarah Johnson"
        phone = "+1-555-0101"
        investmentCapacity = 500000
        riskPreference = "low"
        address = "123 Wall Street, New York, NY 10005"
        panNumber = "AABCS1234A"
        bankAccountNumber = "1234567890"
        ifscCode = "HDFC0001234"
    },
    @{
        email = "michael.chen@investcorp.com"
        password = "SecurePass456!"
        role = "lender"
        name = "Michael Chen"
        phone = "+1-555-0102"
        investmentCapacity = 1000000
        riskPreference = "medium"
        address = "456 Market Street, San Francisco, CA 94105"
        panNumber = "BBCDS2345B"
        bankAccountNumber = "2345678901"
        ifscCode = "ICIC0002345"
    },
    @{
        email = "priya.sharma@capitalfunds.in"
        password = "SecurePass789!"
        role = "lender"
        name = "Priya Sharma"
        phone = "+91-98765-43210"
        investmentCapacity = 750000
        riskPreference = "high"
        address = "789 MG Road, Bangalore, Karnataka 560001"
        panNumber = "CCDEF3456C"
        bankAccountNumber = "3456789012"
        ifscCode = "SBIN0003456"
    },
    @{
        email = "robert.williams@goldenlending.com"
        password = "SecurePass321!"
        role = "lender"
        name = "Robert Williams"
        phone = "+1-555-0103"
        investmentCapacity = 300000
        riskPreference = "low"
        address = "321 Oak Avenue, Chicago, IL 60601"
        panNumber = "DDEFG4567D"
        bankAccountNumber = "4567890123"
        ifscCode = "AXIS0004567"
    },
    @{
        email = "emma.davis@smartinvest.uk"
        password = "SecurePass654!"
        role = "lender"
        name = "Emma Davis"
        phone = "+44-20-7946-0958"
        investmentCapacity = 2000000
        riskPreference = "medium"
        address = "654 Baker Street, London, UK W1U 6TY"
        panNumber = "EEFGH5678E"
        bankAccountNumber = "5678901234"
        ifscCode = "HDFC0005678"
    },
    @{
        email = "david.kumar@angelfinance.com"
        password = "SecurePass987!"
        role = "lender"
        name = "David Kumar"
        phone = "+1-555-0104"
        investmentCapacity = 150000
        riskPreference = "high"
        address = "987 Cedar Lane, Austin, TX 78701"
        panNumber = "FFGHI6789F"
        bankAccountNumber = "6789012345"
        ifscCode = "ICIC0006789"
    },
    @{
        email = "lisa.anderson@primecapital.com"
        password = "SecurePass147!"
        role = "lender"
        name = "Lisa Anderson"
        phone = "+1-555-0105"
        investmentCapacity = 800000
        riskPreference = "low"
        address = "147 Pine Street, Seattle, WA 98101"
        panNumber = "GGHIJ7890G"
        bankAccountNumber = "7890123456"
        ifscCode = "SBIN0007890"
    },
    @{
        email = "james.patel@venturelend.in"
        password = "SecurePass258!"
        role = "lender"
        name = "James Patel"
        phone = "+91-98765-43211"
        investmentCapacity = 450000
        riskPreference = "medium"
        address = "258 Brigade Road, Mumbai, Maharashtra 400001"
        panNumber = "HHIJK8901H"
        bankAccountNumber = "8901234567"
        ifscCode = "AXIS0008901"
    },
    @{
        email = "sophia.rodriguez@globalfunds.es"
        password = "SecurePass369!"
        role = "lender"
        name = "Sophia Rodriguez"
        phone = "+34-91-123-4567"
        investmentCapacity = 1500000
        riskPreference = "high"
        address = "369 Gran Via, Madrid, Spain 28013"
        panNumber = "IIJKL9012I"
        bankAccountNumber = "9012345678"
        ifscCode = "HDFC0009012"
    },
    @{
        email = "alex.wong@asianinvest.sg"
        password = "SecurePass753!"
        role = "lender"
        name = "Alex Wong"
        phone = "+65-6123-4567"
        investmentCapacity = 600000
        riskPreference = "medium"
        address = "753 Orchard Road, Singapore 238839"
        panNumber = "JJKLM0123J"
        bankAccountNumber = "0123456789"
        ifscCode = "ICIC0000123"
    }
)

# Loan offers templates for each lender
$loanOffersTemplates = @(
    @( # Sarah Johnson - Conservative home loans
        @{ amount = 200000; interestRate = 8.5; tenure = 240; minCreditScore = 750; description = "Prime Home Loan - Fixed Rate"; termsAndConditions = "Low risk, prime customers only. No prepayment penalty." },
        @{ amount = 150000; interestRate = 9.0; tenure = 180; minCreditScore = 720; description = "Home Renovation Loan"; termsAndConditions = "Verified income required. Property should be free of liens." }
    ),
    @( # Michael Chen - Business expansion loans
        @{ amount = 500000; interestRate = 11.5; tenure = 60; minCreditScore = 700; description = "Business Expansion Loan"; termsAndConditions = "Business must be operational for 3+ years. Collateral required." },
        @{ amount = 300000; interestRate = 10.8; tenure = 48; minCreditScore = 680; description = "Working Capital Loan"; termsAndConditions = "Quarterly financial statements required. Medium risk tolerance." },
        @{ amount = 750000; interestRate = 12.0; tenure = 84; minCreditScore = 720; description = "Commercial Real Estate Loan"; termsAndConditions = "Property appraisal mandatory. LTV ratio max 70%." }
    ),
    @( # Priya Sharma - High-risk, high-return loans
        @{ amount = 100000; interestRate = 16.5; tenure = 36; minCreditScore = 600; description = "Quick Business Loan"; termsAndConditions = "Fast approval. Higher interest for startups. Personal guarantee required." },
        @{ amount = 75000; interestRate = 18.0; tenure = 24; minCreditScore = 580; description = "Emergency Business Fund"; termsAndConditions = "Same-day approval available. High risk, high return." }
    ),
    @( # Robert Williams - Auto and personal loans
        @{ amount = 50000; interestRate = 7.5; tenure = 60; minCreditScore = 740; description = "Auto Loan - New Vehicles"; termsAndConditions = "Vehicle as collateral. Insurance mandatory." },
        @{ amount = 35000; interestRate = 9.5; tenure = 48; minCreditScore = 700; description = "Personal Loan - Debt Consolidation"; termsAndConditions = "Stable employment required. Income verification needed." }
    ),
    @( # Emma Davis - Large commercial projects
        @{ amount = 1000000; interestRate = 10.0; tenure = 120; minCreditScore = 760; description = "Large Commercial Project Loan"; termsAndConditions = "Institutional grade. Detailed project report required." },
        @{ amount = 500000; interestRate = 9.5; tenure = 96; minCreditScore = 740; description = "Manufacturing Unit Loan"; termsAndConditions = "Equipment as collateral. Export businesses preferred." }
    ),
    @( # David Kumar - Startup and venture loans
        @{ amount = 125000; interestRate = 15.5; tenure = 36; minCreditScore = 650; description = "Startup Seed Funding"; termsAndConditions = "Equity participation option. High growth potential required." },
        @{ amount = 80000; interestRate = 17.0; tenure = 24; minCreditScore = 620; description = "Tech Startup Loan"; termsAndConditions = "Convertible debt structure. Milestone-based disbursement." }
    ),
    @( # Lisa Anderson - Education and medical loans
        @{ amount = 100000; interestRate = 6.5; tenure = 120; minCreditScore = 700; description = "Higher Education Loan"; termsAndConditions = "Co-signer required. Deferred payment during study period." },
        @{ amount = 75000; interestRate = 8.0; tenure = 60; minCreditScore = 680; description = "Medical Procedure Financing"; termsAndConditions = "Hospital tie-up available. Direct payment to facility." }
    ),
    @( # James Patel - Real estate development
        @{ amount = 400000; interestRate = 11.0; tenure = 72; minCreditScore = 710; description = "Real Estate Development Loan"; termsAndConditions = "Land ownership required. Construction milestones monitored." },
        @{ amount = 250000; interestRate = 10.5; tenure = 60; minCreditScore = 690; description = "Property Flip Loan"; termsAndConditions = "Short-term bridge loan. Property should be income-generating." }
    ),
    @( # Sophia Rodriguez - International business loans
        @{ amount = 800000; interestRate = 13.5; tenure = 60; minCreditScore = 730; description = "Import-Export Business Loan"; termsAndConditions = "Currency hedging included. Trade license required." },
        @{ amount = 600000; interestRate = 12.5; tenure = 48; minCreditScore = 710; description = "Cross-Border Investment Loan"; termsAndConditions = "Multi-currency option. International credit check needed." }
    ),
    @( # Alex Wong - SME and retail loans
        @{ amount = 200000; interestRate = 10.5; tenure = 48; minCreditScore = 690; description = "SME Growth Loan"; termsAndConditions = "Revenue-based repayment option. Business plan required." },
        @{ amount = 150000; interestRate = 11.0; tenure = 36; minCreditScore = 680; description = "Retail Business Loan"; termsAndConditions = "Inventory as collateral. Point-of-sale system integration." }
    )
)

Write-Host "Starting data seeding...`n" -ForegroundColor Yellow

# Register lenders and create their loan offers
for ($i = 0; $i -lt $lendersData.Count; $i++) {
    $lender = $lendersData[$i]
    $offers = $loanOffersTemplates[$i]
    
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Gray
    Write-Host "Processing Lender $($i + 1)/$($lendersData.Count): $($lender.name)" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Gray
    
    try {
        # Step 1: Register lender
        Write-Host "  ➤ Registering lender..." -ForegroundColor Yellow
        $registerBody = $lender | ConvertTo-Json
        
        $registerResponse = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method Post -Body $registerBody -Headers $headers
        
        Write-Host "    ✓ Lender registered successfully" -ForegroundColor Green
        Write-Host "      User ID: $($registerResponse.user.id)" -ForegroundColor White
        Write-Host "      Profile ID: $($registerResponse.user.profileId)" -ForegroundColor White
        Write-Host "      Email: $($lender.email)" -ForegroundColor White
        Write-Host "      Investment Capacity: `$$($lender.investmentCapacity)" -ForegroundColor White
        Write-Host "      Risk Preference: $($lender.riskPreference)" -ForegroundColor White
        
        # Store lender info
        $createdLenders += @{
            name = $lender.name
            email = $lender.email
            password = $lender.password
            userId = $registerResponse.user.id
            profileId = $registerResponse.user.profileId
            token = $registerResponse.access_token
            investmentCapacity = $lender.investmentCapacity
            riskPreference = $lender.riskPreference
        }
        
        # Step 2: Create loan offers for this lender
        Write-Host "`n  ➤ Creating $($offers.Count) loan offer(s)..." -ForegroundColor Yellow
        
        $authHeaders = @{
            "Content-Type" = "application/json"
            "Authorization" = "Bearer $($registerResponse.access_token)"
        }
        
        foreach ($offer in $offers) {
            $offerBody = $offer | ConvertTo-Json
            
            try {
                $offerResponse = Invoke-RestMethod -Uri "$baseUrl/lender/$($registerResponse.user.profileId)/offers" -Method Post -Body $offerBody -Headers $authHeaders
                
                Write-Host "    ✓ Offer created: $($offer.description)" -ForegroundColor Green
                Write-Host "      Amount: `$$($offer.amount) | Rate: $($offer.interestRate)% | Tenure: $($offer.tenure) months" -ForegroundColor White
                
                $createdOffers += @{
                    lenderName = $lender.name
                    offerId = $offerResponse.id
                    amount = $offer.amount
                    interestRate = $offer.interestRate
                    description = $offer.description
                }
            }
            catch {
                Write-Host "    ✗ Failed to create offer: $($offer.description)" -ForegroundColor Red
                Write-Host "      Error: $($_.Exception.Message)" -ForegroundColor Red
            }
        }
        
        # Step 3: Get dashboard stats
        Write-Host "`n  ➤ Fetching dashboard statistics..." -ForegroundColor Yellow
        $dashboard = Invoke-RestMethod -Uri "$baseUrl/lender/$($registerResponse.user.profileId)/dashboard" -Method Get -Headers $authHeaders
        
        Write-Host "    ✓ Dashboard loaded" -ForegroundColor Green
        Write-Host "      Total Active Offers: $($dashboard.totalActiveOffers)" -ForegroundColor White
        Write-Host "      Total Amount Offered: `$$($dashboard.totalAmountOffered)" -ForegroundColor White
        
        Write-Host ""
    }
    catch {
        Write-Host "  ✗ Failed to process lender: $($lender.name)" -ForegroundColor Red
        Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.ErrorDetails.Message) {
            Write-Host "    Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
        }
        Write-Host ""
    }
    
    Start-Sleep -Milliseconds 500  # Small delay between lenders
}

# Summary Report
Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                  SEEDING COMPLETED!                       ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Green

Write-Host "📊 Summary Statistics:" -ForegroundColor Cyan
Write-Host "   ✓ Total Lenders Created: $($createdLenders.Count)" -ForegroundColor White
Write-Host "   ✓ Total Loan Offers Created: $($createdOffers.Count)" -ForegroundColor White

# Calculate totals
$totalInvestment = ($createdLenders | ForEach-Object { $_.investmentCapacity } | Measure-Object -Sum).Sum
$totalOfferAmount = ($createdOffers | ForEach-Object { $_.amount } | Measure-Object -Sum).Sum
$avgInterestRate = ($createdOffers | ForEach-Object { $_.interestRate } | Measure-Object -Average).Average

Write-Host "   ✓ Total Investment Capacity: `$$totalInvestment" -ForegroundColor White
Write-Host "   ✓ Total Loan Offers Amount: `$$totalOfferAmount" -ForegroundColor White
Write-Host "   ✓ Average Interest Rate: $([math]::Round($avgInterestRate, 2))%" -ForegroundColor White

# Risk distribution
$lowRisk = ($createdLenders | Where-Object { $_.riskPreference -eq "low" }).Count
$mediumRisk = ($createdLenders | Where-Object { $_.riskPreference -eq "medium" }).Count
$highRisk = ($createdLenders | Where-Object { $_.riskPreference -eq "high" }).Count

Write-Host "`n📈 Risk Distribution:" -ForegroundColor Cyan
Write-Host "   Low Risk: $lowRisk lenders" -ForegroundColor Green
Write-Host "   Medium Risk: $mediumRisk lenders" -ForegroundColor Yellow
Write-Host "   High Risk: $highRisk lenders" -ForegroundColor Red

# Export credentials to file for easy testing
Write-Host "`n💾 Saving credentials to file..." -ForegroundColor Yellow

$credentialsOutput = "# LENDER CREDENTIALS FOR TESTING`n"
$credentialsOutput += "# Generated on: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n`n"

foreach ($lender in $createdLenders) {
    $credentialsOutput += "═══════════════════════════════════════════════════════════`n"
    $credentialsOutput += "Lender: $($lender.name)`n"
    $credentialsOutput += "Email: $($lender.email)`n"
    $credentialsOutput += "Password: $($lender.password)`n"
    $credentialsOutput += "Profile ID: $($lender.profileId)`n"
    $credentialsOutput += "Risk: $($lender.riskPreference)`n"
    $credentialsOutput += "Investment Capacity: `$$($lender.investmentCapacity)`n"
    $credentialsOutput += "JWT Token: $($lender.token.Substring(0, [Math]::Min(50, $lender.token.Length)))...`n`n"
}

$credentialsOutput | Out-File -FilePath "lender-credentials.txt" -Encoding UTF8

Write-Host "   [OK] Credentials saved to: lender-credentials.txt" -ForegroundColor Green

# Quick test commands
Write-Host "`n[TEST] Quick Test Commands:" -ForegroundColor Cyan
Write-Host "`nTo login as any lender, use:" -ForegroundColor Yellow
Write-Host '  $body = @{ email = "EMAIL_HERE"; password = "PASSWORD_HERE" } | ConvertTo-Json' -ForegroundColor White
Write-Host '  Invoke-RestMethod -Uri "http://localhost:3000/auth/login" -Method Post -Body $body -Headers @{"Content-Type"="application/json"}' -ForegroundColor White

Write-Host "`nTo get all lenders:" -ForegroundColor Yellow
Write-Host '  Invoke-RestMethod -Uri "http://localhost:3000/lender" -Method Get -Headers @{"Authorization"="Bearer YOUR_TOKEN"}' -ForegroundColor White

Write-Host "`nYou now have 10 diverse lenders with $($createdOffers.Count) loan offers in your database!" -ForegroundColor Green
Write-Host "   Check Firebase Console to see all the data!" -ForegroundColor Cyan
Write-Host ""
