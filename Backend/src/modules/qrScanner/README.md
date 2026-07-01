# QR Scanner Module

Backend module for processing QR code scans from payment slips. When a lender scans a payment slip QR code, the system:
1. Validates the QR data and loan details
2. Marks the next pending installment as **paid**
3. Updates the **borrower's payment status**
4. Creates a transaction record
5. Updates loan progress if all installments are complete

## API Endpoints

### 1. Scan Payment Slip
**POST** `/lender-mobile/qr-scanner/scan-payment`

Process QR code from payment slip and mark borrower payment as complete.

**Headers:**
```
Authorization: Bearer {lender_jwt_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "qrData": "{\"loanId\":\"L-001\",\"borrowerId\":\"B-123\",\"amount\":5000}",
  "loanId": "L-001",
  "borrowerId": "B-123",
  "amount": 5000,
  "referenceNumber": "REF-2026-001",
  "paymentMethod": "bank_transfer"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Payment processed successfully",
  "data": {
    "loanId": "L-001",
    "borrowerId": "B-123",
    "amount": 5000,
    "paymentStatus": "completed",
    "transactionId": "TXN-abc123",
    "updatedAt": "2026-07-01T10:30:00.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid QR data, borrower mismatch, or amount mismatch
- `404 Not Found`: Loan or borrower not found
- `403 Forbidden`: Only loan lender can scan payments

---

### 2. Get Payment History
**GET** `/lender-mobile/qr-scanner/payment-history/:loanId?limit=10`

Fetch payment transaction history for a specific loan.

**Response:**
```json
{
  "payments": [
    {
      "id": "TXN-001",
      "loanId": "L-001",
      "borrowerId": "B-123",
      "amount": 5000,
      "paymentMethod": "qr_scan",
      "status": "completed",
      "createdAt": "2026-07-01T10:30:00.000Z"
    }
  ],
  "count": 1
}
```

---

### 3. Validate QR Code
**POST** `/lender-mobile/qr-scanner/validate-qr`

Parse and validate QR code structure before processing.

**Request:**
```json
{
  "qrData": "{\"loanId\":\"L-001\",\"borrowerId\":\"B-123\",\"amount\":5000}"
}
```

**Response:**
```json
{
  "loanId": "L-001",
  "borrowerId": "B-123",
  "amount": 5000,
  "qrVersion": "1.0"
}
```

---

## QR Code Format

Payment slip QR codes should encode data in **JSON format**:

```json
{
  "loanId": "L-2026-001",
  "borrowerId": "B-123456",
  "amount": 5000,
  "dueDate": "2026-07-15",
  "referenceNumber": "PAY-2026-001",
  "qrVersion": "1.0"
}
```

**Fields:**
- `loanId` (required): Unique loan identifier
- `borrowerId` (required): Borrower user ID
- `amount` (required): Payment amount in loan currency
- `dueDate` (optional): Due date of the installment
- `referenceNumber` (optional): Payment reference for tracking
- `qrVersion` (optional): QR format version for future compatibility

---

## Data Flow

```
Frontend (QR Scanner)
        ↓
    Scan QR
        ↓
   POST /scan-payment
        ↓
Backend (QrScannerService)
        ├─ Validate loan exists
        ├─ Verify borrower ID matches
        ├─ Verify lender authorization
        ├─ Get next pending installment
        ├─ Verify payment amount
        ├─ Create transaction record ✓
        ├─ Mark installment as paid ✓
        ├─ Update borrower payment status ✓
        ├─ Check if loan complete
        └─ Return success response
        ↓
    Borrower payment marked DONE
```

---

## Database Schema Updates

### transactions collection
New fields added:
- `paymentMethod`: 'qr_scan' | 'bank_transfer' | etc.
- `scannedAt`: Timestamp of QR scan
- `qrData`: Original QR code content (for audit)

### users collection (borrower)
Updated `paymentHistory` object:
```json
{
  "paymentHistory": {
    "lastPaymentDate": "2026-07-01",
    "lastPaymentAmount": 5000,
    "lastPaymentStatus": "completed",
    "totalPaymentsMade": 3,
    "paymentHistory": [...]
  }
}
```

### loans collection
New statuses:
- Installment `status`: "paid" | "pending" | "overdue"
- Loan `status`: "completed" when all installments are paid

---

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| Loan not found | Invalid loanId in QR | Verify QR code content |
| Borrower mismatch | borrowerId doesn't match loan | Scan correct payment slip |
| Amount mismatch | Payment != installment amount | Verify slip amount |
| No pending installments | Loan fully paid | Check loan status |
| Not authorized | Scanned by non-lender | Use lender account |

---

## Future Enhancements

1. **Partial Payments**: Support installment payment splits
2. **QR Retry**: Handle failed scans with retry logic
3. **Offline Mode**: Cache QR scans for offline processing
4. **Barcode Types**: Support barcode/EAN formats in addition to QR
5. **Payment Notifications**: Real-time lender/borrower notifications
