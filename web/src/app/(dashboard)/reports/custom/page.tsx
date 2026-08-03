import { getActiveOrg } from "@/lib/org";
import { getProductsWithStock, getSalesOrders, getCustomers, getPurchaseOrders, money } from "@/lib/data";
import { loadFinance } from "@/lib/finance/data";
import { CustomReportBuilder, type Dataset } from "./CustomReportBuilder";

export const metadata = { title: "Custom Reports — Reports" };

export default async function CustomReportPage() {
  const org = await getActiveOrg();
  const currency = org?.currency ?? "USD";
  if (!org) return <div className="p-xl text-center text-on-surface-variant">Sign in to build custom reports.</div>;

  const [products, orders, customers, purchases, fin] = await Promise.all([
    getProductsWithStock(org.orgId),
    getSalesOrders(org.orgId, 500),
    getCustomers(org.orgId),
    getPurchaseOrders(org.orgId, 500),
    loadFinance(org.orgId),
  ]);
  const m = (n: number) => money(n, currency);

  const datasets: Record<string, Dataset> = {
    Sales: {
      label: "Sales Orders", icon: "point_of_sale",
      columns: [{ key: "order", label: "Order" }, { key: "customer", label: "Customer" }, { key: "payment", label: "Payment" }, { key: "status", label: "Status" }, { key: "date", label: "Date" }, { key: "total", label: "Total" }],
      rows: orders.map((o) => ({ order: o.orderNumber, customer: o.customerName, payment: o.paymentMethod ?? "—", status: o.paid ? "Paid" : "Due", date: o.date, total: m(o.total) })),
    },
    Products: {
      label: "Products", icon: "inventory_2",
      columns: [{ key: "name", label: "Name" }, { key: "sku", label: "SKU" }, { key: "category", label: "Category" }, { key: "brand", label: "Brand" }, { key: "qty", label: "On Hand" }, { key: "price", label: "Price" }, { key: "value", label: "Stock Value" }],
      rows: products.map((p) => ({ name: p.name, sku: p.sku, category: p.category, brand: p.brand, qty: p.qty, price: m(p.price), value: m(p.qty * p.price) })),
    },
    Customers: {
      label: "Customers", icon: "groups",
      columns: [{ key: "name", label: "Name" }, { key: "segment", label: "Segment" }, { key: "email", label: "Email" }, { key: "phone", label: "Phone" }, { key: "loyalty", label: "Loyalty" }, { key: "credit", label: "Credit Limit" }],
      rows: customers.map((c) => ({ name: c.name, segment: c.segment ?? "—", email: c.email ?? "—", phone: c.phone ?? "—", loyalty: c.loyaltyPoints, credit: m(c.creditLimit) })),
    },
    Purchases: {
      label: "Purchase Orders", icon: "shopping_cart",
      columns: [{ key: "po", label: "PO #" }, { key: "supplier", label: "Supplier" }, { key: "status", label: "Status" }, { key: "date", label: "Date" }, { key: "total", label: "Total" }],
      rows: purchases.map((p) => ({ po: p.poNumber, supplier: p.supplierName, status: p.status, date: p.date, total: m(p.total) })),
    },
    Transactions: {
      label: "Transactions", icon: "receipt_long",
      columns: [{ key: "date", label: "Date" }, { key: "type", label: "Type" }, { key: "category", label: "Category" }, { key: "description", label: "Description" }, { key: "amount", label: "Amount" }],
      rows: fin.transactions.map((t) => ({ date: new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), type: t.type, category: t.category ?? "—", description: t.description ?? "—", amount: m(t.amount) })),
    },
  };

  return (
    <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full">
      <div className="mb-lg">
        <h1 className="font-headline-xl text-headline-xl text-on-surface">Custom Reports</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Pick a dataset, choose your columns, filter, and export to CSV or PDF.</p>
      </div>
      <CustomReportBuilder datasets={datasets} />
    </main>
  );
}
