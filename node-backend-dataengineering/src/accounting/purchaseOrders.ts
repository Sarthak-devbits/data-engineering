import prisma from "../utils/prismaClient";
import { callApi } from "../utils/callApi";
import { parseXeroDate } from "../utils/dateUtils";
import { syncAttachments } from "./attachments";
import logger from "../utils/logger";

interface XeroPurchaseOrder {
  PurchaseOrderID: string;
  Contact?: { Name?: string };
  PurchaseOrderNumber?: string;
  Reference?: string;
  Status?: string;
  Date?: string;
  DeliveryDate?: string;
  ExpectedArrivalDate?: string;
  DeliveryAddress?: string;
  DeliveryInstructions?: string;
  Telephone?: string;
  LineItems?: unknown[];
  SubTotal?: number;
  TotalTax?: number;
  Total?: number;
  CurrencyCode?: string;
  HasAttachments?: boolean;
  UpdatedDateUTC?: string;
}
interface XeroPurchaseOrdersResponse {
  PurchaseOrders: XeroPurchaseOrder[];
}

export async function syncPurchaseOrders(
  token: string,
  tenantId: string,
  xeroUserId: string,
  userId: number,
): Promise<void> {
  logger.info("==> Syncing Purchase Orders...");
  const data = await callApi<XeroPurchaseOrdersResponse>(
    tenantId,
    token,
    "PurchaseOrders",
  );
  const orders = data.PurchaseOrders ?? [];

  for (const po of orders) {
    const updatedDateUtc = parseXeroDate(po.UpdatedDateUTC);

    try {
      const existing = await prisma.purchaseOrder.findUnique({
        where: {
          purchaseOrderId_userId: {
            purchaseOrderId: po.PurchaseOrderID,
            userId,
          },
        },
        select: { updatedDateUtc: true },
      });

      const payload = {
        userId,
        xeroUserId,
        purchaseOrderNumber: po.PurchaseOrderNumber,
        contactName: po.Contact?.Name,
        reference: po.Reference,
        status: po.Status,
        date: parseXeroDate(po.Date),
        deliveryDate: parseXeroDate(po.DeliveryDate),
        expectedArrivalDate: parseXeroDate(po.ExpectedArrivalDate),
        deliveryAddresses: po.DeliveryAddress,
        deliveryInstructions: po.DeliveryInstructions,
        telephone: po.Telephone,
        lineItems: po.LineItems
          ? JSON.parse(JSON.stringify(po.LineItems))
          : undefined,
        subTotal: po.SubTotal ?? 0,
        totalTax: po.TotalTax ?? 0,
        total: po.Total ?? 0,
        currencyCode: po.CurrencyCode,
        updatedDateUtc,
      };

      if (!existing) {
        await prisma.purchaseOrder.create({
          data: { purchaseOrderId: po.PurchaseOrderID, ...payload },
        });
        logger.info(`PurchaseOrder inserted: ${po.PurchaseOrderID}`);
      } else if (
        updatedDateUtc &&
        existing.updatedDateUtc?.toISOString() !== updatedDateUtc.toISOString()
      ) {
        await prisma.purchaseOrder.update({
          where: {
            purchaseOrderId_userId: {
              purchaseOrderId: po.PurchaseOrderID,
              userId,
            },
          },
          data: payload,
        });
        logger.info(`PurchaseOrder updated: ${po.PurchaseOrderID}`);
      } else {
        logger.info(`PurchaseOrder unchanged: ${po.PurchaseOrderID}`);
      }

      if (po.HasAttachments) {
        await syncAttachments(
          token,
          tenantId,
          xeroUserId,
          "PurchaseOrders",
          po.PurchaseOrderID,
        );
      }
    } catch (err) {
      logger.error(
        `PurchaseOrders error for ${po.PurchaseOrderID}: ${(err as Error).message}`,
      );
    }
  }
  logger.info(`Purchase Orders sync complete. Total: ${orders.length}`);
}
