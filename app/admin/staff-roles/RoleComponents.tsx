'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Edit, Eye, Plus, RefreshCw, Search, Trash2, X, AlertCircle, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useToast } from '@/app/admin/_components/CustomToast';
import ConfirmDialog from '@/app/admin/_components/ConfirmDialog';
import type { StaffRole } from '@/lib/services/staff';

export type RoleAction =
  | { type: 'view'; item: StaffRole }
  | { type: 'create' }
  | { type: 'edit'; item: StaffRole }
  | { type: 'delete'; item: StaffRole };

export const RoleFilters = React.memo(function RoleFilters({
  search,
  searching,
  loading,
  onSearchChange,
  systemFilter,
  onSystemFilterChange,
  onReset,
}: {
  search: string;
  searching: boolean;
  loading: boolean;
  onSearchChange: (value: string) => void;
  systemFilter: string;
  onSystemFilterChange: (value: string) => void;
  onReset: () => void;
}) {
  const isFilterActive = search.trim() !== '' || systemFilter !== '';

  return (
    <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 shadow-sm">
      <div className="flex items-center gap-3 w-full">
        {/* Search Input Container */}
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className={`h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
              search.trim() !== '' ? 'text-violet-500 dark:text-violet-400' : 'text-slate-500'
            }`} />
            <input
              type="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="role name..."
              className={`w-full pl-9 pr-10 py-1.5 bg-white dark:bg-slate-950/40 border rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/60 transition-all ${
                search.trim() !== ''
                  ? 'border-violet-500 dark:border-violet-500/60 bg-violet-500/5 dark:bg-violet-950/60 shadow-sm shadow-violet-500/10'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            />
            {searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <RefreshCw className="h-4 w-4 text-slate-400 animate-spin" />
              </div>
            )}
          </div>
        </div>

        {/* System Filter Select */}
        <div className="w-44 flex-shrink-0">
          <select
            value={systemFilter}
            onChange={(e) => onSystemFilterChange(e.target.value)}
            className={`w-full px-3 py-1.5 bg-white dark:bg-slate-950/40 border rounded-xl text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/60 transition-all cursor-pointer ${
              systemFilter !== ''
                ? 'border-violet-500 dark:border-violet-500/60 bg-violet-500/5 dark:bg-violet-950/60 shadow-sm shadow-violet-500/10 font-semibold'
                : 'border-slate-200 dark:border-slate-800'
            }`}
          >
            <option value="" className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200">Role Type: All</option>
            <option value="yes" className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200">Role Type: System</option>
            <option value="no" className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200">Role Type: Custom</option>
          </select>
        </div>

        {/* Clear Filters Button (Dynamic) */}
        {isFilterActive && (
          <button
            type="button"
            onClick={onReset}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 rounded-xl hover:bg-violet-100 dark:hover:bg-violet-950/80 transition-all shadow-sm active:scale-95"
          >
            Clear Filters
          </button>
        )}
      </div>
    </div>
  );
});

function SortIcon({
  field,
  currentField,
  order,
}: {
  field: 'name' | 'users' | 'system';
  currentField: 'name' | 'users' | 'system' | null;
  order: 'asc' | 'desc';
}) {
  if (currentField !== field) {
    return <ArrowUpDown className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />;
  }
  return order === 'asc' ? (
    <ChevronUp className="h-3.5 w-3.5 text-violet-500 dark:text-violet-400" />
  ) : (
    <ChevronDown className="h-3.5 w-3.5 text-violet-500 dark:text-violet-400" />
  );
}

export const RoleTable = React.memo(function RoleTable({
  items,
  loading,
  selectedIds,
  onToggleOne,
  onToggleAll,
  onAction,
  onDisabled,
  sortField,
  sortOrder,
  onSort,
  permissions,
}: {
  items: StaffRole[];
  loading: boolean;
  selectedIds: Set<string>;
  onToggleOne: (id: string) => void;
  onToggleAll: (checked: boolean) => void;
  onAction: (action: RoleAction) => void;
  onDisabled: (message: string) => void;
  sortField: 'name' | 'users' | 'system' | null;
  sortOrder: 'asc' | 'desc';
  onSort: (field: 'name' | 'users' | 'system') => void;
  permissions: { view: boolean; create: boolean; edit: boolean; delete: boolean };
}) {
  const allVisibleSelected = useMemo(() => {
    if (items.length === 0) return false;
    return items.every((i) => selectedIds.has(i.id));
  }, [items, selectedIds]);

  return (
    <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800">
            <tr className="text-slate-600 dark:text-slate-300">
              <th className="text-left px-4 py-3 font-semibold w-12">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={(e) => onToggleAll(e.target.checked)}
                  className="w-4 h-4 rounded bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-violet-500 focus:ring-violet-500"
                />
              </th>
              <th className="text-left px-4 py-3 font-semibold">
                <button
                  type="button"
                  onClick={() => onSort('name')}
                  className="flex items-center gap-1 hover:text-slate-800 dark:hover:text-white transition-colors focus:outline-none group font-semibold"
                >
                  <span>Name</span>
                  <SortIcon field="name" currentField={sortField} order={sortOrder} />
                </button>
              </th>
              <th className="text-left px-4 py-3 font-semibold">
                <button
                  type="button"
                  onClick={() => onSort('users')}
                  className="flex items-center gap-1 hover:text-slate-800 dark:hover:text-white transition-colors focus:outline-none group font-semibold"
                >
                  <span>Users</span>
                  <SortIcon field="users" currentField={sortField} order={sortOrder} />
                </button>
              </th>
              <th className="text-left px-4 py-3 font-semibold">
                <button
                  type="button"
                  onClick={() => onSort('system')}
                  className="flex items-center gap-1 hover:text-slate-800 dark:hover:text-white transition-colors focus:outline-none group font-semibold"
                >
                  <span>System</span>
                  <SortIcon field="system" currentField={sortField} order={sortOrder} />
                </button>
              </th>
              <th className="text-right px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-slate-500 dark:text-slate-400" colSpan={5}>
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Loading roles...
                  </div>
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-slate-500 dark:text-slate-400" colSpan={5}>
                  No roles found.
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-950/30 transition-colors">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(row.id)}
                      onChange={() => onToggleOne(row.id)}
                      className="w-4 h-4 rounded bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-violet-500 focus:ring-violet-500"
                    />
                  </td>
                  <td className="px-4 py-3 text-slate-800 dark:text-slate-100 font-semibold">{row.name}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.userCount ?? 0}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                        row.isSystem
                          ? 'bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/30 text-cyan-700 dark:text-cyan-300'
                          : 'bg-slate-100 dark:bg-slate-500/10 border border-slate-200 dark:border-slate-500/30 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {row.isSystem ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {(() => {
                      const isAdminRole = (row.name || '').toLowerCase() === 'admin';
                      const isProtected = isAdminRole || row.isSystem;
                      return (
                    <div className="flex items-center justify-end gap-2">
                      {permissions.view && (
                        <IconButton title="View" onClick={() => onAction({ type: 'view', item: row })}>
                          <Eye className="h-4 w-4" />
                        </IconButton>
                      )}
                      {permissions.edit && (
                        <IconButton
                          title={isProtected ? 'Protected role' : 'Edit'}
                          onClick={() => onAction({ type: 'edit', item: row })}
                          disabledReason={
                            isAdminRole
                              ? 'Admin role cannot be edited'
                              : row.isSystem
                                ? 'System roles cannot be edited'
                                : undefined
                          }
                          onDisabledClick={onDisabled}
                        >
                          <Edit className="h-4 w-4" />
                        </IconButton>
                      )}
                      {permissions.delete && (
                        <IconButton
                          title={isProtected ? 'Protected role' : 'Delete'}
                          variant="danger"
                          onClick={() => onAction({ type: 'delete', item: row })}
                          disabledReason={
                            isAdminRole
                              ? 'Admin role cannot be deleted'
                              : row.isSystem
                                ? 'System roles cannot be deleted'
                                : undefined
                          }
                          onDisabledClick={onDisabled}
                        >
                          <Trash2 className="h-4 w-4" />
                        </IconButton>
                      )}
                    </div>
                      );
                    })()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
});

function IconButton({
  title,
  onClick,
  variant = 'default',
  disabledReason,
  onDisabledClick,
  children,
}: {
  title: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
  disabledReason?: string;
  onDisabledClick?: (message: string) => void;
  children: React.ReactNode;
}) {
  const base =
    'p-2 rounded-xl border transition-all hover:shadow-lg hover:-translate-y-[1px] active:translate-y-0';
  const disabledCls = 'opacity-50 cursor-not-allowed hover:shadow-none hover:translate-y-0';
  const cls =
    variant === 'danger'
      ? `${base} bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-200 hover:bg-red-100 dark:hover:bg-red-500/20 hover:shadow-red-500/20 hover:border-red-300 dark:hover:border-red-500/60`
      : `${base} bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:shadow-slate-200/40 dark:hover:shadow-slate-900/40 hover:border-violet-500/50 dark:hover:border-violet-500/50 hover:text-violet-600 dark:hover:text-white`;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabledReason) {
      onDisabledClick?.(disabledReason);
      return;
    }
    onClick();
  };
  return (
    <button
      type="button"
      title={disabledReason || title}
      onClick={handleClick}
      aria-disabled={disabledReason ? 'true' : 'false'}
      className={`${cls} ${disabledReason ? disabledCls : ''}`}
    >
      {children}
    </button>
  );
}

export function RoleFormModal({
  isOpen,
  mode,
  saving,
  initialValue,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  mode: 'create' | 'edit';
  saving: boolean;
  initialValue: StaffRole | null;
  onClose: () => void;
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = useState('');
  const toast = useToast();

  useEffect(() => {
    if (!isOpen) return;
    if (mode === 'edit' && initialValue) setName(initialValue.name || '');
    if (mode === 'create') setName('');
  }, [isOpen, mode, initialValue]);

  const isFormValid = useMemo(() => !!name.trim(), [name]);

  const handleSubmit = useCallback(() => {
    if (!isFormValid) {
      toast.error('Role name is required');
      return;
    }
    onSubmit(name);
  }, [name, onSubmit, isFormValid, toast]);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 border border-slate-200 dark:border-violet-500/20 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-slate-200 dark:border-violet-500/20 bg-slate-50 dark:bg-slate-900/50 dark:bg-gradient-to-r dark:from-violet-600/10 dark:to-cyan-500/10 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{mode === 'create' ? 'Create Role' : 'Edit Role'}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Manage staff access roles</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-white hover:bg-red-50 dark:hover:bg-red-500/20 border border-transparent hover:border-red-200 dark:hover:border-red-500/50 rounded-lg transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4">
          <label className="text-xs text-slate-700 dark:text-slate-400">Role Name <span className="text-red-500">*</span></label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`w-full mt-1 px-3 py-2 bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/60 transition-all ${
              !name.trim() && name !== '' ? 'border-red-500/50 bg-red-500/5' : 'border-slate-200 dark:border-slate-800'
            }`}
            placeholder="e.g. StoreManager"
          />
          {initialValue?.isSystem && mode === 'edit' && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">System roles cannot be edited.</p>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl font-semibold shadow-lg transition-all active:scale-[0.98] ${
              isFormValid
                ? 'bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white shadow-violet-500/20'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-60'
            }`}
          >
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : mode === 'create' ? <Plus className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
            {saving ? 'Saving...' : mode === 'create' ? 'Create Role' : 'Update Role'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function RoleViewModal({
  isOpen,
  item,
  onClose,
}: {
  isOpen: boolean;
  item: StaffRole | null;
  onClose: () => void;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 border border-slate-200 dark:border-cyan-500/20 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-slate-200 dark:border-cyan-500/20 bg-slate-50 dark:bg-slate-900/50 dark:bg-gradient-to-r dark:from-cyan-500/10 dark:to-violet-600/10 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Role Details</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{item?.name || '—'}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-white hover:bg-red-50 dark:hover:bg-red-500/20 border border-transparent hover:border-red-200 dark:hover:border-red-500/50 rounded-lg transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 grid grid-cols-1 gap-3 text-sm">
          <InfoRow label="Name" value={item?.name || '—'} />
          <InfoRow label="Users" value={String(item?.userCount ?? 0)} />
          <InfoRow label="System" value={item?.isSystem ? 'Yes' : 'No'} />
          <InfoRow label="Id" value={item?.id || '—'} />
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className="text-slate-800 dark:text-slate-100 font-semibold mt-0.5 break-words">{value}</div>
    </div>
  );
}

export function RoleConfirmDialogs({
  open,
  loading,
  target,
  onClose,
  onConfirm,
}: {
  open: { delete: boolean };
  loading: boolean;
  target: StaffRole | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <ConfirmDialog
      isOpen={open.delete}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Delete Role?"
      message={target ? `This will delete role "${target.name}". Continue?` : 'Continue?'}
      confirmText="Delete"
      confirmButtonStyle="bg-gradient-to-r from-red-500 to-rose-500 hover:shadow-lg hover:shadow-red-500/30"
      isLoading={loading}
    />
  );
}

export function exportRolesToXlsx(filename: string, rows: StaffRole[]) {
  const data = rows.map((r) => ({
    id: r.id,
    name: r.name,
    userCount: r.userCount ?? 0,
    isSystem: r.isSystem ? 'Yes' : 'No',
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Roles');
  XLSX.writeFile(wb, filename);
}

export function BulkSelectionBar({
  count,
  onExport,
  onClear,
}: {
  count: number;
  onExport: () => void;
  onClear: () => void;
}) {
  if (count <= 0) return null;

  return (
    <div className="fixed top-[80px] left-1/2 -translate-x-1/2 z-[999] pointer-events-none w-full">
      <div className="flex justify-center px-2">
        <div className="pointer-events-auto mx-auto w-fit max-w-[95%] rounded-xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 px-4 py-3 shadow-xl backdrop-blur-md">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm">
                <span className="h-2 w-2 rounded-full bg-violet-500"></span>
                <span className="font-semibold text-slate-900 dark:text-white">{count}</span>
                <span className="text-slate-700 dark:text-slate-300">roles selected</span>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Bulk actions: export selected roles.</p>
            </div>
            <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 hidden md:block" />
            <button
              onClick={onExport}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-emerald-700"
              type="button"
            >
              Export ({count})
            </button>
            <button
              onClick={onClear}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-white text-sm rounded-lg transition-all"
              type="button"
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
