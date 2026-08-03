import { Icon } from "@/components/Icon";
import { CrudDialog, fieldCls, labelCls } from "@/components/CrudDialog";
import { DeleteButton } from "@/components/DeleteButton";
import { getActiveOrg } from "@/lib/org";
import { requireRole } from "@/lib/rbac";
import { getCategories, type CategoryRow } from "@/lib/data";
import { createCategory, deleteCategory } from "@/lib/config/actions";

export const metadata = { title: "Product Categories — Inventory Pro" };

export default async function CategoriesPage() {
  await requireRole(["owner", "admin", "manager"]);
  const org = await getActiveOrg();
  const categories = org ? await getCategories(org.orgId) : [];
  const totalProducts = categories.reduce((s, c) => s + c.productCount, 0);
  const parents = categories.filter((c) => !c.parentId);
  const featured = categories[0] ?? null;
  const featuredSubs = featured
    ? categories.filter((c) => c.parentId === featured.id).length
    : 0;

  return (
    <main className="p-md md:p-lg xl:p-xl">
      <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        {/* Header */}
        <div className="lg:col-span-12 flex flex-col md:flex-row justify-between items-start md:items-center mb-md gap-4">
          <div>
            <h2 className="font-headline-xl text-headline-xl-mobile md:text-headline-xl text-on-background">
              Product Categories
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
              Manage and organize your product hierarchy.
            </p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button className="flex-1 md:flex-none border border-outline-variant text-on-surface-variant hover:bg-surface-container-high hover:text-primary font-label-md text-label-md py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors">
              <Icon name="download" /> Export
            </button>
            <NewCategoryDialog parents={parents} />
          </div>
        </div>

        {/* Left: table */}
        <div className="lg:col-span-8 flex flex-col gap-md">
          <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-[0_2px_4px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:w-64">
              <Icon
                name="search"
                size={20}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
              />
              <input
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg pl-9 pr-4 py-1.5 text-body-sm font-body-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                placeholder="Search categories..."
                type="text"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-body-sm font-body-sm text-on-surface-variant">
                {categories.length} categories · {totalProducts} products
              </span>
            </div>
          </div>

          <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container-low/50">
                    <th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant">Category Name</th>
                    <th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant hidden sm:table-cell">Slug</th>
                    <th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant">Products</th>
                    <th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant">Status</th>
                    <th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="font-body-sm text-body-sm text-on-surface">
                  {categories.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 px-4 text-center text-on-surface-variant">
                        {org ? "No categories yet. Create your first one." : "Sign in to manage categories."}
                      </td>
                    </tr>
                  ) : (
                    categories.map((c) => (
                      <tr
                        key={c.id}
                        className="border-b border-outline-variant/50 hover:bg-surface-container-lowest transition-colors group"
                      >
                        <td className="py-3 px-4">
                          <div className={`flex items-center gap-3 ${c.parentId ? "pl-8" : ""}`}>
                            {!c.parentId && (
                              <div className="w-8 h-8 rounded bg-primary-container/20 text-primary flex items-center justify-center shrink-0">
                                <Icon name="category" size={18} />
                              </div>
                            )}
                            <div className={c.parentId ? "font-medium text-on-background" : "font-semibold text-on-background"}>
                              {c.name}
                              {c.parentName && (
                                <span className="text-on-surface-variant font-normal"> · in {c.parentName}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 hidden sm:table-cell text-on-surface-variant">{c.slug ?? "—"}</td>
                        <td className="py-3 px-4">{c.productCount.toLocaleString()}</td>
                        <td className="py-3 px-4">
                          <StatusPill status={c.status} />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <DeleteButton
                              id={c.id}
                              action={deleteCategory}
                              confirmLabel={`Delete category "${c.name}"? Products keep existing but lose this category.`}
                            />
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-outline-variant flex items-center justify-between text-on-surface-variant text-label-md font-label-md">
              <span>Showing {categories.length} of {categories.length} entries</span>
            </div>
          </div>
        </div>

        {/* Right: preview */}
        <div className="lg:col-span-4 flex flex-col gap-md">
          <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-[0_2px_4px_rgba(0,0,0,0.02)] sticky top-24">
            {featured ? (
              <>
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-primary-container/20 text-primary flex items-center justify-center">
                      <Icon name="category" size={24} />
                    </div>
                    <div>
                      <h3 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-background leading-tight">
                        {featured.name}
                      </h3>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        /{featured.slug ?? ""}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-surface-container-low rounded-lg p-3 border border-outline-variant/50">
                    <div className="text-label-md font-label-md text-on-surface-variant mb-1">
                      Total Products
                    </div>
                    <div className="font-headline-lg text-headline-lg-mobile text-on-background">
                      {featured.productCount.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-surface-container-low rounded-lg p-3 border border-outline-variant/50">
                    <div className="text-label-md font-label-md text-on-surface-variant mb-1">
                      Sub-categories
                    </div>
                    <div className="font-headline-lg text-headline-lg-mobile text-on-background">
                      {featuredSubs}
                    </div>
                  </div>
                </div>
                <div className="mb-2">
                  <h4 className="font-label-md text-label-md text-on-surface-variant mb-3 uppercase tracking-wider">
                    Category Hierarchy
                  </h4>
                  <ul className="flex flex-col gap-2">
                    {parents.slice(0, 6).map((p) => (
                      <li key={p.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-container-lowest transition-all">
                        <span className="font-body-sm text-body-sm text-on-background font-medium">{p.name}</span>
                        <span className="font-label-md text-label-md text-on-surface-variant">{p.productCount} items</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-on-surface-variant gap-2 py-10 text-center">
                <Icon name="category" size={40} className="text-outline-variant" />
                <p className="font-body-sm text-body-sm">Create a category to see its overview.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function NewCategoryDialog({ parents }: { parents: CategoryRow[] }) {
  return (
    <CrudDialog triggerLabel="New Category" title="New Category" submitLabel="Create Category" action={createCategory}>
      <div>
        <label className={labelCls}>Name *</label>
        <input name="name" required className={fieldCls} placeholder="Furniture" type="text" />
      </div>
      <div className="grid grid-cols-2 gap-md">
        <div>
          <label className={labelCls}>Slug</label>
          <input name="slug" className={fieldCls} placeholder="auto from name" type="text" />
        </div>
        <div>
          <label className={labelCls}>Status</label>
          <select name="status" className={`${fieldCls} appearance-none`} defaultValue="active">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>
      <div>
        <label className={labelCls}>Parent category</label>
        <select name="parent_id" className={`${fieldCls} appearance-none`} defaultValue="">
          <option value="">— None (top level) —</option>
          {parents.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
    </CrudDialog>
  );
}

function StatusPill({ status }: { status: "active" | "inactive" }) {
  if (status === "inactive") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-[11px] font-medium border border-outline-variant">
        <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant" />
        Inactive
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary-container/20 text-primary-fixed-dim text-[11px] font-medium border border-primary/20">
      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
      Active
    </span>
  );
}
