"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { permissionsService } from '@/lib/services/permissions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function PagesTab() {
  const { data: response, isLoading, isError } = useQuery({
    queryKey: ['permissions-pages'],
    queryFn: () => permissionsService.getPages()
  });

  if (isLoading) {
    return (
      <div className="w-full flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return <div className="text-destructive p-4 border rounded-md">Failed to load pages.</div>;
  }

  const pages = response?.data?.data || [];

  return (
    <div className="space-y-4">
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
        {/* Scrollable Table Container */}
        <div className="relative overflow-y-auto" style={{ maxHeight: 'calc(100vh - 380px)' }}>
          <Table>
            {/* Sticky Table Header */}
            <TableHeader className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-800 border-b-2 border-slate-200 dark:border-slate-700 shadow-sm">
              <TableRow className="hover:bg-transparent border-0">
                <TableHead className="font-bold text-slate-500 dark:text-slate-400 text-xs tracking-wider h-10 uppercase px-4 bg-slate-50 dark:bg-slate-800">
                  Page Name
                </TableHead>
                <TableHead className="font-bold text-slate-500 dark:text-slate-400 text-xs tracking-wider h-10 uppercase px-4 bg-slate-50 dark:bg-slate-800">
                  Group
                </TableHead>
                <TableHead className="font-bold text-slate-500 dark:text-slate-400 text-xs tracking-wider h-10 uppercase px-4 bg-slate-50 dark:bg-slate-800">
                  Permission Key
                </TableHead>
              </TableRow>
            </TableHeader>
            
            {/* Table Body */}
            <TableBody>
              {pages.length > 0 ? (
                pages.map((page: any) => (
                  <TableRow key={page.id} className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <TableCell className="font-semibold text-slate-800 dark:text-slate-200 py-3 px-4">{page.name}</TableCell>
                    <TableCell className="py-3 px-4">
                      <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700">
                        {page.group}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <code className="text-[11px] bg-slate-50 dark:bg-[#0f172a] p-1 px-2 rounded-md font-mono text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-slate-800">
                        {page.key}
                      </code>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-12 text-slate-500">
                    No pages found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}