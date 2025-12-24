# UK Shipping Module - Integration Guide
## Simple Database-Driven Shipping Calculator for 600+ Orders/Day

### ✅ What's Been Created

#### 1. Database Schema
**4 Essential Tables:**
- **ShippingZones** - 4 UK zones pre-configured (Mainland, Highlands, NI, Offshore)
- **ShippingMethods** - Royal Mail 48, Royal Mail 24, DPD Next Day, Click & Collect
- **ShippingRates** - Weight-based, zone-based pricing with free shipping thresholds
- **PostcodeZoneMappings** - 600+ UK postcodes mapped to zones

**Performance Features:**
- Indexed columns for fast lookups (600+ orders/day optimized)
- Memory caching (5-minute TTL)
- Zone-based pricing logic

#### 2. Domain Entities (`EcomPlatform.Domain/Entities/Shipping/`)
- `ShippingZone.cs` - Shipping zones with postcode patterns
- `ShippingMethod.cs` - Carrier methods (Royal Mail, DPD, etc.)
- `ShippingRate.cs` - Pricing rules with calculation logic
- `PostcodeZoneMapping.cs` - Quick postcode lookup

#### 3. Application Layer (`EcomPlatform.Application/`)
- **Query**: `GetShippingQuoteQuery` & Handler - Calculates shipping options from database
- **DTOs**: `ShippingOptionDto`, `ShippingQuoteDto`
- **Caching**: 5-minute memory cache for performance

#### 4. API Controller (`EcomPlatform.API/Controllers/ShippingController.cs`)
- `POST /api/shipping/quote` - Get shipping options for cart
- `GET /api/shipping/validate-postcode/{postcode}` - Quick postcode validation

---

## 🚀 How It Works

### Simple Flow:
```
Customer enters postcode + cart details
    ↓
System detects shipping zone (UK Mainland, Highlands, etc.)
    ↓
Database lookup for applicable rates
    ↓
Calculate price based on weight + cart value
    ↓
Return shipping options with prices & delivery times
```

**No external API calls** - Everything runs from your database!

---

## 📋 Configuration

### appsettings.json
```json
{
  "Shipping": {
    "WarehouseName": "Direct Care Warehouse",
    "WarehousePostcode": "SW1A 1AA",
    "WarehouseAddress": "London, UK",
    "FreeShippingThreshold": 30.00,
    "CacheExpirationMinutes": 5,
    "DefaultEstimatedDeliveryDays": 3
  }
}
```

### Update Values:
- **WarehouseName**: Your warehouse/store name
- **WarehousePostcode**: Where you ship from (affects delivery estimates)
- **FreeShippingThreshold**: Cart value for free shipping (£30 default)

---

## 📊 Customer-Facing API Usage

### Get Shipping Options During Checkout

**Request:**
```http
POST /api/shipping/quote
Content-Type: application/json

{
  "postcode": "SW1A 1AA",
  "totalWeight": 2.5,
  "cartValue": 45.00,
  "itemCount": 3,
  "productIds": ["guid1", "guid2"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "postcode": "SW1A 1AA",
    "zoneName": "UK Mainland",
    "totalWeight": 2.5,
    "cartValue": 45.00,
    "itemCount": 3,
    "availableOptions": [
      {
        "shippingMethodId": "guid",
        "methodName": "click-and-collect",
        "displayName": "Click & Collect",
        "description": "Collect from store - Ready in 2 hours",
        "carrierCode": "STORE",
        "price": 0.00,
        "isFree": true,
        "estimatedDelivery": "0-0 business days",
        "trackingSupported": false
      },
      {
        "shippingMethodId": "guid",
        "methodName": "royal-mail-48",
        "displayName": "Royal Mail 48 (Standard)",
        "description": "2-3 business days delivery",
        "carrierCode": "ROYAL_MAIL",
        "price": 6.24,
        "isFree": false,
        "estimatedDelivery": "2-3 business days",
        "trackingSupported": true
      },
      {
        "shippingMethodId": "guid",
        "methodName": "royal-mail-24",
        "displayName": "Royal Mail 24 (Express)",
        "description": "1-2 business days delivery",
        "carrierCode": "ROYAL_MAIL",
        "price": 9.36,
        "isFree": false,
        "estimatedDelivery": "1-2 business days",
        "trackingSupported": true
      },
      {
        "shippingMethodId": "guid",
        "methodName": "dpd-next-day",
        "displayName": "DPD Next Day",
        "description": "Next business day delivery before 6pm",
        "carrierCode": "DPD",
        "price": 11.48,
        "isFree": false,
        "estimatedDelivery": "1-1 business days",
        "trackingSupported": true
      }
    ],
    "recommendedOption": { /* cheapest option */ },
    "hasFreeShipping": true
  },
  "message": "Shipping quote generated successfully"
}
```

### Validate Postcode
```http
GET /api/shipping/validate-postcode/SW1A1AA
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isValid": true,
    "postcode": "SW1A1AA",
    "zoneName": "UK Mainland",
    "hasFreeShippingAvailable": true,
    "minimumShippingCost": 0.00
  }
}
```

---

## 🎯 Key Features

### 1. **Zone-Based Pricing**
Different rates for different UK regions:
- **UK Mainland**: Standard rates, free shipping over £30
- **Scottish Highlands**: Higher rates due to remote location
- **Northern Ireland**: Moderate rates
- **Offshore Islands**: Premium rates

### 2. **Weight-Based Calculation**
Rates increase with package weight:
- 0-2kg: Base rate
- 2-5kg: Base rate + per kg charge
- 5-10kg: Higher tier
- 10-20kg: Premium tier

### 3. **Free Shipping Threshold**
- Cart value ≥ £30 → FREE Royal Mail 48 (UK Mainland only)
- Other zones have different thresholds or no free shipping

### 4. **Multiple Carrier Options**
Customer can choose:
- **Click & Collect**: Free, same day ready
- **Royal Mail 48**: Standard, 2-3 days
- **Royal Mail 24**: Express, 1-2 days
- **DPD Next Day**: Premium, next day

### 5. **Performance Optimized**
- Memory caching (5 minutes)
- Database indexes on key columns
- Fast postcode pattern matching
- Async/await throughout

---

## 🧪 Testing Scenarios

### Test 1: UK Mainland Order (Free Shipping)
```json
{
  "postcode": "SW1A 1AA",
  "totalWeight": 1.5,
  "cartValue": 35.00,
  "itemCount": 2
}
```
**Expected Result:**
- Zone: UK Mainland
- Free shipping available (cart > £30)
- Royal Mail 48: £0.00 (FREE)
- Royal Mail 24: £8.99
- DPD: £10.99

### Test 2: Scottish Highlands (Higher Rate)
```json
{
  "postcode": "IV1 1AA",
  "totalWeight": 2.5,
  "cartValue": 25.00,
  "itemCount": 3
}
```
**Expected Result:**
- Zone: Scottish Highlands & Islands
- No free shipping (threshold not met)
- Royal Mail 48: £10.48
- Royal Mail 24: £14.60

### Test 3: Northern Ireland
```json
{
  "postcode": "BT1 1AA",
  "totalWeight": 1.5,
  "cartValue": 40.00,
  "itemCount": 2
}
```
**Expected Result:**
- Zone: Northern Ireland
- Royal Mail 48: £5.99
- Royal Mail 24: £8.99

### Test 4: Heavy Package
```json
{
  "postcode": "E1 1AA",
  "totalWeight": 12.0,
  "cartValue": 60.00,
  "itemCount": 5
}
```
**Expected Result:**
- Zone: UK Mainland
- Weight tier: 10-20kg
- Royal Mail 48: £12.99 (heavier = more expensive)

---

## 📦 Postcode Zone Mapping Examples

| Postcode Pattern | Zone | Example |
|-----------------|------|---------|
| `BT` | Northern Ireland | BT1, BT20 |
| `AB31-38` | Scottish Highlands | AB31 1AA |
| `IV` | Scottish Highlands | IV1 1AA |
| `PH` | Scottish Highlands | PH1 1AA |
| `GY` | Offshore Islands | GY1 1AA (Guernsey) |
| `JE` | Offshore Islands | JE1 1AA (Jersey) |
| `IM` | Offshore Islands | IM1 1AA (Isle of Man) |
| `SW`, `E`, `N`, `W`, etc. | UK Mainland | SW1A 1AA |

---

## 🔧 Managing Shipping Rates

### Updating Rates in Database

**Example: Update Royal Mail 48 rate for UK Mainland**
```sql
UPDATE ShippingRates
SET BaseRate = 4.99,
    PerKgRate = 0.75,
    FreeShippingThreshold = 35.00
WHERE ShippingMethodId = (SELECT Id FROM ShippingMethods WHERE Name = 'royal-mail-48')
  AND ShippingZoneId = (SELECT Id FROM ShippingZones WHERE Name = 'UK Mainland')
  AND WeightFrom = 0
  AND WeightTo = 2;
```

### Adding New Zone
```sql
INSERT INTO ShippingZones (Id, Name, Description, Country, IsActive, DisplayOrder, CreatedAt, CreatedBy, IsDeleted)
VALUES (NEWID(), 'Channel Islands', 'Jersey, Guernsey', 'GB', 1, 5, GETUTCDATE(), 'System', 0);

-- Add postcode mappings for new zone
INSERT INTO PostcodeZoneMappings (Id, PostcodePattern, ShippingZoneId, Priority, IsActive, CreatedAt, CreatedBy, IsDeleted)
VALUES
  (NEWID(), 'GY', @NewZoneId, 100, 1, GETUTCDATE(), 'System', 0),
  (NEWID(), 'JE', @NewZoneId, 100, 1, GETUTCDATE(), 'System', 0);
```

### Enable/Disable Shipping Method
```sql
-- Disable DPD temporarily
UPDATE ShippingMethods
SET IsActive = 0
WHERE Name = 'dpd-next-day';

-- Re-enable
UPDATE ShippingMethods
SET IsActive = 1
WHERE Name = 'dpd-next-day';
```

---

## 📈 Monitoring & Analytics

### Most Popular Shipping Methods
```sql
SELECT
    sm.DisplayName,
    COUNT(*) AS OrderCount,
    SUM(o.ShippingAmount) AS TotalRevenue,
    AVG(o.ShippingAmount) AS AvgCost
FROM Orders o
JOIN ShippingMethods sm ON o.ShippingMethodId = sm.Id
WHERE o.CreatedAt >= DATEADD(day, -30, GETUTCDATE())
GROUP BY sm.DisplayName
ORDER BY OrderCount DESC;
```

### Shipping Cost by Zone
```sql
SELECT
    sz.Name AS Zone,
    AVG(o.ShippingAmount) AS AvgCost,
    COUNT(*) AS OrderCount,
    SUM(CASE WHEN o.ShippingAmount = 0 THEN 1 ELSE 0 END) AS FreeShippingCount
FROM Orders o
JOIN ShippingZones sz ON o.ShippingZoneId = sz.Id
WHERE o.CreatedAt >= DATEADD(day, -30, GETUTCDATE())
GROUP BY sz.Name
ORDER BY OrderCount DESC;
```

### Free Shipping Utilization
```sql
SELECT
    CASE WHEN o.ShippingAmount = 0 THEN 'Free' ELSE 'Paid' END AS ShippingType,
    COUNT(*) AS OrderCount,
    COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() AS Percentage
FROM Orders o
WHERE o.CreatedAt >= DATEADD(day, -30, GETUTCDATE())
GROUP BY CASE WHEN o.ShippingAmount = 0 THEN 'Free' ELSE 'Paid' END;
```

---

## ✅ Production Checklist

- [ ] Database tables created successfully
- [ ] All 4 UK zones configured and active
- [ ] Shipping rates tested for each zone
- [ ] Postcode validation working correctly
- [ ] Free shipping thresholds configured
- [ ] Warehouse address updated in appsettings.json
- [ ] Memory caching working (check performance)
- [ ] API endpoints tested with various postcodes
- [ ] Frontend integrated with shipping quote API
- [ ] Error handling tested (invalid postcodes, etc.)

---

## 🎉 That's It!

Your shipping module is a **simple, database-driven calculator** that:
- ✅ Shows customers accurate shipping costs
- ✅ Calculates based on zone, weight, and cart value
- ✅ Handles 600+ orders/day with caching
- ✅ Requires ZERO external API calls
- ✅ Easy to manage (update rates in database)

**No complexity, no API integrations, no carrier dependencies!**

### What This Module Does NOT Do:
- ❌ Generate shipping labels (separate module)
- ❌ Call Royal Mail/Yodel APIs (separate module)
- ❌ Track shipments (separate module)
- ❌ Print labels (separate module)

**This module's only job:** Tell customers how much shipping costs and when it will arrive.

Simple and effective! 🚀
