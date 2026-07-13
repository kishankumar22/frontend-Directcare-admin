"use client";

import React from 'react';
import { useQueryClient, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PagesTab } from './_components/PagesTab';
import { RolesTab } from './_components/RolesTab';
import { UsersTab } from './_components/UsersTab';


const queryClient = new QueryClient();

export default function PermissionsManagementPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <PermissionsManagementContent />
    </QueryClientProvider>
  );
}

function PermissionsManagementContent() {
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    queryClient.invalidateQueries();
  };

  return (
    <div className="p-2 mx-auto space-y-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Permissions Management</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage system pages, role permissions, and user overrides.
          </p>
        </div>
        <Button variant="outline" onClick={handleRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Main Content using Tabs */}
      <Tabs defaultValue="roles" className="space-y-4">
        <TabsList className="bg-muted">
          <TabsTrigger value="roles">Role Permissions</TabsTrigger>
          <TabsTrigger value="users">User Overrides</TabsTrigger>
          <TabsTrigger value="pages">System Pages</TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="space-y-4">
          <RolesTab />
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <UsersTab />
        </TabsContent>

        <TabsContent value="pages" className="space-y-4">
          <PagesTab />
        </TabsContent>
      </Tabs>

     
    </div>
  );
}
