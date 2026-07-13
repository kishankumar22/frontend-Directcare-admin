"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { permissionsService } from '@/lib/services/permissions';
import { staffService } from '@/lib/services/staff';
import { PermissionTable, PermissionRowData } from './PermissionTable';
import { useToast } from '@/app/admin/_components/CustomToast';
import { Label } from '@/components/ui/label';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown, Loader2, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/app/admin/_context/auth-context';
import { useEffect } from 'react';
import { getBackendMessage } from '@/app/admin/_utils/errorUtils';

export function UsersTab() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  useEffect(() => {
    if (user?.id && !selectedUserId) {
      setSelectedUserId(user.id);
    }
  }, [user, selectedUserId]);
  const toast = useToast();
  const queryClient = useQueryClient();

  // Fetch all staff users for the dropdown
  // Note: Depending on pagination, you might need an autocomplete endpoint.
  // Using staffService.getAll with a large limit or search if available.
  const { data: usersResponse, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['staff-users'],
    queryFn: () => staffService.getAll({ pageSize: 100 })
  });

  const users = usersResponse?.data?.data?.items || [];
  const selectedUser = users.find(u => u.id === selectedUserId);

  // Fetch permissions for selected user
  const { data: permissionsResponse, isLoading: isLoadingPermissions } = useQuery({
    queryKey: ['user-permissions', selectedUserId],
    queryFn: () => permissionsService.getUserPermissions(selectedUserId),
    enabled: !!selectedUserId
  });

  // Map user permissions backend format to UI table format
  const mappedPermissions: PermissionRowData[] = (permissionsResponse?.data?.data || []).map((p) => ({
    pageId: p.pageId,
    key: p.key,
    name: p.name,
    group: p.group,
    canView: p.effective?.view || false,
    canCreate: p.effective?.create || false,
    canEdit: p.effective?.edit || false,
    canDelete: p.effective?.delete || false,
  }));

  const updateMutation = useMutation({
    mutationFn: async (updatedData: PermissionRowData[]) => {
      const payload = updatedData.map(row => ({
        pageId: row.pageId,
        canView: row.canView,
        canCreate: row.canCreate,
        canEdit: row.canEdit,
        canDelete: row.canDelete
      }));
      const response = await permissionsService.updateUserPermissions(selectedUserId, payload);
      if (response.error) {
        throw response;
      }
      return response;
    },
    onSuccess: (response: any) => {
      const backendMessage = response?.data?.message || "User permissions updated successfully.";
      toast.success(backendMessage);
      queryClient.invalidateQueries({ queryKey: ['user-permissions', selectedUserId] });
    },
    onError: (error: any) => {
      toast.error(getBackendMessage(error) || "Failed to update user permissions.");
    }
  });

  return (
    <div className="space-y-6">
      <PermissionTable
        data={mappedPermissions}
        isLoading={isLoadingPermissions}
        isSaving={updateMutation.isPending}
        onSave={(data) => updateMutation.mutate(data)}
        renderHeader={({ isDirty, handleSave, changedCount }) => (
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="max-w-sm w-full space-y-2 flex flex-col">
              <Label>Select User</Label>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                    disabled={isLoadingUsers}
                  >
                    {selectedUser ? selectedUser.fullName || selectedUser.email : "Search user..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                  <Command>
                    <CommandInput placeholder="Search user by name or email..." />
                    <CommandList>
                      <CommandEmpty>No user found.</CommandEmpty>
                      <CommandGroup>
                        {users.map((user) => (
                          <CommandItem
                            key={user.id}
                            value={user.fullName || user.email}
                            onSelect={() => {
                              setSelectedUserId(user.id);
                              setOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedUserId === user.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {user.fullName || user.firstName} ({user.email})
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            {selectedUserId && (
              <Button onClick={handleSave} disabled={!isDirty || updateMutation.isPending}>
                {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Permissions {changedCount > 0 ? `(${changedCount} changes)` : ''}
              </Button>
            )}
          </div>
        )}
      />
    </div>
  );
}
