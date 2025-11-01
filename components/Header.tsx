import Link from "next/link";

export default function Header() {
  return (
    <header className="bg-white border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold">E-Commerce</Link>
        <nav className="flex gap-6 items-center">
          <Link href="/products" className="hover:text-blue-600">Products</Link>
          <Link href="/cart" className="hover:text-blue-600">Cart (0)</Link>
          <Link href="/admin" className="text-sm text-gray-600 hover:text-blue-600">Admin</Link>
        </nav>
      </div>
    </header>
  );
}
