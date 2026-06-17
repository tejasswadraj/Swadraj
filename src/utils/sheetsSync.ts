/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DailyServiceSheet, SalesInvoice, CollectionHistory, RatesOverride } from "../types";

// Base Google Sheets API v4 URL
const GOOGLE_API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

/**
 * Ensures required sheets exist on the spreadsheet or creates them.
 */
async function ensureWorksheetsExist(spreadsheetId: string, accessToken: string, requiredSheetTitles: string[]): Promise<void> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  // 1. Fetch current sheets
  const url = `${GOOGLE_API_BASE}/${spreadsheetId}?fields=sheets.properties.title`;
  const response = await fetch(url, { headers });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error("Access Forbidden. Ensure the authenticated Google Account has access permissions to edit this Spreadsheet.");
    } else if (response.status === 404) {
      throw new Error("Spreadsheet not found. Please double-check that the Spreadsheet ID is correct.");
    } else {
      const errorText = await response.text();
      throw new Error(`Failed to inspect spreadsheet: ${response.statusText}. details: ${errorText}`);
    }
  }

  const data = await response.json();
  const existingTitles = (data.sheets || []).map((s: any) => s.properties.title);

  // 2. Determine which sheets are missing
  const missingTitles = requiredSheetTitles.filter(title => !existingTitles.includes(title));

  if (missingTitles.length > 0) {
    // 3. Create missing sheets
    const createUrl = `${GOOGLE_API_BASE}/${spreadsheetId}:batchUpdate`;
    const requests = missingTitles.map(title => ({
      addSheet: {
        properties: {
          title,
          gridProperties: {
            frozenRowCount: 1, // Freeze the header row for elegant look
          }
        }
      }
    }));

    const createResponse = await fetch(createUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ requests }),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`Failed to create worksheets: ${createResponse.statusText}. details: ${errorText}`);
    }
  }
}

/**
 * Saves values into a Google Worksheet
 */
async function uploadSheetData(spreadsheetId: string, accessToken: string, range: string, values: any[][]): Promise<void> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  // Always update from A1 onwards in the sheet
  const url = `${GOOGLE_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;

  // First we clear the sheet's old values to avoid trailing leftovers
  const clearUrl = `${GOOGLE_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}:clear`;
  await fetch(clearUrl, {
    method: "POST",
    headers,
  });

  // Now write fresh values
  const writeResponse = await fetch(url, {
    method: "PUT",
    headers,
    body: JSON.stringify({ values }),
  });

  if (!writeResponse.ok) {
    const errorText = await writeResponse.text();
    throw new Error(`Failed to write sheet data at "${range}": ${writeResponse.statusText}. details: ${errorText}`);
  }
}

/**
 * Sync all active ERP data with Google Sheets via server-side proxy
 */
export async function syncERPToGoogleSheets(
  spreadsheetId: string,
  accessToken: any, // Ignored in proxied version as server handles auth
  sheets: DailyServiceSheet[],
  invoices: SalesInvoice[],
  collections: CollectionHistory[],
  rateExceptions: RatesOverride[],
  onProgress?: (log: string) => void
): Promise<void> {

  const logMessage = (msg: string) => {
    if (onProgress) onProgress(msg);
    console.log(`[SyncEngine] ${msg}`);
  };

  logMessage("🔄 Initiating secure server-side synchronization...");

  if (!spreadsheetId.trim()) {
    throw new Error("No Google Spreadsheet ID supplied.");
  }

  // Prepare data payload
  const data: Record<string, any[][]> = {};

  // 1. DSR
  const dsrHeaders = [
    "Date", "Sheet_Name", "Brand", "Net_Qty", "Case_Pack", "Item_Code",
    "Open_Godown", "Open_Vehicle", "Primary_Dispatch", "Total_Open", 
    "Total_Load_Out", "Total_Load_In", "Closing_Stock", "Counter_Sale", "Total_Sale",
    "Sinhgad_Open", "Sinhgad_Load1", "Sinhgad_Load2", "Sinhgad_Sale", "Sinhgad_Load_In",
    "Purandar_Open", "Purandar_Load1", "Purandar_Load2", "Purandar_Sale", "Purandar_Load_In",
    "Rajgad_Open", "Rajgad_Load1", "Rajgad_Load2", "Rajgad_Sale", "Rajgad_Load_In"
  ];
  data["DSR"] = [dsrHeaders];
  sheets.forEach(sheet => {
    sheet.rows.forEach(row => {
      data["DSR"].push([
        sheet.date, sheet.sheetName, row.Brand, row.Net_Qty, row.Case_Pack, row.Item_Code,
        row.Open || 0, row.Vehicle_Open || 0, row.Primary || 0, row.Total_Open || 0,
        row.Total_Load_Out || 0, row.Total_Load_In || 0, row.Total_Closing || 0,
        row.Counter_Sale || 0, row.Total_Sale || 0, row.Sinhgad_Open || 0,
        row.Sinhgad_Load1 || 0, row.Sinhgad_Load2 || 0, row.Sinhgad_Sale || 0,
        row.Sinhgad_Load_In || 0, row.Purandar_Open || 0, row.Purandar_Load1 || 0,
        row.Purandar_Load2 || 0, row.Purandar_Sale || 0, row.Purandar_Load_In || 0,
        row.Rajgad_Open || 0, row.Rajgad_Load1 || 0, row.Rajgad_Load2 || 0,
        row.Rajgad_Sale || 0, row.Rajgad_Load_In || 0
      ]);
    });
  });

  // 2. SALES
  const salesHeaders = [
    "Bill_Id", "Date", "Customer_Code", "Customer_Name", "Route", "Total_Amount",
    "Cash_Received", "UPI_Received", "Cheque_Received", "Credit_Amount", "Payment_Status", "Audit_Status", "Items"
  ];
  data["SALES"] = [salesHeaders];
  invoices.forEach(inv => {
    data["SALES"].push([
      inv.BillId, inv.Date, inv.CustomerCode, inv.CustomerName, inv.Route, inv.TotalAmount,
      inv.CashReceived, inv.UPIReceived, inv.ChequeReceived, inv.CreditAmount, 
      inv.PaymentStatus, inv.AuditStatus || "Ready", JSON.stringify(inv.Items)
    ]);
  });

  // 3. RATES
  const ratesHeaders = ["Customer_Code", "Item_Code", "Special_Rate"];
  data["RATES"] = [ratesHeaders];
  rateExceptions.forEach(record => {
    Object.entries(record.PricingOverrides).forEach(([itemCode, specialPrice]) => {
      data["RATES"].push([record.CustomerCode, itemCode, specialPrice]);
    });
  });

  // 4. COLLECTIONS
  const collectionsHeaders = ["Collection_Id", "Date", "Bill_Id", "Customer_Code", "Customer_Name", "Amount_Collected", "Method", "Notes"];
  data["COLLECTIONS"] = [collectionsHeaders];
  collections.forEach(col => {
    data["COLLECTIONS"].push([col.Id, col.Date, col.BillId, col.CustomerCode, col.CustomerName, col.AmountCollected, col.Method, col.Notes || ""]);
  });

  logMessage("📤 Sending payload to server nodes...");

  const response = await fetch("/api/sheets/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ spreadsheetId, data })
  });

  if (!response.ok) {
    const errorBody = await response.json();
    throw new Error(errorBody.error || "Failed to sync with Google Sheets server-side.");
  }

  logMessage("🎉 Synchronization complete! Data pushed successfully.");
}
