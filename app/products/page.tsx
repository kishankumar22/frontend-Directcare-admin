import Link from "next/link";
import Header from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Star, Filter, SlidersHorizontal } from "lucide-react";

const products = [
  { id: 1, name: 'Wireless Headphones Pro', price: 299, originalPrice: 399, rating: 4.8, reviews: 234, image: '🎧', badge: 'Best Seller', discount: 25, category: 'Electronics' },
  { id: 2, name: 'Smart Watch Series 5', price: 399, originalPrice: 499, rating: 4.9, reviews: 189, image: '⌚', badge: 'New', discount: 20, category: 'Electronics' },
  { id: 3, name: 'Premium Yoga Mat', price: 39, originalPrice: 59, rating: 4.7, reviews: 567, image: '🧘', badge: 'Hot Deal', discount: 34, category: 'Sports' },
  { id: 4, name: 'Laptop Stand Pro', price: 79, originalPrice: 99, rating: 4.6, reviews: 89, image: '💻', badge: 'Sale', discount: 20, category: 'Accessories' },
  { id: 5, name: 'Designer T-Shirt', price: 49, originalPrice: 79, rating: 4.5, reviews: 345, image: '👕', badge: 'Trending', discount: 38, category: 'Fashion' },
  { id: 6, name: 'USB-C Hub 7-in-1', price: 59, originalPrice: 89, rating: 4.7, reviews: 256, image: '🔌', badge: 'Popular', discount: 34, category: 'Electronics' },
  { id: 7, name: 'Coffee Maker Deluxe', price: 129, originalPrice: 179, rating: 4.8, reviews: 178, image: '☕', badge: 'Featured', discount: 28, category: 'Home' },
  { id: 8, name: 'Running Shoes Pro', price: 89, originalPrice: 129, rating: 4.6, reviews: 423, image: '👟', badge: 'Best Seller', discount: 31, category: 'Sports' },
  { id: 9, name: 'Bluetooth Speaker', price: 79, originalPrice: 119, rating: 4.7, reviews: 312, image: '🔊', badge: 'Hot', discount: 34, category: 'Electronics' },
  { id: 10, name: 'Desk Lamp LED', price: 45, originalPrice: 69, rating: 4.5, reviews: 234, image: '💡', badge: 'New', discount: 35, category: 'Home' },
  { id: 11, name: 'Water Bottle Steel', price: 29, originalPrice: 45, rating: 4.8, reviews: 567, image: '🍾', badge: 'Eco-Friendly', discount: 36, category: 'Sports' },
  { id: 12, name: 'Backpack Premium', price: 69, originalPrice: 99, rating: 4.6, reviews: 189, image: '🎒', badge: 'Sale', discount: 30, category: 'Fashion' },
];

export default function ProductsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">All Products</h1>
          <p className="text-gray-600">Discover our complete collection</p>
        </div>

        <div className="flex gap-8">
          {/* Sidebar Filters */}
          <aside className="w-64 flex-shrink-0">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-6">
                  <SlidersHorizontal className="h-5 w-5" />
                  <h2 className="font-semibold text-lg">Filters</h2>
                </div>

                {/* Category Filter */}
                <div className="mb-6">
                  <h3 className="font-semibold mb-3">Category</h3>
                  <div className="space-y-2">
                    {['All', 'Electronics', 'Fashion', 'Sports', 'Home', 'Accessories'].map((cat) => (
                      <label key={cat} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="rounded" defaultChecked={cat === 'All'} />
                        <span className="text-sm">{cat}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div className="mb-6">
                  <h3 className="font-semibold mb-3">Price Range</h3>
                  <div className="space-y-2">
                    {['Under $50', '$50 - $100', '$100 - $200', 'Over $200'].map((range) => (
                      <label key={range} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm">{range}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Rating */}
                <div className="mb-6">
                  <h3 className="font-semibold mb-3">Rating</h3>
                  <div className="space-y-2">
                    {[4, 3, 2, 1].map((rating) => (
                      <label key={rating} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="rounded" />
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm">{rating}+ Stars</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <Button className="w-full" variant="outline">Reset Filters</Button>
              </CardContent>
            </Card>
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            {/* Search and Sort */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder="Search products..."
                      className="w-full px-4 py-2 border rounded-lg pl-10"
                    />
                    <Filter className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  </div>
                  <select className="px-4 py-2 border rounded-lg">
                    <option>Sort by: Featured</option>
                    <option>Price: Low to High</option>
                    <option>Price: High to Low</option>
                    <option>Rating: High to Low</option>
                    <option>Newest First</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Product Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <Card key={product.id} className="group hover:shadow-xl transition-all duration-300 border-0 shadow-md overflow-hidden">
                  <CardContent className="p-0">
                    <div className="relative bg-gradient-to-br from-gray-100 to-gray-200 p-8 flex items-center justify-center h-48">
                      <span className="text-7xl transform group-hover:scale-110 transition-transform">
                        {product.image}
                      </span>
                      {product.discount > 0 && (
                        <Badge className="absolute top-3 right-3 bg-red-500 text-white">
                          -{product.discount}%
                        </Badge>
                      )}
                      <Badge className="absolute top-3 left-3 bg-blue-600 text-white">
                        {product.badge}
                      </Badge>
                    </div>

                    <div className="p-4">
                      <Badge variant="outline" className="mb-2 text-xs">
                        {product.category}
                      </Badge>

                      <h3 className="font-semibold text-lg mb-2 line-clamp-2">{product.name}</h3>

                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium">{product.rating}</span>
                        </div>
                        <span className="text-sm text-gray-500">({product.reviews})</span>
                      </div>

                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-2xl font-bold text-blue-600">${product.price}</span>
                        <span className="text-sm text-gray-400 line-through">${product.originalPrice}</span>
                      </div>

                      <Button className="w-full group-hover:bg-blue-700" size="sm">
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        Add to Cart
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            <div className="mt-8 flex justify-center gap-2">
              <Button variant="outline">Previous</Button>
              <Button>1</Button>
              <Button variant="outline">2</Button>
              <Button variant="outline">3</Button>
              <Button variant="outline">Next</Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
