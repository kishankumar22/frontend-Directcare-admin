# E-Commerce Platform - Frontend

Modern e-commerce platform built with Next.js 15, TypeScript, Tailwind CSS, and shadcn/ui.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **State Management:** React Hooks
- **API Integration:** Custom API client

## Features

### Customer Portal
- Homepage with featured categories
- Product listing and search
- Shopping cart
- Checkout process

### Admin Panel (`/admin`)
- Dashboard with analytics
- Product management (CRUD)
- Order management
- Customer management
- Category management

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Backend API running (see Backend README)

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Update .env.local with your API URL
```

### Development

```bash
# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the customer portal.

Open [http://localhost:3000/admin](http://localhost:3000/admin) to access the admin panel.

### Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

### Lint

```bash
npm run lint
```

## Project Structure

```
src/frontend/
├── app/                    # Next.js App Router pages
│   ├── admin/             # Admin panel routes (/admin)
│   │   ├── layout.tsx     # Admin layout with sidebar
│   │   ├── page.tsx       # Dashboard
│   │   ├── products/      # Product management
│   │   ├── orders/        # Order management
│   │   ├── customers/     # Customer management
│   │   └── categories/    # Category management
│   ├── products/          # Customer product listing
│   ├── cart/              # Shopping cart
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Homepage
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── Header.tsx        # Shared header component
├── lib/                  # Utilities and services
│   ├── api.ts           # API client
│   ├── utils.ts         # Helper functions
│   └── services/        # API service layers
│       ├── products.ts
│       ├── categories.ts
│       ├── orders.ts
│       └── customers.ts
├── public/              # Static assets
├── .env.local          # Environment variables (gitignored)
├── .env.example        # Environment template
├── next.config.ts      # Next.js configuration
├── tailwind.config.ts  # Tailwind configuration
└── tsconfig.json       # TypeScript configuration
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://localhost:5000/api` |
| `NEXT_PUBLIC_APP_NAME` | Application name | `E-Commerce Platform` |
| `NEXT_PUBLIC_APP_URL` | Frontend URL | `http://localhost:3000` |

## API Integration

The frontend uses a custom API client (`lib/api.ts`) to communicate with the backend. Service modules are organized by entity:

- `lib/services/products.ts` - Product operations
- `lib/services/categories.ts` - Category operations
- `lib/services/orders.ts` - Order operations
- `lib/services/customers.ts` - Customer operations

Example usage:

```typescript
import { productsService } from '@/lib/services';

const { data, error } = await productsService.getAll();
if (data) {
  console.log('Products:', data);
}
```

## Routes

### Customer Routes
- `/` - Homepage
- `/products` - Product listing
- `/cart` - Shopping cart

### Admin Routes (requires `/admin` prefix)
- `/admin` - Dashboard
- `/admin/products` - Product management
- `/admin/orders` - Order management
- `/admin/customers` - Customer management
- `/admin/categories` - Category management

## Adding shadcn/ui Components

To add new shadcn/ui components:

```bash
npx shadcn@latest add [component-name]
```

Example:
```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dialog
```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect repository to Vercel
3. Add environment variables
4. Deploy

### Other Platforms

Build the production bundle:

```bash
npm run build
```

The output will be in the `.next` folder. Deploy using your preferred hosting platform.

## Production Checklist

- [ ] Update `NEXT_PUBLIC_API_URL` to production API
- [ ] Configure proper CORS on backend
- [ ] Enable authentication/authorization
- [ ] Add error boundaries
- [ ] Implement proper error handling
- [ ] Add loading states
- [ ] Optimize images
- [ ] Add SEO metadata
- [ ] Enable production mode
- [ ] Configure caching strategy
- [ ] Set up monitoring and analytics

## License

Proprietary
