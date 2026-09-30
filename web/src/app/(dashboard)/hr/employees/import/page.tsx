import Link from "next/link";
import { Icon } from "@/components/Icon";
import { requireRole } from "@/lib/rbac";
import { EmployeeImportClient } from "./EmployeeImportClient";

export const metadata = { title: "Import Employees — Inventory Pro" };

export default async function ImportEmployeesPage() {
  await requireRole(["owner", "admin", "manager", "accountant"]);

  return (
    <main className="flex-1 p-md md:p-lg lg:p-xl pb-32">
      <div className="max-w-[1000px] mx-auto space-y-lg">
        <div>
          <Link href="/hr/employees" className="inline-flex items-center gap-1 font-label-md text-label-md text-on-surface-variant hover:text-on-surface mb-sm transition-colors">
            <Icon name="arrow_back" size={16} /> Back to Employees
          </Link>
          <h2 className="font-headline-xl text-headline-xl font-bold text-on-surface">Import Employees</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs">
            Add your whole team at once. Paste a CSV or a Markdown table (e.g. straight from ChatGPT), or upload
            an Excel/CSV file. We&apos;ll auto-detect the columns, create any new departments and positions,
            and generate employee numbers.
          </p>
        </div>

        <EmployeeImportClient />
      </div>
    </main>
  );
}
