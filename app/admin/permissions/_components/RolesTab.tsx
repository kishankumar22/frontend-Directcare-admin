"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { permissionsService } from '@/lib/services/permissions';
import { staffService } from '@/lib/services/staff';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PermissionTable, PermissionRowData } from './PermissionTable';
import { useToast } from '@/app/admin/_components/CustomToast';

import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Save, Loader2 } from 'lucide-react';
import { useAuth } from '@/app/admin/_context/auth-context';
import { useEffect } from 'react';
import { getBackendMessage } from '@/app/admin/_utils/errorUtils';

export function RolesTab() {
  const { user } = useAuth();
  const [selectedRole, setSelectedRole] = useState<string>('');

  useEffect(() => {
    if (user?.role && !selectedRole) {
      setSelectedRole(user.role);
    }
  }, [user, selectedRole]);
  const toast = useToast();
  const queryClient = useQueryClient();

  // Fetch roles
  const { data: rolesResponse, isLoading: isLoadingRoles } = useQuery({
    queryKey: ['roles'],
    queryFn: () => staffService.getRoles()
  });

  const roles = rolesResponse?.data?.data || [];

  // Fetch permissions for selected role
  const { data: permissionsResponse, isLoading: isLoadingPermissions } = useQuery({
    queryKey: ['role-permissions', selectedRole],
    queryFn: () => permissionsService.getRolePermissions(selectedRole),
    enabled: !!selectedRole
  });

  const permissions = permissionsResponse?.data?.data || [];

  const updateMutation = useMutation({
    mutationFn: async (updatedData: PermissionRowData[]) => {
      const payload = updatedData.map(row => ({
        pageId: row.pageId,
        canView: row.canView,
        canCreate: row.canCreate,
        canEdit: row.canEdit,
        canDelete: row.canDelete
      }));
      const response = await permissionsService.updateRolePermissions(selectedRole, payload);
      if (response.error) {
        throw response;
      }
      return response;
    },
    onSuccess: (response: any) => {
      const backendMessage = response?.data?.message || "Role permissions updated successfully.";
      toast.success(backendMessage);
      queryClient.invalidateQueries({ queryKey: ['role-permissions', selectedRole] });
    },
    onError: (error: any) => {
      toast.error(getBackendMessage(error) || "Failed to update role permissions.");
    }
  });

  return (
    <div className="space-y-6">
      <PermissionTable
        data={permissions as PermissionRowData[]}
        isLoading={isLoadingPermissions}
        isSaving={updateMutation.isPending}
        onSave={(data) => updateMutation.mutate(data)}
        renderHeader={({ isDirty, handleSave, changedCount }) => (
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="max-w-sm w-full space-y-2">
              <Label htmlFor="role-select">Select Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole} disabled={isLoadingRoles}>
                <SelectTrigger id="role-select">
                  <SelectValue placeholder="Select a role to manage permissions" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role: any) => (
                    <SelectItem key={role.id} value={role.name}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedRole && (
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
