"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { shippingService } from "@/lib/services/shipping";
import {
  ShippingZone,
  ShippingMethod,
  ShippingRate,
  ZoneRates,
  CreateRateDto,
  UpdateRateDto,
} from "@/lib/types/shipping";
import { useToast } from "@/app/admin/_component/CustomToast";
// ✅ FIX: App Router import
import { useRouter } from "next/navigation";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  DollarSign,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  X,
  Save,
  Weight,
  Tag,
  Layers,
  MapPin,
  Truck,
  ChevronLeft,
  ChevronRight,
  Eye,
  Info,
  ChevronDown,
  FilterX,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ==================== UTILITY FUNCTIONS ====================


// 🔒 Input Sanitization
const sanitizeInput = (value: string): string => {
  return value.trim().replace(/<script>|<\/script>/gi, '');
};

// 🔒 XSS Protection
const escapeHtml = (text: string): string => {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
};

// 🔄 Retry Logic
const fetchWithRetry = async <T,>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      if (i === retries - 1) throw error;
      
      // Don't retry on client errors (4xx)
      if (error.response?.status >= 400 && error.response?.status < 500) {
        throw error;
      }
      
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
  throw new Error("Max retries reached");
};

const validateDecimal = (value: number | null | undefined, maxDecimals = 2): boolean => {
  // Check if value is null, undefined, or empty
  if (value === null || value === undefined ) {
    return true; // Allow null values (they're handled separately)
  }
  
  const regex = new RegExp(`^\\d+(\\.\\d{1,${maxDecimals}})?$`);
  return regex.test(value.toString());
};

// ==================== CUSTOM HOOKS ====================

// 🎯 Debounce Hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function ShippingRatesPage() {
  const toast = useToast();
  const router = useRouter();
  // ==================== STATE ====================
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [methods, setMethods] = useState<ShippingMethod[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string>("");
  const [zoneRates, setZoneRates] = useState<ZoneRates | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingZones, setLoadingZones] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");
  
  // 🎯 Filter Dropdown State
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  // 🎯 Debounced Search
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // 🎯 Zone Dropdown State
  const [showZoneDropdown, setShowZoneDropdown] = useState(false);
  const [zoneSearchTerm, setZoneSearchTerm] = useState("");
  const zoneDropdownRef = useRef<HTMLDivElement>(null);

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedRate, setSelectedRate] = useState<ShippingRate | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // 🎯 Modal Zone Dropdown State
  const [showZoneModalDropdown, setShowZoneModalDropdown] = useState(false);
  const [zoneModalSearchTerm, setZoneModalSearchTerm] = useState("");
  const zoneModalDropdownRef = useRef<HTMLDivElement>(null);

  // 🎯 Modal Method Dropdown State  
  const [showMethodModalDropdown, setShowMethodModalDropdown] = useState(false);
  const [methodModalSearchTerm, setMethodModalSearchTerm] = useState("");
  const methodModalDropdownRef = useRef<HTMLDivElement>(null);

  // 🎯 Double Submit Prevention
  const [submitting, setSubmitting] = useState(false);
  const submitTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 🎯 AbortController for cleanup
  const abortControllerRef = useRef<AbortController | null>(null);

  // Form State for Create
  const [formDataCreate, setFormDataCreate] = useState<CreateRateDto>({
    shippingZoneId: "",
    shippingMethodId: "",
    weightFrom: 0,
    weightTo: 2,
    orderValueFrom: 0,
    orderValueTo: 999999.99,
    baseRate: 0,
    perKgRate: 0,
    perItemRate: 0,
    minimumCharge: 0,
    maximumCharge: null,
    freeShippingThreshold: null,
    isActive: true,
  });

  // Form State for Update
  const [formDataUpdate, setFormDataUpdate] = useState<UpdateRateDto>({
    baseRate: 0,
    perKgRate: 0,
    perItemRate: 0,
    minimumCharge: 0,
    maximumCharge: null,
    freeShippingThreshold: null,
    isActive: true,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ==================== EFFECTS ====================
  useEffect(() => {
    fetchZonesAndMethods();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    if (selectedZoneId) {
      fetchRatesForZone(selectedZoneId);
    }
  }, [selectedZoneId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, filterActive, selectedZoneId]);

  // 🎯 Click Outside to Close Zone Dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        zoneDropdownRef.current &&
        !zoneDropdownRef.current.contains(event.target as Node)
      ) {
        setShowZoneDropdown(false);
      }
    };

    if (showZoneDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showZoneDropdown]);

  // 🎯 Click Outside - Filter Dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(event.target as Node)
      ) {
        setShowFilterDropdown(false);
      }
    };

    if (showFilterDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showFilterDropdown]);

  // 🎯 Outside Click - Zone Modal Dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        zoneModalDropdownRef.current &&
        !zoneModalDropdownRef.current.contains(event.target as Node)
      ) {
        setShowZoneModalDropdown(false);
      }
    };

    if (showZoneModalDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showZoneModalDropdown]);

  // 🎯 Outside Click - Method Modal Dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        methodModalDropdownRef.current &&
        !methodModalDropdownRef.current.contains(event.target as Node)
      ) {
        setShowMethodModalDropdown(false);
      }
    };

    if (showMethodModalDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMethodModalDropdown]);

  // ==================== API CALLS WITH RETRY ====================
  const fetchZonesAndMethods = async () => {
    try {
      setLoadingZones(true);
      abortControllerRef.current = new AbortController();

      const [zonesResponse, methodsResponse] = await Promise.all([
        fetchWithRetry(() => 
          shippingService.getAllZones({ params: { includeInactive: false } })
        ),
        fetchWithRetry(() =>
          shippingService.getAllMethods({ params: { includeInactive: false } })
        ),
      ]);

      if (zonesResponse.data && zonesResponse.data.success) {
        setZones(zonesResponse.data.data || []);
        if (zonesResponse.data.data && zonesResponse.data.data.length > 0 && !selectedZoneId) {
          setSelectedZoneId(zonesResponse.data.data[0].id);
        }
      }

      if (methodsResponse.data && methodsResponse.data.success) {
        setMethods(methodsResponse.data.data || []);
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("Error fetching zones/methods:", error);
        
        // 🔥 Enhanced Error Handling
        if (error.response?.status === 401) {
          toast.error("Session expired. Please login again");
        } else if (error.response?.status === 403) {
          toast.error("Access denied. Insufficient permissions");
        } else if (error.response?.status >= 500) {
          toast.error("Server error. Please try again later");
        } else {
          toast.error(error.message || "Failed to fetch zones and methods");
        }
      }
    } finally {
      setLoadingZones(false);
    }
  };

  const fetchRatesForZone = async (zoneId: string) => {
    try {
      setLoading(true);
      const response = await fetchWithRetry(() =>
        shippingService.getZoneRates(zoneId, {
          params: { includeInactive: true },
        })
      );

      if (response.data && response.data.success) {
        setZoneRates(response.data.data || null);
      } else {
        toast.error("Failed to fetch rates");
      }
    } catch (error: any) {
      console.error("Error fetching rates:", error);
      
      // 🔥 Enhanced Error Handling
      if (error.response?.status === 404) {
        toast.error("Zone not found");
      } else if (error.response?.status >= 500) {
        toast.error("Server error. Please try again later");
      } else {
        toast.error(error.message || "Failed to fetch rates");
      }
      
      setZoneRates(null);
    } finally {
      setLoading(false);
    }
  };

// ==================== ENHANCED FORM VALIDATION ====================
const validateCreateForm = (): boolean => {
  const errors: Record<string, string> = {};

  // Zone & Method
  if (!formDataCreate.shippingZoneId) {
    errors.shippingZoneId = "Zone is required";
  }

  if (!formDataCreate.shippingMethodId) {
    errors.shippingMethodId = "Method is required";
  }

  // ✅ Weight Range - Enhanced
  if (formDataCreate.weightFrom < 0) {
    errors.weightFrom = "Weight from must be positive";
  }

  if (formDataCreate.weightTo <= 0) {
    errors.weightTo = "Weight to must be greater than 0";
  }

  if (formDataCreate.weightTo <= formDataCreate.weightFrom) {
    errors.weightTo = "Weight to must be greater than weight from";
  }

  // ✅ Max weight check
  if (formDataCreate.weightTo > 99999) {
    errors.weightTo = "Weight to cannot exceed 99,999kg";
  }

  // ✅ FIXED: Check for overlapping weight ranges - Only if zone/method selected and weights are valid
  if (
    formDataCreate.shippingMethodId && 
    formDataCreate.weightFrom >= 0 && 
    formDataCreate.weightTo > 0 &&
    formDataCreate.weightTo > formDataCreate.weightFrom
  ) {
    const hasOverlap = zoneRates?.rates.some((rate) => {
      // Skip if different method
      if (rate.shippingMethodId !== formDataCreate.shippingMethodId) return false;
      
      // ✅ NEW: In EDIT mode, skip the rate being edited
      if (modalMode === "edit" && selectedRate && rate.id === selectedRate.id) {
        return false;
      }
      
      const rangeStart = Number(formDataCreate.weightFrom);
      const rangeEnd = Number(formDataCreate.weightTo);
      const existingStart = Number(rate.weightFrom);
      const existingEnd = Number(rate.weightTo);
      
      // Check if ranges overlap
      return (
        (rangeStart >= existingStart && rangeStart < existingEnd) ||
        (rangeEnd > existingStart && rangeEnd <= existingEnd) ||
        (rangeStart <= existingStart && rangeEnd >= existingEnd)
      );
    });
    
    if (hasOverlap) {
      errors.weightFrom = "Weight range overlaps with existing rate for this method";
      errors.weightTo = "Weight range overlaps with existing rate for this method";
    }
  }

  // ✅ Base Rate - Enhanced
  if (formDataCreate.baseRate < 0) {
    errors.baseRate = "Base rate must be positive";
  }

  if (formDataCreate.baseRate > 999999.99) {
    errors.baseRate = "Base rate cannot exceed £999,999.99";
  }

  if (!validateDecimal(formDataCreate.baseRate, 2)) {
    errors.baseRate = "Base rate must have at most 2 decimal places";
  }

  // ✅ Per Kg Rate
  if (formDataCreate.perKgRate < 0) {
    errors.perKgRate = "Per kg rate must be positive";
  }

  if (formDataCreate.perKgRate > 9999.99) {
    errors.perKgRate = "Per kg rate cannot exceed £9,999.99";
  }

  if (!validateDecimal(formDataCreate.perKgRate, 2)) {
    errors.perKgRate = "Per kg rate must have at most 2 decimal places";
  }

  // ✅ Per Item Rate
  if (formDataCreate.perItemRate < 0) {
    errors.perItemRate = "Per item rate must be positive";
  }

  if (!validateDecimal(formDataCreate.perItemRate, 2)) {
    errors.perItemRate = "Per item rate must have at most 2 decimal places";
  }

  // ✅ Minimum Charge
  if (formDataCreate.minimumCharge < 0) {
    errors.minimumCharge = "Minimum charge must be positive";
  }

  // ✅ Business logic: Minimum charge cannot exceed base rate
  if (formDataCreate.minimumCharge > formDataCreate.baseRate) {
    errors.minimumCharge = "Minimum charge cannot exceed base rate";
  }

  // ✅ Maximum charge validation
  if (formDataCreate.maximumCharge !== null && formDataCreate.maximumCharge !== undefined) {
    if (formDataCreate.maximumCharge < 0) {
      errors.maximumCharge = "Maximum charge must be positive";
    }
    
    if (formDataCreate.maximumCharge < formDataCreate.minimumCharge) {
      errors.maximumCharge = "Maximum charge must be greater than minimum charge";
    }

    if (!validateDecimal(formDataCreate.maximumCharge, 2)) {
      errors.maximumCharge = "Maximum charge must have at most 2 decimal places";
    }
  }

  // ✅ Free shipping threshold validation
  if (formDataCreate.freeShippingThreshold !== null && formDataCreate.freeShippingThreshold !== undefined) {
    if (formDataCreate.freeShippingThreshold < 0) {
      errors.freeShippingThreshold = "Free shipping threshold must be positive";
    }

    if (!validateDecimal(formDataCreate.freeShippingThreshold, 2)) {
      errors.freeShippingThreshold = "Free shipping threshold must have at most 2 decimal places";
    }
  }

  setFormErrors(errors);
  return Object.keys(errors).length === 0;
};


const validateUpdateForm = (): boolean => {
  const errors: Record<string, string> = {};

  // ✅ Base Rate
  if (formDataUpdate.baseRate < 0) {
    errors.baseRate = "Base rate must be positive";
  }

  if (formDataUpdate.baseRate > 999999.99) {
    errors.baseRate = "Base rate cannot exceed £999,999.99";
  }

  if (!validateDecimal(formDataUpdate.baseRate, 2)) {
    errors.baseRate = "Base rate must have at most 2 decimal places";
  }

  // ✅ Per Kg Rate
  if (formDataUpdate.perKgRate < 0) {
    errors.perKgRate = "Per kg rate must be positive";
  }

  if (formDataUpdate.perKgRate > 9999.99) {
    errors.perKgRate = "Per kg rate cannot exceed £9,999.99";
  }

  if (!validateDecimal(formDataUpdate.perKgRate, 2)) {
    errors.perKgRate = "Per kg rate must have at most 2 decimal places";
  }

  // ✅ Per Item Rate
  if (formDataUpdate.perItemRate < 0) {
    errors.perItemRate = "Per item rate must be positive";
  }

  if (!validateDecimal(formDataUpdate.perItemRate, 2)) {
    errors.perItemRate = "Per item rate must have at most 2 decimal places";
  }

  // ✅ Minimum Charge
  if (formDataUpdate.minimumCharge < 0) {
    errors.minimumCharge = "Minimum charge must be positive";
  }

  // ✅ Business logic: Minimum charge cannot exceed base rate
  if (formDataUpdate.minimumCharge > formDataUpdate.baseRate) {
    errors.minimumCharge = "Minimum charge cannot exceed base rate";
  }

  // ✅ Maximum Charge - Consistent pattern
  if (formDataUpdate.maximumCharge !== null && formDataUpdate.maximumCharge !== undefined) {
    if (formDataUpdate.maximumCharge < 0) {
      errors.maximumCharge = "Maximum charge must be positive";
    }
    
    if (formDataUpdate.maximumCharge < formDataUpdate.minimumCharge) {
      errors.maximumCharge = "Maximum charge must be greater than minimum charge";
    }

    if (!validateDecimal(formDataUpdate.maximumCharge, 2)) {
      errors.maximumCharge = "Maximum charge must have at most 2 decimal places";
    }
  }

  // ✅ Free Shipping Threshold - Consistent pattern
  if (formDataUpdate.freeShippingThreshold !== null && formDataUpdate.freeShippingThreshold !== undefined) {
    if (formDataUpdate.freeShippingThreshold < 0) {
      errors.freeShippingThreshold = "Free shipping threshold must be positive";
    }

    if (!validateDecimal(formDataUpdate.freeShippingThreshold, 2)) {
      errors.freeShippingThreshold = "Free shipping threshold must have at most 2 decimal places";
    }
  }

  setFormErrors(errors);
  return Object.keys(errors).length === 0;
};



  // ==================== HANDLERS WITH useCallback ====================
  const handleCreate = useCallback(() => {
    setModalMode("create");
    setFormDataCreate({
      shippingZoneId: selectedZoneId || "",
      shippingMethodId: "",
      weightFrom: 0,
      weightTo: 2,
      orderValueFrom: 0,
      orderValueTo: 999999.99,
      baseRate: 0,
      perKgRate: 0,
      perItemRate: 0,
      minimumCharge: 0,
      maximumCharge: null,
      freeShippingThreshold: null,
      isActive: true,
    });
    setFormErrors({});
    setShowModal(true);
    setZoneModalSearchTerm("");
    setMethodModalSearchTerm("");
  }, [selectedZoneId]);

  const handleEdit = useCallback((rate: ShippingRate) => {
    setModalMode("edit");
    setSelectedRate(rate);
    setFormDataUpdate({
      baseRate: rate.baseRate,
      perKgRate: rate.perKgRate,
      perItemRate: rate.perItemRate,
      minimumCharge: rate.minimumCharge,
      maximumCharge: rate.maximumCharge,
      freeShippingThreshold: rate.freeShippingThreshold,
      isActive: rate.isActive,
    });
    setFormErrors({});
    setShowModal(true);
  }, []);

  const handleView = useCallback((rate: ShippingRate) => {
    setSelectedRate(rate);
    setShowViewModal(true);
  }, []);

  // 🎯 Submit with Enhanced Error Handling
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (submitting) {
      console.log("⚠️ Submit already in progress, ignoring...");
      return;
    }

    if (modalMode === "create") {
      if (!validateCreateForm()) {
        toast.error("Please fix validation errors");
        return;
      }
    } else {
      if (!validateUpdateForm()) {
        toast.error("Please fix validation errors");
        return;
      }
    }

    try {
      setSubmitting(true);

      submitTimeoutRef.current = setTimeout(() => {
        console.warn("⚠️ Submit timeout reached, resetting...");
        setSubmitting(false);
      }, 10000);

      if (modalMode === "create") {
        const response = await fetchWithRetry(() =>
          shippingService.createRate(formDataCreate)
        );
        
        if (response.data && response.data.success) {
          toast.success("✅ Rate created successfully!");
          setShowModal(false);
          if (selectedZoneId) {
            fetchRatesForZone(selectedZoneId);
          }
        }
      } else if (selectedRate) {
        const response = await fetchWithRetry(() =>
          shippingService.updateRate(selectedRate.id, formDataUpdate)
        );
        
        if (response.data && response.data.success) {
          toast.success("✅ Rate updated successfully!");
          setShowModal(false);
          if (selectedZoneId) {
            fetchRatesForZone(selectedZoneId);
          }
        }
      }
    } catch (error: any) {
      console.error("Submit error:", error);
      
      // 🔥 Enhanced Error Handling
      if (error.response?.status === 409) {
        toast.error("Rate already exists for this weight range");
      } else if (error.response?.status === 400) {
        toast.error(error.response.data.message || "Invalid data provided");
      } else if (error.response?.status === 401) {
        toast.error("Session expired. Please login again");
      } else if (error.response?.status === 403) {
        toast.error("Access denied. Insufficient permissions");
      } else if (error.response?.status >= 500) {
        toast.error("Server error. Please try again later");
      } else {
        toast.error(error.message || "Operation failed");
      }
    } finally {
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current);
      }
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetchWithRetry(() =>
        shippingService.deleteRate(id)
      );
      
      if (response.data && response.data.success) {
        toast.success("🗑️ Rate deleted successfully!");
        setDeleteConfirmId(null);
        if (selectedZoneId) {
          fetchRatesForZone(selectedZoneId);
        }
      }
    } catch (error: any) {
      console.error("Delete error:", error);
      
      // 🔥 Enhanced Error Handling
      if (error.response?.status === 404) {
        toast.error("Rate not found");
      } else if (error.response?.status === 403) {
        toast.error("Access denied. Cannot delete this rate");
      } else if (error.response?.status >= 500) {
        toast.error("Server error. Please try again later");
      } else {
        toast.error(error.message || "Failed to delete rate");
      }
    }
  };

  // 🎯 Filter Zones for Modal with Memoization
  const filteredZonesForModal = useMemo(() => 
    zones.filter((zone) =>
      zone.name.toLowerCase().includes(zoneModalSearchTerm.toLowerCase()) ||
      zone.country.toLowerCase().includes(zoneModalSearchTerm.toLowerCase())
    ),
    [zones, zoneModalSearchTerm]
  );

  // 🎯 Filter Methods for Modal with Memoization
  const filteredMethodsForModal = useMemo(() =>
    methods.filter((method) =>
      method.displayName.toLowerCase().includes(methodModalSearchTerm.toLowerCase()) ||
      method.name.toLowerCase().includes(methodModalSearchTerm.toLowerCase())
    ),
    [methods, methodModalSearchTerm]
  );

  // 🎯 Clear All Filters
  const handleClearFilters = useCallback(() => {
    setSearchTerm("");
    setFilterActive("all");
    setZoneSearchTerm("");
  }, []);

  // 🎯 Check if filters are active
  const hasActiveFilters = searchTerm !== "" || filterActive !== "all";

  // 🎯 Zone Selection Handler
  const handleZoneSelect = useCallback((zone: ShippingZone) => {
    setSelectedZoneId(zone.id);
    setZoneSearchTerm(zone.name);
    setShowZoneDropdown(false);
  }, []);

  // ==================== FILTERING WITH MEMOIZATION ====================
  const filteredRates = useMemo(() =>
    zoneRates?.rates.filter((rate) => {
      const matchesSearch =
        rate.shippingMethodName.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        rate.baseRate.toString().includes(debouncedSearchTerm);

      const matchesActive =
        filterActive === "all" ||
        (filterActive === "active" && rate.isActive) ||
        (filterActive === "inactive" && !rate.isActive);

      return matchesSearch && matchesActive;
    }) || [],
    [zoneRates, debouncedSearchTerm, filterActive]
  );

  // 🎯 Filter Zones for Dropdown with Memoization
  const filteredZones = useMemo(() =>
    zones.filter((zone) =>
      zone.name.toLowerCase().includes(zoneSearchTerm.toLowerCase())
    ),
    [zones, zoneSearchTerm]
  );

  // ==================== PAGINATION ====================
  const totalItems = filteredRates.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentRates = filteredRates.slice(startIndex, endIndex);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  const getPageNumbers = useMemo(() => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      }
    }

    return pages;
  }, [currentPage, totalPages]);

  // Group rates by method with Memoization
  const ratesByMethod = useMemo(() =>
    currentRates.reduce((acc, rate) => {
      const methodName = rate.shippingMethodName;
      if (!acc[methodName]) {
        acc[methodName] = [];
      }
      acc[methodName].push(rate);
      return acc;
    }, {} as Record<string, ShippingRate[]>),
    [currentRates]
  );

  // ==================== STATS WITH MEMOIZATION ====================
  const stats = useMemo(() => ({
    totalRates: zoneRates?.rates.length || 0,
    activeRates: zoneRates?.rates.filter((r) => r.isActive).length || 0,
    freeShipping: zoneRates?.rates.filter((r) => r.freeShippingThreshold !== null).length || 0,
    methods: new Set(zoneRates?.rates.map((r) => r.shippingMethodName) || []).size,
  }), [zoneRates]);

  const selectedZone = useMemo(() =>
    zones.find((z) => z.id === selectedZoneId),
    [zones, selectedZoneId]
  );

  // ==================== RENDER ====================
  return (
    <div className="space-y-2">
      {/* Header */}
     <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Shipping Rates
            </h1>
            <p className="text-slate-400 dark:text-gray-500 mt-1">
              Manage pricing for zones and methods
            </p>
          </div>
          
          {/* Navigation & Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Navigation Button: Zones */}
            <button
              onClick={() => router.push('/admin/shipping/zones')}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <MapPin className="w-4 h-4" />
              Zones
            </button>

            {/* Navigation Button: Methods */}
            <button
              onClick={() => router.push('/admin/shipping/methods')}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Package className="w-4 h-4" />
              Methods
            </button>

            {/* Action Button: Add Rate */}
            <button
              onClick={handleCreate}
              disabled={!selectedZoneId || loadingZones}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              Add Rate
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/50 dark:bg-gray-900/50 backdrop-blur-xl border border-slate-800 dark:border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 dark:text-gray-500 text-sm">Total Rates</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.totalRates}</p>
              </div>
              <div className="w-12 h-12 bg-violet-500/10 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-violet-400" />
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 dark:bg-gray-900/50 backdrop-blur-xl border border-slate-800 dark:border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 dark:text-gray-500 text-sm">Active Rates</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.activeRates}</p>
              </div>
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 dark:bg-gray-900/50 backdrop-blur-xl border border-slate-800 dark:border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 dark:text-gray-500 text-sm">Free Shipping</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.freeShipping}</p>
              </div>
              <div className="w-12 h-12 bg-cyan-500/10 rounded-lg flex items-center justify-center">
                <Tag className="w-6 h-6 text-cyan-400" />
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 dark:bg-gray-900/50 backdrop-blur-xl border border-slate-800 dark:border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 dark:text-gray-500 text-sm">Methods</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.methods}</p>
              </div>
              <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center">
                <Layers className="w-6 h-6 text-orange-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== FILTERS SECTION ==================== */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-4 overflow-visible relative z-40">
        <div className="flex items-end gap-4">

          {/* Zone Dropdown */}
          <div className="w-64 flex-shrink-0 relative" ref={zoneDropdownRef}>
            <label className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cyan-400" />
              Select Zone
            </label>
            <div className="relative">
              <input
                type="text"
                value={showZoneDropdown ? zoneSearchTerm : (selectedZone ? selectedZone.name : "")}
                onChange={(e) => {
                  setZoneSearchTerm(sanitizeInput(e.target.value));
                  if (!showZoneDropdown) setShowZoneDropdown(true);
                }}
                onFocus={() => {
                  setShowZoneDropdown(true);
                  setZoneSearchTerm("");
                }}
                placeholder="Select or search zone..."
                className="w-full px-4 py-2.5 pr-10 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <ChevronDown className={cn("absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-transform pointer-events-none", showZoneDropdown && "rotate-180")} />

              {showZoneDropdown && (
                <div className="absolute w-full mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto z-[9999]">
                  {filteredZones.length === 0 ? (
                    <div className="p-4 text-center text-sm text-slate-400">No zones found</div>
                  ) : (
                    filteredZones.map((zone) => (
                      <button
                        key={zone.id}
                        onClick={() => {
                          handleZoneSelect(zone);
                          setShowZoneDropdown(false);
                          setZoneSearchTerm("");
                        }}
                        className={cn("w-full px-4 py-3 text-left hover:bg-slate-700/50 flex items-center gap-3", selectedZoneId === zone.id && "bg-violet-500/10")}
                      >
                        <MapPin className={cn("w-5 h-5", selectedZoneId === zone.id ? "text-violet-400" : "text-slate-400")} />
                        <div>
                          <p className={cn("text-sm font-medium", selectedZoneId === zone.id ? "text-violet-400" : "text-white")}>{zone.name}</p>
                          <p className="text-xs text-slate-400">{zone.country}</p>
                        </div>
                        {selectedZoneId === zone.id && <CheckCircle className="w-4 h-4 text-violet-400 ml-auto" />}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="flex-1">
            <label className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
              <Search className="w-4 h-4 text-cyan-400" />
              Search Rates
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                placeholder="Search by method or rate..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(sanitizeInput(e.target.value))}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              {searchTerm !== debouncedSearchTerm && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                </div>
              )}
            </div>
          </div>

          {/* Results Count */}
          <div className="flex-shrink-0 pt-6">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500/10 to-violet-500/10 border border-cyan-500/30 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
              <p className="text-sm whitespace-nowrap">
                <span className="font-bold text-cyan-400">{filteredRates.length}</span>
                <span className="text-slate-400 ml-1">{filteredRates.length === 1 ? 'result' : 'results'}</span>
              </p>
            </div>
          </div>

          {/* Filter Dropdown */}
          <div className="flex-shrink-0 relative" ref={filterDropdownRef}>
            <label className="text-sm font-medium text-slate-300 mb-2">Filter Status</label>
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className={cn(
                "flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg font-medium text-sm w-40 ring-2",
                filterActive === "all" && "bg-violet-500/10 text-violet-400 ring-violet-500/50",
                filterActive === "active" && "bg-green-500/10 text-green-400 ring-green-500/50",
                filterActive === "inactive" && "bg-red-500/10 text-red-400 ring-red-500/50"
              )}
            >
              <span className="capitalize">{filterActive}</span>
              <ChevronDown className={cn("w-4 h-4 transition-transform", showFilterDropdown && "rotate-180")} />
            </button>

            {showFilterDropdown && (
              <div className="absolute w-full mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-[9999]">
                {["all", "active", "inactive"].map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      setFilterActive(status as any);
                      setShowFilterDropdown(false);
                    }}
                    className={cn(
                      "w-full px-4 py-2.5 text-left hover:bg-slate-700/50 flex items-center gap-2",
                      filterActive === status && (status === "all" ? "bg-violet-500/10" : status === "active" ? "bg-green-500/10" : "bg-red-500/10")
                    )}
                  >
                    <div className={cn("w-2 h-2 rounded-full", filterActive === status ? (status === "all" ? "bg-violet-400" : status === "active" ? "bg-green-400" : "bg-red-400") : "bg-slate-600")}></div>
                    <span className={cn("text-sm font-medium capitalize", filterActive === status ? (status === "all" ? "text-violet-400" : status === "active" ? "text-green-400" : "text-red-400") : "text-slate-300")}>{status}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Clear Button */}
          {hasActiveFilters && (
            <div className="flex-shrink-0 pt-6">
              <button
                onClick={handleClearFilters}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg font-medium ring-2 ring-red-500/50"
              >
                <FilterX className="w-4 h-4" />
                Clear Filters
              </button>
            </div>
          )}

        </div>
      </div>

      {/* Rates Display */}
      {loadingZones ? (
        <div className="bg-slate-900/50 dark:bg-gray-900/50 backdrop-blur-xl border border-slate-800 dark:border-gray-800 rounded-xl p-12">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="w-10 h-10 text-violet-500 animate-spin mb-4" />
            <p className="text-slate-400 dark:text-gray-500">Loading zones and methods...</p>
          </div>
        </div>
      ) : !selectedZoneId ? (
        <div className="bg-slate-900/50 dark:bg-gray-900/50 backdrop-blur-xl border border-slate-800 dark:border-gray-800 rounded-xl p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-slate-800/50 dark:bg-gray-800/50 rounded-full flex items-center justify-center mb-4">
              <MapPin className="w-8 h-8 text-slate-600 dark:text-gray-600" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No Zone Selected</h3>
            <p className="text-slate-400 dark:text-gray-500 max-w-sm">
              Please select a shipping zone to view and manage rates
            </p>
          </div>
        </div>
      ) : loading ? (
        <div className="bg-slate-900/50 dark:bg-gray-900/50 backdrop-blur-xl border border-slate-800 dark:border-gray-800 rounded-xl p-12">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="w-10 h-10 text-violet-500 animate-spin mb-4" />
            <p className="text-slate-400 dark:text-gray-500">Loading rates...</p>
          </div>
        </div>
      ) : filteredRates.length === 0 ? (
        <div className="bg-slate-900/50 dark:bg-gray-900/50 backdrop-blur-xl border border-slate-800 dark:border-gray-800 rounded-xl p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-slate-800/50 dark:bg-gray-800/50 rounded-full flex items-center justify-center mb-4">
              <DollarSign className="w-8 h-8 text-slate-600 dark:text-gray-600" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No Rates Found</h3>
            <p className="text-slate-400 dark:text-gray-500 max-w-sm mb-4">
              {searchTerm
                ? "Try adjusting your search or filters"
                : `No rates configured for ${zoneRates?.zoneName || "this zone"}`}
            </p>
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create First Rate
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Zone Info Header */}
          {zoneRates && (
            <div className="bg-gradient-to-r from-violet-500/10 to-cyan-500/10 border border-violet-500/20 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MapPin className="w-6 h-6 text-violet-400" />
                  <div>
                    <h3 className="text-lg font-bold text-white">{zoneRates.zoneName}</h3>
                    <p className="text-sm text-slate-400 dark:text-gray-500">
                      {zoneRates.zoneDescription}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-slate-400 dark:text-gray-500">
                  Showing {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems} rates
                </p>
              </div>
            </div>
          )}

          {/* Rates Grouped by Method */}
          {Object.entries(ratesByMethod).map(([methodName, rates]) => (
            <div
              key={methodName}
              className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl overflow-visible relative z-10"
            >
              {/* Method Header */}
              <div className="bg-slate-800/50 px-6 py-4 border-b border-slate-700 rounded-t-xl">
                <div className="flex items-center gap-3">
                  <Truck className="w-5 h-5 text-cyan-400" />
                  <h4 className="text-lg font-semibold text-white">{methodName}</h4>
                  <span className="ml-auto text-sm text-slate-400">
                    {rates.length} rate{rates.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              {/* Rates Table */}
              <div className="overflow-x-auto rounded-b-xl">
                <table className="w-full">
                  <thead className="bg-slate-800/30 border-b border-slate-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        Weight Range
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        Base Rate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        Per Kg
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        Min Charge
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        Free Shipping
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {rates.map((rate) => (
                      <tr
                        key={rate.id}
                        className="hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Weight className="w-4 h-4 text-violet-400" />
                            <span className="text-sm font-medium text-white">
                              {rate.weightFrom}kg - {rate.weightTo}kg
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4 text-green-400" />
                            <span className="text-sm font-semibold text-green-400">
                              £{rate.baseRate.toFixed(2)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-slate-300">
                            £{rate.perKgRate.toFixed(2)}/kg
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-slate-300">
                            £{rate.minimumCharge.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {rate.freeShippingThreshold ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-cyan-500/10 text-cyan-400 rounded text-xs font-medium">
                              <Tag className="w-3 h-3" />
                              £{rate.freeShippingThreshold.toFixed(2)}+
                            </span>
                          ) : (
                            <span className="text-sm text-slate-500">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex justify-center">
                            {rate.isActive ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-500/10 text-green-400 rounded-full text-xs font-medium">
                                <CheckCircle className="w-3.5 h-3.5" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/10 text-red-400 rounded-full text-xs font-medium">
                                <XCircle className="w-3.5 h-3.5" />
                                Inactive
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleView(rate)}
                              className="p-2 text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEdit(rate)}
                              className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                              title="Edit Rate"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(rate.id)}
                              className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                              title="Delete Rate"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <p className="text-sm text-slate-400">
                    Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} results
                  </p>

                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-3 py-1.5 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="5">5 per page</option>
                    <option value="10">10 per page</option>
                    <option value="25">25 per page</option>
                    <option value="50">50 per page</option>
                    <option value="100">100 per page</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-1">
                    {getPageNumbers.map((page, index) => (
                      <button
                        key={index}
                        onClick={() => typeof page === "number" && goToPage(page)}
                        disabled={page === "..."}
                        className={cn(
                          "min-w-[36px] h-9 px-3 rounded-lg text-sm font-medium transition-colors",
                          page === currentPage
                            ? "bg-violet-500 text-white"
                            : page === "..."
                            ? "text-slate-500 cursor-default"
                            : "bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700"
                        )}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-red-500/20 rounded-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Delete Rate</h3>
                <p className="text-sm text-slate-400">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-slate-300 mb-6">
              Are you sure you want to delete this shipping rate? This will permanently remove it from the system.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 🎯 View Modal */}
      {showViewModal && selectedRate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-cyan-500/20 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl shadow-cyan-500/10">
            <div className="flex items-center justify-between p-6 border-b border-cyan-500/20">
              <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400">
                Rate Details
              </h2>
              <button
                onClick={() => setShowViewModal(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Header Info */}
              <div className="bg-gradient-to-r from-cyan-500/10 to-violet-500/10 border border-cyan-500/20 rounded-xl p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-violet-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Truck className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white mb-1">
                        {selectedRate.shippingMethodName}
                      </h3>
                      <p className="text-sm text-slate-400 flex items-center gap-2">
                        <Weight className="w-4 h-4" />
                        {selectedRate.weightFrom}kg - {selectedRate.weightTo}kg
                      </p>
                    </div>
                  </div>
                  {selectedRate.isActive ? (
                    <span className="inline-flex items-center mt-4 gap-1.5 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-full text-sm font-medium">
                      <CheckCircle className="w-4 h-4" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center mt-4  gap-1.5 px-3 py-1.5 bg-red-500/20 text-red-400 rounded-full text-sm font-medium">
                      <XCircle className="w-4 h-4" />
                      Inactive
                    </span>
                  )}
                </div>
              </div>

              {/* Pricing Details */}
              <div>
                <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-cyan-400" />
                  Pricing Structure
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                    <p className="text-xs text-slate-400 mb-1">Base Rate</p>
                    <p className="text-2xl font-bold text-green-400">£{selectedRate.baseRate.toFixed(2)}</p>
                  </div>
                  <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                    <p className="text-xs text-slate-400 mb-1">Per Kg Rate</p>
                    <p className="text-2xl font-bold text-cyan-400">£{selectedRate.perKgRate.toFixed(2)}</p>
                  </div>
                  <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                    <p className="text-xs text-slate-400 mb-1">Per Item Rate</p>
                    <p className="text-2xl font-bold text-violet-400">£{selectedRate.perItemRate.toFixed(2)}</p>
                  </div>
                  <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                    <p className="text-xs text-slate-400 mb-1">Minimum Charge</p>
                    <p className="text-2xl font-bold text-orange-400">£{selectedRate.minimumCharge.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Additional Settings */}
              <div>
                <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-cyan-400" />
                  Additional Settings
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                    <p className="text-xs text-slate-400 mb-1">Maximum Charge</p>
                    <p className="text-lg font-bold text-white">
                      {selectedRate.maximumCharge ? `£${selectedRate.maximumCharge.toFixed(2)}` : "No Limit"}
                    </p>
                  </div>
                  <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                    <p className="text-xs text-slate-400 mb-1">Free Shipping Threshold</p>
                    <p className="text-lg font-bold text-white">
                      {selectedRate.freeShippingThreshold ? `£${selectedRate.freeShippingThreshold.toFixed(2)}` : "Not Set"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Weight & Order Range */}
              <div>
                <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  Applicable Ranges
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-800/30 border border-slate-700 rounded-lg">
                    <p className="text-xs text-slate-400 mb-1">Weight Range</p>
                    <p className="text-sm text-white font-medium">
                      {selectedRate.weightFrom}kg - {selectedRate.weightTo}kg
                    </p>
                  </div>
                  <div className="p-4 bg-slate-800/30 border border-slate-700 rounded-lg">
                    <p className="text-xs text-slate-400 mb-1">Order Value Range</p>
                    <p className="text-sm text-white font-medium">
                      £{selectedRate.orderValueFrom.toFixed(2)} - £{selectedRate.orderValueTo.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-800/30 border border-slate-700 rounded-lg">
                  <p className="text-xs text-slate-400 mb-1">Created</p>
                  <p className="text-sm text-white font-medium">
                    {selectedRate.createdAt
                      ? new Date(selectedRate.createdAt).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "N/A"}
                  </p>
                </div>
                <div className="p-4 bg-slate-800/30 border border-slate-700 rounded-lg">
                  <p className="text-xs text-slate-400 mb-1">Updated</p>
                  <p className="text-sm text-white font-medium">
                    {selectedRate.updatedAt
                      ? new Date(selectedRate.updatedAt).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "N/A"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-cyan-500/20">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  handleEdit(selectedRate);
                }}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 text-white rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Edit Rate
              </button>
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🎯 Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 dark:bg-gray-900 border border-slate-800 dark:border-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-800 dark:border-gray-800">
              <h2 className="text-xl font-bold text-white">
                {modalMode === "create" ? "Create New Rate" : "Edit Rate"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                disabled={submitting}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              {modalMode === "create" ? (
                <>
                  {/* CREATE MODE */}

<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
  {/* 🎯 Zone Searchable Dropdown */}
  <div>
    <label className="block text-sm font-medium text-slate-300 dark:text-gray-400 mb-2">
      Shipping Zone <span className="text-red-400">*</span>
    </label>
    <div className="relative" ref={zoneModalDropdownRef}>
      {/* Input Field */}
      <input
        type="text"
        value={
          showZoneModalDropdown
            ? zoneModalSearchTerm
            : formDataCreate.shippingZoneId
            ? zones.find(z => z.id === formDataCreate.shippingZoneId)?.name || ""
            : ""
        }
        onChange={(e) => {
          setZoneModalSearchTerm(e.target.value);
          if (!showZoneModalDropdown) {
            setShowZoneModalDropdown(true);
          }
        }}
        onFocus={() => {
          setShowZoneModalDropdown(true);
          setZoneModalSearchTerm("");
        }}
        placeholder="Select or search zone..."
        disabled={submitting}
        aria-invalid={!!formErrors.shippingZoneId}
        aria-describedby={formErrors.shippingZoneId ? "zone-error" : "zone-hint"}
        aria-expanded={showZoneModalDropdown}
        aria-haspopup="listbox"
        className={cn(
          "w-full px-4 py-2.5 pr-10 bg-slate-800/50 dark:bg-gray-800/50 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed",
          formErrors.shippingZoneId
            ? "border-red-500 focus:ring-red-500"
            : "border-slate-700 dark:border-gray-700 focus:ring-violet-500"
        )}
      />

      {/* Icon */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
        {showZoneModalDropdown ? (
          <ChevronDown className="w-4 h-4 text-slate-400 rotate-180 transition-transform" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400 transition-transform" />
        )}
      </div>

      {/* Dropdown */}
      {showZoneModalDropdown && (
        <div 
          className="absolute z-50 w-full mt-2 bg-slate-800 dark:bg-gray-800 border border-slate-700 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden"
          role="listbox"
          aria-label="Zone selection"
        >
          <div className="max-h-60 overflow-y-auto">
            {filteredZonesForModal.length === 0 ? (
              <div className="p-4 text-center">
                <div className="w-12 h-12 bg-slate-700/30 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <MapPin className="w-6 h-6 text-slate-500" />
                </div>
                <p className="text-sm text-slate-400">No zones found</p>
                <p className="text-xs text-slate-500 mt-1">Try a different search</p>
              </div>
            ) : (
              filteredZonesForModal.map((zone) => (
                <button
                  key={zone.id}
                  type="button"
                  onClick={() => {
                    setFormDataCreate({ 
                      ...formDataCreate, 
                      shippingZoneId: zone.id 
                    });
                    setFormErrors({ ...formErrors, shippingZoneId: "" });
                    setShowZoneModalDropdown(false);
                    setZoneModalSearchTerm("");
                  }}
                  role="option"
                  aria-selected={formDataCreate.shippingZoneId === zone.id}
                  className={cn(
                    "w-full px-4 py-3 text-left hover:bg-slate-700/50 dark:hover:bg-gray-700/50 transition-colors flex items-center justify-between group",
                    formDataCreate.shippingZoneId === zone.id && "bg-violet-500/10"
                  )}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                      formDataCreate.shippingZoneId === zone.id
                        ? "bg-violet-500/20"
                        : "bg-slate-700/30 group-hover:bg-slate-700/50"
                    )}>
                      <MapPin className={cn(
                        "w-5 h-5",
                        formDataCreate.shippingZoneId === zone.id
                          ? "text-violet-400"
                          : "text-slate-400 group-hover:text-slate-300"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-medium truncate",
                        formDataCreate.shippingZoneId === zone.id
                          ? "text-violet-400"
                          : "text-white"
                      )}>
                        {zone.name}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {zone.country}
                      </p>
                    </div>
                  </div>
                  {formDataCreate.shippingZoneId === zone.id && (
                    <CheckCircle className="w-5 h-5 text-violet-400 flex-shrink-0 ml-2" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          {filteredZonesForModal.length > 0 && (
            <div className="px-4 py-2 border-t border-slate-700 dark:border-gray-700 bg-slate-800/30">
              <p className="text-xs text-slate-400">
                {filteredZonesForModal.length} zone{filteredZonesForModal.length !== 1 ? 's' : ''} available
              </p>
            </div>
          )}
        </div>
      )}
    </div>

    {/* Error or Helper */}
    {formErrors.shippingZoneId ? (
      <p id="zone-error" className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
        <AlertCircle className="w-3 h-3" />
        {formErrors.shippingZoneId}
      </p>
    ) : (
      <p id="zone-hint" className="mt-1.5 text-xs text-slate-400 font-semibold flex items-start gap-1.5">
        <Info className="w-3.5 h-3.5 text-cyan-400 mt-0.5 flex-shrink-0" />
        <span>Select the shipping zone for this rate</span>
      </p>
    )}
  </div>

  {/* 🎯 Method Searchable Dropdown */}
  <div>
    <label className="block text-sm font-medium text-slate-300 dark:text-gray-400 mb-2">
      Shipping Method <span className="text-red-400">*</span>
    </label>
    <div className="relative" ref={methodModalDropdownRef}>
      {/* Input Field */}
      <input
        type="text"
        value={
          showMethodModalDropdown
            ? methodModalSearchTerm
            : formDataCreate.shippingMethodId
            ? methods.find(m => m.id === formDataCreate.shippingMethodId)?.displayName || ""
            : ""
        }
        onChange={(e) => {
          setMethodModalSearchTerm(e.target.value);
          if (!showMethodModalDropdown) {
            setShowMethodModalDropdown(true);
          }
        }}
        onFocus={() => {
          setShowMethodModalDropdown(true);
          setMethodModalSearchTerm("");
        }}
        placeholder="Select or search method..."
        disabled={submitting}
        aria-invalid={!!formErrors.shippingMethodId}
        aria-describedby={formErrors.shippingMethodId ? "method-error" : "method-hint"}
        aria-expanded={showMethodModalDropdown}
        aria-haspopup="listbox"
        className={cn(
          "w-full px-4 py-2.5 pr-10 bg-slate-800/50 dark:bg-gray-800/50 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed",
          formErrors.shippingMethodId
            ? "border-red-500 focus:ring-red-500"
            : "border-slate-700 dark:border-gray-700 focus:ring-violet-500"
        )}
      />

      {/* Icon */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
        {showMethodModalDropdown ? (
          <ChevronDown className="w-4 h-4 text-slate-400 rotate-180 transition-transform" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400 transition-transform" />
        )}
      </div>

      {/* Dropdown */}
      {showMethodModalDropdown && (
        <div 
          className="absolute z-50 w-full mt-2 bg-slate-800 dark:bg-gray-800 border border-slate-700 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden"
          role="listbox"
          aria-label="Method selection"
        >
          <div className="max-h-60 overflow-y-auto">
            {filteredMethodsForModal.length === 0 ? (
              <div className="p-4 text-center">
                <div className="w-12 h-12 bg-slate-700/30 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <Truck className="w-6 h-6 text-slate-500" />
                </div>
                <p className="text-sm text-slate-400">No methods found</p>
                <p className="text-xs text-slate-500 mt-1">Try a different search</p>
              </div>
            ) : (
              filteredMethodsForModal.map((method) => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => {
                    setFormDataCreate({
                      ...formDataCreate,
                      shippingMethodId: method.id,
                    });
                    setFormErrors({ ...formErrors, shippingMethodId: "" });
                    setShowMethodModalDropdown(false);
                    setMethodModalSearchTerm("");
                  }}
                  role="option"
                  aria-selected={formDataCreate.shippingMethodId === method.id}
                  className={cn(
                    "w-full px-4 py-3 text-left hover:bg-slate-700/50 dark:hover:bg-gray-700/50 transition-colors flex items-center justify-between group",
                    formDataCreate.shippingMethodId === method.id && "bg-violet-500/10"
                  )}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                      formDataCreate.shippingMethodId === method.id
                        ? "bg-violet-500/20"
                        : "bg-slate-700/30 group-hover:bg-slate-700/50"
                    )}>
                      <Truck className={cn(
                        "w-5 h-5",
                        formDataCreate.shippingMethodId === method.id
                          ? "text-violet-400"
                          : "text-slate-400 group-hover:text-slate-300"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-medium truncate",
                        formDataCreate.shippingMethodId === method.id
                          ? "text-violet-400"
                          : "text-white"
                      )}>
                        {method.displayName}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {method.name}
                      </p>
                    </div>
                  </div>
                  {formDataCreate.shippingMethodId === method.id && (
                    <CheckCircle className="w-5 h-5 text-violet-400 flex-shrink-0 ml-2" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          {filteredMethodsForModal.length > 0 && (
            <div className="px-4 py-2 border-t border-slate-700 dark:border-gray-700 bg-slate-800/30">
              <p className="text-xs text-slate-400">
                {filteredMethodsForModal.length} method{filteredMethodsForModal.length !== 1 ? 's' : ''} available
              </p>
            </div>
          )}
        </div>
      )}
    </div>

    {/* Error or Helper */}
    {formErrors.shippingMethodId ? (
      <p id="method-error" className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
        <AlertCircle className="w-3 h-3" />
        {formErrors.shippingMethodId}
      </p>
    ) : (
      <p id="method-hint" className="mt-1.5 text-xs text-slate-400 font-semibold flex items-start gap-1.5">
        <Truck className="w-3.5 h-3.5 text-cyan-400 mt-0.5 flex-shrink-0" />
        <span>Choose shipping method (e.g., Express, Standard)</span>
      </p>
    )}
  </div>
</div>

                  {/* Weight Range */}
<div>
  <label className="block text-sm font-medium text-slate-300 dark:text-gray-400 mb-2">
    Weight Range (kg) <span className="text-red-400">*</span>
  </label>
  <div className="grid grid-cols-2 gap-3">
    {/* ✅ WEIGHT FROM */}
    <div>
      <input
        type="number"
        step="0.01"
        min="0"
        max="99999"  // ✅ Add max limit
        value={formDataCreate.weightFrom}
        onChange={(e) => {
          const value = e.target.value;
          // ✅ Handle empty input
          if (value === '' || value === null) {
            setFormDataCreate({
              ...formDataCreate,
              weightFrom: 0,
            });
          } else {
            const parsed = parseFloat(value);
            // ✅ Validate and clamp
            if (!isNaN(parsed)) {
              setFormDataCreate({
                ...formDataCreate,
                weightFrom: Math.max(0, Math.min(99999, parsed)),
              });
            }
          }
          setFormErrors({ ...formErrors, weightFrom: "", weightTo: "" });
        }}
        onBlur={(e) => {
          // ✅ Format on blur to 2 decimal places
          const value = parseFloat(e.target.value) || 0;
          setFormDataCreate({
            ...formDataCreate,
            weightFrom: parseFloat(value.toFixed(2)),
          });
        }}
        disabled={submitting}
        placeholder="From (kg)"
        aria-invalid={!!formErrors.weightFrom}
        aria-describedby={formErrors.weightFrom ? "weight-from-error" : undefined}
        className={cn(
          "w-full px-4 py-2.5 bg-slate-800/50 dark:bg-gray-800/50 border rounded-lg text-white placeholder-slate-500 dark:placeholder-gray-600 focus:outline-none focus:ring-2 transition-all disabled:opacity-50",
          formErrors.weightFrom
            ? "border-red-500 focus:ring-red-500"
            : "border-slate-700 dark:border-gray-700 focus:ring-violet-500"
        )}
      />
      {formErrors.weightFrom && (
        <p id="weight-from-error" className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {formErrors.weightFrom}
        </p>
      )}
    </div>

    {/* ✅ WEIGHT TO */}
    <div>
      <input
        type="number"
        step="0.01"
        min="0"
        max="99999"  // ✅ Add max limit
        value={formDataCreate.weightTo}
        onChange={(e) => {
          const value = e.target.value;
          // ✅ Handle empty input
          if (value === '' || value === null) {
            setFormDataCreate({
              ...formDataCreate,
              weightTo: 0,
            });
          } else {
            const parsed = parseFloat(value);
            // ✅ Validate and clamp
            if (!isNaN(parsed)) {
              setFormDataCreate({
                ...formDataCreate,
                weightTo: Math.max(0, Math.min(99999, parsed)),
              });
            }
          }
          setFormErrors({ ...formErrors, weightFrom: "", weightTo: "" });
        }}
        onBlur={(e) => {
          // ✅ Format on blur to 2 decimal places
          const value = parseFloat(e.target.value) || 0;
          setFormDataCreate({
            ...formDataCreate,
            weightTo: parseFloat(value.toFixed(2)),
          });
        }}
        disabled={submitting}
        placeholder="To (kg)"
        aria-invalid={!!formErrors.weightTo}
        aria-describedby={formErrors.weightTo ? "weight-to-error" : undefined}
        className={cn(
          "w-full px-4 py-2.5 bg-slate-800/50 dark:bg-gray-800/50 border rounded-lg text-white placeholder-slate-500 dark:placeholder-gray-600 focus:outline-none focus:ring-2 transition-all disabled:opacity-50",
          formErrors.weightTo
            ? "border-red-500 focus:ring-red-500"
            : "border-slate-700 dark:border-gray-700 focus:ring-violet-500"
        )}
      />
      {formErrors.weightTo && (
        <p id="weight-to-error" className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {formErrors.weightTo}
        </p>
      )}
    </div>
  </div>
  <p className="mt-1.5 text-xs text-slate-400 font-semibold flex items-start gap-1.5">
    <Weight className="w-3.5 h-3.5 text-cyan-400 mt-0.5 flex-shrink-0" />
    <span>Define the weight range for this rate (e.g., 0-2kg, 2-5kg)</span>
  </p>
</div>


                  {/* Pricing */}
                  <div>
                    <label className=" text-sm font-medium text-slate-300 dark:text-gray-400 mb-2 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-green-400" />
                      Pricing Structure
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      {/* Base Rate */}
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">
                          Base Rate (£) <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formDataCreate.baseRate}
                          onChange={(e) => {
                            setFormDataCreate({
                              ...formDataCreate,
                              baseRate: parseFloat(e.target.value) || 0,
                            });
                            setFormErrors({ ...formErrors, baseRate: "" });
                          }}
                          disabled={submitting}
                          aria-invalid={!!formErrors.baseRate}
                          className={cn(
                            "w-full px-4 py-2.5 bg-slate-800/50 dark:bg-gray-800/50 border rounded-lg text-white focus:outline-none focus:ring-2 transition-all disabled:opacity-50",
                            formErrors.baseRate
                              ? "border-red-500 focus:ring-red-500"
                              : "border-slate-700 dark:border-gray-700 focus:ring-violet-500"
                          )}
                        />
                        {formErrors.baseRate && (
                          <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {formErrors.baseRate}
                          </p>
                        )}
                      </div>

                      {/* Per Kg Rate */}
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">
                          Per Kg Rate (£)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formDataCreate.perKgRate}
                          onChange={(e) => {
                            setFormDataCreate({
                              ...formDataCreate,
                              perKgRate: parseFloat(e.target.value) || 0,
                            });
                          }}
                          disabled={submitting}
                          className="w-full px-4 py-2.5 bg-slate-800/50 dark:bg-gray-800/50 border border-slate-700 dark:border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all disabled:opacity-50"
                        />
                      </div>

                      {/* Per Item Rate */}
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">
                          Per Item Rate (£)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formDataCreate.perItemRate}
                          onChange={(e) => {
                            setFormDataCreate({
                              ...formDataCreate,
                              perItemRate: parseFloat(e.target.value) || 0,
                            });
                          }}
                          disabled={submitting}
                          className="w-full px-4 py-2.5 bg-slate-800/50 dark:bg-gray-800/50 border border-slate-700 dark:border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all disabled:opacity-50"
                        />
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-slate-400 font-semibold flex items-start gap-1.5">
                      <Info className="w-3.5 h-3.5 text-cyan-400 mt-0.5 flex-shrink-0" />
                      <span>
                        <strong>Base Rate:</strong> Fixed charge. 
                        <strong className="ml-2">Per Kg:</strong> Additional charge per kilogram. 
                        <strong className="ml-2">Per Item:</strong> Additional charge per item.
                      </span>
                    </p>
                  </div>

                  {/* Additional Settings */}
                  <div>
                    <label className=" text-sm font-medium text-slate-300 dark:text-gray-400 mb-2 flex items-center gap-2">
                      <Tag className="w-4 h-4 text-cyan-400" />
                      Additional Settings
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      {/* Minimum Charge */}
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">
                          Minimum Charge (£)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formDataCreate.minimumCharge}
                          onChange={(e) => {
                            setFormDataCreate({
                              ...formDataCreate,
                              minimumCharge: parseFloat(e.target.value) || 0,
                            });
                          }}
                          disabled={submitting}
                          className="w-full px-4 py-2.5 bg-slate-800/50 dark:bg-gray-800/50 border border-slate-700 dark:border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all disabled:opacity-50"
                        />
                      </div>

                      {/* Maximum Charge */}
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">
                          Maximum Charge (£)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formDataCreate.maximumCharge || ""}
                          onChange={(e) => {
                            setFormDataCreate({
                              ...formDataCreate,
                              maximumCharge: e.target.value ? parseFloat(e.target.value) : null,
                            });
                          }}
                          disabled={submitting}
                          placeholder="Optional"
                          className="w-full px-4 py-2.5 bg-slate-800/50 dark:bg-gray-800/50 border border-slate-700 dark:border-gray-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all disabled:opacity-50"
                        />
                      </div>

                      {/* Free Shipping Threshold */}
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">
                          Free Shipping Threshold (£)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formDataCreate.freeShippingThreshold || ""}
                          onChange={(e) => {
                            setFormDataCreate({
                              ...formDataCreate,
                              freeShippingThreshold: e.target.value
                                ? parseFloat(e.target.value)
                                : null,
                            });
                          }}
                          disabled={submitting}
                          placeholder="Optional"
                          className="w-full px-4 py-2.5 bg-slate-800/50 dark:bg-gray-800/50 border border-slate-700 dark:border-gray-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all disabled:opacity-50"
                        />
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-slate-400 font-semibold flex items-start gap-1.5">
                      <Info className="w-3.5 h-3.5 text-cyan-400 mt-0.5 flex-shrink-0" />
                      <span>
                        <strong>Min:</strong> Minimum amount to charge. 
                        <strong className="ml-2">Max:</strong> Cap shipping cost. 
                        <strong className="ml-2">Free Shipping:</strong> Waive shipping if order exceeds this value.
                      </span>
                    </p>
                  </div>

                  {/* Active Toggle */}
                  <div className="flex items-center justify-between p-4 bg-slate-800/30 dark:bg-gray-800/30 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-white flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-cyan-400" />
                        Rate Status
                      </p>
                      <p className="text-xs text-slate-500 dark:text-gray-600 mt-0.5">
                        {formDataCreate.isActive ? "Rate is active and will be used for calculations" : "Rate is inactive and won't be applied"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setFormDataCreate({ ...formDataCreate, isActive: !formDataCreate.isActive })
                      }
                      disabled={submitting}
                      className={cn(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50",
                        formDataCreate.isActive ? "bg-green-500" : "bg-slate-700 dark:bg-gray-700"
                      )}
                      aria-pressed={formDataCreate.isActive}
                      aria-label="Toggle rate active status"
                    >
                      <span
                        className={cn(
                          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                          formDataCreate.isActive ? "translate-x-6" : "translate-x-1"
                        )}
                      />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* EDIT MODE */}
                  {selectedRate && (
                    <div className="mb-5 p-4 bg-gradient-to-r from-violet-500/10 to-cyan-500/10 border border-violet-500/20 rounded-lg">
                      <p className="text-xs text-slate-400 dark:text-gray-500 mb-1">Editing Rate For:</p>
                      <p className="text-white font-semibold flex items-center gap-2">
                        <Truck className="w-4 h-4 text-cyan-400" />
                        {selectedRate.shippingMethodName} • {selectedRate.weightFrom}kg - {selectedRate.weightTo}kg
                      </p>
                    </div>
                  )}

                  {/* Pricing - Edit Mode */}
                  <div>
                    <label className=" text-sm font-medium text-slate-300 dark:text-gray-400 mb-2 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-green-400" />
                      Pricing Structure
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">
                          Base Rate (£) <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formDataUpdate.baseRate}
                          onChange={(e) => {
                            setFormDataUpdate({
                              ...formDataUpdate,
                              baseRate: parseFloat(e.target.value) || 0,
                            });
                            setFormErrors({ ...formErrors, baseRate: "" });
                          }}
                          disabled={submitting}
                          className={cn(
                            "w-full px-4 py-2.5 bg-slate-800/50 dark:bg-gray-800/50 border rounded-lg text-white focus:outline-none focus:ring-2 transition-all disabled:opacity-50",
                            formErrors.baseRate
                              ? "border-red-500 focus:ring-red-500"
                              : "border-slate-700 dark:border-gray-700 focus:ring-violet-500"
                          )}
                        />
                        {formErrors.baseRate && (
                          <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {formErrors.baseRate}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">
                          Per Kg Rate (£)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formDataUpdate.perKgRate}
                          onChange={(e) => {
                            setFormDataUpdate({
                              ...formDataUpdate,
                              perKgRate: parseFloat(e.target.value) || 0,
                            });
                          }}
                          disabled={submitting}
                          className="w-full px-4 py-2.5 bg-slate-800/50 dark:bg-gray-800/50 border border-slate-700 dark:border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all disabled:opacity-50"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">
                          Per Item Rate (£)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formDataUpdate.perItemRate}
                          onChange={(e) => {
                            setFormDataUpdate({
                              ...formDataUpdate,
                              perItemRate: parseFloat(e.target.value) || 0,
                            });
                          }}
                          disabled={submitting}
                          className="w-full px-4 py-2.5 bg-slate-800/50 dark:bg-gray-800/50 border border-slate-700 dark:border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all disabled:opacity-50"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Additional Settings - Edit Mode */}
                  <div>
                    <label className=" text-sm font-medium text-slate-300 dark:text-gray-400 mb-2 flex items-center gap-2">
                      <Tag className="w-4 h-4 text-cyan-400" />
                      Additional Settings
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">
                          Minimum Charge (£)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formDataUpdate.minimumCharge}
                          onChange={(e) => {
                            setFormDataUpdate({
                              ...formDataUpdate,
                              minimumCharge: parseFloat(e.target.value) || 0,
                            });
                          }}
                          disabled={submitting}
                          className="w-full px-4 py-2.5 bg-slate-800/50 dark:bg-gray-800/50 border border-slate-700 dark:border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all disabled:opacity-50"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">
                          Maximum Charge (£)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formDataUpdate.maximumCharge || ""}
                          onChange={(e) => {
                            setFormDataUpdate({
                              ...formDataUpdate,
                              maximumCharge: e.target.value ? parseFloat(e.target.value) : null,
                            });
                          }}
                          disabled={submitting}
                          placeholder="Optional"
                          className="w-full px-4 py-2.5 bg-slate-800/50 dark:bg-gray-800/50 border border-slate-700 dark:border-gray-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all disabled:opacity-50"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">
                          Free Shipping Threshold (£)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formDataUpdate.freeShippingThreshold || ""}
                          onChange={(e) => {
                            setFormDataUpdate({
                              ...formDataUpdate,
                              freeShippingThreshold: e.target.value
                                ? parseFloat(e.target.value)
                                : null,
                            });
                          }}
                          disabled={submitting}
                          placeholder="Optional"
                          className="w-full px-4 py-2.5 bg-slate-800/50 dark:bg-gray-800/50 border border-slate-700 dark:border-gray-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all disabled:opacity-50"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Active Toggle - Edit Mode */}
                  <div className="flex items-center justify-between p-4 bg-slate-800/30 dark:bg-gray-800/30 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-white flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-cyan-400" />
                        Rate Status
                      </p>
                      <p className="text-xs text-slate-500 dark:text-gray-600 mt-0.5">
                        {formDataUpdate.isActive ? "Rate is active" : "Rate is inactive"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setFormDataUpdate({ ...formDataUpdate, isActive: !formDataUpdate.isActive })
                      }
                      disabled={submitting}
                      className={cn(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50",
                        formDataUpdate.isActive ? "bg-green-500" : "bg-slate-700 dark:bg-gray-700"
                      )}
                      aria-pressed={formDataUpdate.isActive}
                    >
                      <span
                        className={cn(
                          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                          formDataUpdate.isActive ? "translate-x-6" : "translate-x-1"
                        )}
                      />
                    </button>
                  </div>
                </>
              )}
            </form>

            {/* Modal Footer */}
            <div className="flex gap-3 p-6 border-t border-slate-800 dark:border-gray-800 bg-slate-900/50 dark:bg-gray-900/50">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={submitting}
                className="flex-1 px-4 py-2.5 bg-slate-800 dark:bg-gray-800 text-white rounded-lg hover:bg-slate-700 dark:hover:bg-gray-700 transition-colors font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-violet-600 hover:to-cyan-600 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {modalMode === "create" ? "Create Rate" : "Update Rate"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 dark:bg-gray-900 border border-slate-800 dark:border-gray-800 rounded-xl max-w-md w-full shadow-2xl">
            <div className="p-6">
              <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Delete Rate?</h3>
              <p className="text-slate-400 dark:text-gray-500 mb-6">
                Are you sure you want to delete this rate? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 px-4 py-2.5 bg-slate-800 dark:bg-gray-800 text-white rounded-lg hover:bg-slate-700 dark:hover:bg-gray-700 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirmId)}
                  className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    
    </div>
  );
}
