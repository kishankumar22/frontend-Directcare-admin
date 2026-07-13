"use client";

import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Save, Loader2 } from 'lucide-react';


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
}

export function PermissionTable({ data, isLoading, isSaving, onSave, renderHeader }: PermissionTableProps) {
  const [localData, setLocalData] = useState<PermissionRowData[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setLocalData(data);
    setIsDirty(false);
  }, [data]);

  const handleCheckboxChange = (rowIndex: number, field: keyof PermissionRowData, value: boolean) => {
    const newData = [...localData];
    newData[rowIndex] = { ...newData[rowIndex], [field]: value };
    setLocalData(newData);
    setIsDirty(true);
  };

  const handleSelectAll = (field: keyof PermissionRowData, value: boolean) => {
    setLocalData(prev => prev.map(row => ({ ...row, [field]: value })));
    setIsDirty(true);
  };

  const handleRowSelectAll = (rowIndex: number, value: boolean) => {
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
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur py-2 border-b">
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
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-[#0f172a] shadow-sm">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                <TableRow className="hover:bg-transparent border-0">
                  <TableHead className="w-[220px] font-bold text-slate-700 dark:text-slate-300 h-12">
                    Page Name
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 dark:text-slate-300 h-12">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={localData.length > 0 && localData.every(row => row.canView)}
                        onCheckedChange={(checked) => handleSelectAll('canView', !!checked)}
                        className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500 data-[state=checked]:text-white border-slate-300 dark:border-slate-600"
                      />
                      <span>View</span>
                    </div>
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 dark:text-slate-300 h-12">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={localData.length > 0 && localData.every(row => row.canCreate)}
                        onCheckedChange={(checked) => handleSelectAll('canCreate', !!checked)}
                        className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 data-[state=checked]:text-white border-slate-300 dark:border-slate-600"
                      />
                      <span>Create</span>
                    </div>
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 dark:text-slate-300 h-12">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={localData.length > 0 && localData.every(row => row.canEdit)}
                        onCheckedChange={(checked) => handleSelectAll('canEdit', !!checked)}
                        className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500 data-[state=checked]:text-white border-slate-300 dark:border-slate-600"
                      />
                      <span>Edit</span>
                    </div>
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 dark:text-slate-300 h-12">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={localData.length > 0 && localData.every(row => row.canDelete)}
                        onCheckedChange={(checked) => handleSelectAll('canDelete', !!checked)}
                        className="data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500 data-[state=checked]:text-white border-slate-300 dark:border-slate-600"
                      />
                      <span>Delete</span>
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(groupedData).map(([group, rows]) => (
                  <React.Fragment key={group}>
                    <TableRow className="bg-slate-100/50 dark:bg-slate-800/40 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800">
                      <TableCell colSpan={5} className="font-bold text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider py-2">
                        {group}
                      </TableCell>
                    </TableRow>
                    {rows.map((row) => (
                      <TableRow key={row.key} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <TableCell className="font-medium text-slate-700 dark:text-slate-300 py-3">
                          <div className="flex items-center space-x-3">
                            <Checkbox
                              checked={row.canView && row.canCreate && row.canEdit && row.canDelete}
                              onCheckedChange={(checked) => handleRowSelectAll(row.originalIndex, !!checked)}
                              className="data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600 data-[state=checked]:text-white border-slate-300 dark:border-slate-600"
                              title={`Select all for ${row.name}`}
                            />
                            <span>{row.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <Checkbox
                            checked={row.canView}
                            onCheckedChange={(checked) => handleCheckboxChange(row.originalIndex, 'canView', !!checked)}
                            className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500 data-[state=checked]:text-white border-slate-300 dark:border-slate-600"
                          />
                        </TableCell>
                        <TableCell className="py-3">
                          <Checkbox
                            checked={row.canCreate}
                            onCheckedChange={(checked) => handleCheckboxChange(row.originalIndex, 'canCreate', !!checked)}
                            className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 data-[state=checked]:text-white border-slate-300 dark:border-slate-600"
                          />
                        </TableCell>
                        <TableCell className="py-3">
                          <Checkbox
                            checked={row.canEdit}
                            onCheckedChange={(checked) => handleCheckboxChange(row.originalIndex, 'canEdit', !!checked)}
                            className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500 data-[state=checked]:text-white border-slate-300 dark:border-slate-600"
                          />
                        </TableCell>
                        <TableCell className="py-3">
                          <Checkbox
                            checked={row.canDelete}
                            onCheckedChange={(checked) => handleCheckboxChange(row.originalIndex, 'canDelete', !!checked)}
                            className="data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500 data-[state=checked]:text-white border-slate-300 dark:border-slate-600"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
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
