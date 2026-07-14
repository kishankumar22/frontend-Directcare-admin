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

  return (
    <div className="space-y-4">
      {renderHeader && (
        <div className="sticky top-0 z-10 bg-slate-50/95 dark:bg-[#0f172a]/95 backdrop-blur pb-3 mb-2 border-b border-slate-200 dark:border-slate-800">
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
        <>
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-[#1e293b] shadow-sm">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-[#1e293b] border-b border-slate-200 dark:border-slate-800">
                <TableRow className="hover:bg-transparent border-0">
                  <TableHead className="w-[220px] font-bold text-slate-500 dark:text-slate-400 text-[10px] tracking-wider h-10 uppercase px-3">
                    PAGE
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 dark:text-slate-300 h-10 px-3">
                    <div className="flex flex-col space-y-1">
                      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                        <Eye className="w-3.5 h-3.5" /> <span>View</span>
                      </div>
                      <div className="flex items-center gap-2 text-[9px] text-slate-500 font-normal">
                        <button onClick={() => handleSelectAll('canView', true)} className="hover:text-emerald-600 dark:hover:text-emerald-400">all</button>
                        <button onClick={() => handleSelectAll('canView', false)} className="hover:text-slate-700 dark:hover:text-slate-300">none</button>
                      </div>
                    </div>
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 dark:text-slate-300 h-10 px-3">
                    <div className="flex flex-col space-y-1">
                      <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                        <Plus className="w-3.5 h-3.5" /> <span>Create</span>
                      </div>
                      <div className="flex items-center gap-2 text-[9px] text-slate-500 font-normal">
                        <button onClick={() => handleSelectAll('canCreate', true)} className="hover:text-purple-600 dark:hover:text-purple-400">all</button>
                        <button onClick={() => handleSelectAll('canCreate', false)} className="hover:text-slate-700 dark:hover:text-slate-300">none</button>
                      </div>
                    </div>
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 dark:text-slate-300 h-10 px-3">
                    <div className="flex flex-col space-y-1">
                      <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                        <Edit2 className="w-3.5 h-3.5" /> <span>Edit</span>
                      </div>
                      <div className="flex items-center gap-2 text-[9px] text-slate-500 font-normal">
                        <button onClick={() => handleSelectAll('canEdit', true)} className="hover:text-amber-600 dark:hover:text-amber-400">all</button>
                        <button onClick={() => handleSelectAll('canEdit', false)} className="hover:text-slate-700 dark:hover:text-slate-300">none</button>
                      </div>
                    </div>
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 dark:text-slate-300 h-10 px-3">
                    <div className="flex flex-col space-y-1">
                      <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                        <Trash2 className="w-3.5 h-3.5" /> <span>Delete</span>
                      </div>
                      <div className="flex items-center gap-2 text-[9px] text-slate-500 font-normal">
                        <button onClick={() => handleSelectAll('canDelete', true)} className="hover:text-rose-600 dark:hover:text-rose-400">all</button>
                        <button onClick={() => handleSelectAll('canDelete', false)} className="hover:text-slate-700 dark:hover:text-slate-300">none</button>
                      </div>
                    </div>
                  </TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(groupedData).map(([group, rows]) => (
                  <React.Fragment key={group}>
                    <TableRow className="bg-slate-50 dark:bg-[#1e293b] hover:bg-slate-50 dark:hover:bg-[#1e293b] border-b border-slate-200 dark:border-slate-800">
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
                            className={`w-4 h-4 rounded-[3px] border-emerald-500/50 data-[state=checked]:bg-emerald-500 data-[state=checked]:text-white dark:data-[state=checked]:text-[#1e293b] data-[state=checked]:border-emerald-500 ${readOnly ? 'cursor-not-allowed opacity-50' : ''}`}
                          />
                        </TableCell>
                        <TableCell className="py-2.5 px-3">
                          <Checkbox
                            checked={row.canCreate}
                            onCheckedChange={(checked) => handleCheckboxChange(row.originalIndex, 'canCreate', !!checked)}
                            disabled={readOnly}
                            className={`w-4 h-4 rounded-[3px] border-purple-500/50 data-[state=checked]:bg-purple-500 data-[state=checked]:text-white dark:data-[state=checked]:text-[#1e293b] data-[state=checked]:border-purple-500 ${readOnly ? 'cursor-not-allowed opacity-50' : ''}`}
                          />
                        </TableCell>
                        <TableCell className="py-2.5 px-3">
                          <Checkbox
                            checked={row.canEdit}
                            onCheckedChange={(checked) => handleCheckboxChange(row.originalIndex, 'canEdit', !!checked)}
                            disabled={readOnly}
                            className={`w-4 h-4 rounded-[3px] border-amber-500/50 data-[state=checked]:bg-amber-500 data-[state=checked]:text-white dark:data-[state=checked]:text-[#1e293b] data-[state=checked]:border-amber-500 ${readOnly ? 'cursor-not-allowed opacity-50' : ''}`}
                          />
                        </TableCell>
                        <TableCell className="py-2.5 px-3">
                          <Checkbox
                            checked={row.canDelete}
                            onCheckedChange={(checked) => handleCheckboxChange(row.originalIndex, 'canDelete', !!checked)}
                            disabled={readOnly}
                            className={`w-4 h-4 rounded-[3px] border-rose-500/50 data-[state=checked]:bg-rose-500 data-[state=checked]:text-white dark:data-[state=checked]:text-[#1e293b] data-[state=checked]:border-rose-500 ${readOnly ? 'cursor-not-allowed opacity-50' : ''}`}
                          />
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => handleRowSelectAll(row.originalIndex, !isAllChecked)}
                            disabled={readOnly}
                            className="text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                          >
                            Toggle
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

          {!renderHeader && (
            <div className="flex justify-end pt-4">
              <Button onClick={handleSave} disabled={!isDirty || isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Permissions
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
