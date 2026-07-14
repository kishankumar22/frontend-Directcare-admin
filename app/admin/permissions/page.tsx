"use client";

import React from 'react';
import { useQueryClient, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RefreshCw, ShieldAlert, User, FileText } from 'lucide-react';
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
    <div className="p-4 max-w-[1600px] mx-auto min-h-[calc(100vh-4rem)] bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-slate-200">
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 rounded-xl p-4 md:p-6 mb-4 md:mb-6 flex items-start gap-4 shadow-sm">
        <div className="p-2 md:p-3 bg-emerald-100 dark:bg-emerald-500/10 rounded-lg shrink-0">
          <ShieldAlert className="w-5 h-5 md:w-6 md:h-6 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h1 className="text-lg md:text-xl font-bold text-slate-800 dark:text-white mb-1">Page Permissions</h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
            Grant access per page & action. A role's permissions apply to every user in that role; per-user overrides fine-tune individuals.
          </p>
        </div>
      </div>

      {/* Main Content using Tabs */}
      <Tabs defaultValue="roles" className="w-full">
        <TabsList className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 p-1 rounded-lg mb-4 md:mb-6 h-auto shadow-sm">
          <TabsTrigger value="roles" className="data-[state=active]:bg-emerald-50 dark:data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 rounded-md px-4 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 transition-all">
            <span className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" /> By Role
            </span>
          </TabsTrigger>
          <TabsTrigger value="users" className="data-[state=active]:bg-emerald-50 dark:data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 rounded-md px-4 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 transition-all">
            <span className="flex items-center gap-2">
              <User className="w-4 h-4" /> By User
            </span>
          </TabsTrigger>
          <TabsTrigger value="pages" className="data-[state=active]:bg-emerald-50 dark:data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 rounded-md px-4 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 transition-all">
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4" /> By Page
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="mt-0 outline-none">
          <RolesTab />
        </TabsContent>

        <TabsContent value="users" className="mt-0 outline-none">
          <UsersTab />
        </TabsContent>

        <TabsContent value="pages" className="mt-0 outline-none">
          <PagesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
