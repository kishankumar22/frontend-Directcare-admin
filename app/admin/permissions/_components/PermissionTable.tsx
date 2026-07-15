"use client";

import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Save, Loader2, Eye, Plus, Edit2, Trash2 } from 'lucide-react';

export interface PermissionRowData {
  pageId: string;
  key: string;
  name: string;
  group: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

interface PermissionTableProps {
  data: PermissionRowData[];
  isLoading: boolean;
  isSaving: boolean;
  onSave: (updatedData: PermissionRowData[]) => void;
  renderHeader?: (props: { isDirty: boolean; handleSave: () => void; changedCount: number }) => React.ReactNode;
  readOnly?: boolean;
}

export function PermissionTable({ data, isLoading, isSaving, onSave, renderHeader, readOnly = false }: PermissionTableProps) {
  const [localData, setLocalData] = useState<PermissionRowData[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setLocalData(data);
    setIsDirty(false);
  }, [data]);

  const handleCheckboxChange = (rowIndex: number, field: keyof PermissionRowData, value: boolean) => {
    if (readOnly) return;
    const newData = [...localData];
    newData[rowIndex] = { ...newData[rowIndex], [field]: value };
    setLocalData(newData);
    setIsDirty(true);
  };

  const handleSelectAll = (field: keyof PermissionRowData, value: boolean) => {
    if (readOnly) return;
    setLocalData(prev => prev.map(row => ({ ...row, [field]: value })));
    setIsDirty(true);
  };

  const handleRowSelectAll = (rowIndex: number, value: boolean) => {
    if (readOnly) return;
    const newData = [...localData];
    newData[rowIndex] = {
      ...newData[rowIndex],
      canView: value,
      canCreate: value,
      canEdit: value,
      canDelete: value,
    };
    setLocalData(newData);
    setIsDirty(true);
  };

  const handleSave = () => {
    onSave(localData);
  };

  const groupedData = localData?.reduce((acc, row, index) => {
    if (!acc[row.group]) acc[row.group] = [];
    acc[row.group].push({ ...row, originalIndex: index });
    return acc;
  }, {} as Record<string, (PermissionRowData & { originalIndex: number })[]>) || {};

  const changedCount = localData.reduce((count, row, i) => {
    const originalRow = data[i];
    if (!originalRow) return count;
    let changes = 0;
    if (row.canView !== originalRow.canView) changes++;
    if (row.canCreate !== originalRow.canCreate) changes++;
    if (row.canEdit !== originalRow.canEdit) changes++;
    if (row.canDelete !== originalRow.canDelete) changes++;
    return count + changes;
  }, 0);

  const isAllView = localData?.length > 0 && localData.every(r => r.canView);
  const isNoneView = localData?.length > 0 && localData.every(r => !r.canView);
  const isAllCreate = localData?.length > 0 && localData.every(r => r.canCreate);
  const isNoneCreate = localData?.length > 0 && localData.every(r => !r.canCreate);
  const isAllEdit = localData?.length > 0 && localData.every(r => r.canEdit);
  const isNoneEdit = localData?.length > 0 && localData.every(r => !r.canEdit);
  const isAllDelete = localData?.length > 0 && localData.every(r => r.canDelete);
  const isNoneDelete = localData?.length > 0 && localData.every(r => !r.canDelete);

  return (
    <div className="space-y-4">
      {/* Render Header - Roles List aur Controls - Yeh top par sticky rahega */}
      {renderHeader && (
        <div className="sticky top-0 z-30 bg-white dark:bg-slate-900 pb-3 mb-2 border-b border-slate-200 dark:border-slate-800">
          {renderHeader({ isDirty, handleSave, changedCount })}
        </div>
      )}

      {isLoading ? (
        <div className="w-full flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (!localData || localData.length === 0) ? (
        <div className="w-full flex justify-center py-12 text-muted-foreground">
          No permissions data available. Please select an option above.
        </div>
      ) : (
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
          {/* Table Container with Scroll */}
          <div className="relative overflow-y-auto" style={{ maxHeight: 'calc(100vh - 380px)' }}>
            <Table>
              {/* Sticky Table Header - Yeh fixed rahega scroll karte waqt */}
              <TableHeader className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-800 border-b-2 border-slate-200 dark:border-slate-700 shadow-sm">
                <TableRow className="hover:bg-transparent border-0">
                  <TableHead className="w-[220px] font-bold text-slate-500 dark:text-slate-400 text-[10px] tracking-wider h-10 uppercase px-3 bg-slate-50 dark:bg-slate-800">
                    PAGE
                  </TableHead>
                  <TableHead className="px-3 py-2.5 font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 min-w-[100px]">
                    <div>
                      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                        <Eye className="w-4 h-4" /> <span>View</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 font-normal mt-1">
                        <button 
                          onClick={() => handleSelectAll('canView', true)} 
                          className={`transition-colors ${isAllView ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'hover:text-emerald-600 dark:hover:text-emerald-400'}`}
                        >
                          all
                        </button>
                        <button 
                          onClick={() => handleSelectAll('canView', false)} 
                          className={`transition-colors ${isNoneView ? 'text-slate-800 dark:text-slate-200 font-semibold' : 'hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                          none
                        </button>
                      </div>
                    </div>
                  </TableHead>
                  <TableHead className="px-3 py-2.5 font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 min-w-[100px]">
                    <div>
                      <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                        <Plus className="w-4 h-4" /> <span>Create</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 font-normal mt-0.5 ml-[22px]">
                        <button 
                          onClick={() => handleSelectAll('canCreate', true)} 
                          className={`transition-colors ${isAllCreate ? 'text-purple-600 dark:text-purple-400 font-semibold' : 'hover:text-purple-600 dark:hover:text-purple-400'}`}
                        >
                          all
                        </button>
                        <button 
                          onClick={() => handleSelectAll('canCreate', false)} 
                          className={`transition-colors ${isNoneCreate ? 'text-slate-800 dark:text-slate-200 font-semibold' : 'hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                          none
                        </button>
                      </div>
                    </div>
                  </TableHead>
                  <TableHead className="px-3 py-2.5 font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 min-w-[100px]">
                    <div>
                      <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                        <Edit2 className="w-4 h-4" /> <span>Edit</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 font-normal mt-0.5 ml-[22px]">
                        <button 
                          onClick={() => handleSelectAll('canEdit', true)} 
                          className={`transition-colors ${isAllEdit ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'hover:text-amber-600 dark:hover:text-amber-400'}`}
                        >
                          all
                        </button>
                        <button 
                          onClick={() => handleSelectAll('canEdit', false)} 
                          className={`transition-colors ${isNoneEdit ? 'text-slate-800 dark:text-slate-200 font-semibold' : 'hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                          none
                        </button>
                      </div>
                    </div>
                  </TableHead>
                  <TableHead className="px-3 py-2.5 font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 min-w-[100px]">
                    <div>
                      <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                        <Trash2 className="w-4 h-4" /> <span>Delete</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 font-normal mt-0.5 ml-[22px]">
                        <button 
                          onClick={() => handleSelectAll('canDelete', true)} 
                          className={`transition-colors ${isAllDelete ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'hover:text-rose-600 dark:hover:text-rose-400'}`}
                        >
                          all
                        </button>
                        <button 
                          onClick={() => handleSelectAll('canDelete', false)} 
                          className={`transition-colors ${isNoneDelete ? 'text-slate-800 dark:text-slate-200 font-semibold' : 'hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                          none
                        </button>
                      </div>
                    </div>
                  </TableHead>
                  <TableHead className="w-[100px] bg-slate-50 dark:bg-slate-800"></TableHead>
                </TableRow>
              </TableHeader>
              
              {/* Table Body - Yeh scroll hoga */}
              <TableBody>
                {Object.entries(groupedData).map(([group, rows]) => (
                  <React.Fragment key={group}>
                    <TableRow className="bg-slate-50 dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-[#1e293b] border-b border-slate-200 dark:border-slate-800">
                      <TableCell colSpan={6} className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-3 bg-emerald-500 rounded-full"></div>
                          <span className="font-bold text-slate-500 dark:text-slate-400 uppercase text-[9px] tracking-widest">{group}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                    {rows.map((row) => {
                      const isAllChecked = row.canView && row.canCreate && row.canEdit && row.canDelete;
                      return (
                        <TableRow key={row.key} className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                          <TableCell className="font-semibold text-slate-800 dark:text-slate-200 py-2.5 px-3 text-sm">
                            {row.name}
                          </TableCell>
                          <TableCell className="py-2.5 px-3">
                            <Checkbox
                              checked={row.canView}
                              onCheckedChange={(checked) => handleCheckboxChange(row.originalIndex, 'canView', !!checked)}
                              disabled={readOnly}
                              className={`w-4 h-4 rounded-[3px] border-emerald-500/50 data-[state=checked]:bg-emerald-500 data-[state=checked]:text-white dark:data-[state=checked]:text-slate-900 data-[state=checked]:border-emerald-500 ${readOnly ? 'cursor-not-allowed opacity-50' : ''}`}
                            />
                          </TableCell>
                          <TableCell className="py-2.5 px-3">
                            <Checkbox
                              checked={row.canCreate}
                              onCheckedChange={(checked) => handleCheckboxChange(row.originalIndex, 'canCreate', !!checked)}
                              disabled={readOnly}
                              className={`w-4 h-4 rounded-[3px] border-purple-500/50 data-[state=checked]:bg-purple-500 data-[state=checked]:text-white dark:data-[state=checked]:text-slate-900 data-[state=checked]:border-purple-500 ${readOnly ? 'cursor-not-allowed opacity-50' : ''}`}
                            />
                          </TableCell>
                          <TableCell className="py-2.5 px-3">
                            <Checkbox
                              checked={row.canEdit}
                              onCheckedChange={(checked) => handleCheckboxChange(row.originalIndex, 'canEdit', !!checked)}
                              disabled={readOnly}
                              className={`w-4 h-4 rounded-[3px] border-amber-500/50 data-[state=checked]:bg-amber-500 data-[state=checked]:text-white dark:data-[state=checked]:text-slate-900 data-[state=checked]:border-amber-500 ${readOnly ? 'cursor-not-allowed opacity-50' : ''}`}
                            />
                          </TableCell>
                          <TableCell className="py-2.5 px-3">
                            <Checkbox
                              checked={row.canDelete}
                              onCheckedChange={(checked) => handleCheckboxChange(row.originalIndex, 'canDelete', !!checked)}
                              disabled={readOnly}
                              className={`w-4 h-4 rounded-[3px] border-rose-500/50 data-[state=checked]:bg-rose-500 data-[state=checked]:text-white dark:data-[state=checked]:text-slate-900 data-[state=checked]:border-rose-500 ${readOnly ? 'cursor-not-allowed opacity-50' : ''}`}
                            />
                          </TableCell>
                          <TableCell className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => handleRowSelectAll(row.originalIndex, !isAllChecked)}
                              disabled={readOnly}
                              title={
                                isAllChecked
                                  ? "Click to revoke all permissions for this row"
                                  : "Click to grant all permissions for this row"
                              }
                              className={`text-[11px] transition-colors ${isAllChecked ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                              {isAllChecked ? "Revoke All" : "Grant All"}
                            </button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}