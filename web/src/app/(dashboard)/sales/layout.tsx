import { SalesNav } from "@/components/SalesNav";

export default function SalesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-full">
      <SalesNav />
      {children}
    </div>
  );
}
