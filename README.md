# Direct Care Admin Frontend

This repository contains a single Next.js application that powers both the customer-facing Direct Care storefront and the internal admin dashboard.

The codebase is organized so the public shopping experience and the `/admin` back office live in the same app, share some UI and utility code, and talk to the same backend API with two different integration styles:

- Storefront pages mostly use direct `fetch` calls from route files and client components.
- Admin pages mostly use a centralized service layer in `lib/services/*` built on top of a shared axios client in `lib/api.ts`.

## Project Overview

The application supports a full e-commerce workflow:

- Public storefront with homepage, categories, brands, product listing, product detail, search, cart, wishlist, checkout, account, orders, and blog.
- Admin dashboard for managing catalog, inventory, orders, customers, discounts, banners, blog content, subscriptions, newsletter, shipping, VAT, loyalty, and activity logs.
- Shared authentication, cart, and wishlist state on the storefront.
- Real-time collaboration and product lock/takeover flows in the admin product editor via SignalR.

## Folder Structure

```text
frontend-Directcare-admin/
|-- app/                          Next.js App Router routes
|   |-- admin/                    Admin dashboard routes and admin-only shared code
|   |   |-- _components/          Admin shared components
|   |   |-- _context/             Admin theme/auth-related context
|   |   |-- products/             Product management screens
|   |   |-- orders/               Order management screens
|   |   |-- customers/            Customer management
|   |   |-- shipping/             Shipping configuration
|   |   |-- page.tsx              Admin dashboard
|   |   `-- layout.tsx            Admin layout wrapper
|   |-- account/                  Customer account area
|   |-- blog/                     Blog listing, detail, comments
|   |-- brands/                   Brand listing and detail pages
|   |-- cart/                     Cart page
|   |-- category/                 Category listing and detail pages
|   |-- checkout/                 Checkout and payment flow
|   |-- offers/                   Offers page
|   |-- products/                 Product listing and detail pages
|   |-- search/                   Search results page
|   |-- wishlist/                 Wishlist page
|   |-- layout.tsx                Root app layout and global providers
|   |-- ConditionalLayout.tsx     Public layout switching logic
|   `-- globals.css               Global styles
|-- components/                   Shared storefront components
|   |-- cart/                     Cart-specific UI
|   |-- checkout/                 Checkout-specific UI
|   |-- product/                  Product detail and review UI
|   |-- pharma/                   Pharma question UI
|   |-- toast/                    Toast provider/components
|   `-- ui/                       Base UI primitives
|-- context/                      Storefront global state
|   |-- AuthContext.tsx
|   |-- CartContext.tsx
|   |-- WishlistContext.tsx
|   `-- theme-provider.tsx
|-- lib/                          API client, helpers, and service layer
|   |-- api.ts                    Shared axios API client
|   |-- api-config.ts             API base URL and endpoint map
|   |-- services/                 Admin-oriented API services
|   `-- utils.ts                  Shared utilities
|-- public/                       Static assets
|-- middleware.ts                 Route protection for admin/login
|-- server.js                     Custom Next.js server entry
|-- next.config.ts                Next.js configuration
|-- tailwind.config.ts            Tailwind configuration
|-- package.json                  Scripts and dependencies
`-- .env.local                    Local environment variables
```

## Tech Stack

- Framework: Next.js 15 with App Router
- Language: TypeScript
- UI: React 19
- Styling: Tailwind CSS
- UI primitives: Radix UI and shadcn-style components
- HTTP: native `fetch` and `axios`
- Charts: Recharts
- Rich text editor: TinyMCE
- Payments: Stripe
- Real-time: Microsoft SignalR
- Tables/import-export helpers: `xlsx`
- Icons: `lucide-react`

## How to Run the Project

### Prerequisites

- Node.js 20 or newer
- npm
- A running backend API reachable through `NEXT_PUBLIC_API_URL`

### Environment Variables

Create or update `.env.local` with the values your environment needs. The most important variables used by this frontend are:

```env
NODE_ENV=development
PORT=3000
NEXT_PUBLIC_API_URL=http://localhost:5285
API_BASE_URL=http://localhost:5285
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_TINY_MCE_APIKEY=your_tinymce_key
NEXT_TINY_MCE_APIKEY=your_tinymce_key
```

Notes:

- `NEXT_PUBLIC_API_URL` is the primary backend base URL used throughout the storefront and many admin flows.
- Some admin helpers also reference `API_BASE_URL`.
- Do not commit real secrets or production-only keys into source control.

### Install Dependencies

```bash
npm install
```

### Start Development Server

```bash
npm run dev
```

The app will usually be available at [http://localhost:3000](http://localhost:3000).

Useful routes:

- Storefront: [http://localhost:3000](http://localhost:3000)
- Admin: [http://localhost:3000/admin](http://localhost:3000/admin)

### Production Build

```bash
npm run build
npm start
```

### Lint

```bash
npm run lint
```

## Key Features

### Storefront

- Homepage with banners, featured products, categories, new arrivals, and brands
- Product listing with sorting, infinite loading, and client-side filtering
- Category and brand landing pages
- Product detail pages with variants, reviews, coupons, related products, and pharma question flows
- Search with quick-search dropdown in the header
- Cart and wishlist stored in browser storage
- Customer authentication, account dashboard, address management, and order history
- Checkout with shipping quotes, click-and-collect, card payments via Stripe, and COD
- Blog, comments, and newsletter UI

### Admin

- Analytics dashboard with charts and KPIs
- Product CRUD, variants, images, imports, filters, and publishing controls
- Product lock and takeover workflow for concurrent editing
- Order management, bulk status updates, shipments, invoices, and refunds
- Customer, category, brand, banner, discount, subscription, newsletter, loyalty, VAT, and shipping management
- Blog category/post/comment administration
- Activity logs and store settings
- Session handling with token refresh support

## API Structure

This frontend talks to a backend REST API, but the codebase uses two patterns depending on which part of the app you are in.

### Storefront API Pattern

The storefront generally calls backend endpoints directly with `fetch`.

Common examples:

- `GET /api/Banners`
- `GET /api/Products`
- `GET /api/Categories`
- `GET /api/Brands`
- `GET /api/Products/quick-search`
- `POST /api/Auth/login`
- `POST /api/Auth/register`
- `GET /api/Customers/by-email/{email}`
- `POST /api/Orders`
- `GET /api/Payment/config`
- `POST /api/Payment/create-intent`
- `POST /api/shipping/quote`

Typical flow:

1. A route file or client component calls `fetch(...)`.
2. The response is parsed locally.
3. Data is passed into UI components or stored in React/context state.
4. Cart, wishlist, and auth session data are persisted in `localStorage` or `sessionStorage` where needed.

### Admin API Pattern

The admin mostly uses:

- `lib/api.ts` for the shared axios client
- `lib/api-config.ts` for endpoint constants
- `lib/services/*` for entity-specific API wrappers

Examples of admin service modules:

- `lib/services/products.ts`
- `lib/services/orders.ts`
- `lib/services/categories.ts`
- `lib/services/brands.ts`
- `lib/services/dashboard.ts`
- `lib/services/discounts.ts`
- `lib/services/blogPosts.ts`
- `lib/services/signalRService.ts`

Common admin endpoint groups:

- Auth: `/api/Auth/*`
- Products: `/api/Products/*`
- Categories: `/api/Categories/*`
- Brands: `/api/Brands/*`
- Orders: `/api/Orders/*`
- Shipping: `/api/Shipping/*`
- Discounts: `/api/Discounts/*`
- Banners: `/api/Banners/*`
- Blog: `/api/BlogCategories/*`, `/api/BlogPosts/*`, `/api/BlogComments/*`
- Customers: `/api/customers/*`
- VAT: `/api/VATRates/*`
- Dashboard: `/api/Dashboard/*`
- Loyalty: `/api/admin/loyalty-config`, `/api/loyalty/*`

Typical flow:

1. An admin page calls a service method such as `productsService.getAll(...)`.
2. The service uses the shared axios client.
3. The axios request interceptor injects the auth token from `localStorage`.
4. The response is normalized and returned to the page.
5. The page maps API data into table rows, cards, charts, or form state.

## Authentication Notes

- `middleware.ts` protects `/admin/*` routes and redirects unauthenticated admin users to `/login`.
- The storefront uses `context/AuthContext.tsx` for customer auth state.
- The admin uses `lib/services/auth.ts` plus admin layout/session checks for login state and token refresh.

## Important Architecture Notes

- Storefront and admin live together but are not fully unified in their data-access approach.
- The storefront is more page-driven and fetch-driven.
- The admin is more service-driven and axios-driven.
- This split is important to understand before refactoring or adding new features.

## Scripts

```json
{
  "dev": "next dev --turbo",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "clean": "rimraf .next node_modules && npm install"
}
```

## License

Proprietary
