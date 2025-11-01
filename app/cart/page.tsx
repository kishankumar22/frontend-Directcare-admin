import Link from "next/link";
import Header from "@/components/Header";

export default function CartPage() {
  return (
    <div className="min-h-screen">
      <Header />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="bg-white border rounded-lg p-8 text-center">
              <p className="text-gray-500">Your cart is empty</p>
              <Link href="/products" className="text-blue-600 hover:underline mt-2 inline-block">
                Continue Shopping
              </Link>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white border rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>$0.00</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span>$0.00</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-semibold">
                  <span>Total</span>
                  <span>$0.00</span>
                </div>
              </div>
              <button
                disabled
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
