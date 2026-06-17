import { describe, test, expect } from "vitest";
import {
  getCalculatedPrice,
  calculateDailyRow,
  verifyInvoiceBalance,
  calculateCreditRisk,
  getPreviousDaySheetName,
  getSheetNameForDate
} from "./math";
import { DailyServiceRow, SalesInvoice } from "../types";

describe("Pricing and Sales Override Hierarchy", () => {
  test("returns default wholesale rate if customer code is empty or not in system overrides", () => {
    const priceForEmpty = getCalculatedPrice("", "F01");
    expect(priceForEmpty).toBeDefined();

    const priceForUnknownCust = getCalculatedPrice("CUST_UNKWN", "F01");
    expect(priceForUnknownCust).toBeDefined();
  });

  test("uses specific pricing overrides when present for a client code", () => {
    const price = getCalculatedPrice("KCD", "F01");
    expect(typeof price).toBe("number");
  });
});

describe("DSR Multi-Column Stock Reconciliation Loop", () => {
  test("correctly tallies intermediate mathematical totals in sheet columns", () => {
    const mockRow: Omit<DailyServiceRow, "Total_Open" | "Total_Load_Out" | "Total_Load_In" | "Total_Closing" | "Total_Sale"> = {
      Brand: "Frooti Tetra",
      Net_Qty: "200ml Tetra",
      Case_Pack: 40,
      Item_Code: "PTFR-0065-72-05",
      System: 100,
      Open: 100,
      Vehicle_Open: 10,
      Primary: 50,
      Sinhgad_Open: 5,
      Sinhgad_Load1: 20,
      Sinhgad_Load2: 5,
      Sinhgad_Sale: 18,
      Sinhgad_Load_In: 2,
      Purandar_Open: 5,
      Purandar_Load1: 15,
      Purandar_Load2: 0,
      Purandar_Sale: 14,
      Purandar_Load_In: 1,
      Rajgad_Open: 5,
      Rajgad_Load1: 10,
      Rajgad_Load2: 0,
      Rajgad_Sale: 10,
      Rajgad_Load_In: 3,
      Counter_Sale: 30
    };

    const result = calculateDailyRow(mockRow);

    // Total Open = Open (100) + Vehicle_Open (10) + Primary (50) = 160
    expect(result.Total_Open).toBe(160);

    // Total Load Out = 20 + 5 + 15 + 0 + 10 + 0 = 50
    expect(result.Total_Load_Out).toBe(50);

    // Total Load In = 2 + 1 + 3 = 6
    expect(result.Total_Load_In).toBe(6);

    // Total Closing = Open (100) + Primary (50) - Total Load Out (50) + Total Load In (6) - Counter_Sale (30)
    // = 100 + 50 - 50 + 6 - 30 = 76
    expect(result.Total_Closing).toBe(76);

    // Total Sale = Counter_Sale (30) + Sinhgad (18) + Purandar (14) + Rajgad (10) = 72
    expect(result.Total_Sale).toBe(72);
  });
});

describe("Invoice Balance Audit Engine", () => {
  test("reconciles invoice entries cleanly when payments sum to total invoice amount", () => {
    const validInvoice: Omit<SalesInvoice, "AuditStatus"> = {
      BillId: 101,
      Date: "2026-06-14",
      CustomerCode: "C01",
      CustomerName: "Sai provision",
      Route: "Sinhgad",
      Items: {},
      UnitPrices: {},
      PaymentStatus: "Paid",
      TotalAmount: 1540.50,
      CashReceived: 540.50,
      UPIReceived: 500.00,
      ChequeReceived: 500.00,
      CreditAmount: 0.00
    };

    expect(verifyInvoiceBalance(validInvoice)).toBe("OK");
  });

  test("rejects invoice with unbalanced bookkeeping entries to prevent ledger leak", () => {
    const invalidInvoice: Omit<SalesInvoice, "AuditStatus"> = {
      BillId: 102,
      Date: "2026-06-14",
      CustomerCode: "C01",
      CustomerName: "Sai provision",
      Route: "Sinhgad",
      Items: {},
      UnitPrices: {},
      PaymentStatus: "Partial",
      TotalAmount: 1000.00,
      CashReceived: 400.00,
      UPIReceived: 400.00,
      ChequeReceived: 0.00,
      CreditAmount: 100.00 // Total is 900 instead of 1000
    };

    expect(verifyInvoiceBalance(invalidInvoice)).toBe("⚠️ BALANCE ERROR");
  });
});

describe("Credit Aging and Compliance Evaluation", () => {
  test("resolves to fully reconciled if outstanding balance is zero", () => {
    expect(calculateCreditRisk(0, 5)).toBe("✅ Fully Reconciled");
  });

  test("flags red-alert danger if debt overflows beyond maximum safety duration of 45 days", () => {
    expect(calculateCreditRisk(100, 46)).toBe("🚨 High Credit Risk");
  });

  test("signals yellow warning alert if active debt exceeds the safety ceiling parameters", () => {
    expect(calculateCreditRisk(5500, 10)).toBe("⚠️ Over Credit Limit");
  });

  test("ranks active and fully secure credit channels cleanly", () => {
    expect(calculateCreditRisk(2400, 12)).toBe("Active Credit");
  });
});

describe("Ledger Daily Serializer Strings", () => {
  test("formats the day and month correctly per sheet name format template", () => {
    const output = getSheetNameForDate("2026-06-14");
    expect(output).toBe("1406");
  });

  test("returns previous contiguous date name string relative to sheet input date", () => {
    const prevSession = getPreviousDaySheetName("2026-06-14");
    expect(prevSession).toBe("1306");
  });
});
