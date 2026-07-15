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
    <div className="space-y-2">
      <PermissionTable
        data={permissions as PermissionRowData[]}
        isLoading={isLoadingPermissions}
        isSaving={updateMutation.isPending}
        onSave={(data) => updateMutation.mutate(data)}
        readOnly={isSuperAdmin}
        renderHeader={({ isDirty, handleSave, changedCount }) => (
          <div className="flex flex-col space-y-3 p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shadow-sm">
  {/* Roles List */}
  <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
    {roles.map((role: any) => (
      <button
        key={role.id}
        onClick={() => setSelectedRole(role.name)}
        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap border transition-all duration-200
          ${selectedRole === role.name
            ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-300 dark:hover:bg-slate-600 hover:text-slate-900 dark:hover:text-slate-200'}
        `}
        aria-pressed={selectedRole === role.name}
      >
        {role.name === 'SuperAdmin' && <ShieldAlert className={`w-3.5 h-3.5 ${selectedRole === role.name ? 'text-white' : 'text-amber-500 dark:text-amber-400'}`} />}
        {role.name}
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold leading-none ${selectedRole === role.name ? 'bg-white/20 text-white' : 'bg-slate-300 dark:bg-slate-600 text-slate-500 dark:text-slate-400'}`}
        >
          {role.usersCount || 15}
        </span>
      </button>
    ))}
  </div>

  {/* Table Header Controls */}
  {selectedRole && (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-100 dark:bg-slate-800 p-2 rounded-md">
      <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
        Editing <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{selectedRole}</span>
        {isSuperAdmin && (
          <span className="ml-1 text-amber-500 text-[10px] bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">Read Only</span>
        )}
      </div>
      {!isSuperAdmin && (
        <div className="flex items-center gap-3">
          {isDirty ? (
            <span className="text-xs text-amber-600 dark:text-amber-500 font-medium bg-amber-50 dark:bg-amber-500/10 px-2 py-1 rounded-md">
              Unsaved changes {changedCount > 0 ? `(${changedCount})` : ''}
            </span>
          ) : (
            <span className="text-xs text-slate-400 dark:text-slate-500">Saved — applies to all users in this role.</span>
          )}
          <Button
            onClick={handleSave}
            disabled={!isDirty || updateMutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700 text-white border-0 shadow-sm h-8 px-4 rounded-md text-xs font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            {updateMutation.isPending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-2 h-3.5 w-3.5" />}
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
