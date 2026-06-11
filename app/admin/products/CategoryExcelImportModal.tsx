import { useState, useRef } from "react";
import { Upload, FileSpreadsheet, X, AlertCircle, CheckCircle2, Loader2, Download } from "lucide-react";
import { productsService } from "@/lib/services/products";

import { getBackendMessage } from "@/app/admin/_utils/errorUtils";
import { useToast } from "../_components/CustomToast";

interface CategoryExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CategoryExcelImportModal({ isOpen, onClose, onSuccess }: CategoryExcelImportModalProps) {
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Result state
  const [importResult, setImportResult] = useState<{
    updatedCount: number;
    skippedCount: number;
    clearedCount: number;
    failedCount: number;
    errors: string[];
  } | null>(null);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleFileSelection = (selectedFile: File) => {
    setImportResult(null);
    if (!selectedFile.name.endsWith('.xlsx')) {
      toast.error('Only .xlsx files are supported');
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error("File size must be less than 10MB");
      return;
    }
    setFile(selectedFile);
  };

  const removeFile = () => {
    setFile(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // ✅ Download Excel Template/Export
  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      const response = await productsService.exportCategoriesExcel();
      
      // ✅ FIX: Type safe blob casting
      const blobPart = response.data as any;
      const blob = new Blob([blobPart], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `category_export_${new Date().getTime()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Category Excel downloaded successfully');
    } catch (error: any) {
      console.error('Download error:', error);
      toast.error(getBackendMessage(error) || 'Failed to download excel');
    } finally {
      setIsDownloading(false);
    }
  };

  // ✅ Upload Excel File
  const handleUpload = async () => {
    if (!file) return;

    try {
      setIsUploading(true);
      setImportResult(null);

      const response = await productsService.importCategoriesExcel(file);
      
      // ✅ FIX: response.data contains the actual payload { success, data, errors }
      const payload = response.data as any;
      
      if (payload && (payload.success || payload.data)) {
        setImportResult(payload.data);
        
        if (payload.data.failedCount > 0) {
          toast.error(`Completed with some errors. Updated: ${payload.data.updatedCount}`);
        } else {
          toast.success(`Successfully updated ${payload.data.updatedCount} products`);
          onSuccess();
        }
      } else {
        toast.error(payload?.message || "Import failed. Please check errors.");
      }
    } catch (error: any) {
      console.error("Import Error:", error);
      const errorMsg = getBackendMessage(error);
      toast.error(errorMsg || "Failed to import file");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"
        onClick={!isUploading && !isDownloading ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FileSpreadsheet className="w-6 h-6 text-emerald-500" />
              Category Excel Import / Export
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Bulk update product categories using Excel (.xlsx)
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading || isDownloading}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          
          {/* Action 1: Download Button */}
          <div className="mb-8 p-5 bg-slate-800/50 rounded-xl border border-slate-700/50 flex flex-col items-center justify-center text-center">
            <h3 className="text-white font-medium mb-2">Step 1: Download Current Categories</h3>
            <p className="text-sm text-slate-400 mb-4 max-w-md">
              Download the Excel file containing all products and their current categories.
            </p>
            <button
              onClick={handleDownload}
              disabled={isDownloading || isUploading}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating Excel...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5 text-emerald-400" />
                  Download Category Excel
                </>
              )}
            </button>
          </div>

          {/* Guidelines */}
          <div className="mb-6 bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
            <h4 className="text-sm font-semibold text-emerald-400 flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4" />
              Import Rules (Please read before uploading)
            </h4>
            <ul className="text-sm text-slate-300 space-y-2 list-disc list-inside">
              <li><span className="text-white font-medium">Blank PrimaryCategory:</span> Product will be skipped (no changes made).</li>
              <li><span className="text-white font-medium">CLEAR:</span> Type "CLEAR" in PrimaryCategory to remove all categories from that product.</li>
              <li>Category path matches are <strong>case-insensitive</strong>.</li>
              <li>Maximum <strong>10 categories</strong> allowed per product.</li>
              <li>Only <strong>.xlsx</strong> format is supported.</li>
            </ul>
          </div>

          {/* Upload Area */}
          <h3 className="text-white font-medium mb-3 text-center">Step 2: Upload Updated Excel</h3>
          
          <div
            className={`
              relative border-2 border-dashed rounded-xl p-8 text-center transition-colors
              ${dragActive ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-700 bg-slate-800/30 hover:bg-slate-800/50'}
              ${file ? 'border-emerald-500/50 bg-emerald-500/5' : ''}
              ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              onChange={handleChange}
              disabled={isUploading || isDownloading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />

            {!file ? (
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="p-4 bg-slate-800 rounded-full">
                  <Upload className="w-8 h-8 text-emerald-400" />
                </div>
                <div>
                  <p className="text-slate-300 font-medium">
                    Drag & drop your .xlsx file here
                  </p>
                  <p className="text-slate-500 text-sm mt-1">
                    or click to browse
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 bg-slate-800/80 rounded-lg border border-slate-700">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-8 h-8 text-emerald-400" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-white truncate max-w-[200px] sm:max-w-[300px]">
                      {file.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    removeFile();
                  }}
                  disabled={isUploading}
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-700 rounded-lg transition-colors z-10 relative"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          {/* Import Result UI */}
          {importResult && (
            <div className="mt-6 p-5 bg-slate-800 rounded-xl border border-slate-700">
              <h4 className="text-white font-medium mb-4 flex items-center gap-2">
                {importResult.failedCount === 0 ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                )}
                Import Results
              </h4>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <div className="bg-slate-900/50 p-3 rounded-lg text-center border border-slate-700/50">
                  <p className="text-xs text-slate-400 mb-1">Updated</p>
                  <p className="text-xl font-bold text-emerald-400">{importResult.updatedCount}</p>
                </div>
                <div className="bg-slate-900/50 p-3 rounded-lg text-center border border-slate-700/50">
                  <p className="text-xs text-slate-400 mb-1">Cleared</p>
                  <p className="text-xl font-bold text-blue-400">{importResult.clearedCount}</p>
                </div>
                <div className="bg-slate-900/50 p-3 rounded-lg text-center border border-slate-700/50">
                  <p className="text-xs text-slate-400 mb-1">Skipped</p>
                  <p className="text-xl font-bold text-slate-300">{importResult.skippedCount}</p>
                </div>
                <div className="bg-slate-900/50 p-3 rounded-lg text-center border border-slate-700/50">
                  <p className="text-xs text-slate-400 mb-1">Failed</p>
                  <p className={`text-xl font-bold ${importResult.failedCount > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                    {importResult.failedCount}
                  </p>
                </div>
              </div>

              {/* Errors List */}
              {importResult.errors && importResult.errors.length > 0 && (
                <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                  <p className="text-sm font-medium text-rose-400 mb-2">Errors Details:</p>
                  <ul className="text-xs text-rose-300/80 space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                    {importResult.errors.map((err, i) => (
                      <li key={i}>• {err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isUploading || isDownloading}
            className="px-4 py-2 text-slate-300 hover:text-white font-medium transition-colors disabled:opacity-50"
          >
            Close
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || isUploading || isDownloading}
            className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-400 text-white rounded-lg font-medium transition-colors"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Upload & Update Categories'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
