# 🎁 Grouped Product Discount/Offer System - Production Implementation

**Date:** 2025-12-22
**Purpose:** Add discount/offer functionality to grouped products to incentivize bundle purchases

---

## 🎯 Problem Statement

**Current Situation:**
- Grouped products exist but no incentive for customers to buy the bundle
- No way to show "Buy together and save X%" offers
- No automatic discount calculation for grouped purchases

**Required Solution:**
- Special pricing when products bought together as a group
- Display savings to customers (e.g., "Save ₹200 when you buy this bundle")
- Flexible discount strategies (percentage off, fixed amount off, special bundle price)
- Show individual vs bundle pricing comparison

---

## 📋 Solution Design

### Strategy 1: **Bundle-Level Discount** (Recommended for Production)

Add bundle discount fields directly to the Product entity for grouped products:

```csharp
// New fields to add to Product.cs
public decimal? GroupBundleDiscountPercentage { get; set; } // e.g., 15% off
public decimal? GroupBundleDiscountAmount { get; set; } // e.g., ₹500 off
public string? GroupBundleDiscountType { get; set; } // "Percentage", "FixedAmount", "SpecialPrice"
public decimal? GroupBundleSpecialPrice { get; set; } // Fixed bundle price
public string? GroupBundleSavingsMessage { get; set; } // Custom message: "Save ₹500 on this bundle!"
public bool ApplyDiscountToAllItems { get; set; } = false; // Distribute discount across all items
public bool ShowIndividualPrices { get; set; } = true; // Show individual product prices
```

---

## 🏗️ Implementation Steps

### Step 1️⃣: Update Product Entity

**File:** `EcomPlatform.Domain/Entities/Products/Product.cs`

Add after line 148 (after CrossSellProductIds):

```csharp
// Grouped Product Discount Settings
public decimal? GroupBundleDiscountPercentage { get; set; }
public decimal? GroupBundleDiscountAmount { get; set; }
public string? GroupBundleDiscountType { get; set; } = "None"; // None, Percentage, FixedAmount, SpecialPrice
public decimal? GroupBundleSpecialPrice { get; set; }
public string? GroupBundleSavingsMessage { get; set; }
public bool ApplyDiscountToAllItems { get; set; } = false;
public bool ShowIndividualPrices { get; set; } = true;
```

**Discount Type Options:**
- `None` - No bundle discount
- `Percentage` - X% off total (e.g., 15% off when buying bundle)
- `FixedAmount` - Fixed ₹X off (e.g., ₹500 off bundle)
- `SpecialPrice` - Fixed bundle price (e.g., whole bundle for ₹2999)

---

### Step 2️⃣: Update ProductDto

**File:** `EcomPlatform.Application/DTOs/Products/ProductDto.cs`

Add after line 167 (after GroupedProducts):

```csharp
// Grouped Product Bundle Pricing
public decimal? GroupBundleDiscountPercentage { get; set; }
public decimal? GroupBundleDiscountAmount { get; set; }
public string? GroupBundleDiscountType { get; set; }
public decimal? GroupBundleSpecialPrice { get; set; }
public string? GroupBundleSavingsMessage { get; set; }
public bool ApplyDiscountToAllItems { get; set; }
public bool ShowIndividualPrices { get; set; }

// Calculated Bundle Pricing (calculated on the fly)
public decimal? TotalIndividualPrice { get; set; } // Sum of all child product prices
public decimal? BundlePrice { get; set; } // Final bundle price after discount
public decimal? TotalSavings { get; set; } // How much customer saves
```

---

### Step 3️⃣: Update GroupedProductItemDto

**File:** `EcomPlatform.Application/DTOs/Products/GroupedProductItemDto.cs`

Add after line 18 (after InStock):

```csharp
// Bundle-specific pricing for this item
public decimal? BundlePrice { get; set; } // Discounted price when bought in bundle
public decimal? IndividualSavings { get; set; } // Savings on this specific item
public bool HasBundleDiscount { get; set; } // Whether this item has bundle discount applied
```

---

### Step 4️⃣: Create Helper Service for Bundle Calculations

**File:** `EcomPlatform.Application/Services/BundlePricingService.cs` (NEW)

```csharp
using EcomPlatform.Application.DTOs.Products;

namespace EcomPlatform.Application.Services;

public interface IBundlePricingService
{
    BundlePricingResult CalculateBundlePricing(ProductDto groupedProduct);
}

public class BundlePricingService : IBundlePricingService
{
    public BundlePricingResult CalculateBundlePricing(ProductDto groupedProduct)
    {
        if (groupedProduct.ProductType != "grouped" || !groupedProduct.GroupedProducts.Any())
        {
            return new BundlePricingResult
            {
                IsValid = false,
                ErrorMessage = "Not a valid grouped product"
            };
        }

        // Calculate total individual price (sum of all child products)
        decimal totalIndividualPrice = groupedProduct.GroupedProducts.Sum(p => p.Price);
        decimal bundlePrice = totalIndividualPrice;
        decimal totalSavings = 0;

        // Apply bundle discount based on discount type
        switch (groupedProduct.GroupBundleDiscountType)
        {
            case "Percentage":
                if (groupedProduct.GroupBundleDiscountPercentage.HasValue)
                {
                    decimal discountAmount = totalIndividualPrice * (groupedProduct.GroupBundleDiscountPercentage.Value / 100);
                    bundlePrice = totalIndividualPrice - discountAmount;
                    totalSavings = discountAmount;
                }
                break;

            case "FixedAmount":
                if (groupedProduct.GroupBundleDiscountAmount.HasValue)
                {
                    bundlePrice = totalIndividualPrice - groupedProduct.GroupBundleDiscountAmount.Value;
                    totalSavings = groupedProduct.GroupBundleDiscountAmount.Value;
                }
                break;

            case "SpecialPrice":
                if (groupedProduct.GroupBundleSpecialPrice.HasValue)
                {
                    bundlePrice = groupedProduct.GroupBundleSpecialPrice.Value;
                    totalSavings = totalIndividualPrice - groupedProduct.GroupBundleSpecialPrice.Value;
                }
                break;

            case "None":
            default:
                // No discount
                break;
        }

        // Ensure bundle price never goes below 0
        if (bundlePrice < 0) bundlePrice = 0;

        // Calculate per-item savings if discount should be distributed
        if (groupedProduct.ApplyDiscountToAllItems && totalSavings > 0)
        {
            foreach (var item in groupedProduct.GroupedProducts)
            {
                decimal itemPriceRatio = item.Price / totalIndividualPrice;
                decimal itemSavings = totalSavings * itemPriceRatio;
                item.BundlePrice = item.Price - itemSavings;
                item.IndividualSavings = itemSavings;
                item.HasBundleDiscount = true;
            }
        }

        return new BundlePricingResult
        {
            IsValid = true,
            TotalIndividualPrice = totalIndividualPrice,
            BundlePrice = bundlePrice,
            TotalSavings = totalSavings,
            SavingsPercentage = totalIndividualPrice > 0
                ? Math.Round((totalSavings / totalIndividualPrice) * 100, 2)
                : 0
        };
    }
}

public class BundlePricingResult
{
    public bool IsValid { get; set; }
    public string? ErrorMessage { get; set; }
    public decimal TotalIndividualPrice { get; set; }
    public decimal BundlePrice { get; set; }
    public decimal TotalSavings { get; set; }
    public decimal SavingsPercentage { get; set; }
}
```

---

### Step 5️⃣: Update GetProductByIdQueryHandler

**File:** `EcomPlatform.Application/Queries/Products/GetProductByIdQueryHandler.cs`

After fetching grouped products, calculate bundle pricing:

```csharp
// Add after mapping to ProductDto (around line where GroupedProducts are populated)

if (productDto.ProductType == "grouped" && productDto.GroupedProducts.Any())
{
    // Inject IBundlePricingService via constructor
    var pricingResult = _bundlePricingService.CalculateBundlePricing(productDto);

    if (pricingResult.IsValid)
    {
        productDto.TotalIndividualPrice = pricingResult.TotalIndividualPrice;
        productDto.BundlePrice = pricingResult.BundlePrice;
        productDto.TotalSavings = pricingResult.TotalSavings;
    }
}
```

---

### Step 6️⃣: Add Database Migration

```bash
cd EcomPlatform.Infrastructure
dotnet ef migrations add AddGroupedProductDiscountFields --startup-project ../EcomPlatform.API
dotnet ef database update --startup-project ../EcomPlatform.API
```

---

### Step 7️⃣: Register Service in DI Container

**File:** `EcomPlatform.API/Program.cs`

Add after other service registrations:

```csharp
builder.Services.AddScoped<IBundlePricingService, BundlePricingService>();
```

---

## 📊 Usage Examples

### Example 1: Percentage Discount (15% off)

**Create Grouped Product with 15% Bundle Discount:**

```json
POST /api/products
{
  "name": "Incontinence Care Bundle - Save 15%",
  "description": "Complete care package",
  "productType": "grouped",
  "requiredProductIds": "guid1,guid2,guid3",
  "groupBundleDiscountType": "Percentage",
  "groupBundleDiscountPercentage": 15,
  "groupBundleSavingsMessage": "Save 15% when you buy this bundle!",
  "showIndividualPrices": true,
  "applyDiscountToAllItems": false,
  "isPublished": true
}
```

**API Response:**
```json
{
  "id": "bundle-guid",
  "name": "Incontinence Care Bundle - Save 15%",
  "productType": "grouped",
  "groupBundleDiscountType": "Percentage",
  "groupBundleDiscountPercentage": 15,
  "totalIndividualPrice": 2500.00,
  "bundlePrice": 2125.00,
  "totalSavings": 375.00,
  "groupBundleSavingsMessage": "Save 15% when you buy this bundle!",
  "groupedProducts": [
    {
      "productId": "guid1",
      "name": "TENA Pads",
      "price": 1000.00,
      "bundlePrice": null,
      "hasBundleDiscount": false
    },
    {
      "productId": "guid2",
      "name": "Wet Wipes",
      "price": 800.00,
      "bundlePrice": null,
      "hasBundleDiscount": false
    },
    {
      "productId": "guid3",
      "name": "Disposal Bags",
      "price": 700.00,
      "bundlePrice": null,
      "hasBundleDiscount": false
    }
  ]
}
```

---

### Example 2: Fixed Amount Discount (₹500 off)

```json
POST /api/products
{
  "name": "Baby Care Starter Kit",
  "productType": "grouped",
  "requiredProductIds": "guid1,guid2,guid3",
  "groupBundleDiscountType": "FixedAmount",
  "groupBundleDiscountAmount": 500,
  "groupBundleSavingsMessage": "Save ₹500 on this starter kit!",
  "showIndividualPrices": true,
  "isPublished": true
}
```

**Result:**
- Individual Total: ₹3500
- Bundle Price: ₹3000
- Savings: ₹500

---

### Example 3: Special Bundle Price

```json
POST /api/products
{
  "name": "Travel Toiletries Set - Special Price",
  "productType": "grouped",
  "requiredProductIds": "guid1,guid2,guid3,guid4",
  "groupBundleDiscountType": "SpecialPrice",
  "groupBundleSpecialPrice": 1999,
  "groupBundleSavingsMessage": "Complete set for just ₹1999!",
  "showIndividualPrices": true,
  "isPublished": true
}
```

**Result:**
- Individual Total: ₹2800 (sum of all products)
- Bundle Price: ₹1999 (special price)
- Savings: ₹801

---

### Example 4: Distributed Discount (Apply to all items)

```json
POST /api/products
{
  "name": "Premium Skincare Bundle",
  "productType": "grouped",
  "requiredProductIds": "guid1,guid2,guid3",
  "groupBundleDiscountType": "Percentage",
  "groupBundleDiscountPercentage": 20,
  "applyDiscountToAllItems": true,
  "showIndividualPrices": true,
  "isPublished": true
}
```

**Response (with distributed discount):**
```json
{
  "totalIndividualPrice": 5000.00,
  "bundlePrice": 4000.00,
  "totalSavings": 1000.00,
  "groupedProducts": [
    {
      "name": "Face Cream",
      "price": 2000.00,
      "bundlePrice": 1600.00,
      "individualSavings": 400.00,
      "hasBundleDiscount": true
    },
    {
      "name": "Serum",
      "price": 1500.00,
      "bundlePrice": 1200.00,
      "individualSavings": 300.00,
      "hasBundleDiscount": true
    },
    {
      "name": "Cleanser",
      "price": 1500.00,
      "bundlePrice": 1200.00,
      "individualSavings": 300.00,
      "hasBundleDiscount": true
    }
  ]
}
```

---

## 🎨 Frontend Display Examples

### Display 1: Bundle Savings Banner

```tsx
function GroupedProductPage({ product }: { product: ProductDto }) {
  if (product.productType !== 'grouped') return null;

  const hasBundleDiscount = product.groupBundleDiscountType !== 'None';

  return (
    <div className="grouped-product-page">
      <h1>{product.name}</h1>

      {/* Bundle Savings Banner */}
      {hasBundleDiscount && (
        <div className="bundle-savings-banner bg-green-100 p-4 rounded-lg mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold text-green-800">
                {product.groupBundleSavingsMessage || "Bundle Offer!"}
              </h3>
              <p className="text-green-700">
                Buy together and save ₹{product.totalSavings?.toFixed(2)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-gray-500 line-through">
                ₹{product.totalIndividualPrice?.toFixed(2)}
              </p>
              <p className="text-3xl font-bold text-green-600">
                ₹{product.bundlePrice?.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Product List */}
      <div className="grouped-products-list">
        {product.groupedProducts.map(item => (
          <GroupedProductItem key={item.productId} item={item} />
        ))}
      </div>

      {/* Add to Cart Section */}
      <div className="sticky bottom-0 bg-white p-4 border-t">
        <div className="flex justify-between items-center">
          <div>
            {hasBundleDiscount ? (
              <>
                <p className="text-sm text-gray-500 line-through">
                  Regular: ₹{product.totalIndividualPrice?.toFixed(2)}
                </p>
                <p className="text-2xl font-bold">
                  Bundle Price: ₹{product.bundlePrice?.toFixed(2)}
                </p>
                <p className="text-green-600 font-semibold">
                  You Save: ₹{product.totalSavings?.toFixed(2)}
                </p>
              </>
            ) : (
              <p className="text-2xl font-bold">
                Total: ₹{product.totalIndividualPrice?.toFixed(2)}
              </p>
            )}
          </div>
          <button className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold">
            Add Bundle to Cart
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

### Display 2: Individual Product with Bundle Discount

```tsx
function GroupedProductItem({ item }: { item: GroupedProductItemDto }) {
  return (
    <div className="border p-4 rounded-lg mb-4">
      <div className="flex gap-4">
        <img src={item.mainImageUrl} alt={item.name} className="w-24 h-24" />

        <div className="flex-1">
          <h3 className="font-semibold">{item.name}</h3>
          <p className="text-sm text-gray-600">{item.shortDescription}</p>

          <div className="mt-2">
            {item.hasBundleDiscount ? (
              <div>
                <span className="text-gray-500 line-through mr-2">
                  ₹{item.price.toFixed(2)}
                </span>
                <span className="text-green-600 font-bold">
                  ₹{item.bundlePrice?.toFixed(2)}
                </span>
                <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                  Save ₹{item.individualSavings?.toFixed(2)}
                </span>
              </div>
            ) : (
              <span className="font-bold">₹{item.price.toFixed(2)}</span>
            )}
          </div>

          {/* Variant Selection */}
          {item.variants && item.variants.length > 0 && (
            <select className="mt-2 border rounded px-2 py-1">
              {item.variants.map(v => (
                <option key={v.id} value={v.id}>
                  {v.option1Value} - ₹{v.price}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

### Display 3: Product Card in Listing

```tsx
function GroupedProductCard({ product }: { product: ProductDto }) {
  const hasBundleDiscount = product.groupBundleDiscountType !== 'None';

  return (
    <div className="product-card border rounded-lg overflow-hidden">
      {hasBundleDiscount && (
        <div className="bg-red-500 text-white px-3 py-1 text-sm font-semibold">
          BUNDLE OFFER
        </div>
      )}

      <img src={product.images[0]?.url} alt={product.name} />

      <div className="p-4">
        <h3 className="font-semibold">{product.name}</h3>

        {hasBundleDiscount ? (
          <div className="mt-2">
            <p className="text-xs text-gray-500 line-through">
              ₹{product.totalIndividualPrice?.toFixed(2)}
            </p>
            <p className="text-xl font-bold text-green-600">
              ₹{product.bundlePrice?.toFixed(2)}
            </p>
            <p className="text-xs text-green-600 font-semibold">
              Save ₹{product.totalSavings?.toFixed(2)}
            </p>
          </div>
        ) : (
          <p className="text-xl font-bold mt-2">
            ₹{product.price.toFixed(2)}
          </p>
        )}

        {product.groupBundleSavingsMessage && (
          <p className="text-xs text-green-700 mt-1 bg-green-50 px-2 py-1 rounded">
            {product.groupBundleSavingsMessage}
          </p>
        )}
      </div>
    </div>
  );
}
```

---

## 🧪 Testing Scenarios

### Test Case 1: 15% Percentage Discount
```
Products: A (₹1000), B (₹800), C (₹700)
Total Individual: ₹2500
Discount: 15%
Expected Bundle Price: ₹2125
Expected Savings: ₹375
```

### Test Case 2: Fixed ₹500 Discount
```
Products: A (₹1500), B (₹1200), C (₹800)
Total Individual: ₹3500
Discount: ₹500
Expected Bundle Price: ₹3000
Expected Savings: ₹500
```

### Test Case 3: Special Price
```
Products: A (₹1000), B (₹900), C (₹900)
Total Individual: ₹2800
Special Price: ₹1999
Expected Bundle Price: ₹1999
Expected Savings: ₹801
```

### Test Case 4: No Discount
```
Products: A (₹1000), B (₹800)
Total Individual: ₹1800
Discount Type: None
Expected Bundle Price: ₹1800
Expected Savings: ₹0
```

---

## 🔒 Validation Rules

1. **GroupBundleDiscountType** validation:
   - Only allow: "None", "Percentage", "FixedAmount", "SpecialPrice"

2. **Percentage Discount** validation:
   - Must be between 0 and 100
   - Cannot exceed 100%

3. **Fixed Amount Discount** validation:
   - Cannot exceed total individual price
   - Must be positive

4. **Special Price** validation:
   - Must be positive
   - Should be less than total individual price (otherwise no savings)

5. **Business Logic** validation:
   - Only applicable when ProductType = "grouped"
   - Must have RequiredProductIds populated
   - All child products must exist and be published

---

## 📈 Benefits of This Approach

1. **Flexible Pricing Strategies**
   - Percentage discounts for general promotions
   - Fixed amount discounts for seasonal offers
   - Special bundle prices for premium sets

2. **Clear Customer Value**
   - Shows exact savings amount
   - Compares individual vs bundle pricing
   - Custom marketing messages

3. **Simple Implementation**
   - Uses existing Product entity
   - No complex many-to-many relationships
   - Easy to query and display

4. **Scalable**
   - Works with any number of products in bundle
   - Supports distributed discounts
   - Easy to add more discount types

5. **Production Ready**
   - Database migration included
   - Service layer for calculations
   - Frontend display examples
   - Comprehensive validation

---

## 🚀 Deployment Checklist

- [ ] Add new fields to Product.cs
- [ ] Update ProductDto.cs
- [ ] Update GroupedProductItemDto.cs
- [ ] Create BundlePricingService.cs
- [ ] Update GetProductByIdQueryHandler.cs
- [ ] Register service in Program.cs
- [ ] Create and run database migration
- [ ] Update Create/Update product validators
- [ ] Add frontend components
- [ ] Test all discount types
- [ ] Add admin UI for setting bundle discounts
- [ ] Update API documentation

---

## 💡 Future Enhancements

1. **Time-Limited Offers**
   - Add GroupBundleOfferStartDate, GroupBundleOfferEndDate
   - Auto-disable expired offers

2. **Tiered Discounts**
   - Buy 2 products: 10% off
   - Buy 3 products: 15% off
   - Buy all 4 products: 20% off

3. **Analytics**
   - Track bundle purchase rate
   - Compare bundle vs individual sales
   - A/B test different discount amounts

4. **Personalized Bundles**
   - AI-suggested bundles based on purchase history
   - Dynamic pricing based on customer segment

---

**Status:** 📋 Ready for Implementation
**Estimated Time:** 4-6 hours (including testing)
**Impact:** High (increases bundle purchase conversion)
Done 