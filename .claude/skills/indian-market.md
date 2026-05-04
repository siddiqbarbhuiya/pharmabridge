# India-Specific Requirements

## Phone Numbers
- Format: 10 digits, starting with 6, 7, 8, or 9 (no country code in DB)
- Validation regex: /^[6-9]\d{9}$/
- Display format: +91 XXXXX XXXXX
- Store without country code in DB (prefix +91 only when calling SMS API)
- OTP provider: MSG91 (primary), Twilio as fallback

## Payments (Razorpay — CRITICAL)
- Razorpay is the ONLY payment gateway for India
- Amount unit: PAISE (multiply rupees by 100 before API call)
- Always display amounts in ₹ (rupee symbol) with 2 decimal places
- Payment method priority order in UI: UPI → UPI Apps → Cards → Netbanking → Wallets → COD
- UPI must be FIRST — majority of Indian users pay via UPI
- COD is essential — show as always-available option (no payment upfront)
- Razorpay test mode keys: rzp_test_XXXXX (never use live keys in dev)

```typescript
// Razorpay checkout config
const options = {
  key: import.meta.env.VITE_RAZORPAY_KEY_ID,
  amount: Math.round(totalAmount * 100), // always integer paise
  currency: 'INR',
  name: 'PharmaBridge',
  description: `Order ${orderNumber}`,
  image: '/icon-192.png',
  order_id: razorpayOrderId,
  prefill: { name, email, contact: `+91${phone}` },
  theme: { color: '#4ADE80' },
  modal: {
    ondismiss: () => handlePaymentCancelled(),
    animation: true
  }
}
```

## Medicine Pricing (Drug Price Control)
- Always show MRP (Maximum Retail Price) prominently
- Show selling price below MRP with strikethrough on MRP if discounted
- Cannot sell above MRP — validate: price ≤ mrp on all medicine forms
- Show "X% off" discount badge if discountPercent > 0
- GST is included in MRP for medicines (not added on top)
- Store HSN code per medicine (required for GST compliance)
- Common GST rates: 12% most medicines, 5% essential medicines, 18% wellness products

## Prescription (Rx) Rules (Legal Compliance)
- Schedule H, H1, X drugs require valid prescription
- Flag `isPrescriptionRequired` on medicine — never sell Rx drugs without verification
- Pharmacy pharmacist must verify prescription before confirming order
- Prescription must be stored for audit (Cloudinary, never delete)
- Add watermark "Verified by PharmaBridge — [OrderNumber]" on verified prescriptions

## Date & Number Formats
```typescript
// Dates: DD/MM/YYYY (India standard)
const formatDate = (date: Date) => format(date, 'dd/MM/yyyy')
const formatDateTime = (date: Date) => format(date, 'dd/MM/yyyy, hh:mm a')

// Currency: ₹X,XX,XXX.XX (Indian numbering system — lakhs, crores)
const formatCurrency = (amount: number) =>
  `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

// Large numbers: use Indian system (1,00,000 = 1 lakh, not 100,000)
```

## Distance & Delivery
- Distance in km (never miles)
- Delivery radius typically 3–10 km for pharmacy
- Show estimated delivery time in minutes/hours
- "Delivering in 45–60 mins" not "Delivering in 0.75 hrs"

## Maps & Geocoding
- Use OpenStreetMap + Leaflet (no Google Maps billing surprises)
- Geocoding API: Nominatim (OSM) or Mapbox free tier
- Default map center on load: { lat: 20.5937, lng: 78.9629 } (India center), zoom: 5
- On GPS grant: zoom to user location
- Pincode lookup: use India Pincode API for address auto-fill

## Address Format
```typescript
// Standard Indian address structure
interface Address {
  line1: string      // Building, flat number
  line2?: string     // Street, locality
  city: string       // City/Town
  district?: string  // District (important for rural)
  state: string      // State (use standard abbreviations: MH, DL, KA, etc.)
  pincode: string    // 6-digit pincode (validate: /^\d{6}$/)
  landmark?: string  // "Near X" — very common in India
}
```

## Language & Content
- English only at launch (Phase 1)
- All user-facing text: simple, clear English — not jargon
- Error messages: friendly, not technical
- "Your prescription is being reviewed" not "PRESCRIPTION_REQUIRED error"
- Plan for Hindi localization in Phase 2 (use i18n from day 1 — react-i18next)

## Performance for India Networks
- Design for 2G: total initial JS < 200KB gzipped
- Images: mandatory Cloudinary auto-format (f_auto delivers WebP on supported browsers)
- Cloudflare CDN: ensures India POP (Mumbai, Chennai, Hyderabad) serves assets
- Never block render on non-critical resources
- API timeout: 15s (India servers can be slower)
- Retry failed requests up to 3x with exponential backoff

## Notifications (India)
- SMS: MSG91 DLT (Distributed Ledger Technology) registration required for transactional SMS
- Template ID must be pre-registered with TRAI (regulatory requirement)
- WhatsApp Business API: future consideration (very high engagement in India)
- FCM Push: works well on Android (dominant in India), limited on iOS Safari PWA

## DPDP Act Compliance (Digital Personal Data Protection Act, 2023)
- Explicit consent checkbox on registration: "I agree to the Privacy Policy and Terms of Service"
- Store consent timestamp in DB: `consentGivenAt: DateTime`
- Data deletion: `DELETE /api/v1/users/me` must anonymize all user data
  - Set name = null, email = null, phone = null, isActive = false
  - Keep orders for GST audit (financial records)
- Privacy policy: clear, in plain English, linked in footer
- Data retention: prescriptions kept 5 years (CDSCO requirement), orders kept 7 years (GST)
- No selling/sharing user data with third parties — state explicitly in privacy policy

## State List (for dropdowns)
```typescript
export const INDIA_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
]
```
