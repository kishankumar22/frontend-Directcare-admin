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
      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Page Name</TableHead>
              <TableHead>Group</TableHead>
              <TableHead>Permission Key</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pages.length > 0 ? (
              pages.map((page) => (
                <TableRow key={page.id}>
                  <TableCell className="font-medium">{page.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-muted/50">{page.group}</Badge>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted p-1 rounded font-mono text-muted-foreground">{page.key}</code>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                  No pages found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
