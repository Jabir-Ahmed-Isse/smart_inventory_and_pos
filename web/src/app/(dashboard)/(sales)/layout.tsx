import { SalesNav } from "@/components/SalesNav";

/**
 * Wraps the Sales-owned standalone pages (Orders, Customers, Loyalty) in the same
 * sticky sub-nav as /sales, so clicking a tab keeps you in the section instead of
 * dropping you onto a bare page. Route group — no effect on URLs.
 */
export default function SalesSectionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-full">
      <SalesNav />
      {children}
    </div>
  );
}
