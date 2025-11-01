"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserPlus, Mail, Phone, MapPin, Eye, Search } from "lucide-react";

const customers = [
  { id: '1', name: 'John Doe', email: 'john@example.com', phone: '+1 234-567-8901', orders: 12, spent: '$3,456', status: 'Active', joined: 'Jan 2025', avatar: 'JD' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', phone: '+1 234-567-8902', orders: 8, spent: '$2,890', status: 'Active', joined: 'Feb 2025', avatar: 'JS' },
  { id: '3', name: 'Bob Johnson', email: 'bob@example.com', phone: '+1 234-567-8903', orders: 15, spent: '$4,120', status: 'Active', joined: 'Dec 2024', avatar: 'BJ' },
  { id: '4', name: 'Alice Brown', email: 'alice@example.com', phone: '+1 234-567-8904', orders: 3, spent: '$890', status: 'New', joined: 'Mar 2025', avatar: 'AB' },
  { id: '5', name: 'Charlie Wilson', email: 'charlie@example.com', phone: '+1 234-567-8905', orders: 0, spent: '$0', status: 'Inactive', joined: 'Mar 2025', avatar: 'CW' },
];

export default function CustomersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">Manage your customer base</p>
        </div>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Customer
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
            <p className="text-xs text-muted-foreground">+18% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Regular buyers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">Recent signups</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Lifetime Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$2,271</div>
            <p className="text-xs text-muted-foreground">Per customer</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select className="px-4 py-2 border rounded-lg">
              <option>All Status</option>
              <option>Active</option>
              <option>New</option>
              <option>Inactive</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Customers List */}
      <Card>
        <CardHeader>
          <CardTitle>All Customers</CardTitle>
          <CardDescription>Complete list of registered customers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {customers.map((customer) => (
              <div
                key={customer.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                    {customer.avatar}
                  </div>

                  <div>
                    <p className="font-semibold">{customer.name}</p>
                    <div className="flex items-center gap-4 mt-1">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {customer.email}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {customer.phone}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Orders</p>
                    <p className="font-semibold">{customer.orders}</p>
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Total Spent</p>
                    <p className="font-semibold text-blue-600">{customer.spent}</p>
                  </div>

                  <div className="text-center min-w-[80px]">
                    <Badge
                      variant={
                        customer.status === 'Active' ? 'default' :
                        customer.status === 'New' ? 'secondary' :
                        'outline'
                      }
                    >
                      {customer.status}
                    </Badge>
                  </div>

                  <div className="text-center min-w-[80px]">
                    <p className="text-sm text-muted-foreground">Joined</p>
                    <p className="text-sm font-medium">{customer.joined}</p>
                  </div>

                  <Button variant="outline" size="icon">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
