import Link from "next/link";
import Header from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Star, TrendingUp, Zap, Gift, Shield } from "lucide-react";

const featuredProducts = [
  {
    id: 1,
    name: 'Wireless Headphones Pro',
    price: 299,
    originalPrice: 399,
    rating: 4.8,
    reviews: 234,
    image: '🎧',
    badge: 'Best Seller',
    discount: 25
  },
  {
    id: 2,
    name: 'Smart Watch Series 5',
    price: 399,
    originalPrice: 499,
    rating: 4.9,
    reviews: 189,
    image: '⌚',
    badge: 'New',
    discount: 20
  },
  {
    id: 3,
    name: 'Premium Yoga Mat',
    price: 39,
    originalPrice: 59,
    rating: 4.7,
    reviews: 567,
    image: '🧘',
    badge: 'Hot Deal',
    discount: 34
  },
  {
    id: 4,
    name: 'Laptop Stand Pro',
    price: 79,
    originalPrice: 99,
    rating: 4.6,
    reviews: 89,
    image: '💻',
    badge: 'Sale',
    discount: 20
  },
];

const categories = [
  { name: 'Electronics', icon: '📱', count: 234, color: 'bg-blue-100 text-blue-700' },
  { name: 'Fashion', icon: '👕', count: 456, color: 'bg-purple-100 text-purple-700' },
  { name: 'Home & Living', icon: '🏠', count: 189, color: 'bg-pink-100 text-pink-700' },
  { name: 'Sports', icon: '⚽', count: 123, color: 'bg-green-100 text-green-700' },
  { name: 'Books', icon: '📚', count: 345, color: 'bg-orange-100 text-orange-700' },
  { name: 'Toys', icon: '🧸', count: 267, color: 'bg-red-100 text-red-700' },
];

const features = [
  { icon: Zap, title: 'Fast Delivery', description: 'Get your orders in 24-48 hours' },
  { icon: Shield, title: 'Secure Payment', description: '100% secure transactions' },
  { icon: Gift, title: 'Gift Cards', description: 'Perfect for any occasion' },
  { icon: TrendingUp, title: 'Best Prices', description: 'Competitive pricing guaranteed' },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <Header />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-20">
          <div className="max-w-3xl">
            <Badge className="mb-4 bg-white/20 text-white border-0">🎉 Special Summer Sale - Up to 50% Off</Badge>
            <h1 className="text-6xl font-bold mb-6 leading-tight">
              Discover Amazing Products at Great Prices
            </h1>
            <p className="text-xl mb-8 text-blue-100">
              Shop the latest trends in electronics, fashion, and home essentials. Quality guaranteed.
            </p>
            <div className="flex gap-4">
              <Link href="/products">
                <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Start Shopping
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                Explore Categories
              </Button>
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Features */}
        <section className="mb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="flex items-start gap-4 p-6">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <feature.icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{feature.title}</h3>
                    <p className="text-sm text-gray-600">{feature.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Featured Products */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold mb-2">Featured Products</h2>
              <p className="text-gray-600">Our best-selling items this month</p>
            </div>
            <Link href="/products">
              <Button variant="outline">View All</Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product) => (
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
                    <h3 className="font-semibold text-lg mb-2 line-clamp-2">{product.name}</h3>

                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">{product.rating}</span>
                      </div>
                      <span className="text-sm text-gray-500">({product.reviews} reviews)</span>
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
        </section>

        {/* Categories */}
        <section className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">Shop by Category</h2>
            <p className="text-gray-600">Browse our wide range of products</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((category, index) => (
              <Link key={index} href="/products">
                <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer border-0 shadow-md">
                  <CardContent className="p-6 text-center">
                    <div className="text-5xl mb-3">{category.icon}</div>
                    <h3 className="font-semibold mb-1">{category.name}</h3>
                    <p className="text-sm text-gray-500">{category.count} items</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* CTA Banner */}
        <section className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-12 text-white text-center">
          <h2 className="text-4xl font-bold mb-4">Join Our Newsletter</h2>
          <p className="text-xl mb-8 text-purple-100">Get exclusive deals and updates delivered to your inbox</p>
          <div className="flex gap-4 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 rounded-lg text-gray-900"
            />
            <Button size="lg" className="bg-white text-purple-600 hover:bg-gray-100">
              Subscribe
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
