import axios from "axios";
import prisma from "../utils/prismaClient";
import logger from "../utils/logger";
import dotenv from "dotenv";
dotenv.config();

const BASE_URL =
  process.env.XERO_BASE_URL || "https://api.xero.com/api.xro/2.0/";

interface XeroAttachment {
  AttachmentID: string;
  FileName?: string;
  Url?: string;
  MimeType?: string;
  ContentLength?: number;
}
interface XeroAttachmentsResponse {
  Attachments: XeroAttachment[];
}

export async function syncAttachments(
  token: string,
  tenantId: string,
  xeroUserId: string,
  entityType: string,
  entityXeroId: string,
  relatedDbId?: {
    invoiceId?: string;
    creditNoteId?: string;
    bankTransactionId?: string;
    purchaseOrderId?: string;
    receiptId?: string;
  },
): Promise<void> {
  try {
    const url = `${BASE_URL}${entityType}/${entityXeroId}/Attachments`;
    const response = await axios.get<XeroAttachmentsResponse>(url, {
      headers: {
        "xero-tenant-id": tenantId,
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      timeout: 10_000,
    });
    const attachments = response.data.Attachments ?? [];

    for (const att of attachments) {
      try {
        const existing = await prisma.attachment.findUnique({
          where: { attachmentId: att.AttachmentID },
          select: { attachmentId: true },
        });

        if (!existing) {
          await prisma.attachment.create({
            data: {
              attachmentId: att.AttachmentID,
              xeroUserId,
              fileName: att.FileName,
              url: att.Url,
              mimeType: att.MimeType,
              contentLength: att.ContentLength ?? 0,
              entityType,
              entityXeroId,
              invoiceId: relatedDbId?.invoiceId,
              creditNoteId: relatedDbId?.creditNoteId,
              bankTransactionId: relatedDbId?.bankTransactionId,
              purchaseOrderId: relatedDbId?.purchaseOrderId,
              receiptId: relatedDbId?.receiptId,
            },
          });
          logger.info(
            `Attachment inserted: ${att.AttachmentID} for ${entityType}/${entityXeroId}`,
          );
        } else {
          logger.info(`Attachment already exists: ${att.AttachmentID}`);
        }
      } catch (err) {
        logger.error(
          `Attachment error ${att.AttachmentID}: ${(err as Error).message}`,
        );
      }
    }
  } catch (err) {
    logger.error(
      `syncAttachments error for ${entityType}/${entityXeroId}: ${(err as Error).message}`,
    );
  }
}
