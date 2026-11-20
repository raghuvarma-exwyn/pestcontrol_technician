export const parseUsageQty = (qty: string | number | undefined) => {
  if (typeof qty === "number" && Number.isFinite(qty)) return qty;
  const parsed = parseFloat(String(qty ?? "").trim().replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
};

const asId = (value: unknown) => {
  if (value == null || value === "") return "";
  return String(value);
};

const asName = (value: unknown) => String(value ?? "").trim().toLowerCase();

const pushUsedRow = (rows: any[], row: any) => {
  if (!row || typeof row !== "object") return;
  if (Array.isArray(row.materials_used)) {
    row.materials_used.forEach((nested: any) => pushUsedRow(rows, nested));
    return;
  }
  // Usage rows identify a chemical by item_id / item_name, not by record id.
  if (row.item_id != null && row.item_id !== "") {
    rows.push(row);
    return;
  }
  if (row.item_name) {
    rows.push(row);
  }
};

export const collectMaterialsUsed = (executionDetails: any): any[] => {
  const rows: any[] = [];
  if (!executionDetails || executionDetails.error) return rows;

  const details = Array.isArray(executionDetails)
    ? executionDetails[0]
    : executionDetails;

  if (Array.isArray(details?.materials_used)) {
    details.materials_used.forEach((row: any) => pushUsedRow(rows, row));
  }

  if (Array.isArray(details?.pests_found)) {
    details.pests_found.forEach((pest: any) => {
      const nested =
        pest.materials_used || pest.chemicals_used || pest.usage || [];
      if (Array.isArray(nested)) {
        nested.forEach((row: any) => pushUsedRow(rows, row));
      }
    });
  }

  return rows;
};

export const buildUsedQtyIndexes = (executionDetails: any) => {
  const byItemId = new Map<string, number>();
  const byName = new Map<string, number>();

  collectMaterialsUsed(executionDetails).forEach((row) => {
    const qty = parseUsageQty(row.quantity);
    const itemId = asId(row.item_id);
    if (itemId) {
      byItemId.set(itemId, (byItemId.get(itemId) || 0) + qty);
      return;
    }
    const name = asName(row.item_name);
    if (name) {
      byName.set(name, (byName.get(name) || 0) + qty);
    }
  });

  return { byItemId, byName };
};

export const getUsedQuantityForItem = (
  indexes: ReturnType<typeof buildUsedQtyIndexes>,
  item: { id?: string | number; item_id?: string | number; item_name?: string }
) => {
  const itemId = asId(item.item_id);
  if (itemId && indexes.byItemId.has(itemId)) {
    return indexes.byItemId.get(itemId) || 0;
  }
  const name = asName(item.item_name);
  if (name && indexes.byName.has(name)) {
    return indexes.byName.get(name) || 0;
  }
  return 0;
};

export const sumUsedQuantityForItem = (
  executionDetails: any,
  item: { id?: string | number; item_id?: string | number; item_name?: string }
) => getUsedQuantityForItem(buildUsedQtyIndexes(executionDetails), item);

export const materialUsageKey = (item: {
  id?: string | number;
  item_id?: string | number;
  item_name?: string;
  treatment_type?: string;
  packaging_uom?: string;
  unit_id?: string | number;
}) => {
  if (item.item_id != null && item.item_id !== "") {
    return `item_${item.item_id}`;
  }
  if (item.id != null && item.id !== "") {
    return `id_${item.id}`;
  }
  return `name_${item.item_name ?? ""}_${item.treatment_type ?? ""}_${
    item.unit_id ?? item.packaging_uom ?? ""
  }`;
};
