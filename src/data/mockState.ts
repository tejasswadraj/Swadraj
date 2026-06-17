/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product, Customer, DailyServiceSheet, DailyServiceRow, SalesInvoice, CollectionHistory } from "../types";
import { PRODUCTS, CUSTOMERS } from "./masterData";
import { calculateDailyRow, verifyInvoiceBalance, getSheetNameForDate } from "../utils/math";

// Helper to construct a blank DailyServiceRow
export function createBlankRow(product: Product, previousClosing = 0, previousVehicleLoadIn = 0, previousVehicleReturn = { sinhgad: 0, purandar: 0, rajgad: 0 }): DailyServiceRow {
  return calculateDailyRow({
    Brand: product.Brand,
    Net_Qty: product.Item_Name.replace(product.Brand + " ", ""),
    Case_Pack: product.Case_Pack,
    Item_Code: product.Item_Code,

    System: previousClosing,
    Open: previousClosing, 
    Vehicle_Open: previousVehicleLoadIn,
    Primary: 0,
    Counter_Sale: 0,

    Sinhgad_Open: previousVehicleReturn.sinhgad,
    Sinhgad_Load1: 0,
    Sinhgad_Load2: 0,
    Sinhgad_Sale: 0,
    Sinhgad_Load_In: 0,

    Purandar_Open: previousVehicleReturn.purandar,
    Purandar_Load1: 0,
    Purandar_Load2: 0,
    Purandar_Sale: 0,
    Purandar_Load_In: 0,

    Rajgad_Open: previousVehicleReturn.rajgad,
    Rajgad_Load1: 0,
    Rajgad_Load2: 0,
    Rajgad_Sale: 0,
    Rajgad_Load_In: 0,
  });
}

// Generate the initial list of items for Day 1: 1206 (June 12, 2026)
export function getSeedSheets(): DailyServiceSheet[] {
  // Let's create Row matching June 12
  const june12Rows = PRODUCTS.map(product => {
    let openStock = 0;
    // Apply default starting values matching user's specific PDF snapshot
    if (product.Item_Code === "PTBA-1000-12-20") openStock = 728; // Bailey 1L
    else if (product.Item_Code === "PTBA-2000-06-30") openStock = 147; // Bailey 2L
    else if (product.Item_Code === "PTBA-5000-04-60") openStock = 62; // Bailey 5L
    else if (product.Item_Code === "PTBA-0500-24-15") openStock = 262; // Bailey 500ml
    else if (product.Item_Code === "PTBA-0250-24-08") openStock = 150; // Bailey 250ml
    else if (product.Item_Code === "PTFR-ONE-0400-24-20") openStock = 150; // Bailey One 1L
    else if (product.Item_Code === "PTFR-ONE-0500-24-10") openStock = 129; // Bailey One 500ml
    else if (product.Item_Code === "GLSD-0300-24-15") openStock = 2; // Soda 300ml
    else if (product.Item_Code === "PTSD-0750-12-30") openStock = 3; // Soda 750ml
    else if (product.Item_Code === "PTJR-0300-24-20") openStock = 1; // Jeera 300ml

    return calculateDailyRow({
      Brand: product.Brand,
      Net_Qty: product.Item_Name.replace(product.Brand + " ", ""),
      Case_Pack: product.Case_Pack,
      Item_Code: product.Item_Code,

      System: openStock,
      Open: openStock,
      Vehicle_Open: 0,
      Primary: 0,
      Counter_Sale: 0,

      Sinhgad_Open: 0,
      Sinhgad_Load1: 0,
      Sinhgad_Load2: 0,
      Sinhgad_Sale: 0,
      Sinhgad_Load_In: 0,

      Purandar_Open: 0,
      Purandar_Load1: 0,
      Purandar_Load2: 0,
      Purandar_Sale: 0,
      Purandar_Load_In: 0,

      Rajgad_Open: 0,
      Rajgad_Load1: 0,
      Rajgad_Load2: 0,
      Rajgad_Sale: 0,
      Rajgad_Load_In: 0,
    });
  });

  const sheet1206: DailyServiceSheet = {
    date: "2026-06-12",
    sheetName: "1206",
    rows: june12Rows,
  };

  // Now create Day 2 (June 13) using the rollover from June 12
  // We'll fill June 13 with some manual logs to make the dashboard look active!
  const june13Rows = PRODUCTS.map((product) => {
    const prevRow = june12Rows.find(r => r.Item_Code === product.Item_Code);
    const systemVal = prevRow?.Total_Closing || prevRow?.Open || 0;
    const vehicleOpen = prevRow?.Total_Load_In || 0;
    const vehicleReturn = {
      sinhgad: prevRow?.Sinhgad_Load_In || 0,
      purandar: prevRow?.Purandar_Load_In || 0,
      rajgad: prevRow?.Rajgad_Load_In || 0,
    };

    // Feed some active loads on June 13
    let pLoad1 = 0, pLoad2 = 0, pLoadIn = 0;
    let sLoad1 = 0, sLoad2 = 0, sLoadIn = 0;
    let rLoad1 = 0, rLoad2 = 0, rLoadIn = 0;
    let primaryPurchase = 0;

    if (product.Item_Code === "PTBA-1000-12-20") {
      sLoad1 = 50;
      sLoad2 = 20;
      sLoadIn = 5; // Retuned 5 cases
      primaryPurchase = 120; // 120 cases came in from manufacturer
    } else if (product.Item_Code === "PTBA-0500-24-15") {
      pLoad1 = 30;
      pLoadIn = 2;
    } else if (product.Item_Code === "TRFR-0150-40-12") {
      rLoad1 = 15;
      rLoadIn = 0;
    }

    return calculateDailyRow({
      Brand: product.Brand,
      Net_Qty: product.Item_Name.replace(product.Brand + " ", ""),
      Case_Pack: product.Case_Pack,
      Item_Code: product.Item_Code,

      System: systemVal,
      Open: systemVal,
      Vehicle_Open: vehicleOpen,
      Primary: primaryPurchase,
      Counter_Sale: 2, // Direct counter sale at godown

      Sinhgad_Open: vehicleReturn.sinhgad,
      Sinhgad_Load1: sLoad1,
      Sinhgad_Load2: sLoad2,
      Sinhgad_Sale: 0, // This will be calculated by transaction reconciliations
      Sinhgad_Load_In: sLoadIn,

      Purandar_Open: vehicleReturn.purandar,
      Purandar_Load1: pLoad1,
      Purandar_Load2: pLoad2,
      Purandar_Sale: 0,
      Purandar_Load_In: pLoadIn,

      Rajgad_Open: vehicleReturn.rajgad,
      Rajgad_Load1: rLoad1,
      Rajgad_Load2: rLoad2,
      Rajgad_Sale: 0,
      Rajgad_Load_In: rLoadIn,
    });
  });

  const sheet1306: DailyServiceSheet = {
    date: "2026-06-13",
    sheetName: "1306",
    rows: june13Rows,
  };

  return [sheet1206, sheet1306];
}

// Pre-seeded sales bills (to show stats)
export function getSeedInvoices(): SalesInvoice[] {
  return [
    {
      BillId: 1,
      Date: "2026-06-13",
      CustomerCode: "104", // Radha Pavbhaji
      CustomerName: "Radha Pavbhaji & Juice Bar",
      Route: "Sinhgad",
      Items: {
        "PTBA-1000-12-20": 45, // 45 cases of Bailey 1L
        "PTAF-0160-40-10": 10 // 10 cases of Appy Fizz
      },
      UnitPrices: {
        "PTBA-1000-12-20": 135.00, // custom price
        "PTAF-0160-40-10": 265.00  // custom price
      },
      TotalAmount: 8725.00, // (45 * 135) + (10 * 265) = 6075 + 2650 = 8725
      CashReceived: 3000,
      UPIReceived: 2000,
      ChequeReceived: 0,
      CreditAmount: 3725,
      PaymentStatus: "Partial",
      AuditStatus: "OK",
      Time: "09:30 AM",
      Status: "Delivered"
    },
    {
      BillId: 2,
      Date: "2026-06-13",
      CustomerCode: "103", // Sinhgad Food Mall
      CustomerName: "Sinhgad Food Mall & Resort",
      Route: "Sinhgad",
      Items: {
        "PTBA-1000-12-20": 20 // 20 cases of Bailey 1L
      },
      UnitPrices: {
        "PTBA-1000-12-20": 140.00 // Custom
      },
      TotalAmount: 2800.00,
      CashReceived: 0,
      UPIReceived: 0,
      ChequeReceived: 0,
      CreditAmount: 2800.00, // full credit outstanding
      PaymentStatus: "Pending",
      AuditStatus: "OK",
      Time: "11:15 AM",
      Status: "Outlet Closed"
    },
    {
      BillId: 3,
      Date: "2026-06-13",
      CustomerCode: "101", // Kundan Restaurant
      CustomerName: "Kundan Restaurant & Lodging",
      Route: "Purandar",
      Items: {
        "PTBA-0500-24-15": 28 // 28 cases of Bailey 500ml
      },
      UnitPrices: {
        "PTBA-0500-24-15": 195.00 // standard wholesale rate
      },
      TotalAmount: 5460.00, // 28 * 195
      CashReceived: 5460,
      UPIReceived: 0,
      ChequeReceived: 0,
      CreditAmount: 0,
      PaymentStatus: "Paid",
      AuditStatus: "OK",
      Time: "01:20 PM",
      Status: "Delivered"
    },
    {
      BillId: 4,
      Date: "2026-06-13",
      CustomerCode: "102", // Rajgad Palace
      CustomerName: "Rajgad Darbar Palace",
      Route: "Rajgad",
      Items: {
        "TRFR-0150-40-12": 15 // 15 cases of Frooti 150ml
      },
      UnitPrices: {
        "TRFR-0150-40-12": 340.00
      },
      TotalAmount: 5100.00, // 15 * 340
      CashReceived: 0,
      UPIReceived: 1100,
      ChequeReceived: 0,
      CreditAmount: 4000.00,
      PaymentStatus: "Partial",
      AuditStatus: "OK",
      Time: "03:45 PM",
      Status: "Order Revised"
    }
  ];
}

export function getSeedCollections(): CollectionHistory[] {
  return [
    {
      Id: "pay_1",
      Date: "2026-06-13",
      BillId: 1,
      CustomerCode: "104",
      CustomerName: "Radha Pavbhaji & Juice Bar",
      AmountCollected: 1000,
      Method: "UPI",
      Notes: "Partial collection run by Sinhgad fleet driver"
    }
  ];
}
