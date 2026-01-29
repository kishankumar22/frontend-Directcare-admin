import OrderCard from "../orders/OrderCard";

export default function OrdersTab({ orders }: any) {
  if (!orders.length) {
    return (
      <div className="bg-white rounded-xl border p-6 text-gray-500">
        No orders found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order: any) => (
        <OrderCard key={order.id} order={order} />
      ))}
    </div>
  );
}
