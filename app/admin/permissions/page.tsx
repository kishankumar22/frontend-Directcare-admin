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
    <div className=" max-w-[1600px] mx-auto min-h-[calc(100vh-4rem)] text-slate-900 dark:text-slate-200">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 md:p-4 mb-3 md:mb-4 flex items-start gap-3 shadow-sm">
        <div className="p-1.5 md:p-2 bg-emerald-100 dark:bg-emerald-500/10 rounded-lg shrink-0">
          <ShieldAlert className="w-4 h-4 md:w-5 md:h-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h1 className="text-base md:text-lg font-bold text-slate-800 dark:text-white mb-0.5">Page Permissions</h1>
          <p className="text-[11px] md:text-xs text-slate-500 dark:text-slate-400">
            Grant access per page & action. A role's permissions apply to every user in that role; per-user overrides fine-tune individuals.
          </p>
        </div>
      </div>

      {/* Main Content using Tabs */}
      <Tabs defaultValue="roles" className="w-full">
        <TabsList className="sticky top-0 z-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-0 rounded-lg mb-2 md:mb-3 h-auto shadow-sm">
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
              <FileText className="w-4 h-4" /> Pages
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
