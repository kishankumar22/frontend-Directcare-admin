'use client';

import { orderService } from '@/lib/services/orders';
import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  X,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  FileSpreadsheet,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ParsedShipment {
  orderId: string;
  trackingNumber: string;
  carrier: string;
  shippingMethod: string;
  notes?: string;
}

interface BulkResult {
  processedCount: number;
  failedCount: number;
  failed?: {
    orderId: string;
    orderNumber: string;
    reason: string;
  }[];
}

export default function BulkShipmentUploadModal({
  isOpen,
  onClose,
  onSuccess,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [shipments, setShipments] = useState<ParsedShipment[]>([]);
  const [result, setResult] = useState<BulkResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inputKey, setInputKey] = useState(Date.now());
const resetState = () => {
  setLoading(false);
  setFileName('');
  setShipments([]);
  setResult(null);
  setError(null);
  setInputKey(Date.now()); // 👈 this resets file input
};

useEffect(() => {
  if (isOpen) {
    resetState();
  }
}, [isOpen]);

  if (!isOpen) return null;

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);
    setResult(null);

    const reader = new FileReader();

    reader.onload = (evt) => {
      const data = evt.target?.result;
      const workbook = XLSX.read(data, { type: 'binary' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<any>(sheet);

      const formatted: ParsedShipment[] = json.map((row) => ({
        orderId: row.orderId,
        trackingNumber: row.trackingNumber,
        carrier: row.carrier,
        shippingMethod: row.shippingMethod,
        notes: row.notes || '',
      }));

      setShipments(formatted);
    };

    reader.readAsBinaryString(file);
  };

  const handleSubmit = async () => {
    if (shipments.length === 0) {
      setError('Excel file is empty or invalid.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const currentUser =
        localStorage.getItem('adminName') || 'System Admin';

      const response = await orderService.bulkCreateShipment({
        shipments,
        currentUser,
      });

      if (!response?.data) {
        setError('Invalid server response.');
        return;
      }

      setResult(response.data);

      if (response.data.failedCount === 0) {
        setTimeout(() => {
          onClose();
          resetState();
          onSuccess?.();
        }, 1500);
      }

    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

return (
  <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[999] p-4">
    
    <div className="bg-slate-900 w-full max-w-2xl 
    max-h-[85vh] rounded-2xl border border-slate-700 
    shadow-2xl flex flex-col overflow-hidden">

      {/* Header */}
      <div className="flex justify-between items-start px-5 py-4 border-b border-slate-800">
        <div>
          <h2 className="text-white text-lg font-semibold">
            Bulk Shipment Upload
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Upload Excel file to create multiple shipments
          </p>
        </div>

        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white transition"
        >
          <X size={20} />
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

        {/* Upload Box */}
        <label className="border-2 border-dashed border-slate-600 
        hover:border-blue-500 transition-all rounded-xl 
        p-6 flex flex-col items-center justify-center 
        text-center cursor-pointer">

          <UploadCloud size={32} className="text-slate-400 mb-2" />
          <p className="text-white text-sm font-medium">
            Click to upload Excel file
          </p>
          <p className="text-slate-400 text-xs mt-1">
            .xlsx or .xls format
          </p>

          <input
            key={inputKey}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>

        {/* File Name */}
        {fileName && (
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <FileSpreadsheet size={14} />
            {fileName}
          </div>
        )}

        {/* Parsed Count */}
        {shipments.length > 0 && (
          <div className="bg-slate-800 rounded-lg px-4 py-3 flex justify-between text-xs">
            <span className="text-green-400 font-medium">
              {shipments.length} rows parsed
            </span>
            <span className="text-slate-400">
              Ready to submit
            </span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-900/30 border border-red-700 
          px-4 py-3 rounded-lg text-red-400 text-xs flex gap-2">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        {/* Result Section */}
        {result && (
          <div className="bg-slate-800 rounded-lg p-4 space-y-3">

            <div className="grid grid-cols-2 gap-3 text-center">

              <div className="bg-green-900/20 border border-green-600 
              rounded-lg py-3">
                <p className="text-green-400 text-xl font-bold">
                  {result.processedCount}
                </p>
                <p className="text-slate-300 text-xs">Processed</p>
              </div>

              <div className="bg-red-900/20 border border-red-600 
              rounded-lg py-3">
                <p className="text-red-400 text-xl font-bold">
                  {result.failedCount}
                </p>
                <p className="text-slate-300 text-xs">Failed</p>
              </div>
            </div>

            {result.failedCount > 0 && (
              <div className="max-h-32 overflow-y-auto text-xs 
              text-red-300 space-y-2 border-t border-slate-700 pt-3">

                {result.failed?.map((f, i) => (
                  <div key={i} className="flex justify-between gap-3">
                    <span className="truncate">
                      {f.orderNumber}
                    </span>
                    <span className="text-red-400 text-right">
                      {f.reason}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex gap-3 px-5 py-4 border-t border-slate-800 bg-slate-900">

        <button
          onClick={onClose}
          className="flex-1 bg-slate-700 hover:bg-slate-600 
          text-white py-2.5 rounded-lg text-sm font-medium transition"
        >
          Cancel
        </button>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex-1 bg-blue-600 hover:bg-blue-700 
          text-white py-2.5 rounded-lg text-sm font-medium 
          transition flex justify-center items-center gap-2"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? 'Processing...' : 'Create Shipments'}
        </button>
      </div>

    </div>
  </div>
);
}