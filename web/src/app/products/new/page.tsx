import { getActiveOrg } from "@/lib/org";
import { getCategoryOptions, getBrandOptions, getWarehouseOptions } from "@/lib/data";
import { createProduct } from "@/lib/products/actions";
import { ProductForm } from "../ProductForm";

export const metadata = { title: "Add New Product — Inventory Pro" };

export default async function AddProductPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const org = await getActiveOrg();
  const [categories, brands, warehouses] = org
    ? await Promise.all([
        getCategoryOptions(org.orgId),
        getBrandOptions(org.orgId),
        getWarehouseOptions(org.orgId),
      ])
    : [[], [], []];

  return (
    <ProductForm
      action={createProduct}
      title="Add New Product"
      breadcrumb="Inventory > Products > New"
      submitLabel="Save Product"
      error={error}
      categories={categories}
      brands={brands}
      warehouses={warehouses}
    />
  );
}
