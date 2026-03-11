import prisma from "../utils/prismaClient";
import { callApi } from "../utils/callApi";
import { parseXeroDate } from "../utils/dateUtils";
import logger from "../utils/logger";

interface XeroContact {
  ContactID: string;
}
interface XeroContactsResponse {
  Contacts: XeroContact[];
}
interface XeroCell {
  Value: string;
  Attributes?: Array<{ Value?: string }>;
}
interface XeroSubRow {
  RowType: string;
  Cells?: XeroCell[];
}
interface XeroSection {
  Rows?: XeroSubRow[];
}
interface XeroReport {
  UpdatedDateUTC?: string;
  ReportTitles?: string[];
  Rows: Array<XeroSection & { Cells?: XeroCell[] }>;
}
interface XeroReportResponse {
  Reports: XeroReport[];
}

export async function syncAgedPayablesByContact(
  token: string,
  tenantId: string,
  xeroUserId: string,
  userId: number,
): Promise<void> {
  logger.info("==> Syncing Aged Payables By Contact...");

  const contactsData = await callApi<XeroContactsResponse>(
    tenantId,
    token,
    "Contacts",
  );
  const contacts = contactsData.Contacts ?? [];
  logger.info(`Processing aged payables for ${contacts.length} contacts...`);

  for (const contact of contacts) {
    const contactId = contact.ContactID;
    try {
      const data = await callApi<XeroReportResponse>(
        tenantId,
        token,
        `Reports/AgedPayablesByContact?ContactID=${contactId}`,
      );
      const report = data.Reports?.[0];
      if (!report) continue;

      const updatedDateUtc = parseXeroDate(report.UpdatedDateUTC);
      const rows = report.Rows;
      if (!rows || rows.length === 0) continue;

      const headers = (rows[0]?.Cells ?? []).map((c: XeroCell) => c.Value);
      const reportTitles = report.ReportTitles ?? ["", "", "", ""];

      for (const section of rows.slice(1)) {
        if (!section.Rows) continue;
        for (const subRow of section.Rows) {
          if (subRow.RowType !== "Row") continue;
          const cells = subRow.Cells ?? [];
          const rowData = cells.map((c: XeroCell) => c.Value ?? "");
          const invoiceId = cells[0]?.Attributes?.[0]?.Value ?? "";

          if (rowData.length < 8) continue;

          try {
            const existing = await prisma.agedPayableByContact.findFirst({
              where: {
                dueDate: rowData[2] || null,
                userId,
                name: reportTitles[1] ?? null,
                contactId,
                invoiceId: invoiceId || null,
              },
              select: { updatedDateUtc: true },
            });

            const payload = {
              userId,
              contactId,
              invoiceId: invoiceId || null,
              date: rowData[0] || null,
              reference: rowData[1] || null,
              dueDate: rowData[2] || null,
              total: rowData[4] || null,
              paid: rowData[5] || null,
              credited: rowData[6] || null,
              due: rowData[7] || null,
              type: reportTitles[0] || null,
              name: reportTitles[1] || null,
              reportTitleDate: reportTitles[2] || null,
              description: reportTitles[3] || null,
              updatedDateUtc,
            };

            if (!existing) {
              await prisma.agedPayableByContact.create({ data: payload });
              logger.info(
                `AgedPayable inserted for contact ${contactId}, invoice ${invoiceId}`,
              );
            } else if (
              updatedDateUtc &&
              existing.updatedDateUtc?.toISOString() !==
                updatedDateUtc.toISOString()
            ) {
              await prisma.agedPayableByContact.updateMany({
                where: {
                  dueDate: rowData[2] || null,
                  userId,
                  contactId,
                  invoiceId: invoiceId || null,
                },
                data: {
                  total: rowData[4],
                  paid: rowData[5],
                  credited: rowData[6],
                  due: rowData[7],
                  updatedDateUtc,
                },
              });
              logger.info(`AgedPayable updated for contact ${contactId}`);
            }
          } catch (err) {
            logger.error(`AgedPayable DB error: ${(err as Error).message}`);
          }
        }
      }
    } catch (err) {
      logger.error(
        `AgedPayables fetch error for ${contactId}: ${(err as Error).message}`,
      );
    }
  }
  logger.info("Aged Payables By Contact sync complete.");
}
