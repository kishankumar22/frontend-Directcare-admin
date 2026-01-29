# Order Edit & Invoice API Documentation

## Base URL
```
Production: https://your-domain.com/api
Development: http://localhost:5285/api
```

## Authentication
All endpoints require **Admin** role authentication.

**Headers Required:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

---

# Table of Contents
1. [Edit Order](#1-edit-order)
2. [Process Full Refund](#2-process-full-refund)
3. [Process Partial Refund](#3-process-partial-refund)
4. [Get Refund History](#4-get-refund-history)
5. [Get Edit History](#5-get-edit-history)
6. [Regenerate Invoice](#6-regenerate-invoice)
7. [Enums & Constants](#7-enums--constants)
8. [Response DTOs](#8-response-dtos)

---

# 1. Edit Order

Edit order items, quantities, prices, and addresses.

## Endpoint
```
PUT /api/orders/{orderId}/edit
```

## Supported Operations

| Operation Type | Value | Description |
|----------------|-------|-------------|
| UpdateQuantity | 1 | Change item quantity |
| UpdatePrice | 2 | Change item unit price |
| RemoveItem | 3 | Remove item from order |
| AddItem | 4 | Add new product to order |
| ReplaceItem | 5 | Replace item with different product |

## Request Body

```json
{
  "orderId": "bc7e49ef-0464-470c-87bb-d71d60c7b597",
  "operations": [
    {
      "operationType": 1,
      "orderItemId": "5dfd7462-6c27-42cf-90c0-016284817332",
      "newQuantity": 3
    }
  ],
  "editReason": "Customer requested quantity change",
  "adminNotes": "Called customer to confirm",
  "recalculateTotals": true,
  "adjustInventory": true,
  "sendCustomerNotification": true,
  "billingAddress": null,
  "shippingAddress": null
}
```

## Request Parameters

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| orderId | guid | Yes | - | Order ID (must match URL) |
| operations | array | No* | [] | List of edit operations |
| editReason | string | No | null | Reason for the edit |
| adminNotes | string | No | null | Internal admin notes |
| recalculateTotals | boolean | No | true | Auto-recalculate totals |
| adjustInventory | boolean | No | true | Auto-adjust stock |
| sendCustomerNotification | boolean | No | true | Send email to customer |
| billingAddress | object | No | null | New billing address |
| shippingAddress | object | No | null | New shipping address |

*At least one operation OR address change is required.

## Operation Parameters

### UpdateQuantity (operationType: 1)
```json
{
  "operationType": 1,
  "orderItemId": "guid-of-existing-item",
  "newQuantity": 5
}
```

### UpdatePrice (operationType: 2)
```json
{
  "operationType": 2,
  "orderItemId": "guid-of-existing-item",
  "newUnitPrice": 29.99
}
```

### RemoveItem (operationType: 3)
```json
{
  "operationType": 3,
  "orderItemId": "guid-of-existing-item"
}
```

### AddItem (operationType: 4)
```json
{
  "operationType": 4,
  "productId": "guid-of-product-to-add",
  "productVariantId": null,
  "newQuantity": 2,
  "newUnitPrice": 149.99
}
```
*Note: If `newUnitPrice` is not provided, product's current price will be used.*

### ReplaceItem (operationType: 5)
```json
{
  "operationType": 5,
  "orderItemId": "guid-of-existing-item",
  "replacementProductId": "guid-of-new-product",
  "replacementProductVariantId": null,
  "newQuantity": 1,
  "newUnitPrice": 199.99
}
```

## Address Object Structure

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "company": "Acme Corp",
  "addressLine1": "123 Main Street",
  "addressLine2": "Apt 4B",
  "city": "London",
  "state": "Greater London",
  "postalCode": "SW1A 1AA",
  "country": "United Kingdom",
  "phoneNumber": "+44 20 1234 5678"
}
```

## Success Response (200 OK)

```json
{
  "success": true,
  "message": "Order edited successfully",
  "data": {
    "orderId": "bc7e49ef-0464-470c-87bb-d71d60c7b597",
    "orderNumber": "ORD-20260128-000055",
    "success": true,
    "message": "Order edited successfully",
    "oldSubtotal": 529.59,
    "newSubtotal": 1129.59,
    "oldTaxAmount": 20.00,
    "newTaxAmount": 45.00,
    "oldTotalAmount": 555.58,
    "newTotalAmount": 1180.58,
    "priceDifference": 625.00,
    "itemChanges": [
      {
        "changeType": "Updated",
        "productName": "Spatone Natural Iron Supplement",
        "productSku": "HEADPHONE-PREMIUM-001",
        "oldQuantity": 1,
        "newQuantity": 3,
        "oldUnitPrice": 400.00,
        "newUnitPrice": 400.00,
        "oldTotalPrice": 400.00,
        "newTotalPrice": 1200.00
      }
    ],
    "billingAddressChanged": false,
    "shippingAddressChanged": false,
    "inventoryAdjustments": [
      {
        "productId": "74f9a441-0459-4f3e-baa8-00378b9e4005",
        "productName": "Spatone Natural Iron Supplement",
        "productSku": "HEADPHONE-PREMIUM-001",
        "quantityAdjusted": -2,
        "adjustmentType": "Deducted"
      }
    ],
    "refundRecommended": false,
    "recommendedRefundAmount": 0,
    "updatedOrder": {
      // Full OrderDto object
    }
  },
  "errors": []
}
```

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Order cannot be edited in its current status",
  "data": null,
  "errors": ["Order with status 'Delivered' cannot be edited"]
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Order not found",
  "data": null,
  "errors": []
}
```

---

# 2. Process Full Refund

Refund the entire order amount via Stripe.

## Endpoint
```
POST /api/orders/{orderId}/refund
```

## Request Body

```json
{
  "orderId": "bc7e49ef-0464-470c-87bb-d71d60c7b597",
  "reason": 1,
  "reasonDetails": "Customer requested cancellation",
  "adminNotes": "Processed via phone request",
  "restoreInventory": true,
  "sendCustomerNotification": true
}
```

## Request Parameters

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| orderId | guid | Yes | - | Order ID |
| reason | integer | Yes | - | RefundReason enum value |
| reasonDetails | string | No | null | Additional details |
| adminNotes | string | No | null | Internal notes |
| restoreInventory | boolean | No | true | Restore stock levels |
| sendCustomerNotification | boolean | No | true | Send email notification |

## RefundReason Enum Values

| Value | Name | Description |
|-------|------|-------------|
| 1 | CustomerRequest | Customer asked for refund |
| 2 | OrderCancellation | Order cancelled |
| 3 | ItemOutOfStock | Item not available |
| 4 | DamagedItem | Item was damaged |
| 5 | WrongItemShipped | Incorrect item sent |
| 6 | PriceAdjustment | Price correction |
| 7 | DuplicateCharge | Charged twice |
| 8 | ServiceIssue | Service problem |
| 9 | PartialOrderCancellation | Part of order cancelled |
| 10 | QualityIssue | Quality problem |
| 11 | LateDelivery | Delivery was late |
| 99 | Other | Other reason |

## Success Response (200 OK)

```json
{
  "success": true,
  "message": "Refund processed successfully",
  "data": {
    "orderId": "bc7e49ef-0464-470c-87bb-d71d60c7b597",
    "orderNumber": "ORD-20260128-000055",
    "refundId": "re_3N1234567890abcdef",
    "refundAmount": 555.58,
    "remainingRefundableAmount": 0,
    "isFullyRefunded": true,
    "paymentStatus": "Refunded",
    "stockRestored": true,
    "loyaltyPointsReversed": 556,
    "refundDate": "2026-01-29T10:30:00Z"
  },
  "errors": []
}
```

---

# 3. Process Partial Refund

Refund a specific amount (supports multiple partial refunds).

## Endpoint
```
POST /api/orders/{orderId}/partial-refund
```

## Request Body

```json
{
  "orderId": "bc7e49ef-0464-470c-87bb-d71d60c7b597",
  "refundAmount": 100.00,
  "reason": 6,
  "reasonDetails": "Price adjustment for damaged packaging",
  "adminNotes": "Customer received 10% discount",
  "sendCustomerNotification": true
}
```

## Request Parameters

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| orderId | guid | Yes | - | Order ID |
| refundAmount | decimal | Yes | - | Amount to refund |
| reason | integer | Yes | - | RefundReason enum value |
| reasonDetails | string | No | null | Additional details |
| adminNotes | string | No | null | Internal notes |
| sendCustomerNotification | boolean | No | true | Send email notification |

## Success Response (200 OK)

```json
{
  "success": true,
  "message": "Partial refund processed successfully",
  "data": {
    "orderId": "bc7e49ef-0464-470c-87bb-d71d60c7b597",
    "orderNumber": "ORD-20260128-000055",
    "refundId": "re_3N9876543210fedcba",
    "refundAmount": 100.00,
    "remainingRefundableAmount": 455.58,
    "isFullyRefunded": false,
    "paymentStatus": "PartiallyRefunded",
    "stockRestored": false,
    "loyaltyPointsReversed": null,
    "refundDate": "2026-01-29T11:00:00Z"
  },
  "errors": []
}
```

---

# 4. Get Refund History

Get all refunds for an order.

## Endpoint
```
GET /api/orders/{orderId}/refund-history
```

## Success Response (200 OK)

```json
{
  "success": true,
  "message": null,
  "data": {
    "orderId": "bc7e49ef-0464-470c-87bb-d71d60c7b597",
    "orderNumber": "ORD-20260128-000055",
    "originalOrderAmount": 555.58,
    "totalRefunded": 200.00,
    "remainingBalance": 355.58,
    "isFullyRefunded": false,
    "paymentStatus": "PartiallyRefunded",
    "refunds": [
      {
        "refundId": "re_3N1111111111111111",
        "amount": 100.00,
        "currency": "GBP",
        "reason": "PriceAdjustment",
        "reasonDetails": "Damaged packaging discount",
        "processedBy": "admin@example.com",
        "processedAt": "2026-01-29T10:00:00Z",
        "isPartial": true
      },
      {
        "refundId": "re_3N2222222222222222",
        "amount": 100.00,
        "currency": "GBP",
        "reason": "CustomerRequest",
        "reasonDetails": "Changed mind on one item",
        "processedBy": "admin@example.com",
        "processedAt": "2026-01-29T11:00:00Z",
        "isPartial": true
      }
    ]
  },
  "errors": []
}
```

---

# 5. Get Edit History

Get all edit history for an order.

## Endpoint
```
GET /api/orders/{orderId}/edit-history
```

## Success Response (200 OK)

```json
{
  "success": true,
  "message": null,
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "orderId": "bc7e49ef-0464-470c-87bb-d71d60c7b597",
      "changeType": "ItemQuantityUpdated",
      "changedBy": "admin@example.com",
      "changeDate": "2026-01-29T09:30:00Z",
      "changeDetails": {
        "productName": "Spatone Natural Iron Supplement",
        "productSku": "HEADPHONE-PREMIUM-001",
        "oldQuantity": 1,
        "newQuantity": 5
      },
      "oldSubtotal": 529.59,
      "newSubtotal": 2129.59,
      "oldTaxAmount": 20.00,
      "newTaxAmount": 80.00,
      "oldShippingAmount": 5.99,
      "newShippingAmount": 5.99,
      "oldTotalAmount": 555.58,
      "newTotalAmount": 2215.58,
      "oldStatus": "Pending",
      "newStatus": "Pending",
      "notes": "Customer requested more quantity"
    },
    {
      "id": "b2c3d4e5-f6a7-8901-bcde-f23456789012",
      "orderId": "bc7e49ef-0464-470c-87bb-d71d60c7b597",
      "changeType": "ItemPriceAdjusted",
      "changedBy": "admin@example.com",
      "changeDate": "2026-01-29T09:35:00Z",
      "changeDetails": {
        "productName": "Oralieve Moisturising Mouth",
        "productSku": "ORAL-001",
        "oldPrice": 90.00,
        "newPrice": 50.00
      },
      "oldSubtotal": 2129.59,
      "newSubtotal": 2089.59,
      "oldTaxAmount": 80.00,
      "newTaxAmount": 78.00,
      "oldShippingAmount": 5.99,
      "newShippingAmount": 5.99,
      "oldTotalAmount": 2215.58,
      "newTotalAmount": 2173.58,
      "oldStatus": "Pending",
      "newStatus": "Pending",
      "notes": "Special discount applied"
    }
  ],
  "errors": []
}
```

## Change Types

| ChangeType | Description |
|------------|-------------|
| StatusChanged | Order status changed |
| ItemQuantityUpdated | Item quantity changed |
| ItemPriceAdjusted | Item price changed |
| ItemAdded | New item added to order |
| ItemRemoved | Item removed from order |
| ItemReplaced | Item replaced with different product |
| BillingAddressUpdated | Billing address changed |
| ShippingAddressUpdated | Shipping address changed |
| OrderEdited | General order edit |
| Refunded | Full refund processed |
| PartiallyRefunded | Partial refund processed |
| InvoiceRegenerated | Invoice regenerated |

---

# 6. Regenerate Invoice

Generate new invoice after order modifications.

## Endpoint
```
POST /api/orders/{orderId}/regenerate-invoice
```

## Request Body

```json
{
  "orderId": "bc7e49ef-0464-470c-87bb-d71d60c7b597",
  "notes": "Invoice regenerated after price adjustment",
  "sendToCustomer": true
}
```

## Request Parameters

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| orderId | guid | Yes | - | Order ID |
| notes | string | No | null | Invoice notes |
| sendToCustomer | boolean | No | false | Email invoice to customer |

## Success Response (200 OK)

```json
{
  "success": true,
  "message": "Invoice regenerated successfully",
  "data": {
    "id": "d4e5f6a7-b8c9-0123-def4-567890abcdef",
    "invoiceNumber": "INV-2026-000055-v2",
    "invoiceDate": "2026-01-29T12:00:00Z",
    "dueDate": "2026-02-28T12:00:00Z",
    "status": "Issued",
    "subtotalAmount": 2089.59,
    "taxAmount": 78.00,
    "shippingAmount": 5.99,
    "discountAmount": 0,
    "totalAmount": 2173.58,
    "currency": "GBP",
    "customerEmail": "customer@example.com",
    "billingName": "John Doe",
    "billingAddress": "123 Main Street, Apt 4B",
    "billingCity": "London",
    "billingPostalCode": "SW1A 1AA",
    "billingCountry": "United Kingdom",
    "pdfUrl": "/api/invoices/d4e5f6a7-b8c9-0123-def4-567890abcdef/pdf",
    "pdfFileSize": 45678,
    "notes": "Invoice regenerated after price adjustment",
    "emailedAt": "2026-01-29T12:00:05Z",
    "orderId": "bc7e49ef-0464-470c-87bb-d71d60c7b597",
    "orderNumber": "ORD-20260128-000055",
    "createdAt": "2026-01-29T12:00:00Z",
    "updatedAt": null
  },
  "errors": []
}
```

---

# 7. Enums & Constants

## OrderEditOperationType
```typescript
enum OrderEditOperationType {
  UpdateQuantity = 1,
  UpdatePrice = 2,
  RemoveItem = 3,
  AddItem = 4,
  ReplaceItem = 5
}
```

## RefundReason
```typescript
enum RefundReason {
  CustomerRequest = 1,
  OrderCancellation = 2,
  ItemOutOfStock = 3,
  DamagedItem = 4,
  WrongItemShipped = 5,
  PriceAdjustment = 6,
  DuplicateCharge = 7,
  ServiceIssue = 8,
  PartialOrderCancellation = 9,
  QualityIssue = 10,
  LateDelivery = 11,
  Other = 99
}
```

## OrderStatus
```typescript
enum OrderStatus {
  Pending = 0,
  Confirmed = 1,
  Processing = 2,
  Shipped = 3,
  Delivered = 4,
  Cancelled = 5,
  Refunded = 6,
  OnHold = 7,
  Failed = 8
}
```

---

# 8. Response DTOs

## ApiResponse Wrapper
All responses follow this structure:
```typescript
interface ApiResponse<T> {
  success: boolean;
  message: string | null;
  data: T | null;
  errors: string[];
}
```

## OrderEditResultDto
```typescript
interface OrderEditResultDto {
  orderId: string;
  orderNumber: string;
  success: boolean;
  message: string;

  // Financial Summary
  oldSubtotal: number;
  newSubtotal: number;
  oldTaxAmount: number;
  newTaxAmount: number;
  oldTotalAmount: number;
  newTotalAmount: number;
  priceDifference: number;

  // Changes
  itemChanges: OrderItemChangeDto[];
  billingAddressChanged: boolean;
  shippingAddressChanged: boolean;
  inventoryAdjustments: InventoryAdjustmentDto[];

  // Refund Recommendation
  refundRecommended: boolean;
  recommendedRefundAmount: number;

  // Updated Order
  updatedOrder: OrderDto;
}
```

## OrderItemChangeDto
```typescript
interface OrderItemChangeDto {
  changeType: string; // "Added" | "Removed" | "Updated" | "Replaced" | "PriceAdjusted"
  productName: string;
  productSku: string;
  oldQuantity: number | null;
  newQuantity: number | null;
  oldUnitPrice: number | null;
  newUnitPrice: number | null;
  oldTotalPrice: number | null;
  newTotalPrice: number | null;
}
```

## InventoryAdjustmentDto
```typescript
interface InventoryAdjustmentDto {
  productId: string;
  productName: string;
  productSku: string;
  quantityAdjusted: number;
  adjustmentType: string; // "Restored" | "Deducted"
}
```

## RefundResultDto
```typescript
interface RefundResultDto {
  orderId: string;
  orderNumber: string;
  refundId: string;
  refundAmount: number;
  remainingRefundableAmount: number;
  isFullyRefunded: boolean;
  paymentStatus: string;
  stockRestored: boolean;
  loyaltyPointsReversed: number | null;
  refundDate: string; // ISO 8601 datetime
}
```

## RefundHistoryDto
```typescript
interface RefundHistoryDto {
  orderId: string;
  orderNumber: string;
  originalOrderAmount: number;
  totalRefunded: number;
  remainingBalance: number;
  isFullyRefunded: boolean;
  paymentStatus: string;
  refunds: RefundEntryDto[];
}

interface RefundEntryDto {
  refundId: string;
  amount: number;
  currency: string;
  reason: string;
  reasonDetails: string | null;
  processedBy: string;
  processedAt: string; // ISO 8601 datetime
  isPartial: boolean;
}
```

## OrderHistoryDto
```typescript
interface OrderHistoryDto {
  id: string;
  orderId: string;
  changeType: string;
  changedBy: string;
  changeDate: string; // ISO 8601 datetime
  changeDetails: any; // JSON object with change specifics

  // Financial Snapshots
  oldSubtotal: number | null;
  newSubtotal: number | null;
  oldTaxAmount: number | null;
  newTaxAmount: number | null;
  oldShippingAmount: number | null;
  newShippingAmount: number | null;
  oldTotalAmount: number | null;
  newTotalAmount: number | null;

  // Status Snapshots
  oldStatus: string | null;
  newStatus: string | null;

  notes: string | null;
}
```

## InvoiceDto
```typescript
interface InvoiceDto {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string | null;
  status: string;

  // Financial
  subtotalAmount: number;
  taxAmount: number;
  shippingAmount: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;

  // Customer
  customerEmail: string;
  billingName: string;
  billingAddress: string;
  billingCity: string;
  billingPostalCode: string;
  billingCountry: string;

  // PDF
  pdfUrl: string | null;
  pdfFileSize: number | null;

  // Meta
  notes: string | null;
  emailedAt: string | null;
  orderId: string;
  orderNumber: string;
  createdAt: string;
  updatedAt: string | null;
}
```

## AddressDto
```typescript
interface AddressDto {
  firstName: string;
  lastName: string;
  company: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phoneNumber: string | null;
}
```

## OrderDto
```typescript
interface OrderDto {
  id: string;
  orderNumber: string;
  status: number; // OrderStatus enum
  orderDate: string;
  estimatedDispatchDate: string | null;
  dispatchedAt: string | null;
  dispatchNote: string | null;

  // Financial
  subtotalAmount: number;
  taxAmount: number;
  shippingAmount: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
  notes: string | null;
  couponCode: string | null;
  bundleDiscountAmount: number;
  bundleDiscountDetails: string | null;

  // Customer
  isGuestOrder: boolean;
  subscriptionId: string | null;
  customerEmail: string;
  customerPhone: string;
  userId: string | null;
  customerName: string | null;

  // Addresses
  billingAddress: AddressDto;
  shippingAddress: AddressDto;

  // Click & Collect
  deliveryMethod: string;
  clickAndCollectFee: number;
  collectionStatus: string | null;
  readyForCollectionAt: string | null;
  collectedAt: string | null;
  collectedBy: string | null;
  collectorIDType: string | null;
  collectionExpiryDate: string | null;

  // Related Data
  orderItems: OrderItemDto[];
  payments: PaymentDto[];
  shipments: ShipmentDto[];

  createdAt: string;
  updatedAt: string | null;
}
```

## OrderItemDto
```typescript
interface OrderItemDto {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  productName: string;
  productSku: string;
  productImageUrl: string | null;
  variantName: string | null;
  selectedDeliveryType: string;
  estimatedDeliveryDate: string | null;
  actualDeliveryDate: string | null;
  productId: string;
  productVariantId: string | null;
}
```

---

# Usage Examples

## Example 1: Update Quantity
```javascript
const response = await fetch('/api/orders/bc7e49ef-0464-470c-87bb-d71d60c7b597/edit', {
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    orderId: 'bc7e49ef-0464-470c-87bb-d71d60c7b597',
    operations: [{
      operationType: 1, // UpdateQuantity
      orderItemId: '5dfd7462-6c27-42cf-90c0-016284817332',
      newQuantity: 5
    }],
    editReason: 'Customer requested more items'
  })
});
```

## Example 2: Add New Product
```javascript
const response = await fetch('/api/orders/bc7e49ef-0464-470c-87bb-d71d60c7b597/edit', {
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    orderId: 'bc7e49ef-0464-470c-87bb-d71d60c7b597',
    operations: [{
      operationType: 4, // AddItem
      productId: 'c8160a65-b08e-46f8-a3b4-0e9c76ce8c9e',
      newQuantity: 2,
      newUnitPrice: 149.99
    }],
    editReason: 'Customer added product via phone'
  })
});
```

## Example 3: Update Address Only
```javascript
const response = await fetch('/api/orders/bc7e49ef-0464-470c-87bb-d71d60c7b597/edit', {
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    orderId: 'bc7e49ef-0464-470c-87bb-d71d60c7b597',
    operations: [],
    shippingAddress: {
      firstName: 'John',
      lastName: 'Smith',
      addressLine1: '456 New Street',
      city: 'Manchester',
      state: 'Greater Manchester',
      postalCode: 'M1 1AA',
      country: 'United Kingdom'
    },
    editReason: 'Customer moved to new address'
  })
});
```

## Example 4: Process Partial Refund
```javascript
const response = await fetch('/api/orders/bc7e49ef-0464-470c-87bb-d71d60c7b597/partial-refund', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    orderId: 'bc7e49ef-0464-470c-87bb-d71d60c7b597',
    refundAmount: 50.00,
    reason: 6, // PriceAdjustment
    reasonDetails: '10% goodwill discount'
  })
});
```

---

# Business Rules

## Editable Order Statuses
Orders can only be edited when status is:
- Pending (0)
- Confirmed (1)
- Processing (2)
- Shipped (3)

Orders **cannot** be edited when status is:
- Delivered (4)
- Cancelled (5)
- Refunded (6)
- OnHold (7)
- Failed (8)

## Inventory Rules
- When quantity increased: Stock is deducted
- When quantity decreased: Stock is restored
- When item removed: Stock is restored
- When item added: Stock is deducted
- When item replaced: Old item stock restored, new item stock deducted

## Refund Rules
- Full refund sets payment status to "Refunded"
- Partial refund sets payment status to "PartiallyRefunded"
- Cannot refund more than remaining balance
- Refunds are processed via Stripe API

---

# Error Codes

| HTTP Code | Meaning |
|-----------|---------|
| 200 | Success |
| 400 | Bad Request - Validation failed |
| 401 | Unauthorized - Invalid/missing token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Order/Item not found |
| 500 | Internal Server Error |

---

# Notes for Frontend Development

1. **Order Item IDs**: Always fetch the current order before editing to get the latest `orderItemId` values.

2. **Optimistic Updates**: The API returns the complete updated order in `updatedOrder` - use this to update your local state.

3. **Refund Recommendation**: Check `refundRecommended` and `recommendedRefundAmount` after edit operations to prompt admin for refund if order total decreased.

4. **History Tracking**: All changes are automatically logged. Use the edit-history endpoint to show audit trail.

5. **Inventory**: Stock levels are automatically adjusted. The response shows all `inventoryAdjustments` made.

6. **Currency**: All amounts are in GBP by default.

7. **Timestamps**: All dates are in ISO 8601 format (UTC).
