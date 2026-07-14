"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { permissionsService } from '@/lib/services/permissions';
import { staffService } from '@/lib/services/staff';
import { PermissionTable, PermissionRowData } from './PermissionTable';
import { useToast } from '@/app/admin/_components/CustomToast';

import { Button } from '@/components/ui/button';
import { Save, Loader2, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/app/admin/_context/auth-context';
import { useEffect } from 'react';
import { getBackendMessage } from '@/app/admin/_utils/errorUtils';

export function RolesTab() {
  const { user } = useAuth();
  const [selectedRole, setSelectedRole] = useState<string>('');
  const isSuperAdmin = String(selectedRole || '').toLowerCase() === 'superadmin';

  useEffect(() => {
    if (user?.role && !selectedRole) {
      // user.role can be comma-separated when user has multiple roles (e.g. "Admin, SuperAdmin")
      // Pick the first role as default selection
      const firstRole = String(user.role).split(',')[0].trim();
      setSelectedRole(firstRole);
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
    <div className="space-y-3">
      <PermissionTable
        data={permissions as PermissionRowData[]}
        isLoading={isLoadingPermissions}
        isSaving={updateMutation.isPending}
        onSave={(data) => updateMutation.mutate(data)}
        readOnly={isSuperAdmin}
        renderHeader={({ isDirty, handleSave, changedCount }) => (
          <div className="flex flex-col space-y-3">
            {/* Roles List */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              {roles.map((role: any) => (
                <button
                  key={role.id}
                  onClick={() => setSelectedRole(role.name)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap border transition-all ${selectedRole === role.name ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-500/20' : 'bg-white dark:bg-[#1e293b] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'}`}
                >
                  {role.name === 'SuperAdmin' && <ShieldAlert className={`w-3 h-3 ${selectedRole === role.name ? 'text-white' : 'text-amber-500 dark:text-amber-400'}`} />}
                  {role.name}
                  <span className={`px-1 py-0.5 rounded text-[9px] font-bold leading-none ${selectedRole === role.name ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                    {role.usersCount || 15}
                  </span>
                </button>
              ))}
            </div>

            {/* Table Header Controls */}
            {selectedRole && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  Editing <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{selectedRole}</span>
                  {isSuperAdmin && (
                    <span className="ml-1.5 text-amber-500 text-[10px] bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">Read Only</span>
                  )}
                </div>
                {!isSuperAdmin && (
                  <div className="flex items-center gap-3">
                    {isDirty ? (
                      <span className="text-xs text-amber-600 dark:text-amber-500 font-medium">Unsaved changes {changedCount > 0 ? `(${changedCount})` : ''}</span>
                    ) : (
                      <span className="text-xs text-emerald-600/70 dark:text-emerald-500/70">Saved — applies to all users in this role.</span>
                    )}
                    <Button 
                      onClick={handleSave} 
                      disabled={!isDirty || updateMutation.isPending}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white border-0 shadow-sm shadow-emerald-500/20 h-7 px-3 rounded text-[11px] font-medium"
                    >
                      {updateMutation.isPending ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <Save className="mr-1.5 h-3 w-3" />}
                      Save changes
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      />
    </div>
  );
}
