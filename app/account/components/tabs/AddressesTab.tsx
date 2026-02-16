"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from "@/app/lib/api/address";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Address {
  id: string;
  firstName: string;
  lastName: string;
  company: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phoneNumber: string;
  isDefault: boolean;
}

export default function AddressesTab() {
  const { accessToken } = useAuth();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
// ✅ UK Mobile Validation (7XXXXXXXXX)
const ukPhoneRegex = /^7\d{9}$/;

  const [editingAddress, setEditingAddress] =
    useState<Address | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const emptyForm: Omit<Address, "id"> = {
    firstName: "",
    lastName: "",
    company: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
    phoneNumber: "",
    isDefault: false,
  };

  const [form, setForm] =
    useState<Omit<Address, "id">>(emptyForm);


  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof typeof form, string>>
  >({});

  // ---------------- FETCH ----------------
  useEffect(() => {
    if (!accessToken) return;

    const fetchAddresses = async () => {
      try {
        setLoading(true);
        const data = await getAddresses(accessToken);
        setAddresses(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAddresses();
  }, [accessToken]);

  // ---------------- VALIDATION ----------------
  const validateField = (
    key: keyof typeof form,
    value: string
  ) => {
    let errorMsg = "";

    const requiredFields = [
      "firstName",
      "addressLine1",
      "city",
      "state",
      "postalCode",
      "phoneNumber",
    ];

    if (requiredFields.includes(key)) {
      if (!value.trim()) {
        errorMsg = "This field is required";
      }
    }

    if (key === "phoneNumber") {
  const cleaned = value.replace(/\D/g, "");

  if (!cleaned) {
    errorMsg = "Phone number is required";
  } else if (!ukPhoneRegex.test(cleaned)) {
    errorMsg = "Enter valid UK mobile (7XXXXXXXXX)";
  }
}


    setFormErrors((prev) => ({
      ...prev,
      [key]: errorMsg,
    }));

    return errorMsg === "";
  };

  const handleChange = (
    key: keyof typeof form,
    value: any
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: value ?? "",
    }));

    if (key !== "isDefault") {
      validateField(key, value ?? "");
    }
  };

  // ---------------- ADD ----------------
  const handleAddNew = () => {
    setEditingAddress(null);
    setForm(emptyForm);
    setFormErrors({});
    setOpen(true);
  };

  // ---------------- SAVE ----------------
  const handleSave = async () => {
    if (!accessToken) return;

    let isValid = true;

    Object.entries(form).forEach(([key, value]) => {
      if (
        key === "company" ||
        key === "addressLine2" ||
        key === "country" ||
        key === "isDefault"
      )
        return;

      const valid = validateField(
        key as keyof typeof form,
        String(value ?? "")
      );

      if (!valid) isValid = false;
    });

    if (!isValid) return;

    try {
      if (editingAddress) {
        const updated = await updateAddress(
          accessToken,
          editingAddress.id,
          form
        );

        setAddresses((prev) =>
          prev.map((a) =>
            a.id === updated.id ? updated : a
          )
        );
      } else {
        const created = await createAddress(
          accessToken,
          form
        );
        setAddresses((prev) => [...prev, created]);
      }

      setOpen(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // ---------------- DELETE ----------------
  const handleDeleteClick = (id: string) => {
    setDeleteId(id);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!accessToken || !deleteId) return;

    try {
      await deleteAddress(accessToken, deleteId);
      setAddresses((prev) =>
        prev.filter((a) => a.id !== deleteId)
      );
      setDeleteOpen(false);
      setDeleteId(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // ---------------- SET DEFAULT ----------------
  const handleSetDefault = async (id: string) => {
    if (!accessToken) return;

    try {
      await setDefaultAddress(accessToken, id);

      setAddresses((prev) =>
        prev.map((a) => ({
          ...a,
          isDefault: a.id === id,
        }))
      );
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (!accessToken)
    return <div>Please login to manage addresses.</div>;
  if (loading) return <div>Loading addresses...</div>;
  if (error)
    return <div className="text-red-600">{error}</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">
          Saved Addresses
        </h2>
        <Button onClick={handleAddNew}>
          Add Address
        </Button>
      </div>

      {!addresses.length && (
        <div className="bg-white rounded-xl border p-6 text-gray-500">
          No saved addresses.
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {addresses.map((addr) => (
          <div
            key={addr.id}
            className="bg-white rounded-xl border shadow-sm p-5 space-y-2"
          >
            <div className="flex justify-between">
              <p className="font-semibold text-sm">
                {addr.firstName} {addr.lastName}
              </p>

              {addr.isDefault && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                  Default
                </span>
              )}
            </div>

            <p className="text-sm text-gray-600">
              {addr.addressLine1}
            </p>
            {addr.addressLine2 && (
              <p className="text-sm text-gray-600">
                {addr.addressLine2}
              </p>
            )}
            <p className="text-sm text-gray-600">
              {addr.city}, {addr.state}{" "}
              {addr.postalCode}
            </p>
            <p className="text-sm text-gray-600">
              {addr.country}
            </p>

            <div className="flex gap-4 pt-2 text-xs">
              <button
                onClick={() => {
                  setEditingAddress(addr);
                  setForm({
                    ...addr,
                    phoneNumber:
                      addr.phoneNumber ?? "",
                  });
                  setFormErrors({});
                  setOpen(true);
                }}
                className="text-blue-600 hover:underline"
              >
                Edit
              </button>

              <button
                onClick={() =>
                  handleDeleteClick(addr.id)
                }
                className="text-red-600 hover:underline"
              >
                Delete
              </button>

              {!addr.isDefault && (
                <button
                  onClick={() =>
                    handleSetDefault(addr.id)
                  }
                  className="text-green-600 hover:underline"
                >
                  Set Default
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ADD / EDIT MODAL */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAddress
                ? "Edit Address"
                : "Add Address"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              "firstName",
              "lastName",
              "company",
              "addressLine1",
              "addressLine2",
              "city",
              "state",
              "postalCode",
              "country",
              "phoneNumber",
            ].map((field) => {
              const isRequired = [
                "firstName",
                "addressLine1",
                "city",
                "state",
                "postalCode",
                "phoneNumber",
              ].includes(field);

              return (
                <div
                  key={field}
                  className={
                    field === "company" ||
                    field === "addressLine1" ||
                    field === "addressLine2" ||
                    field === "phoneNumber"
                      ? "col-span-2"
                      : ""
                  }
                >
                  <label className="block mb-1 font-medium capitalize">
                    {field}
                    {isRequired && " *"}
                  </label>
                <input
  value={String(form[field as keyof typeof form] ?? "")}
  maxLength={field === "phoneNumber" ? 10 : undefined}
  onChange={(e) => {
    if (field === "phoneNumber") {
      const cleaned = e.target.value.replace(/\D/g, "").slice(0, 10);
      handleChange(field as keyof typeof form, cleaned);
    } else {
      handleChange(field as keyof typeof form, e.target.value);
    }
  }}
  className={`w-full border rounded px-3 py-2 ${
    formErrors[field as keyof typeof form]
      ? "border-red-500"
      : ""
  }`}
/>

                  {formErrors[
                    field as keyof typeof form
                  ] && (
                    <p className="text-red-600 text-xs mt-1">
                      {
                        formErrors[
                          field as keyof typeof form
                        ]
                      }
                    </p>
                  )}
                </div>
              );
            })}

            <div className="col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) =>
                  handleChange(
                    "isDefault",
                    e.target.checked
                  )
                }
              />
              <label className="text-sm">
                Set as default address
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingAddress
                ? "Update Address"
                : "Create Address"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DELETE MODAL */}
      <Dialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Delete Address
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm text-gray-600">
            Are you sure you want to delete
            this address?
          </p>

          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() =>
                setDeleteOpen(false)
              }
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={confirmDelete}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
