import { Icon } from "@/components/Icon";
import { AddDepartmentDialog, AddPositionDialog } from "@/components/hr/HrDialogs";
import { getActiveOrg } from "@/lib/org";
import { loadDepartments, loadPositions } from "@/lib/hr/data";

export const metadata = { title: "Departments — Inventory Pro" };

export default async function DepartmentsPage() {
  const org = await getActiveOrg();
  if (!org) return <div className="p-xl text-center text-on-surface-variant">Sign in.</div>;

  const [departments, positions] = await Promise.all([loadDepartments(org.orgId), loadPositions(org.orgId)]);
  const deptOpts = departments.map((d) => ({ id: d.id, label: d.name }));

  return (
    <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-md mb-lg">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface">Departments &amp; Positions</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Organize your workforce structure.</p>
        </div>
        <div className="flex gap-sm">
          <AddPositionDialog departments={deptOpts} />
          <AddDepartmentDialog />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        <section>
          <h2 className="font-headline-lg text-headline-lg text-on-surface mb-md flex items-center gap-2">
            <Icon name="corporate_fare" size={20} className="text-on-surface-variant" /> Departments
          </h2>
          {departments.length === 0 ? (
            <div className="bg-surface border border-outline-variant rounded-xl p-lg text-center shadow-sm font-body-sm text-body-sm text-on-surface-variant">No departments yet.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
              {departments.map((d) => (
                <div key={d.id} className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-body-md text-body-md text-on-surface font-medium">{d.name}</p>
                      {d.code && <p className="font-label-md text-label-md text-on-surface-variant">{d.code}</p>}
                    </div>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary-container/20 text-primary font-label-md text-label-md">
                      <Icon name="groups" size={14} /> {d.headcount}
                    </span>
                  </div>
                  {d.description && <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">{d.description}</p>}
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="font-headline-lg text-headline-lg text-on-surface mb-md flex items-center gap-2">
            <Icon name="work" size={20} className="text-on-surface-variant" /> Positions
          </h2>
          {positions.length === 0 ? (
            <div className="bg-surface border border-outline-variant rounded-xl p-lg text-center shadow-sm font-body-sm text-body-sm text-on-surface-variant">No positions yet.</div>
          ) : (
            <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden divide-y divide-outline-variant/60">
              {positions.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-md py-3">
                  <span className="font-body-sm text-body-sm text-on-surface">{p.title}</span>
                  <span className="font-label-md text-label-md text-on-surface-variant">{p.departmentName ?? "—"}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
