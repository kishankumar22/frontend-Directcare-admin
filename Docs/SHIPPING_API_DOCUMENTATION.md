# Shipping Module API Documentation
## Complete Guide for Frontend & Admin Panel Integration

---

## ✅ API Status Overview

### Currently Working (Production Ready)
| API | Endpoint | Status | Usage |
|-----|----------|--------|-------|
| Get Shipping Quote | `POST /api/shipping/quote` | ✅ **Working** | Frontend checkout |
| Validate Postcode | `GET /api/shipping/validate-postcode/{postcode}` | ✅ **Working** | Address validation |

### Planned (Use Database Directly)
| API | Endpoint | Status | Alternative |
|-----|----------|--------|-------------|
| Get Zones | `GET /api/shipping/admin/zones` | 🔴 TODO | Direct SQL query |
| Get Methods | `GET /api/shipping/admin/methods` | 🔴 TODO | Direct SQL query |
| Update Rates | `PUT /api/shipping/admin/rates/{id}` | 🔴 TODO | Direct SQL UPDATE |
| Get Zone Rates | `GET /api/shipping/admin/zones/{id}/rates` | 🔴 TODO | Direct SQL query |

---

## 📋 Table of Contents
1. [Customer-Facing APIs (Frontend)](#customer-facing-apis-frontend)
2. [Admin Panel APIs (Management)](#admin-panel-apis-management)
3. [Database Management](#database-management)
4. [Common Workflows](#common-workflows)
5. [Error Handling](#error-handling)

---

## 🛒 Customer-Facing APIs (Frontend)

### 1. Get Shipping Quote (Checkout Page)

**Endpoint:** `POST /api/shipping/quote`

**Purpose:** Calculate shipping cost based on customer's cart and delivery address.

**Use Case:**
- Show shipping options during checkout
- Calculate total order cost
- Let customer choose delivery method

**Request:**
```json
{
  "postcode": "SW1A 1AA",
  "totalWeight": 2.5,
  "cartValue": 45.00,
  "itemCount": 3,
  "productIds": ["guid1", "guid2", "guid3"]
}
```

**Request Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| postcode | string | ✅ Yes | UK postcode (e.g., "SW1A 1AA", "BT1 1AA") |
| totalWeight | decimal | ✅ Yes | Total cart weight in kg |
| cartValue | decimal | ✅ Yes | Cart subtotal (before shipping) |
| itemCount | integer | ✅ Yes | Number of items in cart |
| productIds | array | ❌ No | Product GUIDs (for future features) |

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
        "shippingMethodId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
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
        "shippingMethodId": "b2c3d4e5-f6g7-8901-bcde-fg2345678901",
        "methodName": "royal-mail-48",
        "displayName": "Royal Mail 48 (Standard)",
        "description": "2-3 business days delivery",
        "carrierCode": "ROYAL_MAIL",
        "price": 0.00,
        "isFree": true,
        "estimatedDelivery": "2-3 business days",
        "trackingSupported": true
      },
      {
        "shippingMethodId": "c3d4e5f6-g7h8-9012-cdef-gh3456789012",
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
        "shippingMethodId": "d4e5f6g7-h8i9-0123-defg-hi4567890123",
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
    "recommendedOption": {
      "shippingMethodId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "methodName": "click-and-collect",
      "displayName": "Click & Collect",
      "price": 0.00,
      "isFree": true
    },
    "hasFreeShipping": true
  },
  "message": "Shipping quote generated successfully"
}
```

**Frontend Implementation (React/Vue/Angular):**

```javascript
// Checkout page - Calculate shipping
async function calculateShipping(cart, deliveryAddress) {
  try {
    const response = await fetch('http://localhost:5285/api/shipping/quote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        postcode: deliveryAddress.postcode,
        totalWeight: cart.items.reduce((sum, item) => sum + (item.weight * item.quantity), 0),
        cartValue: cart.subtotal,
        itemCount: cart.items.length,
        productIds: cart.items.map(item => item.productId)
      })
    });

    const result = await response.json();

    if (result.success) {
      // Display shipping options to customer
      displayShippingOptions(result.data.availableOptions);

      // Highlight recommended option
      highlightRecommended(result.data.recommendedOption);

      // Show free shipping badge if available
      if (result.data.hasFreeShipping) {
        showFreeShippingBadge();
      }
    }
  } catch (error) {
    console.error('Shipping calculation failed:', error);
    showErrorMessage('Unable to calculate shipping. Please try again.');
  }
}

// Display options in UI
function displayShippingOptions(options) {
  const container = document.getElementById('shipping-options');

  options.forEach(option => {
    const optionHtml = `
      <div class="shipping-option" data-method-id="${option.shippingMethodId}">
        <input type="radio" name="shipping" value="${option.shippingMethodId}">
        <div class="option-details">
          <h4>${option.displayName}</h4>
          <p>${option.description}</p>
          <p class="delivery-time">${option.estimatedDelivery}</p>
        </div>
        <div class="option-price">
          ${option.isFree ? '<span class="free-badge">FREE</span>' : `£${option.price.toFixed(2)}`}
        </div>
      </div>
    `;
    container.innerHTML += optionHtml;
  });
}
```

---

### 2. Validate Postcode

**Endpoint:** `GET /api/shipping/validate-postcode/{postcode}`

**Purpose:** Quick postcode validation and zone detection.

**Use Case:**
- Validate postcode when customer enters it
- Show delivery zone immediately
- Pre-calculate if free shipping available

**Request:**
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
  },
  "message": "Postcode is valid"
}
```

**Frontend Implementation:**

```javascript
// Address form - Validate postcode on blur
async function validatePostcode(postcode) {
  // Remove spaces and convert to uppercase
  const cleanPostcode = postcode.replace(/\s/g, '').toUpperCase();

  try {
    const response = await fetch(
      `http://localhost:5285/api/shipping/validate-postcode/${cleanPostcode}`
    );
    const result = await response.json();

    if (result.success && result.data.isValid) {
      // Show zone information
      document.getElementById('delivery-zone').textContent =
        `Delivery Zone: ${result.data.zoneName}`;

      // Show free shipping availability
      if (result.data.hasFreeShippingAvailable) {
        showMessage('Free shipping available for this postcode!', 'success');
      }

      return true;
    } else {
      showMessage('Invalid UK postcode. Please check and try again.', 'error');
      return false;
    }
  } catch (error) {
    console.error('Postcode validation failed:', error);
    return false;
  }
}

// Use in form
document.getElementById('postcode-input').addEventListener('blur', (e) => {
  validatePostcode(e.target.value);
});
```

---

## 🔧 Admin Panel APIs (Management)

> **⚠️ Note:** Admin APIs are currently **TODO** - Database-level management ke liye direct SQL use karein (examples neeche diye hain)

### 3. Get All Shipping Zones ⚠️ (Planned - Use Database)

**Endpoint:** `GET /api/shipping/admin/zones`

**Status:** 🔴 Not Yet Implemented (TODO)

**Current Solution:** Direct database query use karein:

```sql
-- Get all shipping zones
SELECT Id, Name, Description, Country, IsActive, DisplayOrder
FROM ShippingZones
WHERE IsDeleted = 0
ORDER BY DisplayOrder;
```

**Purpose:** List all shipping zones for management.

**Use Case:**
- Admin dashboard - view all zones
- Configure zone settings
- Enable/disable zones

**Request:**
```http
GET /api/shipping/zones
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "zone-guid-1",
      "name": "UK Mainland",
      "description": "England, Wales, Southern Scotland",
      "country": "GB",
      "isActive": true,
      "displayOrder": 1,
      "postcodePatterns": ["SW", "E", "N", "W", "SE", "NW", "EC", "WC"],
      "createdAt": "2025-12-20T10:00:00Z"
    },
    {
      "id": "zone-guid-2",
      "name": "Scottish Highlands & Islands",
      "description": "Remote Scottish areas",
      "country": "GB",
      "isActive": true,
      "displayOrder": 2,
      "postcodePatterns": ["IV", "HS", "KW", "PA", "PH", "AB3"],
      "createdAt": "2025-12-20T10:00:00Z"
    }
  ],
  "message": "Zones retrieved successfully"
}
```

**Admin Panel Implementation:**

```javascript
// Admin Dashboard - Zone Management
async function loadShippingZones() {
  try {
    const response = await fetch('http://localhost:5285/api/shipping/zones', {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    const result = await response.json();

    if (result.success) {
      displayZonesTable(result.data);
    }
  } catch (error) {
    console.error('Failed to load zones:', error);
  }
}

function displayZonesTable(zones) {
  const tbody = document.querySelector('#zones-table tbody');
  tbody.innerHTML = '';

  zones.forEach(zone => {
    const row = `
      <tr>
        <td>${zone.name}</td>
        <td>${zone.description}</td>
        <td>${zone.country}</td>
        <td>
          <span class="badge ${zone.isActive ? 'success' : 'danger'}">
            ${zone.isActive ? 'Active' : 'Inactive'}
          </span>
        </td>
        <td>
          <button onclick="editZone('${zone.id}')">Edit</button>
          <button onclick="viewRates('${zone.id}')">View Rates</button>
        </td>
      </tr>
    `;
    tbody.innerHTML += row;
  });
}
```

---

### 4. Get All Shipping Methods ⚠️ (Planned - Use Database)

**Endpoint:** `GET /api/shipping/admin/methods`

**Status:** 🔴 Not Yet Implemented (TODO)

**Current Solution:** Direct database query:

```sql
-- Get all shipping methods
SELECT Id, Name, DisplayName, Description, CarrierCode, IsActive, DisplayOrder
FROM ShippingMethods
WHERE IsDeleted = 0
ORDER BY DisplayOrder;
```

**Purpose:** List all shipping methods (Royal Mail 48, DPD, etc.).

**Use Case:**
- Admin panel - manage carriers
- Enable/disable shipping methods
- Update delivery times

**Request:**
```http
GET /api/shipping/methods
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "method-guid-1",
      "name": "royal-mail-48",
      "displayName": "Royal Mail 48 (Standard)",
      "description": "2-3 business days delivery",
      "carrierCode": "ROYAL_MAIL",
      "serviceCode": "48",
      "deliveryTimeMinDays": 2,
      "deliveryTimeMaxDays": 3,
      "trackingSupported": true,
      "signatureRequired": false,
      "isActive": true,
      "displayOrder": 2
    },
    {
      "id": "method-guid-2",
      "name": "dpd-next-day",
      "displayName": "DPD Next Day",
      "description": "Next business day delivery before 6pm",
      "carrierCode": "DPD",
      "serviceCode": "NEXT_DAY",
      "deliveryTimeMinDays": 1,
      "deliveryTimeMaxDays": 1,
      "trackingSupported": true,
      "signatureRequired": true,
      "isActive": true,
      "displayOrder": 4
    }
  ],
  "message": "Methods retrieved successfully"
}
```

**Admin Panel Implementation:**

```javascript
// Admin - Enable/Disable Shipping Method
async function toggleShippingMethod(methodId, isActive) {
  try {
    const response = await fetch(
      `http://localhost:5285/api/shipping/methods/${methodId}/toggle`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive })
      }
    );

    const result = await response.json();

    if (result.success) {
      showNotification(
        `${isActive ? 'Enabled' : 'Disabled'} shipping method successfully`,
        'success'
      );
      loadShippingMethods(); // Refresh list
    }
  } catch (error) {
    console.error('Failed to toggle method:', error);
  }
}
```

---

### 5. Get Shipping Rates by Zone ⚠️ (Planned - Use Database)

**Endpoint:** `GET /api/shipping/admin/zones/{zoneId}/rates`

**Status:** 🔴 Not Yet Implemented (TODO)

**Current Solution:** Direct database query:

```sql
-- Get all rates for a specific zone
SELECT
  sr.Id,
  sm.DisplayName AS ShippingMethodName,
  sr.WeightFrom,
  sr.WeightTo,
  sr.BaseRate,
  sr.PerKgRate,
  sr.FreeShippingThreshold,
  sr.IsActive
FROM ShippingRates sr
JOIN ShippingMethods sm ON sr.ShippingMethodId = sm.Id
WHERE sr.ShippingZoneId = 'your-zone-guid-here'
  AND sr.IsDeleted = 0
ORDER BY sm.DisplayOrder, sr.WeightFrom;
```

**Purpose:** Get all rates for a specific zone.

**Use Case:**
- Admin panel - view/edit zone pricing
- Adjust rates based on weight
- Set free shipping thresholds

**Request:**
```http
GET /api/shipping/zones/zone-guid-1/rates
```

**Response:**
```json
{
  "success": true,
  "data": {
    "zoneName": "UK Mainland",
    "rates": [
      {
        "id": "rate-guid-1",
        "shippingMethodName": "Royal Mail 48",
        "weightFrom": 0.0,
        "weightTo": 2.0,
        "baseRate": 3.99,
        "perKgRate": 0.50,
        "perItemRate": 0.00,
        "minimumCharge": 3.99,
        "maximumCharge": null,
        "freeShippingThreshold": 30.00,
        "isActive": true
      },
      {
        "id": "rate-guid-2",
        "shippingMethodName": "Royal Mail 48",
        "weightFrom": 2.0,
        "weightTo": 5.0,
        "baseRate": 4.99,
        "perKgRate": 0.75,
        "perItemRate": 0.00,
        "minimumCharge": 4.99,
        "maximumCharge": null,
        "freeShippingThreshold": 30.00,
        "isActive": true
      }
    ]
  },
  "message": "Rates retrieved successfully"
}
```

**Admin Panel - Rate Management:**

```javascript
// Admin - Update Shipping Rate
async function updateShippingRate(rateId, updates) {
  try {
    const response = await fetch(
      `http://localhost:5285/api/shipping/rates/${rateId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          baseRate: updates.baseRate,
          perKgRate: updates.perKgRate,
          freeShippingThreshold: updates.freeShippingThreshold
        })
      }
    );

    const result = await response.json();

    if (result.success) {
      showNotification('Rate updated successfully', 'success');
      loadZoneRates(zoneId); // Refresh
    }
  } catch (error) {
    console.error('Failed to update rate:', error);
  }
}

// Rate Editor Form
function showRateEditor(rate) {
  const editorHtml = `
    <form id="rate-editor-form">
      <h3>Edit Rate: ${rate.shippingMethodName} (${rate.weightFrom}-${rate.weightTo}kg)</h3>

      <label>Base Rate (£):</label>
      <input type="number" step="0.01" name="baseRate" value="${rate.baseRate}">

      <label>Per Kg Rate (£):</label>
      <input type="number" step="0.01" name="perKgRate" value="${rate.perKgRate}">

      <label>Free Shipping Threshold (£):</label>
      <input type="number" step="0.01" name="freeShippingThreshold"
             value="${rate.freeShippingThreshold || ''}">

      <button type="submit">Save Changes</button>
    </form>
  `;

  document.getElementById('rate-editor').innerHTML = editorHtml;

  document.getElementById('rate-editor-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    updateShippingRate(rate.id, {
      baseRate: parseFloat(formData.get('baseRate')),
      perKgRate: parseFloat(formData.get('perKgRate')),
      freeShippingThreshold: parseFloat(formData.get('freeShippingThreshold'))
    });
  });
}
```

---

## 🗄️ Database Management

### Direct SQL Updates (For Advanced Management)

#### 1. Update Free Shipping Threshold

```sql
-- Change free shipping from £30 to £25 for UK Mainland
UPDATE ShippingRates
SET FreeShippingThreshold = 25.00
WHERE ShippingZoneId = (SELECT Id FROM ShippingZones WHERE Name = 'UK Mainland')
  AND ShippingMethodId = (SELECT Id FROM ShippingMethods WHERE Name = 'royal-mail-48');
```

#### 2. Make Shipping Completely Free for a Zone

```sql
-- Make all Royal Mail 48 shipping free for UK Mainland
UPDATE ShippingRates
SET BaseRate = 0.00,
    PerKgRate = 0.00,
    FreeShippingThreshold = 0.00
WHERE ShippingZoneId = (SELECT Id FROM ShippingZones WHERE Name = 'UK Mainland')
  AND ShippingMethodId = (SELECT Id FROM ShippingMethods WHERE Name = 'royal-mail-48');
```

#### 3. Disable Shipping Method Temporarily

```sql
-- Disable DPD Next Day temporarily
UPDATE ShippingMethods
SET IsActive = 0
WHERE Name = 'dpd-next-day';
```

#### 4. Add New Postcode to Zone

```sql
-- Add new postcode pattern to Northern Ireland zone
INSERT INTO PostcodeZoneMappings
  (Id, PostcodePattern, ShippingZoneId, Priority, IsActive, CreatedAt, CreatedBy, IsDeleted)
VALUES
  (NEWID(),
   'BT9',
   (SELECT Id FROM ShippingZones WHERE Name = 'Northern Ireland'),
   100,
   1,
   GETUTCDATE(),
   'Admin',
   0);
```

---

## 🔄 Common Workflows

### Workflow 1: Customer Checkout Process

```javascript
// Step 1: Customer enters delivery address
async function handleAddressEntry(address) {
  // Validate postcode first
  const isValid = await validatePostcode(address.postcode);

  if (!isValid) {
    showError('Please enter a valid UK postcode');
    return;
  }

  // Step 2: Calculate shipping options
  const cart = getCartData();
  const shippingOptions = await calculateShipping(cart, address);

  // Step 3: Display options to customer
  displayShippingOptions(shippingOptions.availableOptions);

  // Step 4: Customer selects shipping method
  return new Promise((resolve) => {
    document.querySelectorAll('input[name="shipping"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        const selectedOption = shippingOptions.availableOptions.find(
          opt => opt.shippingMethodId === e.target.value
        );
        resolve(selectedOption);
      });
    });
  });
}

// Step 5: Create order with selected shipping
async function completeCheckout(orderData, selectedShipping) {
  const orderRequest = {
    ...orderData,
    shippingMethodId: selectedShipping.shippingMethodId,
    shippingAmount: selectedShipping.price,
    estimatedDelivery: selectedShipping.estimatedDelivery
  };

  const response = await fetch('http://localhost:5285/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderRequest)
  });

  return response.json();
}
```

### Workflow 2: Admin Updates Shipping Rates

```javascript
// Admin adjusts rates for seasonal promotion
async function applySeasonalPromotion() {
  // Get all UK Mainland rates
  const zones = await fetch('http://localhost:5285/api/shipping/zones').then(r => r.json());
  const ukMainland = zones.data.find(z => z.name === 'UK Mainland');

  const rates = await fetch(
    `http://localhost:5285/api/shipping/zones/${ukMainland.id}/rates`
  ).then(r => r.json());

  // Lower free shipping threshold for promotion
  for (const rate of rates.data.rates) {
    await updateShippingRate(rate.id, {
      ...rate,
      freeShippingThreshold: 20.00 // Was £30, now £20
    });
  }

  console.log('Seasonal promotion applied: Free shipping at £20!');
}
```

---

## ⚠️ Error Handling

### Common Errors and Solutions

#### 1. Invalid Postcode
```json
{
  "success": false,
  "message": "Invalid UK postcode format",
  "errors": ["Postcode must be in UK format (e.g., SW1A 1AA)"]
}
```

**Solution:**
```javascript
function formatPostcode(input) {
  // Remove spaces and convert to uppercase
  const clean = input.replace(/\s/g, '').toUpperCase();

  // Add space before last 3 characters for UK format
  if (clean.length > 3) {
    return clean.slice(0, -3) + ' ' + clean.slice(-3);
  }
  return clean;
}
```

#### 2. Zone Not Found
```json
{
  "success": false,
  "message": "No shipping zone found for postcode",
  "errors": ["Postcode BT99 does not match any configured shipping zone"]
}
```

**Solution:** Admin needs to add postcode pattern to a zone in database.

#### 3. No Shipping Methods Available
```json
{
  "success": false,
  "message": "No active shipping methods for this zone",
  "errors": ["All shipping methods are currently disabled"]
}
```

**Solution:** Admin needs to enable at least one shipping method.

---

## 📊 Analytics & Reporting

### Get Shipping Statistics (Admin)

```sql
-- Most popular shipping methods (last 30 days)
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

-- Free shipping usage rate
SELECT
  CASE WHEN o.ShippingAmount = 0 THEN 'Free' ELSE 'Paid' END AS ShippingType,
  COUNT(*) AS OrderCount,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() AS Percentage
FROM Orders o
WHERE o.CreatedAt >= DATEADD(day, -30, GETUTCDATE())
GROUP BY CASE WHEN o.ShippingAmount = 0 THEN 'Free' ELSE 'Paid' END;
```

---

## 🎯 Quick Reference

### Frontend Checklist
- ✅ Call `/api/shipping/validate-postcode` when customer enters postcode
- ✅ Call `/api/shipping/quote` before showing checkout total
- ✅ Display all shipping options with prices
- ✅ Highlight free shipping when available
- ✅ Show estimated delivery times
- ✅ Pass selected `shippingMethodId` to order creation

### Admin Panel Checklist
- ✅ View all zones: `GET /api/shipping/zones`
- ✅ View all methods: `GET /api/shipping/methods`
- ✅ View zone rates: `GET /api/shipping/zones/{id}/rates`
- ✅ Update rates via database SQL
- ✅ Monitor shipping analytics
- ✅ Enable/disable methods as needed

### Configuration Files
- **appsettings.json**: Free shipping threshold, warehouse details
- **Database**: ShippingRates table for pricing
- **ShippingZones**: Zone definitions
- **PostcodeZoneMappings**: Postcode patterns

---

## 📞 Support

**Database is already configured with:**
- ✅ 4 UK Zones (Mainland, Highlands, NI, Offshore)
- ✅ 4 Shipping Methods (Click & Collect, Royal Mail 48/24, DPD)
- ✅ Weight-based rates
- ✅ 600+ postcode patterns
- ✅ Free shipping at £30+ (UK Mainland)

**No external API calls needed** - Everything runs from your database!
