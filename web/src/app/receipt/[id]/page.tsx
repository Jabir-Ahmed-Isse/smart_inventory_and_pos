import { notFound } from "next/navigation";
import { getActiveOrg, getOrgBrand } from "@/lib/org";
import { getSalesOrderDetail, money } from "@/lib/data";
import { PrintButton } from "@/components/payroll/PrintButton";

export const metadata = { title: "Receipt — Inventory Pro" };

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const org = await getActiveOrg();
  if (!org) notFound();
  const [order, brand] = await Promise.all([getSalesOrderDetail(org.orgId, id), getOrgBrand(org.orgId)]);
  if (!order) notFound();
  const currency = org.currency;

  return (
    <div className="min-h-screen bg-surface-container-low p-md flex flex-col items-center">
      <div className="w-full max-w-[360px] flex justify-between items-center mb-md print:hidden">
        <a href="/pos" className="text-primary font-label-md text-label-md hover:underline">← Back to POS</a>
        <PrintButton />
      </div>

      {/* Receipt */}
      <div className="w-full max-w-[360px] bg-white text-black rounded-lg shadow-sm p-6 font-mono text-[13px] leading-relaxed print:shadow-none print:rounded-none">
        <div className="text-center mb-3">
          {brand.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.logoUrl} alt="" className="h-12 mx-auto mb-2 object-contain" />
          )}
          <h1 className="text-[17px] font-bold uppercase tracking-wide">{org.orgName}</h1>
          {brand.tagline && <p className="text-[11px]">{brand.tagline}</p>}
        </div>

        <div className="border-t border-dashed border-black/40 pt-2 mb-2 text-[12px]">
          <div className="flex justify-between"><span>Receipt</span><span className="font-bold">{order.orderNumber}</span></div>
          <div className="flex justify-between"><span>Date</span><span>{order.date} {order.time}</span></div>
          <div className="flex justify-between"><span>Customer</span><span>{order.customer?.name ?? "Walk-in"}</span></div>
          <div className="flex justify-between"><span>Status</span><span className="uppercase">{order.paid ? "PAID" : order.isDue ? "DUE" : order.status}</span></div>
        </div>

        <table className="w-full border-t border-dashed border-black/40 pt-1 text-[12px]">
          <thead>
            <tr className="text-left border-b border-dashed border-black/40">
              <th className="py-1">Item</th>
              <th className="py-1 text-center">Qty</th>
              <th className="py-1 text-right">Price</th>
              <th className="py-1 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((it, i) => (
              <tr key={i} className="align-top">
                <td className="py-0.5 pr-1">{it.name}</td>
                <td className="py-0.5 text-center">{it.quantity}</td>
                <td className="py-0.5 text-right">{money(it.unitPrice, currency)}</td>
                <td className="py-0.5 text-right">{money(it.lineTotal, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="border-t border-dashed border-black/40 mt-2 pt-2 text-[12px] space-y-0.5">
          <div className="flex justify-between"><span>Subtotal</span><span>{money(order.subtotal, currency)}</span></div>
          {order.discount > 0 && <div className="flex justify-between"><span>Discount</span><span>−{money(order.discount, currency)}</span></div>}
          <div className="flex justify-between"><span>Tax</span><span>{money(order.tax, currency)}</span></div>
          <div className="flex justify-between font-bold text-[15px] border-t border-black/40 mt-1 pt-1"><span>TOTAL</span><span>{money(order.total, currency)}</span></div>
          {order.paidAmount > 0 && <div className="flex justify-between"><span>Paid</span><span>{money(order.paidAmount, currency)}</span></div>}
          {order.dueAmount > 0 && <div className="flex justify-between font-bold"><span>Balance due</span><span>{money(order.dueAmount, currency)}</span></div>}
        </div>

        <p className="text-center text-[11px] mt-4 pt-2 border-t border-dashed border-black/40">Thank you for your business!</p>
      </div>
    </div>
  );
}
