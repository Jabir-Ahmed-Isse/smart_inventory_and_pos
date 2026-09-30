// The Sales section no longer uses a sub-nav — Overview, Point of Sale, Orders,
// Customers, Loyalty and Sales Returns are all top-level sidebar items.
export default function SalesLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col min-h-full">{children}</div>;
}
