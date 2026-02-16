"use client";

import { useEffect, useState, useRef } from "react";
import { getAddresses } from "@/app/lib/api/address";
import { useAuth } from "@/context/AuthContext";
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

interface Props {
  onSelect: (address: Address | null) => void;
}

export default function SavedAddressesSection({ onSelect }: Props) {
  const { accessToken, isAuthenticated } = useAuth();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openModal, setOpenModal] = useState(false);

  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    const fetchAddresses = async () => {
      try {
        const data: Address[] = await getAddresses(accessToken);
        setAddresses(data);

        if (!hasInitialized.current) {
          const defaultAddress = data.find((a: Address) => a.isDefault);
          if (defaultAddress) {
            setSelectedId(defaultAddress.id);
            onSelect(defaultAddress);
          }
          hasInitialized.current = true;
        }
      } catch {
        console.error("Failed to load addresses");
      }
    };

    fetchAddresses();
  }, [accessToken, isAuthenticated]);

  if (!isAuthenticated || addresses.length === 0) return null;

  const visibleAddresses = addresses.slice(0, 2);

  const AddressCard = (addr: Address) => (
    <label
      key={addr.id}
      className={`relative border rounded-xl p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${
        selectedId === addr.id
          ? "border-[#445D41] bg-[#445D41]/5 ring-2 ring-[#445D41]/20"
          : "border-gray-200"
      }`}
    >
      {/* 🔥 Default badge top-right */}
      {addr.isDefault && (
        <span className="absolute top-3 right-3 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
          Default
        </span>
      )}

      <div className="flex items-start gap-3">
        <input
          type="radio"
          checked={selectedId === addr.id}
          onChange={() => {
            setSelectedId(addr.id);
            onSelect(addr);
            setOpenModal(false);
          }}
          className="mt-1"
        />

        <div className="text-sm space-y-1">
          <div className="font-semibold">
            {addr.firstName} {addr.lastName}
          </div>

          {addr.company && (
            <div className="text-gray-600">{addr.company}</div>
          )}

          <div className="text-gray-700">{addr.addressLine1}</div>

          {addr.addressLine2 && (
            <div className="text-gray-700">{addr.addressLine2}</div>
          )}

          <div className="text-gray-700">
            {addr.city}, {addr.state} {addr.postalCode}
          </div>

          <div className="text-gray-600">{addr.country}</div>
        </div>
      </div>
    </label>
  );

  return (
    <div className="bg-white p-6 rounded shadow space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Saved Addresses</h2>

        {/* 🔥 View All button if more than 2 */}
        {addresses.length > 2 && (
          <button
            onClick={() => setOpenModal(true)}
            className="text-sm text-[#445D41] bg-green-50 border border-green-200 px-2 py-1 font-medium"
          >
            View all Addresses
          </button>
        )}
      </div>

      {/* Show only 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleAddresses.map((addr) => AddressCard(addr))}
      </div>

      {/* Add new address */}
      <button
        onClick={() => {
          setSelectedId(null);
          onSelect(null);
        }}
        className="text-sm text-[#445D41] font-medium underline"
      >
        + Add new address
      </button>

      {/* 🔥 VIEW ALL MODAL */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select Address</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto">
            {addresses.map((addr) => AddressCard(addr))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
