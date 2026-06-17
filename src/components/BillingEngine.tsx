/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { Product, Customer, SalesInvoice } from "../types";
import { PRODUCTS, CUSTOMERS } from "../data/masterData";
import { getCalculatedPrice, verifyInvoiceBalance } from "../utils/math";
import { 
  FileText, 
  Search, 
  Plus, 
  Trash2, 
  CheckSquare, 
  Truck, 
  HelpCircle,
  Coins,
  ShieldCheck,
  TrendingUp,
  Tag,
  Printer,
  Share2,
  FileSpreadsheet,
  Clock
} from "lucide-react";

export function getSimplifiedProductName(fullName: string): string {
  if (!fullName) return "";
  let name = fullName;
  name = name.replace("Fresh Mango Drink ", "");
  name = name
    .replace("Silk ", "")
    .replace("Salted ", "")
    .replace("Roasted ", "")
    .replace("Royal ", "")
    .replace("Classic Sweet ", "")
    .replace(" Shake", "");
  name = name
    .replace("Sparkling Apple Juice Drink ", "")
    .replace("Malty Herb Sparkler Drink ", "");
  name = name
    .replace("Packaged Drinking Water ", "")
    .replace("Club Soda Glass Bottle ", "Soda Glass ")
    .replace("Club Soda Pet Bottle ", "Soda Pet ")
    .replace("Jeera Masala Soda Pet Bottle ", "Jeera Soda ")
    .replace("Premium Drinking Water ", "");
  return name;
}

interface BillingEngineProps {
  invoices: SalesInvoice[];
  onAddInvoice: (invoice: SalesInvoice) => void;
  onUpdateInvoice: (invoice: SalesInvoice) => void;
  selectedDate: string;
  customers: Customer[];
  currentPhase?: number;
  bypassPhaseLock?: boolean;
}

export default function BillingEngine({ 
  invoices, 
  onAddInvoice, 
  onUpdateInvoice, 
  selectedDate, 
  customers,
  currentPhase = 2,
  bypassPhaseLock = false
}: BillingEngineProps) {
  const [localBypass, setLocalBypass] = useState<boolean>(false);
  const [activeMode, setActiveMode] = useState<"new" | "manage">("new");
  const [selectedManageInvoice, setSelectedManageInvoice] = useState<SalesInvoice | null>(null);
  const [managePaymentMode, setManagePaymentMode] = useState<"Cash" | "UPI" | "Cheque" | "Credit">("Cash");
  const [managePaymentAmount, setManagePaymentAmount] = useState<number>(0);
  const [manageStatus, setManageStatus] = useState<any>("");

  // Automatic vs Manual Date selection status
  const [dateMode, setDateMode] = useState<"auto" | "manual">("auto");
  const [manualDate, setManualDate] = useState<string>(selectedDate);
  const billDate = dateMode === "auto" ? "2026-06-14" : manualDate;

  // Invoice vs Sales Order toggle
  const [voucherType, setVoucherType] = useState<"invoice" | "order">("invoice");
  const [assignedVehicle, setAssignedVehicle] = useState<"Sinhgad" | "Purandar" | "Rajgad" | "Counter">("Sinhgad");

  // Route/Beat grouping state
  const [route, setRoute] = useState<"Sinhgad" | "Purandar" | "Rajgad" | "Counter">("Sinhgad");
  const [customerCode, setCustomerCode] = useState<string>("");
  const [outletQuery, setOutletQuery] = useState<string>("");
  const [showOutletSuggestions, setShowOutletSuggestions] = useState<boolean>(false);

  // Draft invoice items array
  const [draftItems, setDraftItems] = useState<Array<{
    brand: string;
    productCode: string;
    cases: number;
    offerPieces: number; // Promo pieces (only for Parle Agro Products)
    manualRate: number; // Allows manual price adjustments
    useManualRate: boolean;
  }>>([
    { brand: "", productCode: "", cases: 0, offerPieces: 0, manualRate: 0, useManualRate: false }
  ]);

  // Mode of Payments states
  const [paymentMode, setPaymentMode] = useState<"Cash" | "Online" | "Cheque" | "Credit">("Cash");
  const [cashReceived, setCashReceived] = useState<number>(0);
  
  // UPI states
  const [upiAmount, setUpiAmount] = useState<number>(0);
  const [upiTxId, setUpiTxId] = useState<string>("");

  // Cheque states
  const [chequeAmount, setChequeAmount] = useState<number>(0);
  const [chequeBank, setChequeBank] = useState<string>("");
  const [chequeNum, setChequeNum] = useState<string>("");
  const [chequeDate, setChequeDate] = useState<string>("2026-06-14");

  // Credit states
  const [creditPromisedDate, setCreditPromisedDate] = useState<string>("2026-06-25");
  const [overrideCreditLock, setOverrideCreditLock] = useState<boolean>(false);

  // Custom Walk-in name counter sales state
  const [customWalkInName, setCustomWalkInName] = useState<string>("");

  // Customer suggestions filter - allows searching by name, ID and phone number!
  const customerSuggestions = useMemo(() => {
    // Return base customers for the active route
    const baseList = customers.filter(c => {
      if (route === "Sinhgad") return c.Beat === "Sinhgad Beat";
      if (route === "Purandar") return c.Beat === "Purandar Beat";
      if (route === "Rajgad") return c.Beat === "Rajgad Beat";
      return true; // Counter allows all
    });

    if (!outletQuery) return baseList;
    const query = outletQuery.toLowerCase().trim();

    return baseList.filter(c => 
      c.Customer_Name.toLowerCase().includes(query) ||
      c.Customer_Code.toLowerCase().includes(query) ||
      (c.Contact && c.Contact.includes(query)) ||
      (c.Secondary_Phone && c.Secondary_Phone.includes(query))
    );
  }, [customers, route, outletQuery]);

  // Selected customer object representation
  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.Customer_Code === customerCode);
  }, [customerCode, customers]);

  // Extract all distinct brand names from PRODUCTS catalog
  const distinctBrands = useMemo(() => {
    return Array.from(new Set(PRODUCTS.map(p => p.Brand))).sort();
  }, []);

  // Calculate prices, line-item taxes, and final totals
  const draftDetails = useMemo(() => {
    let subtotalProductValue = 0;
    let totalGstVal = 0;

    const itemsList = draftItems.map(item => {
      if (!item.productCode) {
        return { ...item, name: "", unitRate: 0, rowTotal: 0, gstPercent: 0, netQty: "" };
      }

      const product = PRODUCTS.find(p => p.Item_Code === item.productCode);
      const name = product?.Item_Name || "";
      const gstPercent = product?.GST_Percent || 0;
      const netQtyStr = product ? `${product.Volume_ml}ml [Pack: ${product.Case_Pack}]` : "";

      // Default contract exceptions or standard rate
      const defaultRate = getCalculatedPrice(customerCode, item.productCode);
      const finalUnitRate = item.useManualRate ? item.manualRate : defaultRate;

      const rowTotal = finalUnitRate * item.cases;
      subtotalProductValue += rowTotal;

      // GST is inclusive in pricing
      const baseAmount = rowTotal / (1 + gstPercent / 100);
      const gstAmount = rowTotal - baseAmount;
      totalGstVal += gstAmount;

      return {
        ...item,
        name,
        unitRate: finalUnitRate,
        rowTotal,
        gstPercent,
        netQty: netQtyStr
      };
    });

    // Handle payments received based on paymentMode
    let cashPay = 0;
    let upiPay = 0;
    let chequePay = 0;
    let creditAmount = 0;

    if (voucherType === "order") {
      // Sales orders do not collect payments (they are pre-sales loaded on trucks)
      // They default to credit amount (non-payment, outstanding of the order value)
      creditAmount = subtotalProductValue;
    } else {
      if (paymentMode === "Cash") {
        cashPay = subtotalProductValue;
      } else if (paymentMode === "Online") {
        upiPay = subtotalProductValue;
      } else if (paymentMode === "Cheque") {
        chequePay = subtotalProductValue;
      } else if (paymentMode === "Credit") {
        creditAmount = subtotalProductValue;
      }
    }

    return {
      items: itemsList,
      totalAmount: subtotalProductValue,
      totalGstAmount: totalGstVal,
      cashPay,
      upiPay,
      chequePay,
      creditAmount
    };
  }, [draftItems, customerCode, paymentMode, voucherType]);

  // Consolidated Credit Risk & Overrun Analyzer
  const creditRisk = useMemo(() => {
    if (!selectedCustomer) {
      return {
        existingOutstanding: 0,
        projectedOutstanding: 0,
        limit: 5000,
        isOverLimit: false,
        percentUsed: 0
      };
    }
    const limit = selectedCustomer.Credit_Limit || 5000;
    const existingOutstanding = invoices
      .filter(inv => inv.CustomerCode === selectedCustomer.Customer_Code)
      .reduce((sum, inv) => sum + (inv.CreditAmount || 0), 0);

    const isCreditVoucher = paymentMode === "Credit" || voucherType === "order";
    const projectedOutstanding = existingOutstanding + (isCreditVoucher ? draftDetails.totalAmount : 0);
    const isOverLimit = projectedOutstanding > limit;
    const percentUsed = limit > 0 ? (projectedOutstanding / limit) * 100 : 0;

    return {
      existingOutstanding,
      projectedOutstanding,
      limit,
      isOverLimit,
      percentUsed
    };
  }, [selectedCustomer, invoices, paymentMode, voucherType, draftDetails.totalAmount]);

  const handleAddRow = () => {
    setDraftItems([...draftItems, { brand: "", productCode: "", cases: 0, offerPieces: 0, manualRate: 0, useManualRate: false }]);
  };

  const handleRemoveRow = (idx: number) => {
    if (draftItems.length === 1) return;
    setDraftItems(draftItems.filter((_, i) => i !== idx));
  };

  const handleRowChange = (idx: number, field: string, value: any) => {
    const updated = [...draftItems];
    const target = updated[idx];

    if (field === "brand") {
      target.brand = value;
      target.productCode = ""; // reset SKU on brand switch
    } else if (field === "productCode") {
      target.productCode = value;
      const prod = PRODUCTS.find(p => p.Item_Code === value);
      
      // Seed default rate to manualRate
      const defaultRate = getCalculatedPrice(customerCode, value);
      target.manualRate = defaultRate;
      target.useManualRate = false;

      // Reset offer pieces if not Parle Argo
      const isParleAgro = ["Frooti", "Smoodh", "Bailey", "Appy Fizz"].includes(prod?.Brand || "");
      if (!isParleAgro) {
        target.offerPieces = 0;
      }
    } else if (field === "cases") {
      target.cases = Math.max(0, parseInt(value, 10) || 0);
    } else if (field === "offerPieces") {
      target.offerPieces = Math.max(0, parseInt(value, 10) || 0);
    } else if (field === "manualRate") {
      target.manualRate = Math.max(0, parseFloat(value) || 0);
      target.useManualRate = true;
    }

    setDraftItems(updated);
  };

  // Process and save double-entry transaction
  const handleSaveInvoice = () => {
    const isCounterWalkIn = route === "Counter" && customWalkInName.trim() !== "";
    let finalCustomerCode = customerCode;
    let finalCustomerName = selectedCustomer ? selectedCustomer.Customer_Name : "";

    if (isCounterWalkIn) {
      finalCustomerCode = `CUST-WALKIN-${customWalkInName.trim().replace(/\s+/g, '-').toUpperCase()}`;
      finalCustomerName = customWalkInName.trim();
    } else {
      if (!customerCode || !selectedCustomer) {
        alert("Please search and select a retail outlet customer first.");
        return;
      }
    }

    if (draftItems.some(i => !i.productCode || i.cases <= 0)) {
      alert("Please ensure all item line rows have a selected SKU and valid Cases quantity.");
      return;
    }

    // Dynamic Credit Limit Violation Guard
    const isCreditVoucher = paymentMode === "Credit" || voucherType === "order";
    if (creditRisk.isOverLimit && isCreditVoucher && !overrideCreditLock) {
      alert(
        `⛔ A/R CREDIT LOCK ACTIVE\n\n` +
        `Selected customer outstanding dues (₹${creditRisk.existingOutstanding.toLocaleString()}) + ` +
        `draft invoice total (₹${draftDetails.totalAmount.toLocaleString()}) is ₹${creditRisk.projectedOutstanding.toLocaleString()}.\n` +
        `This exceeds their active credit limit of ₹${creditRisk.limit.toLocaleString()}.\n\n` +
        `Please check the "Force Authorize Overrun" checkbox under the Credit Risk summary panel to bypass.`
      );
      return;
    }

    const nextId = invoices.length > 0 ? Math.max(...invoices.map(i => i.BillId)) + 1 : 1001;

    // Compose payment summary description for ledger
    let detailsStr = `Payment terms: ${paymentMode}.`;
    if (paymentMode === "Online") {
      detailsStr += ` UPI ref: ${upiTxId || "None"}.`;
    } else if (paymentMode === "Cheque") {
      detailsStr += ` Cheque Bank: ${chequeBank}, No: ${chequeNum}, date: ${chequeDate}.`;
    } else if (paymentMode === "Credit") {
      detailsStr += ` Promised pay day: ${creditPromisedDate}.`;
    }

    const finalInvoice: SalesInvoice = {
      BillId: nextId,
      Date: billDate,
      CustomerCode: finalCustomerCode,
      CustomerName: finalCustomerName,
      Route: voucherType === "order" ? assignedVehicle : route,
      Items: draftItems.reduce((acc, draft) => {
        acc[draft.productCode] = draft.cases;
        return acc;
      }, {} as { [skuCode: string]: number }),
      UnitPrices: draftItems.reduce((acc, draft) => {
        acc[draft.productCode] = draft.useManualRate ? draft.manualRate : getCalculatedPrice(finalCustomerCode, draft.productCode);
        return acc;
      }, {} as { [skuCode: string]: number }),
      TotalAmount: draftDetails.totalAmount,
      CashReceived: draftDetails.cashPay,
      UPIReceived: draftDetails.upiPay,
      ChequeReceived: draftDetails.chequePay,
      CreditAmount: draftDetails.creditAmount,
      PaymentStatus: paymentMode === "Credit" || voucherType === "order" ? "Pending" : "Paid",
      AuditStatus: "OK"
    };

    onAddInvoice(finalInvoice);

    // Reset draft fields
    setCustomerCode("");
    setOutletQuery("");
    setCustomWalkInName("");
    setDraftItems([{ brand: "", productCode: "", cases: 0, offerPieces: 0, manualRate: 0, useManualRate: false }]);
    setUpiTxId("");
    setChequeBank("");
    setChequeNum("");
    alert(`Swadraj ${voucherType === "order" ? "Sales Order (Assigned to Vehicle)" : "Bill Invoice"} #${nextId} processed successfully! Ledger accounts synchronized.`);
  };

  const handleUpdateManageInvoiceStatus = (newStatus: "Cancelled" | "Outlet Closed" | "Order Revised" | "Delivered") => {
    if (selectedManageInvoice) {
      onUpdateInvoice({ ...selectedManageInvoice, Status: newStatus });
      setSelectedManageInvoice({ ...selectedManageInvoice, Status: newStatus });
    }
  };

  const handleApplyManagePayment = () => {
    if (!selectedManageInvoice) return;
    const inv = { ...selectedManageInvoice };
    const amt = managePaymentAmount;
    if (managePaymentMode === "Cash") inv.CashReceived += amt;
    else if (managePaymentMode === "UPI") inv.UPIReceived += amt;
    else if (managePaymentMode === "Cheque") inv.ChequeReceived += amt;

    inv.CreditAmount = Math.max(0, inv.TotalAmount - (inv.CashReceived + inv.UPIReceived + inv.ChequeReceived));
    
    if (inv.CreditAmount === 0) {
      inv.PaymentStatus = "Paid";
    }

    onUpdateInvoice(inv);
    setSelectedManageInvoice(inv);
    setManagePaymentAmount(0);
    alert(`Payment of ₹${amt} via ${managePaymentMode} recorded. Remaining Credit Balance added to ledger: ₹${inv.CreditAmount}`);
  };

  const handlePrintThermal = (inv: SalesInvoice) => {
    const printWindow = window.open("", "_blank", "width=320,height=600");
    if (!printWindow) {
      alert("Popup blocked! Please allow popups to print/thermal scan.");
      return;
    }
    
    let itemsHtml = "";
    Object.entries(inv.Items).forEach(([skuCode, qty]) => {
      const p = PRODUCTS.find(pr => pr.Item_Code === skuCode);
      const name = getSimplifiedProductName(p?.Item_Name || skuCode);
      const rate = inv.UnitPrices[skuCode] || 0;
      const total = (qty as number) * rate;
      itemsHtml += `
        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px;">
          <span>${name} x${qty}</span>
          <span>₹${total}</span>
        </div>
      `;
    });

    const rawHtml = `
      <html>
        <head>
          <title>Thermal Print</title>
          <style>
            @page { margin: 0; }
            body {
              font-family: 'Courier New', Courier, monospace;
              width: 58mm;
              padding: 4px;
              margin: 0;
              background: #fff;
              color: #000;
            }
            .title { text-align: center; font-weight: bold; font-size: 14px; margin-bottom: 3px; }
            .sub { text-align: center; font-size: 10px; margin-bottom: 10px; }
            .divider { border-bottom: 1px dashed #000; margin: 8px 0; }
            .total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 12px; }
          </style>
        </head>
        <body onload="window.print(); setTimeout(function() { window.close(); }, 500);">
          <div class="title">SWADRAJ AGENCIES</div>
          <div class="sub">Pimpri-Chinchwad, Pune<br/>FMCG DISPATCH RECEIPT</div>
          
          <div style="font-size: 10px; margin-bottom: 5px;">
            <div><b>Bill ID:</b> SWAD-${inv.BillId}</div>
            <div><b>Date:</b> ${inv.Date}</div>
            <div><b>Party:</b> ${inv.CustomerName.toUpperCase()}</div>
            <div><b>Route:</b> ${inv.Route}</div>
          </div>
          
          <div class="divider"></div>
          ${itemsHtml}
          <div class="divider"></div>
          
          <div class="total-row">
            <span>GRAND TOTAL:</span>
            <span>₹${inv.TotalAmount}</span>
          </div>
          <div style="font-size: 10px; margin-top: 4px; display: flex; justify-content: space-between;">
            <span>CASH: ₹${inv.CashReceived}</span>
            <span>UPI: ₹${inv.UPIReceived}</span>
          </div>
          <div style="font-size: 10px; margin-top: 2px; display: flex; justify-content: space-between;">
            <span>BALANCE DUE:</span>
            <span><b>₹${inv.CreditAmount}</b></span>
          </div>
          
          <div class="divider"></div>
          <div style="text-align: center; font-size: 9px; margin-top: 10px;">
            Thank you for choosing Swadraj!<br/>GSTIN: 27SWADRAJ1234Z5
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(rawHtml);
    printWindow.document.close();
  };

  const handlePrintStandardPdf = (inv: SalesInvoice) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Popup blocked! Please allow popups to print.");
      return;
    }

    let itemsHtml = "";
    let itemIdx = 1;
    Object.entries(inv.Items).forEach(([skuCode, qty]) => {
      const p = PRODUCTS.find(pr => pr.Item_Code === skuCode);
      const name = getSimplifiedProductName(p?.Item_Name || skuCode);
      const rate = inv.UnitPrices[skuCode] || 0;
      const total = (qty as number) * rate;
      const hsn = "22029929"; 
      itemsHtml += `
        <tr>
          <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${itemIdx++}</td>
          <td style="border: 1px solid #ddd; padding: 6px;">${name}</td>
          <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${hsn}</td>
          <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${qty}</td>
          <td style="border: 1px solid #ddd; padding: 6px; text-align: right;">₹${rate.toFixed(2)}</td>
          <td style="border: 1px solid #ddd; padding: 6px; text-align: right;">₹${total.toFixed(2)}</td>
        </tr>
      `;
    });

    const rawHtml = `
      <html>
        <head>
          <title>GST Tax Invoice - Swadraj Agencies</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #333; line-height: 1.4; }
            .header-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
            .heading { font-size: 22px; font-weight: bold; color: #d97706; }
            .info-box { background: #f9fafb; border: 1px solid #e5e7eb; padding: 15px; border-radius: 8px; font-size: 12px; }
            .items-table { width: 100%; border-collapse: collapse; margin-top: 25px; font-size: 12px; }
            .items-table th { background: #f3f4f6; border: 1px solid #e5e7eb; padding: 8px; font-weight: bold; text-align: left; }
            .footer-sig { margin-top: 50px; display: flex; justify-content: space-between; font-size: 12px; }
          </style>
        </head>
        <body onload="window.print();">
          <table class="header-table">
            <tr>
              <td>
                <div class="heading">SWADRAJ AGENCIES</div>
                <div style="font-size: 11px; color: #666; margin-top: 4px;">FMCG distributor, Pimpri-Chinchwad, Pune<br/>State: Maharashtra (Code: 27)</div>
              </td>
              <td style="text-align: right; font-size: 12px;">
                <b>TAX INVOICE</b><br/>
                Invoice No: SA/2026-27/${inv.BillId}<br/>
                Date: ${inv.Date}
              </td>
            </tr>
          </table>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div class="info-box">
              <b>BILL TO:</b><br/>
              Party Name: ${inv.CustomerName.toUpperCase()}<br/>
              State: Maharashtra (27)<br/>
              Customer Code: ${inv.CustomerCode}
            </div>
            <div class="info-box">
              <b>DISPATCH DETAILS:</b><br/>
              Vehicle Fleet: ${inv.Route}<br/>
              Logistics: Swadraj Freight Line
            </div>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 5%; text-align: center;">S.No</th>
                <th style="width: 50%;">Description of Goods</th>
                <th style="width: 10%; text-align: center;">HSN Code</th>
                <th style="width: 10%; text-align: center;">Qty (cases)</th>
                <th style="width: 10%; text-align: right;">Unit Rate</th>
                <th style="width: 15%; text-align: right;">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
              <tr>
                <td colspan="4" style="border: none;"></td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: right; font-weight: bold;">Subtotal:</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: right; font-weight: bold;">₹${inv.TotalAmount.toFixed(2)}</td>
              </tr>
              <tr>
                <td colspan="4" style="border: none;"></td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: right; font-weight: bold;">Dues Cleared:</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: right; font-weight: bold; color: emerald;">₹${(inv.CashReceived + inv.UPIReceived + inv.ChequeReceived).toFixed(2)}</td>
              </tr>
              <tr>
                <td colspan="4" style="border: none;"></td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: right; font-weight: bold; color: red;">Dues Remaining:</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: right; font-weight: bold; color: red;">₹${inv.CreditAmount.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div style="margin-top: 30px; font-size: 11px;">
            <b>Amount in words:</b> Rupees ${inv.TotalAmount} Only
          </div>

          <div class="footer-sig">
            <div>
              <p>Customer Signature</p>
              <div style="border-bottom: 1px solid #ccc; width: 150px; margin-top: 30px;"></div>
            </div>
            <div style="text-align: right;">
              <p>For Swadraj Agencies</p>
              <div style="border-bottom: 1px solid #ccc; width: 150px; margin-top: 30px; margin-left: auto;"></div>
              <p style="font-size: 10px; color: #777; margin-top: 4px;">Authorized Signatory</p>
            </div>
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(rawHtml);
    printWindow.document.close();
  };

  const handleShareWhatsApp = (inv: SalesInvoice) => {
    let itemsText = "";
    Object.entries(inv.Items).forEach(([skuCode, qty]) => {
      const p = PRODUCTS.find(pr => pr.Item_Code === skuCode);
      const name = getSimplifiedProductName(p?.Item_Name || skuCode);
      const rate = inv.UnitPrices[skuCode] || 0;
      const total = (qty as number) * rate;
      itemsText += `• ${name} x ${qty} cases = ₹${total}\n`;
    });

    const msg = `📦 *SWADRAJ AGENCIES* — FMCG Distribution\nPimpri-Chinchwad, Pune\n\n*Invoice No:* SWAD-${inv.BillId}\n*Date:* ${inv.Date}\n*Customer:* ${inv.CustomerName.toUpperCase()}\n*Route/Vehicle:* ${inv.Route}\n\n*Line Items:*\n${itemsText}\n*Total Amount:* ₹${inv.TotalAmount}\n*Dues Outstanding:* ₹${inv.CreditAmount}\n\nThank you for doing business with Swadraj! 🤝`;
    
    const encodedMsg = encodeURIComponent(msg);
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedMsg}`;
    window.open(whatsappUrl, "_blank");
  };

  return (
    <div className="space-y-6 animate-fade-in" id="billing-engine-tab">
      
      {/* Mode Toggle Tabs */}
      <div className="flex space-x-2 bg-zinc-900 border border-zinc-800 p-1.5 rounded-xl w-max">
        <button
          onClick={() => setActiveMode("new")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${activeMode === "new" ? "bg-amber-glow text-zinc-950" : "text-zinc-500 hover:text-white"}`}
        >
          Create Sales Order / Invoice
        </button>
        <button
          onClick={() => setActiveMode("manage")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${activeMode === "manage" ? "bg-amber-glow text-zinc-950" : "text-zinc-500 hover:text-white"}`}
        >
          Manage Sales Orders
        </button>
      </div>

      {activeMode === "new" && (
        currentPhase !== 2 && !bypassPhaseLock && !localBypass ? (
          <div className="bg-zinc-900 border-2 border-dashed border-red-500/30 rounded-2xl p-10 flex flex-col items-center justify-center text-center space-y-6 max-w-4xl mx-auto shadow-2xl my-6">
            <div className="p-4 bg-red-500/10 rounded-full border border-red-500/30 text-rose-400 animate-bounce">
              <Clock size={40} className="stroke-[2.5]" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-extrabold uppercase text-white font-mono tracking-wider">
                🔒 TEMPORAL OPERATIONS ACCESS LOCK ACTIVE
              </h3>
              <p className="text-xs text-zinc-400 max-w-lg leading-relaxed">
                You are currently in <strong className="text-amber-glow">{currentPhase === 1 ? "Phase 1: Pre-Market Prep" : "Phase 3: Reconciliation"}</strong>. 
                Under Swadraj Operations Protocol, new spot billing transactions are restricted during this slot to eliminate inventory leakages and protect ledger integrity.
              </p>
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-left text-zinc-400 space-y-2 max-w-md mx-auto text-[11px] leading-relaxed">
                <span className="font-bold text-[#ffb300] block uppercase font-mono text-[9px]">Expected Activities:</span>
                {currentPhase === 1 ? (
                  <span>&bull; Perform cash vault checks & allocate loading dispatches (08:00 - 10:00).</span>
                ) : (
                  <span>&bull; Verify collections ledger & generate PO restocking lists (17:00 - 20:59).</span>
                )}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => setLocalBypass(true)}
                className="bg-amber-glow hover:bg-amber-600 text-zinc-900 px-5 py-2.5 rounded-xl font-black font-mono uppercase text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <ShieldCheck size={14} /> Force Bypass System Lock
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Hand: Invoice generation pane */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 lg:col-span-2 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-805 pb-3">
            <div>
              <h2 className="text-sm font-bold text-white tracking-wider font-mono flex items-center gap-2 uppercase">
                <FileText className="text-amber-glow" size={18} />
                <span>Distributor Invoice Dispatch Desk</span>
              </h2>
              <p className="text-[10px] text-zinc-455 mt-1">Raise digital receipts or generate pre-sales orders bound for truck routes.</p>
            </div>

            {/* Invoce vs Sales Order Choice */}
            <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800 mt-2 sm:mt-0 font-mono text-[10px]">
              <button
                type="button"
                onClick={() => setVoucherType("invoice")}
                className={`px-3 py-1.5 rounded-lg font-bold uppercase transition ${voucherType === "invoice" ? "bg-amber-glow text-zinc-950" : "text-zinc-500 hover:text-white"}`}
              >
                Direct Invoice
              </button>
              <button
                type="button"
                onClick={() => setVoucherType("order")}
                className={`px-3 py-1.5 rounded-lg font-bold uppercase transition ${voucherType === "order" ? "bg-indigo-650 text-white" : "text-zinc-500 hover:text-white"}`}
              >
                Generate Sales Order
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
            {/* Route / Beat Selection */}
            <div className="space-y-1.5">
              <label className="text-zinc-450 uppercase tracking-widest block font-bold text-[10px]">Trade route</label>
              <select
                value={route}
                onChange={(e) => {
                  setRoute(e.target.value as any);
                  setCustomerCode("");
                  setOutletQuery("");
                }}
                className="w-full bg-zinc-950 text-white border border-zinc-800 rounded-xl px-3 py-2.5 outline-none focus:border-amber-glow cursor-pointer h-10"
              >
                <option value="Sinhgad">Sinhgad beat route</option>
                <option value="Purandar">Purandar beat route</option>
                <option value="Rajgad">Rajgad beat route</option>
                <option value="Counter">Counter sales (warehouse)</option>
              </select>
            </div>

             {/* Search Outlets using names, ID or Mobile Numbers */}
             <div className="space-y-1.5 relative">
               <label className="text-zinc-450 uppercase tracking-widest block font-bold text-[10px]">Search Customer/Phone</label>
               <div className="relative">
                 <Search size={14} className="absolute left-3.5 top-3 text-zinc-500" />
                 <input
                   type="text"
                   placeholder="ID, Name, or 10-digit Phone..."
                   disabled={customWalkInName.trim().length > 0}
                   value={selectedCustomer ? `[${selectedCustomer.Customer_Code}] ${selectedCustomer.Customer_Name}` : outletQuery}
                   onFocus={() => setShowOutletSuggestions(true)}
                   onClick={() => {
                     if (selectedCustomer) {
                       setCustomerCode("");
                       setOutletQuery("");
                     }
                     setShowOutletSuggestions(true);
                   }}
                   onChange={(e) => {
                     setOutletQuery(e.target.value);
                     setCustomerCode("");
                     setShowOutletSuggestions(true);
                   }}
                   className="w-full bg-zinc-950 text-white border border-zinc-800 rounded-xl pl-9 pr-3 py-2.5 outline-none focus:border-amber-glow h-10 font-bold disabled:opacity-40"
                 />
                 {selectedCustomer && (
                   <button
                     onClick={() => {
                       setCustomerCode("");
                       setOutletQuery("");
                       setShowOutletSuggestions(true);
                     }}
                     className="absolute right-3 top-3 text-[9px] uppercase font-bold text-rose-400 hover:text-rose-300"
                   >
                     Reset
                   </button>
                 )}
               </div>
 
               {/* Suggestions dropdown matching Name, ID, or Contact phones */}
               {showOutletSuggestions && !customerCode && !customWalkInName.trim() && (
                 <div 
                   className="absolute left-0 mt-1 w-full bg-zinc-950 border border-zinc-800 rounded-xl max-h-[220px] overflow-y-auto z-50 shadow-2xl divide-y divide-zinc-900"
                   onMouseLeave={() => setShowOutletSuggestions(false)}
                 >
                   {customerSuggestions.length === 0 ? (
                     <div className="p-3 text-zinc-600 text-center italic">No matching outlets.</div>
                   ) : (
                     customerSuggestions.map(cust => (
                       <div
                         key={cust.Customer_Code}
                         onClick={() => {
                           setCustomerCode(cust.Customer_Code);
                           setOutletQuery(`[${cust.Customer_Code}] ${cust.Customer_Name}`);
                           setShowOutletSuggestions(false);
                         }}
                         className="p-2.5 text-[11px] text-zinc-300 hover:bg-zinc-900 cursor-pointer flex justify-between items-center"
                       >
                         <div>
                           <strong className="text-white block uppercase">{cust.Customer_Name}</strong>
                           <span className="text-[9px] text-zinc-500 font-sans">Phone: {cust.Contact || "N/A"}</span>
                         </div>
                         <span className="text-zinc-400 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded text-[9px]">ID: {cust.Customer_Code}</span>
                       </div>
                     ))
                   )}
                 </div>
               )}
             </div>
 
             {/* Type-in custom walk-in name for counter sales */}
             {route === "Counter" && (
               <div className="space-y-1.5 animate-fadeIn">
                 <label className="text-amber-glow uppercase tracking-wide block font-extrabold text-[10px]">
                   📝 Or Input Walk-in Customer name
                 </label>
                 <input
                   type="text"
                   placeholder="Type new custom walk-in client..."
                   value={customWalkInName}
                   onChange={(e) => {
                     setCustomWalkInName(e.target.value);
                     if (e.target.value) {
                       setCustomerCode("");
                       setOutletQuery("");
                     }
                   }}
                   className="w-full bg-zinc-950 text-white border border-zinc-800 rounded-xl px-3 py-2.5 outline-none focus:border-amber-glow h-10 font-bold"
                 />
               </div>
             )}

            {/* Automatic vs Manual Date selection */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-zinc-450 uppercase tracking-widest font-bold text-[10px]">Voucher Date</label>
                <button
                  type="button"
                  onClick={() => setDateMode(dateMode === "auto" ? "manual" : "auto")}
                  className="text-[9px] text-amber-glow uppercase hover:underline"
                >
                  {dateMode === "auto" ? "Switch Manual" : "Switch Auto"}
                </button>
              </div>

              {dateMode === "auto" ? (
                <div className="bg-zinc-950 text-emerald-400 font-bold border border-zinc-850 rounded-xl px-3 py-2 h-10 flex items-center justify-between">
                  <span>Automatic (Today)</span>
                  <span>14-Jun-2026</span>
                </div>
              ) : (
                <input
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="w-full bg-zinc-950 text-white border border-zinc-800 rounded-xl px-3 py-2 outline-none focus:border-amber-glow h-10 font-bold"
                />
              )}
            </div>
          </div>

          {/* ITEM ROW MATRIX */}
          <div className="space-y-4 pt-3">
            <div className="flex justify-between items-center border-b border-zinc-805 pb-2">
              <span className="text-xs font-bold uppercase font-mono text-zinc-300 tracking-wider">Item SKUs & Case Rates Exception Grid</span>
              <button
                type="button"
                onClick={handleAddRow}
                className="bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 px-3 py-1.5 text-[10px] font-bold text-amber-glow rounded-xl flex items-center space-x-1 cursor-pointer"
              >
                <Plus size={12} />
                <span>Add SKU Item Row</span>
              </button>
            </div>

            <div className="space-y-3">
              {draftItems.map((item, idx) => {
                const productOptions = PRODUCTS.filter(p => !item.brand || p.Brand === item.brand);
                const activeSku = PRODUCTS.find(p => p.Item_Code === item.productCode);
                const isParleAgro = ["Frooti", "Smoodh", "Bailey", "Appy Fizz"].includes(activeSku?.Brand || "");
                const defaultRate = getCalculatedPrice(customerCode, item.productCode);

                return (
                  <div key={idx} className="bg-zinc-950 p-4 rounded-xl border border-zinc-850 space-y-3 font-mono text-[11px] relative">
                    {draftItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        className="absolute right-3.5 top-3 text-rose-455 hover:text-rose-400"
                        title="Remove Invoice Row"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Product Name SKU dropdown (Only show clean dynamic name list) */}
                      <div className="md:col-span-2">
                        <label className="text-zinc-500 block mb-1 uppercase tracking-wider text-[9px]">Product Name</label>
                        <select
                          value={item.productCode}
                          onChange={(e) => handleRowChange(idx, "productCode", e.target.value)}
                          className="w-full bg-zinc-900 text-white rounded border border-zinc-800 p-1.5 outline-none text-xs font-black"
                        >
                          <option value="">-- Choose Product Name --</option>
                          {PRODUCTS.map((p, pIdx) => (
                            <option key={pIdx} value={p.Item_Code}>{getSimplifiedProductName(p.Item_Name)}</option>
                          ))}
                        </select>
                      </div>

                      {/* Pack Volume Details */}
                      <div>
                        <label className="text-zinc-500 block mb-1 uppercase tracking-wider text-[9px]">Pack volume details</label>
                        <div className="bg-zinc-900 p-1.5 border border-zinc-800 rounded text-zinc-400 font-bold h-8 flex items-center justify-center">
                          {activeSku ? `${activeSku.Volume_ml}ml [Pack: ${activeSku.Case_Pack}]` : "Choose product"}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 border-t border-zinc-900">
                      {/* Total Cases */}
                      <div>
                        <label className="text-zinc-550 block mb-1 text-[9px]">Total Cases</label>
                        <input
                          type="number"
                          placeholder="Sum cases"
                          value={item.cases || ""}
                          onChange={(e) => handleRowChange(idx, "cases", e.target.value)}
                          className="w-full bg-zinc-900 text-white font-bold p-1.5 rounded border border-zinc-800 text-center text-xs"
                        />
                      </div>

                      {/* Offer Pack (Free pieces / promo) for Parle Argo */}
                      <div>
                        <label className="text-zinc-555 block mb-1 text-[9px] flex items-center gap-0.5">
                          <span>Offer Pack (Free)</span>
                          <HelpCircle size={10} className="text-zinc-500" title="Scheme pieces only available for Parle Agro brand lines." />
                        </label>
                        {isParleAgro ? (
                          <input
                            type="number"
                            placeholder="Promo pcs"
                            value={item.offerPieces || ""}
                            onChange={(e) => handleRowChange(idx, "offerPieces", e.target.value)}
                            className="w-full bg-zinc-900 text-white border border-zinc-800 rounded p-1.5 text-center text-xs text-amber-glow font-bold"
                          />
                        ) : (
                          <div className="bg-zinc-900/60 text-zinc-600 text-center p-1.5 rounded border border-zinc-900/70 h-8 flex items-center justify-center">
                            N/A (Parle Only)
                          </div>
                        )}
                      </div>

                      {/* Rate (Show Default Contract or let write manually) */}
                      <div>
                        <label className="text-zinc-550 block mb-1 text-[9px]">Rate override (e.g. ₹320)</label>
                        <input
                          type="number"
                          placeholder={`contract: ₹${defaultRate}`}
                          value={item.useManualRate ? item.manualRate : ""}
                          onChange={(e) => handleRowChange(idx, "manualRate", e.target.value)}
                          className="w-full bg-zinc-900 text-white font-bold border border-zinc-800 rounded p-1.5 text-xs text-center"
                        />
                      </div>

                      {/* Show GST % and Total Amount */}
                      <div className="flex items-center justify-between col-span-1 pt-1.5">
                        <div className="text-center flex-1">
                          <span className="text-zinc-550 uppercase tracking-widest text-[8px] block">GST %</span>
                          <strong className="text-zinc-300 text-xs block mt-1">{activeSku ? `${activeSku.GST_Percent}%` : "-"}</strong>
                        </div>
                        <div className="text-right flex-1 border-l border-zinc-900 pl-2">
                          <span className="text-zinc-550 uppercase tracking-widest text-[8px] block">Sum (Tax inc)</span>
                          <strong className="text-white text-xs block mt-1">
                            ₹{activeSku ? (item.cases * (item.useManualRate ? item.manualRate : defaultRate)).toLocaleString() : "0"}
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dispatch Vehicle Choice (Conditional on Voucher selection) */}
          {voucherType === "order" && (
            <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-xl space-y-2 font-mono text-xs animate-fade-in text-zinc-300">
              <span className="text-xs font-bold text-white uppercase block">Dispatch Route & Assign to fleet truck</span>
              <p className="text-[10px] text-zinc-500">Pick which delivery beat vehicle's loading manifests this sales order should attach to.</p>
              <select
                value={assignedVehicle}
                onChange={(e) => setAssignedVehicle(e.target.value as any)}
                className="bg-zinc-900 text-white border border-zinc-800 rounded px-3 py-1.5 cursor-pointer outline-none w-full max-w-sm mt-1 text-xs"
              >
                <option value="Sinhgad">Sinhgad Route vehicle (v1)</option>
                <option value="Purandar">Purandar Route vehicle (v2)</option>
                <option value="Rajgad">Rajgad Route vehicle (v3)</option>
                <option value="Counter">Counter sales dispatch line</option>
              </select>
            </div>
          )}

          {/* MODE OF PAYMENT SECTION */}
          {voucherType === "invoice" ? (
            <div className="bg-zinc-950 rounded-2xl p-5 border border-zinc-850 space-y-4 font-mono text-xs">
              <div className="border-b border-zinc-900 pb-2.5">
                <span className="text-xs font-bold text-white tracking-wider flex items-center gap-1.5 uppercase">
                  <Coins size={14} className="text-amber-glow" />
                  Select Mode of Transaction payment
                </span>
                <p className="text-[10px] text-zinc-500 mt-1">Specify whether cash was settled at warehouse counter, transfered online, paid by cheque or ledger credit.</p>
              </div>

              <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800 max-w-md">
                <button
                  type="button"
                  onClick={() => setPaymentMode("Cash")}
                  className={`flex-1 py-2 rounded-xl font-bold uppercase transition col-span-1 text-[10px] ${paymentMode === "Cash" ? "bg-amber-glow text-zinc-950 font-bold" : "text-zinc-400 hover:text-white"}`}
                >
                  Cash
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode("Online")}
                  className={`flex-1 py-2 rounded-xl font-bold uppercase transition col-span-1 text-[10px] ${paymentMode === "Online" ? "bg-amber-glow text-zinc-950 font-bold" : "text-zinc-400 hover:text-white"}`}
                >
                  Online (UPI)
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode("Cheque")}
                  className={`flex-1 py-2 rounded-xl font-bold uppercase transition col-span-1 text-[10px] ${paymentMode === "Cheque" ? "bg-amber-glow text-zinc-950 font-bold" : "text-zinc-400 hover:text-white"}`}
                >
                  Cheque
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode("Credit")}
                  className={`flex-1 py-2 rounded-xl font-bold uppercase transition col-span-1 text-[10px] ${paymentMode === "Credit" ? "bg-rose-950/40 border border-rose-900/40 text-rose-400" : "text-zinc-400 hover:text-white"}`}
                >
                  Credit Account
                </button>
              </div>

              {/* Sub fields for payments */}
              {paymentMode === "Online" && (
                <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-3 animate-fade-in">
                  <strong className="text-white block text-xs">UPI/Online Reference Fields</strong>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-zinc-500 block mb-1 text-[10px]">Reference Transaction number/name</label>
                      <input
                        type="text"
                        placeholder="e.g. UPI-92931-REVENUE"
                        value={upiTxId}
                        onChange={(e) => setUpiTxId(e.target.value)}
                        className="w-full bg-zinc-950 text-white rounded p-2 border border-zinc-800 outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {paymentMode === "Cheque" && (
                <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-3 animate-fade-in">
                  <strong className="text-white block text-xs font-bold font-sans">Cheque settlement data ledger</strong>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-zinc-500 block mb-1 text-[10px]">Bank Name</label>
                      <input
                        type="text"
                        placeholder="HDFC, SBI, ICICI..."
                        value={chequeBank}
                        onChange={(e) => setChequeBank(e.target.value)}
                        className="w-full bg-zinc-950 text-white rounded p-2 border border-zinc-850 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-zinc-500 block mb-1 text-[10px]">Cheque Number</label>
                      <input
                        type="text"
                        placeholder="6-digit Cheque No."
                        value={chequeNum}
                        onChange={(e) => setChequeNum(e.target.value)}
                        className="w-full bg-zinc-950 text-white rounded p-2 border border-zinc-850 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-zinc-500 block mb-1 text-[10px]">Cheque date</label>
                      <input
                        type="date"
                        value={chequeDate}
                        onChange={(e) => setChequeDate(e.target.value)}
                        className="w-full bg-zinc-950 text-white rounded p-2 border border-zinc-850 outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {paymentMode === "Credit" && (
                <div className="p-4 bg-zinc-905/40 border border-rose-950/20 rounded-xl space-y-2 animate-fade-in">
                  <strong className="text-rose-400 block text-xs">A/R Settlement Promised Date</strong>
                  <p className="text-[10px] text-zinc-500">The customer will clear balances with driver next route day.</p>
                  <div className="max-w-xs mt-1">
                    <label className="text-zinc-500 block mb-1 text-[10px]">Promised Payoff Day</label>
                    <input
                      type="date"
                      value={creditPromisedDate}
                      onChange={(e) => setCreditPromisedDate(e.target.value)}
                      className="w-full bg-zinc-950 text-white rounded p-2 border border-zinc-850 outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-amber-950/20 border border-amber-900/40 p-5 rounded-2xl font-mono text-xs text-amber-500 leading-relaxed">
              📦 <strong>Pre-Sales Dispatch:</strong> Payment Mode is bypassed for active Sales Orders. Direct route driver and counter dispatches compute aggregate cash balances upon return close checkout.
            </div>
          )}

          <button
            onClick={handleSaveInvoice}
            className="w-full bg-amber-glow hover:bg-amber-500 font-extrabold text-zinc-950 uppercase text-xs py-3 rounded-2xl tracking-widest cursor-pointer shadow-xl transition"
          >
            {voucherType === "order" ? `Generate Sales Order & Dispatch Vehicle` : `Generate Bill Invoice & Ledger Entry`}
          </button>
        </div>

        {/* Right Hand Side: Summary overview of current build bill */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl font-mono text-xs text-zinc-300 flex flex-col justify-between">
          <div className="space-y-4">
            <span className="text-xs uppercase font-bold text-zinc-400 block border-b border-zinc-805 pb-2">Active Invoice Summary</span>
            {selectedCustomer ? (
              <div className="space-y-3">
                <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-850 space-y-2 text-[11px]">
                  <div className="flex justify-between">
                    <span>Customer outlet:</span>
                    <strong className="text-white uppercase font-sans text-[11px] truncate max-w-[150px]">{selectedCustomer.Customer_Name}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Contact Phone:</span>
                    <strong className="text-zinc-400">{selectedCustomer.Contact || "N/A"}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Credit Limit:</span>
                    <strong className="text-emerald-400">₹{creditRisk.limit.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Existing Ledger Outstanding:</span>
                    <strong className="text-zinc-300">₹{creditRisk.existingOutstanding.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>GST Registered ID:</span>
                    <strong className="text-amber-glow uppercase text-[9px]">{selectedCustomer.GST_Number || "Unregistered"}</strong>
                  </div>
                </div>

                {/* Credit Limit Usage gauge / meter */}
                <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-850 space-y-1.5 text-[11px]">
                  <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                    <span>CREDIT METER (PROJECTED DUES)</span>
                    <span className={creditRisk.isOverLimit ? "text-rose-400 font-bold" : "text-emerald-400"}>
                      {creditRisk.percentUsed.toFixed(0)}% Used
                    </span>
                  </div>
                  <div className="w-full bg-zinc-850 rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${creditRisk.isOverLimit ? "bg-rose-500" : "bg-emerald-500"}`}
                      style={{ width: `${Math.min(100, creditRisk.percentUsed)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] text-zinc-500">
                    <span>Available: ₹{Math.max(0, creditRisk.limit - creditRisk.projectedOutstanding).toLocaleString()}</span>
                    <span>Max: ₹{creditRisk.limit.toLocaleString()}</span>
                  </div>
                </div>

                {/* Active Credit Lock Signal banner */}
                {creditRisk.isOverLimit && (paymentMode === "Credit" || voucherType === "order") && (
                  <div className="bg-rose-950/20 border border-rose-900/30 p-3.5 rounded-xl space-y-2 border-l-4 border-rose-500 animate-pulse">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      <strong className="text-rose-400 text-[10px] uppercase font-bold tracking-wider">A/R CREDIT LIMIT OVERRUN LOCK</strong>
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-normal">
                      The projected dues (₹{creditRisk.projectedOutstanding.toLocaleString()}) violate credit policies.
                    </p>
                    <label className="flex items-center gap-2 pt-1 border-t border-rose-900/20 cursor-pointer select-none">
                      <input 
                        type="checkbox"
                        checked={overrideCreditLock}
                        onChange={(e) => setOverrideCreditLock(e.target.checked)}
                        className="rounded border-zinc-800 focus:ring-0 accent-rose-500 cursor-pointer"
                      />
                      <span className="text-[10px] text-rose-400 font-bold font-mono">FORCE AUTHORIZE OVERRUN</span>
                    </label>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-zinc-550 italic p-6 text-center border border-dashed border-zinc-850 rounded-xl">
                Awaiting B2B outlet search selection...
              </div>
            )}

            <div className="space-y-3 pt-3">
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Financial breakdown</span>
              <div className="space-y-2">
                <div className="flex justify-between text-zinc-400">
                  <span>Item rows count:</span>
                  <strong>{draftItems.filter(i => i.productCode).length} of {draftItems.length} lines</strong>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Estimated GST Value (Included):</span>
                  <strong>₹{draftDetails.totalGstAmount.toLocaleString("en-IN", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</strong>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Payment terms selected:</span>
                  <strong className="text-amber-glow font-bold uppercase">{paymentMode}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-805 pt-4 mt-6">
            <div className="flex justify-between items-center bg-zinc-950 p-4 rounded-xl border border-zinc-850">
              <span className="text-xs text-zinc-500 uppercase font-bold">Estimated Grand Total (₹)</span>
              <strong className="text-2xl font-bold font-sans text-white">
                ₹{draftDetails.totalAmount.toLocaleString("en-IN")}
              </strong>
            </div>

            <div className="text-[10px] text-zinc-550 pt-3 flex items-center justify-center space-x-1.5 font-sans">
              <ShieldCheck size={12} className="text-emerald-500" />
              <span>Verified double-entry bookkeeping constraints apply.</span>
            </div>
          </div>
        </div>
      </div>
        )
      )}

      {activeMode === "manage" && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="p-4 border-b border-zinc-850 flex items-center justify-between">
            <span className="font-bold text-amber-glow uppercase text-xs">Today's Sales Orders</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-950 text-zinc-500 uppercase border-b border-zinc-850">
                <tr>
                  <th className="p-4 font-bold">Order #</th>
                  <th className="p-4 font-bold">Customer Outlet</th>
                  <th className="p-4 font-bold">Total Amount</th>
                  <th className="p-4 font-bold">Due/Credit</th>
                  <th className="p-4 font-bold">Order Status</th>
                  <th className="p-4 text-right font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850">
                {invoices.filter(i => i.Date === selectedDate).length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center italic text-zinc-600">No sales orders generated for this date.</td></tr>
                ) : (
                  invoices.filter(i => i.Date === selectedDate).map(inv => (
                    <tr key={inv.BillId} className="hover:bg-zinc-800/50">
                      <td className="p-4 font-mono">SWAD-{inv.BillId}</td>
                      <td className="p-4 font-bold uppercase">{inv.CustomerName}</td>
                      <td className="p-4">₹{inv.TotalAmount.toLocaleString()}</td>
                      <td className="p-4 text-rose-400 font-bold">₹{inv.CreditAmount.toLocaleString()}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${inv.Status === 'Delivered' ? 'bg-emerald-950 text-emerald-400' : inv.Status === 'Cancelled' ? 'bg-rose-950 text-rose-400' : inv.Status === 'Outlet Closed' ? 'bg-amber-950 text-amber-400' : 'bg-zinc-800 text-zinc-300'}`}>
                          {inv.Status || "Draft/Pending"}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button onClick={() => setSelectedManageInvoice(inv)} className="bg-zinc-800 hover:bg-zinc-700 font-bold px-3 py-1.5 rounded-lg text-[10px] text-white">Manage Order</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Selected Order Manage Modal */}
      {selectedManageInvoice && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl w-full max-w-2xl text-white space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <h2 className="text-sm font-bold uppercase text-amber-glow tracking-wider">
                Manage Order / Invoice SWAD-{selectedManageInvoice.BillId}
              </h2>
              <button onClick={() => setSelectedManageInvoice(null)} className="text-zinc-500 hover:text-white text-xl">&times;</button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-850">
                <span className="text-zinc-500 block">Customer</span>
                <strong className="text-sm uppercase font-sans">{selectedManageInvoice.CustomerName}</strong>
              </div>
              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-850">
                <span className="text-zinc-500 block">Current Status</span>
                <strong className={`text-sm uppercase font-sans ${selectedManageInvoice.Status === 'Delivered' ? 'text-emerald-400' : 'text-amber-glow'}`}>
                  {selectedManageInvoice.Status || "Draft/Pending"}
                </strong>
              </div>
            </div>

            {/* Change Status */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold text-zinc-400 uppercase">Update Order State</h3>
              <div className="flex gap-2 text-[10px] font-bold">
                <button onClick={() => handleUpdateManageInvoiceStatus("Delivered")} className="flex-1 py-2 bg-emerald-950/50 hover:bg-emerald-900 border border-emerald-900 text-emerald-400 rounded-lg">Mark Delivered</button>
                <button onClick={() => handleUpdateManageInvoiceStatus("Order Revised")} className="flex-1 py-2 bg-indigo-950/50 hover:bg-indigo-900 border border-indigo-900 text-indigo-400 rounded-lg">Order Revised</button>
                <button onClick={() => handleUpdateManageInvoiceStatus("Outlet Closed")} className="flex-1 py-2 bg-amber-950/50 hover:bg-amber-900 border border-amber-900 text-amber-400 rounded-lg">Outlet Closed</button>
                <button onClick={() => handleUpdateManageInvoiceStatus("Cancelled")} className="flex-1 py-2 bg-rose-950/50 hover:bg-rose-900 border border-rose-900 text-rose-400 rounded-lg">Cancel Order</button>
              </div>
            </div>

            {/* Receive Payment / Add to Ledger */}
            <div className="space-y-3 pt-4 border-t border-zinc-800">
              <h3 className="text-xs font-bold justify-between flex text-emerald-400 uppercase">
                <span>Receive Payment for Delivered Order</span>
                <span>Due Balance: ₹{selectedManageInvoice.CreditAmount.toLocaleString()}</span>
              </h3>
              
              <div className="grid grid-cols-4 gap-2">
                {["Cash", "UPI", "Cheque"].map(m => (
                  <button
                    key={m}
                    onClick={() => setManagePaymentMode(m as any)}
                    className={`col-span-1 py-2 text-[10px] font-bold rounded-lg border flex items-center justify-center ${managePaymentMode === m ? 'bg-amber-glow text-zinc-950 border-amber-glow' : 'bg-zinc-950 border-zinc-800 text-zinc-400'}`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  value={managePaymentAmount || ""}
                  onChange={(e) => setManagePaymentAmount(Math.max(0, parseInt(e.target.value) || 0))}
                  placeholder="Amount"
                  className="bg-zinc-950 border border-zinc-800 focus:border-amber-glow outline-none text-white px-3 py-2 rounded-lg text-sm flex-1 font-mono"
                />
                <button onClick={handleApplyManagePayment} className="bg-emerald-600 hover:bg-emerald-500 font-bold px-4 py-2 rounded-lg text-xs uppercase cursor-pointer">
                  Execute Collection
                </button>
              </div>
              <p className="text-[9px] text-zinc-500 block leading-tight">If payment is received for an order and a balance amount remains, the remaining debt footprint is automatically managed and tracked inside the Credit Ledger.</p>
            </div>
            
            {/* View/Edit SKUs */}
            <div className="space-y-3 pt-4 border-t border-zinc-800">
              <h3 className="text-xs font-bold text-zinc-400 uppercase mb-2">Order Items (Manage SKUs)</h3>
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 max-h-40 overflow-y-auto font-mono text-[10px]">
                {Object.entries(selectedManageInvoice.Items).map(([sku, qty]) => {
                  const prod = PRODUCTS.find(p => p.Item_Code === sku);
                  return (
                    <div key={sku} className="flex justify-between items-center py-1.5 border-b border-zinc-850 last:border-0">
                      <span className="text-zinc-300">{prod ? prod.Item_Name : sku}</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={qty as number}
                          onChange={(e) => {
                            const newQty = Math.max(0, parseInt(e.target.value) || 0);
                            setSelectedManageInvoice(prev => {
                              if (!prev) return prev;
                              const newItems = { ...prev.Items, [sku]: newQty };
                              return { ...prev, Items: newItems };
                            });
                          }}
                          className="w-16 bg-zinc-900 border border-zinc-700 text-white text-center rounded px-1 outline-none focus:border-amber-glow"
                        />
                        <span className="text-zinc-500">Cases</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button 
                onClick={() => {
                  // Recalculate Total
                  let newTotal = 0;
                  Object.entries(selectedManageInvoice.Items).forEach(([sku, qty]) => {
                    const price = selectedManageInvoice.UnitPrices[sku] || 0;
                    newTotal += (qty as number) * price;
                  });
                  const updatedInvoice = { ...selectedManageInvoice, TotalAmount: newTotal, CreditAmount: Math.max(0, newTotal - (selectedManageInvoice.CashReceived + selectedManageInvoice.UPIReceived + selectedManageInvoice.ChequeReceived)) };
                  
                  onUpdateInvoice(updatedInvoice);
                  setSelectedManageInvoice(updatedInvoice);
                  handleUpdateManageInvoiceStatus("Order Revised");
                  alert("Order SKUs revised successfully! Total re-calculated.");
                }}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold py-2 rounded-lg text-xs"
              >
                Save Revised SKU Details
              </button>
            </div>

            {/* Share & Print Section */}
            <div className="space-y-3 pt-4 border-t border-zinc-800 font-mono text-xs">
              <h3 className="text-xs font-bold text-amber-glow uppercase">Print Documents & WhatsApp dispatcher</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  onClick={() => handlePrintThermal(selectedManageInvoice)}
                  className="bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 text-zinc-200 font-bold py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer text-[11px]"
                >
                  <Printer size={13} className="text-amber-glow" />
                  Thermal Receipt (58mm)
                </button>
                <button
                  onClick={() => handlePrintStandardPdf(selectedManageInvoice)}
                  className="bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 text-zinc-200 font-bold py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer text-[11px]"
                >
                  <FileSpreadsheet size={13} className="text-amber-glow" />
                  Standard Invoice (A4)
                </button>
                <button
                  onClick={() => handleShareWhatsApp(selectedManageInvoice)}
                  className="bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 text-zinc-200 font-bold py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer text-[11px]"
                >
                  <Share2 size={13} className="text-amber-glow" />
                  Share to WhatsApp
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
