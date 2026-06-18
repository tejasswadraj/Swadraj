/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Product {
  Item_Code: string; // e.g. "PTFR-0065-72-05"
  Item_Name: string; // e.g. "FROOTI PET 65ML"
  Brand: string; // e.g. "Frooti"
  Packaging_Type: string; // e.g. "Pet", "Tetra", "Can"
  Volume_ml: number; // Single unit volume
  Case_Pack: number; // Units per case
  MRP: number; // Maximum Retail Price
  GST_Percent: number; // e.g. 5, 12, 18, 40
  HSN_Code: string; // Harmonized 8 digit
  Supplier_Code: string; // e.g. "SUP001"
  Sale_Rate_Wholesale?: number; // Standard wholesale price from RATES Row 4
  Sale_Rate_Retail?: number; // Standard retail price (optional)
  Purchase_Rate?: number; // Standard purchased rate from factory for P&L tracking
  Offer_Buy_Qty?: number; // Buy X Cases (e.g. 12)
  Offer_Free_Qty?: number; // Get Y Cases free (e.g. 1)
  Offer_Active?: boolean; // Promotional scheme active status
}

export interface Customer {
  Customer_Code: string; // e.g. "104"
  Customer_Name: string; // Outlet Name
  Beat: string; // "Sinhgad Beat", "Purandar Beat", "Rajgad Beat", etc.
  Contact?: string;
  Geolocated_Code?: string;
  Credit_Limit?: number; // Default e.g. 5000
  Secondary_Phone?: string;
  Postal_Address?: string;
  Outlet_Photo?: string;
  GST_Number?: string;
  FSSAI_Number?: string;
  Shopact_Uddyam?: string;
}

export interface Expense {
  Id: string;
  Date: string; // YYYY-MM-DD
  Category: 
    | "Fixed Warehouse Rent" 
    | "Employee Wages" 
    | "Cost of Electricity" 
    | "Vehicle Maintenance" 
    | "Vehicle Fuel" 
    | "Advance Taken" 
    | "Other Expenses"
    | "Warehouse Rent" 
    | "Vehicle Fuel & Maintenance" 
    | "Extra Expense";
  Amount: number;
  Description: string;
  VehicleOrLocation?: "Counter/Warehouse" | "Sinhgad Vehicle" | "Purandar Vehicle" | "Rajgad Vehicle" | "None";
  EmployeeName?: string;
}

export interface Supplier {
  Supplier_Code: string;
  Supplier_Name: string;
  Lead_Times: string;
  Contact?: string;
  Email?: string;
  Address?: string;
}

export interface PurchaseOrderItem {
  Item_Code: string;
  Item_Name: string;
  Brand: string;
  Case_Pack: number;
  Quantity_Cases: number;
  Purchase_Rate: number; // Cost price per case
  Total_Before_Tax: number;
  GST_Percent: number;
  GST_Amount: number;
  Total_Amount: number; // Tax inclusive total
}

export interface PurchaseOrder {
  PO_Number: string; // e.g. "PO-2026-0001"
  Date: string; // YYYY-MM-DD
  Supplier_Code: string;
  Supplier_Name: string;
  Items: PurchaseOrderItem[];
  Total_Before_Tax: number;
  Total_GST: number;
  Grand_Total: number;
  Status: "Draft" | "Sent" | "Received" | "Cancelled";
  Expected_Delivery: string;
  Notes?: string;
  Sync_To_DSR?: boolean; // if stock was applied to active DSR's primary column
  Synced_Sheet_Date?: string; // which sheet it was applied to
}

export interface DailyServiceRow {
  // Brand & SKU metadata
  Brand: string;
  Net_Qty: string; // Specific size description (Net_Qty corresponds to Item_Code or name)
  Case_Pack: number;
  Item_Code: string; // Internal foreign key to find the product

  // Central Godown Node
  System: number; // Lookup to previous day's Total Closing
  Open: number; // Physical warehouse opening stock (entered manually)
  Vehicle_Open: number; // Lookup to previous day's total Load In (return)
  Primary: number; // New purchased stock received (entered manually)
  Total_Open: number; // Open + Vehicle_Open + Primary
  Total_Load_Out: number; // Combined vehicle dispatches (Load 1 & 2 for all route vehicles)
  Total_Load_In: number; // Unsold returns from route vehicles (consolidated)
  Total_Closing: number; // Open + Primary - Total_Load_Out + Total_Load_In - Counter_Sale
  Total_Sale: number; // Counter_Sale + Sinhgad_Sale + Purandar_Sale + Rajgad_Sale (reconciled from Sales)
  Counter_Sale: number; // Cash sold at godown counter (entered manually)

  // Sinhgad Vehicle (v1)
  Sinhgad_Open: number; // Carried over from yesterday's return
  Sinhgad_Load1: number; // Dispatch batch 1
  Sinhgad_Load2: number; // Dispatch batch 2
  Sinhgad_Sale: number; // Sales completed on Sinhgad route (reconciled from Sales)
  Sinhgad_Load_In: number; // Returing unsold stock (entered manually)

  // Purandar Vehicle (v2)
  Purandar_Open: number;
  Purandar_Load1: number;
  Purandar_Load2: number;
  Purandar_Sale: number;
  Purandar_Load_In: number;

  // Rajgad Vehicle (v3)
  Rajgad_Open: number;
  Rajgad_Load1: number;
  Rajgad_Load2: number;
  Rajgad_Sale: number;
  Rajgad_Load_In: number;
}

export interface DailyServiceSheet {
  date: string; // serial date or YYYY-MM-DD
  sheetName: string; // "ddmm" e.g., "1206"
  rows: DailyServiceRow[];
}

export interface SalesInvoice {
  BillId: number; // Auto-incrementing
  Date: string; // YYYY-MM-DD or DD/MM/YYYY
  CustomerCode: string;
  CustomerName: string;
  Route: "Sinhgad" | "Purandar" | "Rajgad" | "Counter";
  Items: { [skuCode: string]: number }; // sku_code -> quantity sold (in cases)
  UnitPrices: { [skuCode: string]: number }; // sku_code -> actual price charged per case
  TotalAmount: number; // calculated via pricing engine
  CashReceived: number;
  UPIReceived: number;
  ChequeReceived: number;
  CreditAmount: number; // TotalAmount - (Cash + UPI + Cheque)
  PaymentStatus: "Paid" | "Partial" | "Pending" | "Void";
  AuditStatus: "OK" | "⚠️ BALANCE ERROR";
  Time?: string; // Delivery time e.g., "11:20 AM"
  Status?: "Cancelled" | "Outlet Closed" | "Order Revised" | "Delivered";
}

export interface RatesOverride {
  CustomerCode: string;
  PricingOverrides: { [itemCode: string]: number }; // itemCode -> customer price per case
}

export interface ArRecord {
  InvoiceDate: string;
  BillId: number;
  CustomerCode: string;
  CustomerName: string;
  OriginalValue: number;
  CreditBalance: number; // Amount still owed
  PaymentCollected: number; // Sum of collections
  AgingDays: number; // CurrentDate - InvoiceDate
  Status: "✅ Fully Reconciled" | "🚨 High Credit Risk" | "⚠️ Over Credit Limit" | "Active Credit";
}

export interface CollectionHistory {
  Id: string;
  Date: string;
  BillId: number;
  CustomerCode: string;
  CustomerName: string;
  AmountCollected: number;
  Method: "Cash" | "UPI" | "Cheque";
  Notes?: string;
}

export interface Employee {
  Id: string;
  Name: string;
  Role: string;
  Phone?: string;
  Department: "Logistics" | "Sales" | "Warehouse" | "Admin";
  JoiningDate: string;
  StandardDailyWage: number;
  BankName?: string;
  AccountNumber?: string;
  IFSC?: string;
  AadharNumber?: string;
  PFNumber?: string;
  Status: "Active" | "Inactive" | "Resigned";
}

export interface AdvanceRecord {
  Id: string;
  EmployeeId: string;
  Date: string;
  Amount: number;
  Reason: string;
  Status: "Pending" | "Deducted" | "Waived";
  DeductedInPayrollId?: string; // Links to a specific payroll run
}

export interface PayrollRecord {
  Id: string;
  EmployeeId: string;
  Month: string; // e.g. "June 2026"
  Year: number;
  TotalPresentDays: number;
  TotalHalfDays: number;
  GrossWages: number;
  TotalAdvancesDeducted: number;
  NetPayout: number;
  PaymentStatus: "Draft" | "Processed" | "Paid" | "Hold";
  PaymentDate?: string;
  PaymentMethod?: "Cash" | "Bank Transfer" | "UPI";
}

export interface Vehicle {
  Id: string;
  Name: string; // "Rajgad" | "Sinhgad" | "Purandar"
  RegistrationNumber: string; // e.g. "MH-14-GU-4521"
  PrimaryDriverId: string; // References Employee.Id
  PrimarySalespersonId: string; // References Employee.Id
  LoadCapacityCases: number; // e.g. 150
  Status: "Active" | "In-field" | "At-warehouse" | "Breakdown";
}

export interface Warehouse {
  Id: string;
  Name: string; // "Warehouse 1 (Main Godown)" | "Warehouse 2 (Secondary Space)"
  Location: string; // Physical address
  AssignedStaffIds: string[]; // References Employee.Id[]
  CapacityCases: number;
  Status: "Active" | "Maintenance" | "Inactive";
}

export interface SupplierCreditNote {
  Id: string; // e.g. "SCN-0001"
  SupplierCode: string;
  SupplierName: string;
  Date: string; // YYYY-MM-DD
  ProductsReturned: {
    ItemCode: string;
    ItemName: string;
    QuantityCases: number;
    Reason: "Expired" | "Damaged" | "Excess Supply";
  }[];
  CreditAmount: number; // calculated refund/outstanding reduction
  Notes?: string;
  Status: "Pending" | "Applied" | "Settled";
}
