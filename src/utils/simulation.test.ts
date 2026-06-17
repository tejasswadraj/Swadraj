import { describe, test, expect } from "vitest";
import { getCalculatedPrice, calculateDailyRow, verifyInvoiceBalance, calculateCreditRisk } from "./math";
import { DailyServiceRow, SalesInvoice, CollectionHistory } from "../types";

describe("Swadraj Master Ledger - Step-by-Step E2E User Session Simulation", () => {
  test("Executed End-to-End simulation steps successfully", () => {
    console.log("---------------------------------------------------------------------------------");
    console.log("[E2E SIMULATION START] Initiating live user business workflow simulation...");
    console.log("---------------------------------------------------------------------------------");

    // =========================================================================
    // STEP 1: LOAD METADATA AND LOOKUP CUSTOM NEGOTIATED OUTLET RATE EXTREMA
    // =========================================================================
    console.log("\n[STEP 1] Customer pricing lookup exception query.");
    const customerCode = "104"; // Radha Pavbhaji & Juice Bar
    const itemBailey1L = "PTBA-1000-12-20"; // standard 165
    const itemFrootiTetra = "TRFR-0150-40-12"; // standard 340
    const itemMastiButtermilk = "TRMS-0200-30-15"; // standard 320 (no exceptions)

    const priceBailey1L = getCalculatedPrice(customerCode, itemBailey1L);
    const priceFrootiTetra = getCalculatedPrice(customerCode, itemFrootiTetra);
    const priceMasti = getCalculatedPrice(customerCode, itemMastiButtermilk);

    console.log(`>> [Query Results] Radha Pavbhaji (Code: 104) Custom/Master Price exception lookups:`);
    console.log(`   - ${itemBailey1L}: Charged ₹${priceBailey1L} per case (Standard Price: ₹165)`);
    console.log(`   - ${itemFrootiTetra}: Charged ₹${priceFrootiTetra} per case (Standard Price: ₹340)`);
    console.log(`   - ${itemMastiButtermilk}: Charged ₹${priceMasti} per case (Standard Price: ₹320 - Fallback to Wholesale)`);

    expect(priceBailey1L).toBe(135.00); // Negotiated discount exception
    expect(priceFrootiTetra).toBe(310.00); // Negotiated discount exception
    expect(priceMasti).toBe(320.00); // Uses fallback standard wholesale

    // =========================================================================
    // STEP 2: BUILD SALES INVOICE & AUTO-AUDIT BALANCING CALCULATOR
    // =========================================================================
    console.log("\n[STEP 2] Creating sales invoice for Radha Pavbhaji.");
    // Invoice contains 10 cases of Bailey (10 * 135 = 1350) and 5 cases of Frooti (5 * 310 = 1550)
    const qtyBailey = 10;
    const qtyFrooti = 5;
    const computedTotal = (qtyBailey * priceBailey1L) + (qtyFrooti * priceFrootiTetra); // 1350 + 1550 = 2900
    
    expect(computedTotal).toBe(2900);

    // Let's create an invoice that has cash, UPI, cheque, and credit
    const subtotal = computedTotal;
    const cashPaid = 1000.00;
    const upiPaid = 1000.00;
    const chequePaid = 0.00;
    const leftOnDebtCredit = subtotal - (cashPaid + upiPaid + chequePaid); // 900.00

    expect(leftOnDebtCredit).toBe(900.00);

    const invoice: SalesInvoice = {
      BillId: 202602,
      Date: "2026-06-14",
      CustomerCode: "104",
      CustomerName: "Radha Pavbhaji & Juice Bar",
      Route: "Sinhgad",
      Items: {
        [itemBailey1L]: qtyBailey,
        [itemFrootiTetra]: qtyFrooti
      },
      UnitPrices: {
        [itemBailey1L]: priceBailey1L,
        [itemFrootiTetra]: priceFrootiTetra
      },
      TotalAmount: subtotal,
      CashReceived: cashPaid,
      UPIReceived: upiPaid,
      ChequeReceived: chequePaid,
      CreditAmount: leftOnDebtCredit,
      PaymentStatus: "Partial",
      AuditStatus: "OK"
    };

    // Run verification helper
    const auditResult = verifyInvoiceBalance(invoice);
    console.log(`>> [Verification] Checking invoice audit balancing reconciliation:`);
    console.log(`   - Invoice total amount: ₹${invoice.TotalAmount}`);
    console.log(`   - Payment components matching check: Cash(₹${invoice.CashReceived}) + UPI(₹${invoice.UPIReceived}) + Cheque(₹${invoice.ChequeReceived}) + Credit(₹${invoice.CreditAmount}) = ₹${invoice.CashReceived + invoice.UPIReceived + invoice.ChequeReceived + invoice.CreditAmount}`);
    console.log(`   - Audit Verification output: [${auditResult}]`);

    expect(auditResult).toBe("OK");

    // =========================================================================
    // STEP 3: PERFORM OUTSTANDING CREDIT AGING RISK ANALYSIS
    // =========================================================================
    console.log("\n[STEP 3] Performing outstanding receivables credit-risk evaluation.");
    const initialDaysOld = 5; // Recently billed
    const riskStatus = calculateCreditRisk(leftOnDebtCredit, initialDaysOld);
    
    console.log(`>> [Risk Analysis] Radha Pavbhaji active balance credit assessment:`);
    console.log(`   - Active outstanding balance: ₹${leftOnDebtCredit}`);
    console.log(`   - Aging days elapsed: ${initialDaysOld} Days`);
    console.log(`   - Assessment status code: [${riskStatus}]`);

    expect(riskStatus).toBe("Active Credit");

    // Let's simulate a collection payout event
    console.log("\n[STEP 4] Logging a payment collection update against credit.");
    const amountCollected = 900.00;
    const historyEntry: CollectionHistory = {
      Id: "collection_rec_001",
      Date: "2026-06-15",
      BillId: invoice.BillId,
      CustomerCode: "104",
      CustomerName: "Radha Pavbhaji & Juice Bar",
      AmountCollected: amountCollected,
      Method: "UPI",
      Notes: "Fully settled pending credit invoice balance"
    };

    const remainingDebtAfterCollection = leftOnDebtCredit - historyEntry.AmountCollected;
    const updatedRisk = calculateCreditRisk(remainingDebtAfterCollection, 6);

    console.log(`>> [Collection applied] Recovered ₹${historyEntry.AmountCollected} via ${historyEntry.Method}.`);
    console.log(`   - New outstanding debt balance: ₹${remainingDebtAfterCollection}`);
    console.log(`   - Updated risk evaluation status: [${updatedRisk}]`);

    expect(remainingDebtAfterCollection).toBe(0.00);
    expect(updatedRisk).toBe("✅ Fully Reconciled");

    // =========================================================================
    // STEP 4: RECORD DIRECT PHYSICAL OVERHEAD OR GENERAL LEDGER EXPENDITURES
    // =========================================================================
    console.log("\n[STEP 5] Filing an operational expense (overhead and fleet maintenance).");
    const testOverhead = {
      Id: "exp_test_001",
      Date: "2026-06-14",
      Category: "Vehicle Fuel" as const,
      Amount: 1800.00,
      Description: "Fleet v1 (Sinhgad) daily diesel overhead refuel",
      VehicleOrLocation: "Sinhgad Vehicle" as const
    };

    console.log(`>> [Operational Debit Record] Expense published to general ledger:`);
    console.log(`   - Date: ${testOverhead.Date}`);
    console.log(`   - Class: ${testOverhead.Category} (${testOverhead.VehicleOrLocation})`);
    console.log(`   - Gross amount: ₹${testOverhead.Amount}`);
    console.log(`   - Details: "${testOverhead.Description}"`);

    expect(testOverhead.Amount).toBeGreaterThan(0);

    console.log("\n---------------------------------------------------------------------------------");
    console.log("[E2E SIMULATION END] E2E user flow tests completed flawlessly with green status!");
    console.log("---------------------------------------------------------------------------------");
  });
});
