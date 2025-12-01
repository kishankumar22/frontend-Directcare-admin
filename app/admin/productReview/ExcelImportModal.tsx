"use client";

import { useState, useRef } from "react";
import { Upload, X, CheckCircle, AlertCircle, Download, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/components/CustomToast";
import { productReviewsService, CreateReviewDto } from "@/lib/services/productReviews";
import * as XLSX from "xlsx";

interface ExcelRow {
  productId: string;
  title: string;
  comment: string;
  rating: number;
  customerEmail?: string; // ✅ Optional customer email
  customerName?: string;  // ✅ Optional customer name
}

interface ImportResult {
  total: number;
  success: number;
  updated: number; // ✅ Track updates
  failed: number;
  errors: { row: number; productId: string; title: string; error: string }[];
}

interface ExcelImportModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function ExcelImportModal({ onClose, onSuccess }: ExcelImportModalProps) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);

  // ✅ Handle File Selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validTypes = [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv"
    ];

    if (!validTypes.includes(selectedFile.type)) {
      toast.error("❌ Please upload a valid Excel or CSV file");
      return;
    }

    setFile(selectedFile);
    setResult(null);
  };

  // ✅ Parse Excel File
const parseExcelFile = async (file: File): Promise<ExcelRow[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const rows: ExcelRow[] = jsonData.map((row: any) => ({
          productId: row["Product ID"] || row["productId"] || "",
          title: row["Title"] || row["title"] || "",
          comment: row["Comment"] || row["comment"] || "",
          rating: parseInt(row["Rating"] || row["rating"] || "5")
          // ❌ Removed customerEmail, customerName
        }));

        resolve(rows);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsBinaryString(file);
  });
};

  // ✅ Validate Row Data
  const validateRow = (row: ExcelRow): string | null => {
    if (!row.productId || row.productId.trim() === "") {
      return "Product ID is required";
    }
    if (!row.title || row.title.trim() === "") {
      return "Title is required";
    }
    if (row.title.length > 100) {
      return "Title must be less than 100 characters";
    }
    if (!row.comment || row.comment.trim() === "") {
      return "Comment is required";
    }
    if (row.comment.length > 1000) {
      return "Comment must be less than 1000 characters";
    }
    if (!row.rating || row.rating < 1 || row.rating > 5) {
      return "Rating must be between 1 and 5";
    }
    return null;
  };

  // ✅ Import Reviews with UPDATE Logic
const handleImport = async () => {
  if (!file) {
    toast.error("Please select a file first");
    return;
  }

  setImporting(true);
  setProgress(0);

  try {
    const rows = await parseExcelFile(file);

    if (rows.length === 0) {
      toast.error("❌ No data found in the file");
      setImporting(false);
      return;
    }

    const importResult: ImportResult = {
      total: rows.length,
      success: 0,
      updated: 0,
      failed: 0,
      errors: []
    };

    // ✅ Get current logged-in user email
    // Option 1: From localStorage/sessionStorage
    const currentUserEmail = localStorage.getItem('userEmail') || 'faizraza349@gmail.com';
    
    // Option 2: From auth context (if available)
    // const { user } = useAuth();
    // const currentUserEmail = user?.email || 'faizraza349@gmail.com';

    console.log(`📧 Importing as user: ${currentUserEmail}`);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2;

      // Validate
      const validationError = validateRow(row);
      if (validationError) {
        importResult.failed++;
        importResult.errors.push({
          row: rowNumber,
          productId: row.productId || "N/A",
          title: row.title || "N/A",
          error: validationError
        });
        setProgress(((i + 1) / rows.length) * 100);
        continue;
      }

      try {
        console.log(`\n🔄 Processing row ${rowNumber}: ${row.title}`);
        
        // ✅ Check if current user already reviewed this product
        const existingReview = await productReviewsService.getByProductAndCustomer(
          row.productId.trim(),
          currentUserEmail
        );

        if (existingReview) {
          // ✅ UPDATE existing review
          console.log(`🔄 UPDATING review ${existingReview.id}`);
          
          const updateResponse = await productReviewsService.update(existingReview.id, {
            title: row.title.trim(),
            comment: row.comment.trim(),
            rating: row.rating
          });

          if (updateResponse.data?.success) {
            importResult.updated++;
            console.log(`✅ Updated successfully`);
          } else {
            const errorMsg = updateResponse.data?.message || "Update failed";
            console.warn(`⚠️ Update failed: ${errorMsg}`);
            importResult.failed++;
            importResult.errors.push({
              row: rowNumber,
              productId: row.productId,
              title: row.title,
              error: errorMsg
            });
          }

        } else {
          // ✅ CREATE new review
          console.log(`➕ CREATING new review`);
          
          const reviewData: CreateReviewDto = {
            productId: row.productId.trim(),
            title: row.title.trim(),
            comment: row.comment.trim(),
            rating: row.rating
          };

          const createResponse = await productReviewsService.create(reviewData);

          if (createResponse.data?.success) {
            importResult.success++;
            console.log(`✅ Created successfully`);
          } else {
            const errorMsg = createResponse.data?.message || "Creation failed";
            console.warn(`⚠️ Create failed: ${errorMsg}`);
            importResult.failed++;
            importResult.errors.push({
              row: rowNumber,
              productId: row.productId,
              title: row.title,
              error: errorMsg
            });
          }
        }

      } catch (error: any) {
        console.error(`❌ Error at row ${rowNumber}:`, error);
        importResult.failed++;
        importResult.errors.push({
          row: rowNumber,
          productId: row.productId,
          title: row.title,
          error: error?.response?.data?.message || error.message || "Unexpected error"
        });
      }

      setProgress(((i + 1) / rows.length) * 100);
    }

    setResult(importResult);

    if (importResult.success > 0 || importResult.updated > 0) {
      const messages = [];
      if (importResult.success > 0) messages.push(`${importResult.success} created`);
      if (importResult.updated > 0) messages.push(`${importResult.updated} updated`);
      
      toast.success(`✅ Import completed: ${messages.join(", ")}!`);
      if (typeof onSuccess === 'function') {
        onSuccess();
      }
    }

    if (importResult.failed > 0) {
      toast.error(`❌ ${importResult.failed} reviews failed. Check error report.`);
    }

  } catch (error: any) {
    console.error("❌ Fatal import error:", error);
    toast.error(`❌ Failed to process file: ${error.message || "Unknown error"}`);
  } finally {
    setImporting(false);
    setProgress(100);
  }
};



  // ✅ Download Sample Excel with Customer Email column
// ✅ Update downloadSample function in ExcelImportModal
const downloadSample = () => {
  const sampleData = [
    {
      "Product ID": "d6e6a17b-d80c-4887-953c-4102d2991d74",
      "Title": "Amazing Coffee Quality!",
      "Comment": "The coffee beans are fresh and delicious. Love the monthly subscription model. Highly recommended!",
      "Rating": 5
    },
    {
      "Product ID": "d6e6a17b-d80c-4887-953c-4102d2991d74",
      "Title": "Good Value for Money",
      "Comment": "Great quality coffee at a reasonable price. The subscription is convenient and saves money.",
      "Rating": 4
    },
    {
      "Product ID": "9b6f845b-3499-488c-9cc7-4b3043cd18b8",
      "Title": "Impressive Smartphone",
      "Comment": "Great camera quality and fast performance. Battery life is excellent!",
      "Rating": 5
    },
    {
      "Product ID": "fc9e5c13-8d8c-40d6-bc43-cfa500504e9a",
      "Title": "Beast Gaming Laptop!",
      "Comment": "Runs all my games at maximum settings without any lag. Totally worth it!",
      "Rating": 5
    },
    {
      "Product ID": "bad59dda-dea0-4d43-a278-e0e9519dd79f",
      "Title": "Comfortable and Stylish",
      "Comment": "Great design and very comfortable. Fabric quality is excellent. Worth every penny!",
      "Rating": 5
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  
  // ✅ Column widths
  worksheet["!cols"] = [
    { wch: 40 }, // Product ID
    { wch: 30 }, // Title
    { wch: 60 }, // Comment
    { wch: 8 }   // Rating
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Reviews");
  XLSX.writeFile(workbook, "sample_reviews_template.xlsx");
  toast.success("📥 Sample file downloaded!");
};


  // ✅ Download Error Report
  const downloadErrorReport = () => {
    if (!result || result.errors.length === 0) return;

    const errorData = result.errors.map(err => ({
      "Row Number": err.row,
      "Product ID": err.productId,
      "Title": err.title,
      "Error": err.error
    }));

    const worksheet = XLSX.utils.json_to_sheet(errorData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Errors");
    XLSX.writeFile(workbook, `import_errors_${Date.now()}.xlsx`);
    toast.success("📥 Error report downloaded!");
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Import Reviews from Excel</h2>
            <p className="text-slate-400 text-sm mt-1">
              Upload Excel or CSV file with review data
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={importing}
            className="p-2 hover:bg-slate-800 rounded-lg transition-all disabled:opacity-50"
          >
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Download Sample */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <FileSpreadsheet className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-white font-medium mb-1">Need a template?</h3>
                <p className="text-slate-400 text-sm mb-3">
                  Download the sample Excel file to see the correct format
                </p>
                <button
                  onClick={downloadSample}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all text-sm font-medium flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download Sample File
                </button>
              </div>
            </div>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-white font-medium mb-3">
              Select Excel File
            </label>
            <div
              onClick={() => !importing && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                file
                  ? "border-green-500 bg-green-500/10"
                  : "border-slate-600 hover:border-violet-500 bg-slate-800/30"
              } ${importing ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                disabled={importing}
                className="hidden"
              />
              {file ? (
                <div className="space-y-2">
                  <CheckCircle className="h-12 w-12 text-green-400 mx-auto" />
                  <p className="text-white font-medium">{file.name}</p>
                  <p className="text-slate-400 text-sm">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                  {!importing && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        setResult(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="mt-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-12 w-12 text-slate-400 mx-auto" />
                  <p className="text-white font-medium">Click to upload Excel file</p>
                  <p className="text-slate-400 text-sm">
                    Supports .xlsx, .xls, and .csv files
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          {importing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Importing reviews...</span>
                <span className="text-white font-medium">{progress.toFixed(0)}%</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-600 to-purple-600 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Import Result - ✅ Updated with 4 columns */}
          {result && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-center">
                  <p className="text-slate-400 text-xs mb-1">Total</p>
                  <p className="text-xl sm:text-2xl font-bold text-white">{result.total}</p>
                </div>
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-center">
                  <p className="text-green-400 text-xs mb-1">Created</p>
                  <p className="text-xl sm:text-2xl font-bold text-green-400">{result.success}</p>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 text-center">
                  <p className="text-blue-400 text-xs mb-1">Updated</p>
                  <p className="text-xl sm:text-2xl font-bold text-blue-400">{result.updated}</p>
                </div>
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-center">
                  <p className="text-red-400 text-xs mb-1">Failed</p>
                  <p className="text-xl sm:text-2xl font-bold text-red-400">{result.failed}</p>
                </div>
              </div>

              {/* Error List */}
              {result.errors.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-red-400 font-medium flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Import Errors ({result.errors.length})
                    </h3>
                    <button
                      onClick={downloadErrorReport}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm flex items-center gap-2"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download Report
                    </button>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {result.errors.slice(0, 10).map((err, idx) => (
                      <div key={idx} className="bg-slate-900/50 rounded-lg p-3 text-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-white font-medium mb-1">
                              Row {err.row}: {err.title}
                            </p>
                            <p className="text-red-400 text-xs">{err.error}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {result.errors.length > 10 && (
                      <p className="text-slate-400 text-xs text-center pt-2">
                        ... and {result.errors.length - 10} more errors
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4">
            <button
              onClick={handleImport}
              disabled={!file || importing}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-violet-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {importing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Import Reviews
                </>
              )}
            </button>
            <button
              onClick={onClose}
              disabled={importing}
              className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-all disabled:opacity-50"
            >
              {result ? "Close" : "Cancel"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
