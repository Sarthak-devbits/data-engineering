import prisma from "../utils/prismaClient";
import { callApi } from "../utils/callApi";
import { parseXeroDate } from "../utils/dateUtils";
import logger from "../utils/logger";

interface XeroItem {
  ItemID: string;
  Code?: string;
  Name?: string;
  Description?: string;
  InventoryAssetAccountCode?: string;
  PurchaseDetails?: { UnitPrice?: number; [key: string]: unknown };
  TotalCostPool?: number;
  QuantityOnHand?: number;
  IsTrackedAsInventory?: boolean;
  UpdatedDateUTC?: string;
}
interface XeroItemsResponse {
  Items: XeroItem[];
}

export async function syncItems(
  token: string,
  tenantId: string,
  xeroUserId: string,
  userId: number,
): Promise<void> {
  logger.info("==> Syncing Items...");
  const data = await callApi<XeroItemsResponse>(tenantId, token, "Items");
  const items = data.Items ?? [];

  for (const item of items) {
    const updatedDateUtc = parseXeroDate(item.UpdatedDateUTC);

    try {
      const existing = await prisma.item.findUnique({
        where: { itemId_userId: { itemId: item.ItemID, userId } },
        select: { updatedDateUtc: true },
      });

      const payload = {
        userId,
        xeroUserId,
        code: item.Code,
        name: item.Name,
        description: item.Description,
        inventoryAssetAccountCode: item.InventoryAssetAccountCode,
        purchaseDetails: item.PurchaseDetails
          ? JSON.parse(JSON.stringify(item.PurchaseDetails))
          : undefined,
        unitPrice: item.PurchaseDetails?.UnitPrice ?? null,
        totalCostPool: item.TotalCostPool ?? null,
        quantityOnHand: item.QuantityOnHand ?? null,
        isTrackedAsInventory: item.IsTrackedAsInventory ?? false,
        updatedDateUtc,
      };

      if (!existing) {
        await prisma.item.create({ data: { itemId: item.ItemID, ...payload } });
        logger.info(`Item inserted: ${item.ItemID}`);
      } else if (
        updatedDateUtc &&
        existing.updatedDateUtc?.toISOString() !== updatedDateUtc.toISOString()
      ) {
        await prisma.item.update({
          where: { itemId_userId: { itemId: item.ItemID, userId } },
          data: payload,
        });
        logger.info(`Item updated: ${item.ItemID}`);
      } else {
        logger.info(`Item unchanged: ${item.ItemID}`);
      }
    } catch (err) {
      logger.error(`Items error for ${item.ItemID}: ${(err as Error).message}`);
    }
  }
  logger.info(`Items sync complete. Total: ${items.length}`);
}
