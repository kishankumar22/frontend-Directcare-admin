export default function AddressesTab({ addresses }: any) {
  if (!addresses.length) {
    return (
      <div className="bg-white rounded-xl border p-6 text-gray-500">
        No saved addresses.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {addresses.map((addr: any) => (
        <div key={addr.id} className="bg-white rounded-xl border shadow-sm p-5">
          <p className="font-semibold">{addr.firstName} {addr.lastName}</p>
          <p className="text-sm text-gray-600">{addr.addressLine1}</p>
          <p className="text-sm text-gray-600">
            {addr.city}, {addr.state} {addr.postalCode}
          </p>
          <p className="text-sm text-gray-600">{addr.country}</p>
        </div>
      ))}
    </div>
  );
}
