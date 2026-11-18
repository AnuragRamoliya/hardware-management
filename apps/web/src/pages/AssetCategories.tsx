import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { ListPageScaffold } from "@/components/common/ListPageScaffold";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useTableState } from "@/hooks/use-tableState";
import { useFormDrawer } from "@/hooks/useFormDrawer";
import {
  useAssetCategoriesList,
  useAssetCategory,
  useDeleteAssetCategory,
  type AssetCategoryRecord,
} from "@/hooks/queries/assetCategories";
import { getAssetCategoryColumns } from "@/components/asset-categories/AssetCategoryColumns";
import { assetCategoryFilters } from "@/components/asset-categories/AssetCategoryFilters";
import { AddEditAssetCategory } from "@/components/asset-categories/AddEditAssetCategory";
import useAuthStore from "@/zustand/user-store";
import usePermissionStore from "@/zustand/permission-store";
import { getUserRole } from "@/lib/roles";

export function AssetCategories() {
  const { tableState, setTableState } = useTableState(10);
  const { isOpen, editingItem, openCreate, openEdit, setIsOpen } =
    useFormDrawer<AssetCategoryRecord>();
  const [deletingItem, setDeletingItem] = useState<AssetCategoryRecord | null>(
    null,
  );

  const role = useAuthStore((state) => getUserRole(state.user));
  const permissions = usePermissionStore(
    (state) => state.modulePermissions.asset_category,
  );
  const canWrite = role === "admin" || permissions?.write_access === true;
  const canDelete = role === "admin" || permissions?.delete_access === true;

  const { data, isLoading, error, refetch } =
    useAssetCategoriesList(tableState);
  const deleteMutation = useDeleteAssetCategory();

  const activeCategoryId = editingItem?.id;
  const { data: fullCategory, isLoading: isFetchingDetail } = useAssetCategory(
    activeCategoryId ?? "",
    Boolean(activeCategoryId),
  );

  const columns = useMemo(
    () =>
      getAssetCategoryColumns({
        onEdit: openEdit,
        onDelete: setDeletingItem,
        canWrite,
        canDelete,
      }),
    [openEdit, canWrite, canDelete],
  );

  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;
    await deleteMutation.mutateAsync(deletingItem.id);
    setDeletingItem(null);
  };

  return (
    <>
      <ListPageScaffold
        title="Asset categories"
        description="Create categories to organize your organization's assets."
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Asset categories" },
        ]}
        action={
          canWrite ? (
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Add category
            </Button>
          ) : undefined
        }
        columns={columns}
        rows={(data?.rows as AssetCategoryRecord[]) ?? []}
        count={data?.count ?? 0}
        query={tableState}
        onQueryChange={setTableState}
        loading={isLoading}
        error={error instanceof Error ? error.message : undefined}
        onRetry={refetch}
        filterFields={assetCategoryFilters}
        emptyTitle="No asset categories found"
      />

      <AddEditAssetCategory
        open={isOpen}
        onOpenChange={setIsOpen}
        category={fullCategory || editingItem}
        loading={isFetchingDetail}
      />

      <ConfirmDialog
        open={Boolean(deletingItem)}
        onOpenChange={(open) => !open && setDeletingItem(null)}
        title="Delete asset category"
        description={`Are you sure you want to delete "${deletingItem?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
