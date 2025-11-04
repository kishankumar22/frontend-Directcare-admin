"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Package, Edit, Trash2, Eye, Search, Filter, TrendingUp, AlertCircle, X, Tag, DollarSign, Calendar, User } from "lucide-react";
import { useToast } from "@/components/CustomToast";
interface Product {
  id: string;
  name: string;
  categoryName: string;
  price: number;
  stock?: number;
  status?: string;
  image?: string;
  sales?: number;
  shortDescription: string;
  sku: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
  description: string;
  category: string
}

export default function ProductsPage() {
    const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

const fetchProducts = async () => {
  setLoading(true);
  
  try {

    const token = localStorage.getItem('token');

    const response = await fetch(`https://testapi.knowledgemarkg.com/api/Products`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    // Dismiss loading toast
    // toast.dismiss(loadingId);

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data && data.data.items) {
        const formattedProducts = data.data.items.map((p: any) => ({
          id: p.id,
          name: p.name,
          categoryName: p.categoryName || 'Uncategorized',
          price: p.price || 0,
          stock: p.stockQuantity || 0,
          status: p.stockQuantity > 10 ? 'In Stock' : p.stockQuantity > 0 ? 'Low Stock' : 'Out of Stock',
          image: '📦',
          sales: 0,
          shortDescription: p.shortDescription || '',
          sku: p.sku || '',
          createdAt: new Date(p.createdAt).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
          }),
          updatedAt: p.updatedAt ? new Date(p.updatedAt).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
          }) : '',
          updatedBy: p.updatedBy || 'N/A',
          description: p.description || p.shortDescription || '',
          category: p.categoryName || 'Uncategorized'
        }));
        
        setProducts(formattedProducts);
      } else {
        // No products found
        toast.warning('No products found in your inventory.');
        setProducts([]);
      }
    } else {
      // HTTP error
      if (response.status === 401) {
        toast.error('Session expired. Please login again.');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else {
        toast.error(`Failed to load products (Error ${response.status})`);
      }
    }
  } catch (error) {
    console.error('Error fetching products:', error);
    
    // ❌ Network/Connection error
    toast.error('Failed to load products. Please check your connection and try again.');
  } finally {
    setLoading(false);
  }
};



  const lowStockCount = products.filter(p => p.status === 'Low Stock').length;
  const outOfStockCount = products.filter(p => p.status === 'Out of Stock').length;

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
            Products
          </h1>
          <p className="text-slate-400 mt-1">Manage your product inventory</p>
        </div>
        <Link href="/admin/products/add">
          <button className="px-4 py-2 bg-gradient-to-r from-violet-500 to-cyan-500 text-white rounded-xl hover:shadow-lg hover:shadow-violet-500/50 transition-all flex items-center gap-2 font-semibold">
            <Plus className="w-5 h-5" />
            Add Product
          </button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 backdrop-blur-xl border border-violet-500/20 rounded-xl p-4 hover:shadow-lg hover:shadow-violet-500/10 transition-all group cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-violet-500 to-purple-500 rounded-lg group-hover:scale-110 transition-transform">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-400 mb-0.5">Total Products</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-white">{products.length}</p>
                <span className="text-xs text-violet-400 flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" />
                  All Categories
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500/10 to-amber-500/10 backdrop-blur-xl border border-orange-500/20 rounded-xl p-4 hover:shadow-lg hover:shadow-orange-500/10 transition-all group cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg group-hover:scale-110 transition-transform">
              <AlertCircle className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-400 mb-0.5">Low Stock</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-white">{lowStockCount}</p>
                <span className="text-xs text-orange-400">Need Restocking</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500/10 to-rose-500/10 backdrop-blur-xl border border-red-500/20 rounded-xl p-4 hover:shadow-lg hover:shadow-red-500/10 transition-all group cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-red-500 to-rose-500 rounded-lg group-hover:scale-110 transition-transform">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-400 mb-0.5">Out of Stock</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-white">{outOfStockCount}</p>
                <span className="text-xs text-red-400">Urgent Attention</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-2 gap">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by product name, SKU..."
              className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
            />
          </div>
          <select className="px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all">
            <option>All Categories</option>
            <option>Electronics</option>
            <option>Fashion</option>
            <option>Accessories</option>
            <option>Sports</option>
          </select>
          <div className="text-sm text-slate-400">
            {products.length} product{products.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-2">
        <div className="">
          <h3 className="text-xl font-bold text-white">All Products</h3>
          <p className="text-sm text-slate-400">A list of all products in your store</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-1.5 px-4 text-slate-300 font-semibold">Product</th>
                <th className="text-left py-1.5 px-4 text-slate-300 font-semibold">SKU</th>
                <th className="text-center py-1.5 px-4 text-slate-300 font-semibold">Price</th>
                <th className="text-center py-1.5 px-4 text-slate-300 font-semibold">Stock</th>
                <th className="text-center py-1.5 px-4 text-slate-300 font-semibold">Sales</th>
                <th className="text-center py-1.5 px-4 text-slate-300 font-semibold">Status</th>
                <th className="text-left py-1.5 px-2 text-slate-300 font-semibold">Updated At</th>
                <th className="text-left py-1.5 px-4 text-slate-300 font-semibold">Updated By</th>
                <th className="text-center py-1.5 px-4 text-slate-300 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center text-2xl">
                        {product.image}
                      </div>
                      <div>
                        <p className="text-white font-medium">{product.name}</p>
                        <p className="text-xs text-slate-500">{product.categoryName}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-slate-400 text-sm font-mono">{product.sku}</span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <DollarSign className="h-4 w-4 text-green-400" />
                      <span className="text-white font-semibold">{product.price}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="px-3 py-1 bg-cyan-500/10 text-cyan-400 rounded-lg text-sm font-medium">
                      {product.stock}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="flex items-center justify-center gap-1 text-slate-300 text-sm">
                      <TrendingUp className="h-4 w-4 text-violet-400" />
                      {product.sales}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                      product.status === 'In Stock' ? 'bg-green-500/10 text-green-400' :
                      product.status === 'Low Stock' ? 'bg-orange-500/10 text-orange-400' :
                      'bg-red-500/10 text-red-400'
                    }`}>
                      {product.status}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2 text-slate-300 text-sm">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      {product.updatedAt}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-slate-400 text-sm">{product.updatedBy}</span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setViewingProduct(product)}
                        className="p-2 text-violet-400 hover:bg-violet-500/10 rounded-lg transition-all"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <Link href={`/admin/products/edit/${product.id}`}>
                        <button
                          className="p-2 text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all"
                          title="Edit Product"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      </Link>
                      <button
                        onClick={() => setDeleteConfirm(product.id)}
                        className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                        title="Delete Product"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Details Modal */}
      {viewingProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                Product Details
              </h2>
              <button
                onClick={() => setViewingProduct(null)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-2 space-y-2">
              {/* Product Image and Basic Info */}
              <div className="flex items-start gap-6">
                <div className="w-32 h-32 rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center text-6xl flex-shrink-0">
                  {viewingProduct.image}
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-white mb-2">{viewingProduct.name}</h3>
                  <p className="text-slate-400 mb-4">{viewingProduct.description}</p>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-violet-500/10 text-violet-400 rounded-lg text-sm font-medium">
                      {viewingProduct.category}
                    </span>
                    <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
                      viewingProduct.status === 'In Stock' ? 'bg-green-500/10 text-green-400' :
                      viewingProduct.status === 'Low Stock' ? 'bg-orange-500/10 text-orange-400' :
                      'bg-red-500/10 text-red-400'
                    }`}>
                      {viewingProduct.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Product Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-800/50 rounded-xl">
                  <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                    <Tag className="w-4 h-4" />
                    <span>SKU</span>
                  </div>
                  <p className="text-white font-semibold font-mono">{viewingProduct.sku}</p>
                </div>

                <div className="p-4 bg-slate-800/50 rounded-xl">
                  <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                    <DollarSign className="w-4 h-4" />
                    <span>Price</span>
                  </div>
                  <p className="text-white font-semibold text-xl">${viewingProduct.price}</p>
                </div>

                <div className="p-4 bg-slate-800/50 rounded-xl">
                  <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                    <Package className="w-4 h-4" />
                    <span>Stock</span>
                  </div>
                  <p className="text-white font-semibold text-xl">{viewingProduct.stock} units</p>
                </div>

                <div className="p-4 bg-slate-800/50 rounded-xl">
                  <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                    <TrendingUp className="w-4 h-4" />
                    <span>Total Sales</span>
                  </div>
                  <p className="text-white font-semibold text-xl">{viewingProduct.sales}</p>
                </div>
              </div>

              {/* Activity */}
              <div>
                <h4 className="text-sm font-semibold text-slate-400 mb-3">Activity</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 bg-slate-900/50 rounded-xl">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                      <Calendar className="w-4 h-4" />
                      <span>Created At</span>
                    </div>
                    <p className="text-white text-sm">{viewingProduct.createdAt}</p>
                  </div>
                  <div className="p-3 bg-slate-900/50 rounded-xl">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                      <Calendar className="w-4 h-4" />
                      <span>Updated At</span>
                    </div>
                    <p className="text-white text-sm">{viewingProduct.updatedAt}</p>
                  </div>
                  <div className="p-3 bg-slate-900/50 rounded-xl">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                      <User className="w-4 h-4" />
                      <span>Updated By</span>
                    </div>
                    <p className="text-white text-sm">{viewingProduct.updatedBy}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white text-center mb-2">
                Delete Product
              </h3>
              <p className="text-slate-400 text-center mb-6">
                Are you sure you want to delete this product? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-3 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-all font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Add delete logic here
                    setDeleteConfirm(null);
                  }}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-xl hover:shadow-lg hover:shadow-red-500/50 transition-all font-semibold"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
