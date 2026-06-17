/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product, DailyServiceRow, SalesInvoice, RatesOverride } from "../types";
import { PRODUCTS, RATES_OVERRIDES } from "../data/masterData";

/**
 * Hierarchical Fallback Price calculator (models the complex Sheets formula).
 * First checks for customer exceptions in RATES, falls back to the default master rate in RATES Row 4 (wholesale).
 */
export function getCalculatedPrice(customerCode: string, itemCode: string): number {
  const product = PRODUCTS.find(p => p.Item_Code === itemCode);
  const defaultWholesale = product?.Sale_Rate_Wholesale || 0;

  if (!customerCode) return 0;

  const exception = RATES_OVERRIDES.find(o => o.CustomerCode === customerCode);
  if (exception && exception.PricingOverrides[itemCode] !== undefined) {
    return exception.PricingOverrides[itemCode];
  }

  return defaultWholesale;
}

/**
 * Auto-calculates fields inside a single row of the Daily Service Sheet
 */
export function calculateDailyRow(
  row: Omit<DailyServiceRow, "Total_Open" | "Total_Load_Out" | "Total_Load_In" | "Total_Closing" | "Total_Sale">
): DailyServiceRow {
  const Total_Open = row.Open + row.Vehicle_Open + row.Primary;

  const Total_Load_Out =
    row.Sinhgad_Load1 +
    row.Sinhgad_Load2 +
    row.Purandar_Load1 +
    row.Purandar_Load2 +
    row.Rajgad_Load1 +
    row.Rajgad_Load2;

  const Total_Load_In = row.Sinhgad_Load_In + row.Purandar_Load_In + row.Rajgad_Load_In;

  // Total Closing: physical warehouse closing = Open + Primary - Total Load Out + Total Load In - Counter Sale
  const Total_Closing = row.Open + row.Primary - Total_Load_Out + Total_Load_In - row.Counter_Sale;

  // Total Sale = Counter Sale + Sinhgad Sale + Purandar Sale + Rajgad Sale
  const Total_Sale = row.Counter_Sale + row.Sinhgad_Sale + row.Purandar_Sale + row.Rajgad_Sale;

  return {
    ...row,
    Total_Open,
    Total_Load_Out,
    Total_Load_In,
    Total_Closing,
    Total_Sale,
  };
}

/**
 * Checks balance audit check for a sales ledger row
 */
export function verifyInvoiceBalance(invoice: Omit<SalesInvoice, "AuditStatus">): "OK" | "⚠️ BALANCE ERROR" {
  const sumReceivedAndOwed = invoice.CashReceived + invoice.UPIReceived + invoice.ChequeReceived + invoice.CreditAmount;
  // Account for typical floating point issues using round to 2 decimals
  return Math.abs(sumReceivedAndOwed - invoice.TotalAmount) < 0.01 ? "OK" : "⚠️ BALANCE ERROR";
}

/**
 * Calculates credit aging status according to aging equations
 */
export function calculateCreditRisk(
  stillDue: number,
  agingDays: number
): "✅ Fully Reconciled" | "🚨 High Credit Risk" | "⚠️ Over Credit Limit" | "Active Credit" {
  if (stillDue <= 0) {
    return "✅ Fully Reconciled";
  }
  if (agingDays > 45) {
    return "🚨 High Credit Risk";
  }
  if (stillDue > 5000) {
    return "⚠️ Over Credit Limit";
  }
  return "Active Credit";
}

/**
 * High-performing helper to determine previous date name (e.g. TEXT($A$2-1, "ddmm"))
 */
export function getPreviousDaySheetName(dateStr: string): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - 1);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}${month}`;
}

export function getSheetNameForDate(dateStr: string): string {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}${month}`;
}
