"use client";

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { permissionsService } from '@/lib/services/permissions';
import { staffService } from '@/lib/services/staff';
import { useToast } from '@/app/admin/_components/CustomToast';
import { Search, Loader2, Save, Eye, Plus, Edit2, Trash2, Check } from 'lucide-react';
import { useAuth } from '@/app/admin/_context/auth-context';
import { getBackendMessage } from '@/app/admin/_utils/errorUtils';
import { Button } from '@/components/ui/button';

// Helper component for 3-way toggle
function ThreeWayToggle({ value, onChange }: { value: 'inherit' | 'allow' | 'deny', onChange: (val: any) => void }) {
  return (
    <div className="flex bg-slate-100 dark:bg-[#0f172a] rounded overflow-hidden border border-slate-200 dark:border-slate-800 text-[10px] font-medium h-7 w-fit shrink-0">
      <button 
        onClick={() => onChange('inherit')} 
        className={`px-2 flex items-center gap-1 transition-colors ${value === 'inherit' ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
      >
        Inherit{value === 'inherit' ? <Check className="w-3 h-3 ml-0.5" /> : null}
      </button>
      <div className="w-px bg-slate-200 dark:bg-slate-800"></div>
      <button 
        onClick={() => onChange('allow')} 
        className={`px-2 transition-colors ${value === 'allow' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-800'}`}
      >
        Allow
      </button>
      <div className="w-px bg-slate-200 dark:bg-slate-800"></div>
      <button 
        onClick={() => onChange('deny')} 
        className={`px-2 transition-colors ${value === 'deny' ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400' : 'text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800'}`}
      >
        Deny
      </button>
    </div>
  );
}

export function UsersTab() {
  const { user } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [localOverrides, setLocalOverrides] = useState<Record<string, any>>({});
  const [isDirty, setIsDirty] = useState(false);

  const toast = useToast();
  const queryClient = useQueryClient();

  // Fetch all staff users for the sidebar
  const { data: usersResponse, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['staff-users'],
    queryFn: () => staffService.getAll({ pageSize: 100 })
  });

  const users = usersResponse?.data?.data?.items || [];
  const filteredUsers = users.filter((u: any) => 
    (u.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const selectedUser = users.find((u: any) => u.id === selectedUserId);

  useEffect(() => {
    if (users.length > 0 && !selectedUserId) {
      setSelectedUserId(users[0].id);
    }
  }, [users, selectedUserId]);

  // Fetch permissions for selected user
  const { data: permissionsResponse, isLoading: isLoadingPermissions } = useQuery({
    queryKey: ['user-permissions', selectedUserId],
    queryFn: () => permissionsService.getUserPermissions(selectedUserId),
    enabled: !!selectedUserId
  });

  const permissions = permissionsResponse?.data?.data || [];

  // Initialize local state when API data changes
  useEffect(() => {
    if (permissions.length > 0) {
      const initialOverrides: Record<string, any> = {};
      permissions.forEach((p: any) => {
        initialOverrides[p.pageId] = {
          view: p.override?.view === true ? 'allow' : p.override?.view === false ? 'deny' : 'inherit',
          create: p.override?.create === true ? 'allow' : p.override?.create === false ? 'deny' : 'inherit',
          edit: p.override?.edit === true ? 'allow' : p.override?.edit === false ? 'deny' : 'inherit',
          delete: p.override?.delete === true ? 'allow' : p.override?.delete === false ? 'deny' : 'inherit',
        };
      });
      setLocalOverrides(initialOverrides);
      setIsDirty(false);
    } else {
      setLocalOverrides({});
      setIsDirty(false);
    }
  }, [permissions, selectedUserId]);

  const handleToggle = (pageId: string, action: string, value: 'inherit' | 'allow' | 'deny') => {
    setLocalOverrides(prev => ({
      ...prev,
      [pageId]: {
        ...prev[pageId],
        [action]: value
      }
    }));
    setIsDirty(true);
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      // Map 'inherit'|'allow'|'deny' back to true|false|null
      const payload = Object.keys(localOverrides).map(pageId => {
        const row = localOverrides[pageId];
        return {
          pageId,
          canView: row.view === 'allow' ? true : row.view === 'deny' ? false : null,
          canCreate: row.create === 'allow' ? true : row.create === 'deny' ? false : null,
          canEdit: row.edit === 'allow' ? true : row.edit === 'deny' ? false : null,
          canDelete: row.delete === 'allow' ? true : row.delete === 'deny' ? false : null
        };
      });
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

  const groupedData = permissions.reduce((acc: any, row: any) => {
    if (!acc[row.group]) acc[row.group] = [];
    acc[row.group].push(row);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="flex flex-col md:flex-row gap-4 h-[calc(100vh-14rem)]">
      {/* Sidebar - User List */}
      <div className="w-full md:w-72 flex flex-col bg-white dark:bg-[#1e293b] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shrink-0">
        <div className="p-3 border-b border-slate-200 dark:border-slate-800">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input 
              type="text" 
              placeholder="Search staff..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {isLoadingUsers ? (
            <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-slate-500" /></div>
          ) : filteredUsers.map((u: any) => {
            const initials = (u.fullName || u.email || 'U').substring(0, 2).toUpperCase();
            const isActive = selectedUserId === u.id;
            return (
              <button
                key={u.id}
                onClick={() => setSelectedUserId(u.id)}
                className={`w-full flex items-center gap-3 p-2.5 text-left transition-colors border-l-2 ${isActive ? 'bg-slate-50 dark:bg-[#0f172a] border-emerald-500' : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isActive ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`text-sm font-medium truncate ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}`}>
                    {u.fullName || u.firstName || u.email}
                  </div>
                  <div className="text-xs text-slate-500 truncate">{u.roles ? (Array.isArray(u.roles) ? u.roles.join(', ') : u.roles) : 'User'}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content - Permissions Matrix */}
      <div className="flex-1 flex flex-col bg-white dark:bg-[#1e293b] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden min-w-0">
        {!selectedUser ? (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            Select a user from the sidebar to manage overrides.
          </div>
        ) : (
          <>
            <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base text-slate-700 dark:text-slate-200">
                  Overriding <span className="font-bold text-slate-900 dark:text-white">{selectedUser.fullName || selectedUser.email}</span> : role: <span className="text-emerald-600 dark:text-emerald-400">{selectedUser.roles ? (Array.isArray(selectedUser.roles) ? selectedUser.roles.join(', ') : selectedUser.roles) : 'User'}</span>
                </h2>
                <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <div className="flex items-center justify-center w-3 h-3 rounded-full border border-slate-300 dark:border-slate-600">i</div>
                  <span className="font-medium text-slate-700 dark:text-slate-300">Inherit</span> = follow the role - <span className="text-emerald-600 dark:text-emerald-400 font-medium">Allow</span> = grant anyway - <span className="text-rose-600 dark:text-rose-400 font-medium">Deny</span> = block even if the role allows.
                </div>
              </div>
              <Button 
                onClick={() => updateMutation.mutate()} 
                disabled={!isDirty || updateMutation.isPending}
                className="bg-emerald-500 hover:bg-emerald-600 text-white border-0 shadow-lg shadow-emerald-500/20 h-9 px-4 rounded-md shrink-0"
              >
                {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {isLoadingPermissions ? (
                <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-slate-500" /></div>
              ) : Object.keys(groupedData).length === 0 ? (
                 <div className="flex justify-center p-8 text-slate-500">No permissions available.</div>
              ) : (
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead className="bg-slate-50 dark:bg-[#1e293b] sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-3 py-2.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase w-[160px]">PAGE</th>
                      <th className="px-3 py-2.5 font-bold text-slate-700 dark:text-slate-300">
                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400"><Eye className="w-4 h-4" /> View</div>
                      </th>
                      <th className="px-3 py-2.5 font-bold text-slate-700 dark:text-slate-300">
                        <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400"><Plus className="w-4 h-4" /> Create</div>
                      </th>
                      <th className="px-3 py-2.5 font-bold text-slate-700 dark:text-slate-300">
                        <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400"><Edit2 className="w-4 h-4" /> Edit</div>
                      </th>
                      <th className="px-3 py-2.5 font-bold text-slate-700 dark:text-slate-300">
                        <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400"><Trash2 className="w-4 h-4" /> Delete</div>
                      </th>
                      <th className="px-3 py-2.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase text-center w-[100px]">EFFECTIVE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(groupedData).map(([group, rows]: [string, any]) => (
                      <React.Fragment key={group}>
                        <tr className="bg-slate-50 dark:bg-[#1e293b] border-b border-slate-200 dark:border-slate-800">
                          <td colSpan={6} className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-1 h-3 bg-emerald-500 rounded-full"></div>
                              <span className="font-bold text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-widest">{group}</span>
                            </div>
                          </td>
                        </tr>
                        {rows.map((row: any) => {
                          const overrides = localOverrides[row.pageId] || { view: 'inherit', create: 'inherit', edit: 'inherit', delete: 'inherit' };
                          
                          // Display colored dots for effective permissions
                          const renderDots = () => {
                             return (
                               <div className="flex items-center justify-center gap-1.5">
                                 <div className={`w-2 h-2 rounded-full ${row.effective?.view ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                                 <div className={`w-2 h-2 rounded-full ${row.effective?.create ? 'bg-purple-500' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                                 <div className={`w-2 h-2 rounded-full ${row.effective?.edit ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                                 <div className={`w-2 h-2 rounded-full ${row.effective?.delete ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                               </div>
                             );
                          }

                          return (
                            <tr key={row.pageId} className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                              <td className="px-3 py-2 font-semibold text-slate-800 dark:text-slate-200 text-sm">{row.name}</td>
                              <td className="px-3 py-2">
                                <ThreeWayToggle value={overrides.view} onChange={(v) => handleToggle(row.pageId, 'view', v)} />
                              </td>
                              <td className="px-3 py-2">
                                <ThreeWayToggle value={overrides.create} onChange={(v) => handleToggle(row.pageId, 'create', v)} />
                              </td>
                              <td className="px-3 py-2">
                                <ThreeWayToggle value={overrides.edit} onChange={(v) => handleToggle(row.pageId, 'edit', v)} />
                              </td>
                              <td className="px-3 py-2">
                                <ThreeWayToggle value={overrides.delete} onChange={(v) => handleToggle(row.pageId, 'delete', v)} />
                              </td>
                              <td className="px-3 py-2">
                                {renderDots()}
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
