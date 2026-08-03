import { notFound } from "next/navigation";
import { getActiveOrg } from "@/lib/org";
import {
  getProductById,
  getCategoryOptions,
  getBrandOptions,
  getWarehouseOptions,
} from "@/lib/data";
import { updateProduct, deleteProduct } from "@/lib/products/actions";
import { ProductForm } from "../../ProductForm";
import { DeleteProductButton } from "../../DeleteProductButton";

export const metadata = { title: "Edit Product — Inventory Pro" };

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const org = await getActiveOrg();
  if (!org) notFound();

  const [product, categories, brands, warehouses] = await Promise.all([
    getProductById(org.orgId, id),
    getCategoryOptions(org.orgId),
    getBrandOptions(org.orgId),
    getWarehouseOptions(org.orgId),
  ]);

  if (!product) notFound();

  return (
    <ProductForm
      action={updateProduct.bind(null, id)}
      title="Edit Product"
      breadcrumb={`Inventory > Products > ${product.sku}`}
      submitLabel="Save Changes"
      error={error}
      categories={categories}
      brands={brands}
      warehouses={warehouses}
      initial={product}
      headerExtra={<DeleteProductButton action={deleteProduct.bind(null, id)} />}
    />
  );
}
