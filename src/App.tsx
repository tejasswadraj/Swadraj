import { syncERPToGoogleSheets } from "./utils/sheetsSync";

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from "react";
import { DailyServiceSheet, DailyServiceRow, SalesInvoice, CollectionHistory, RatesOverride, Customer, Expense, Supplier, PurchaseOrder, Employee, AdvanceRecord, PayrollRecord, Vehicle, Warehouse, SupplierCreditNote } from "./types";
import { getSeedSheets, getSeedInvoices, getSeedCollections } from "./data/mockState";
import { RATES_OVERRIDES, CUSTOMERS, SUPPLIERS } from "./data/masterData";
import { calculateDailyRow, getSheetNameForDate } from "./utils/math";
import Dashboard from "./components/Dashboard";
import StockReconciliation from "./components/StockReconciliation";
import BillingEngine from "./components/BillingEngine";
import ARCollections from "./components/ARCollections";
import ServiceReport from "./components/ServiceReport";
import RegisterOutlet from "./components/RegisterOutlet";
import FinanceDesk from "./components/FinanceDesk";
import SupplierPurchases from "./components/SupplierPurchases";
import Inventory from "./components/Inventory";
import AttendanceReport from "./components/AttendanceReport";
import PayrollManagement from "./components/PayrollManagement";
import DailyReports from "./components/DailyReports";
import LogReport from "./components/LogReport";
import ConnectedRegistries from "./components/ConnectedRegistries";

import { 
  Building2, 
  LayoutDashboard, 
  Database, 
  ListOrdered, 
  ReceiptIndianRupee, 
  Coins, 
  UserSquare,
  Clock,
  Menu,
  X,
  Truck,
  ShieldCheck,
  ClipboardCheck,
  Users,
  UserPlus,
  Activity,
  FileText,
  MapPin,
  Server,
  Info,
  ChevronLeft,
  ChevronRight,
  UserCheck
} from "lucide-react";

export default function App() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [payrollSubTab, setPayrollSubTab] = useState<"roster" | "compensation">("roster");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isDesignModalOpen, setIsDesignModalOpen] = useState<boolean>(false);

  // Role Simulator Account State
  const [activeRole, setActiveRole] = useState<"Admin" | "Warehouse" | "Logistics">("Admin");

  // Core system databases state
  const [sheets, setSheets] = useState<DailyServiceSheet[]>([]);
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [collections, setCollections] = useState<CollectionHistory[]>([]);
  const [rateExceptions, setRateExceptions] = useState<RatesOverride[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);

  // First-class entity Registers State
  const [vehicles, setVehicles] = useState<Vehicle[]>([
    { Id: "veh_1", Name: "Sinhgad", RegistrationNumber: "MH-14-GX-1102", PrimaryDriverId: "emp_1", PrimarySalespersonId: "emp_1", LoadCapacityCases: 150, Status: "At-warehouse" },
    { Id: "veh_2", Name: "Rajgad", RegistrationNumber: "MH-14-GX-8840", PrimaryDriverId: "emp_2", PrimarySalespersonId: "emp_2", LoadCapacityCases: 180, Status: "At-warehouse" },
    { Id: "veh_3", Name: "Purandar", RegistrationNumber: "MH-14-GX-5519", PrimaryDriverId: "emp_3", PrimarySalespersonId: "emp_3", LoadCapacityCases: 150, Status: "At-warehouse" },
  ]);

  const [warehouses, setWarehouses] = useState<Warehouse[]>([
    { Id: "wh_1", Name: "Warehouse 1 (Main Godown)", Location: "Gate No. 4, Pimpri Chinchwad Industrial Area, Pune", AssignedStaffIds: ["emp_4"], CapacityCases: 5000, Status: "Active" },
    { Id: "wh_2", Name: "Warehouse 2 (Secondary Space)", Location: "Building B, Moshi Toll Plaza Depot, Pune", AssignedStaffIds: [], CapacityCases: 2500, Status: "Active" },
  ]);

  const [supplierCreditNotes, setSupplierCreditNotes] = useState<SupplierCreditNote[]>([
    {
      Id: "SCN-0001",
      SupplierCode: "SUP001",
      SupplierName: "Parle Agro Pvt Ltd (Juices, Soda & Dairy)",
      Date: "2026-06-12",
      ProductsReturned: [
        { ItemCode: "PTFR-0065-72-05", ItemName: "Frooti Fresh Mango Drink Pet 65ml", QuantityCases: 10, Reason: "Expired" }
      ],
      CreditAmount: 3100,
      Notes: "Return of expired mango bottles accepted by depot coordinator Shinde.",
      Status: "Applied"
    }
  ]);
  
  
  const [employees, setEmployees] = useState<Employee[]>([
    { Id: "emp_1", Name: "Ramesh Shinde", Role: "Driver (Sinhgad)", Department: "Logistics", JoiningDate: "2024-01-10", StandardDailyWage: 800, Status: "Active" },
    { Id: "emp_2", Name: "Sunil Patil", Role: "Driver (Rajgad)", Department: "Logistics", JoiningDate: "2024-02-15", StandardDailyWage: 800, Status: "Active" },
    { Id: "emp_3", Name: "Sachin Yadav", Role: "Driver (Purandar)", Department: "Logistics", JoiningDate: "2024-03-20", StandardDailyWage: 800, Status: "Active" },
    { Id: "emp_4", Name: "Ramesh Patil", Role: "Warehouse Handler", Department: "Warehouse", JoiningDate: "2024-01-05", StandardDailyWage: 600, Status: "Active" },
    { Id: "emp_5", Name: "Amit K.", Role: "Admin Clerk", Department: "Admin", JoiningDate: "2024-05-12", StandardDailyWage: 700, Status: "Active" },
  ]);

  const [advances, setAdvances] = useState<AdvanceRecord[]>([
    { Id: "adv_1", EmployeeId: "emp_5", Date: "2026-06-14", Amount: 3500, Reason: "Family emergency", Status: "Pending" }
  ]);

  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);

  const [attendanceLog, setAttendanceLog] = useState<any[]>([
    { name: "Ramesh Shinde", role: "Driver (Sinhgad)", date: "2026-06-14", status: "Present", hours: 12, notes: "Delivered standard dairy routes" },
    { name: "Sunil Patil", role: "Driver (Rajgad)", date: "2026-06-14", status: "Present", hours: 12, notes: "Completed morning loading shift" },
    { name: "Sachin Yadav", role: "Driver (Purandar)", date: "2026-06-14", status: "Present", hours: 12, notes: "Cleared standard water crates" },
    { name: "Ramesh Patil", role: "Warehouse Handler", date: "2026-06-14", status: "Present", hours: 8, notes: "Organized incoming fresh stock" },
    { name: "Amit K.", role: "Admin Clerk", date: "2026-06-14", status: "Present", hours: 8, notes: "Updated ledger entries" },
    
    { name: "Ramesh Shinde", role: "Driver (Sinhgad)", date: "2026-06-13", status: "Present", hours: 11, notes: "Delivered standard dairy" },
    { name: "Sunil Patil", role: "Driver (Rajgad)", date: "2026-06-13", status: "Present", hours: 12, notes: "Completed morning loading shift" },
    { name: "Sachin Yadav", role: "Driver (Purandar)", date: "2026-06-13", status: "Present", hours: 12, notes: "Cleared standard water crates" },
    { name: "Ramesh Patil", role: "Warehouse Handler", date: "2026-06-13", status: "Half-Day", hours: 4, notes: "Shift leave for dentist" },
    { name: "Amit K.", role: "Admin Clerk", date: "2026-06-13", status: "Present", hours: 8, notes: "Updated ledger entries" },

    { name: "Ramesh Shinde", role: "Driver (Sinhgad)", date: "2026-06-12", status: "Present", hours: 12, notes: "Delivered standard dairy" },
    { name: "Sunil Patil", role: "Driver (Rajgad)", date: "2026-06-12", status: "Absent", hours: 0, notes: "Sick leave" },
    { name: "Sachin Yadav", role: "Driver (Purandar)", date: "2026-06-12", status: "Present", hours: 12, notes: "Cleared standard water crates" },
    { name: "Ramesh Patil", role: "Warehouse Handler", date: "2026-06-12", status: "Present", hours: 8, notes: "Organized incoming fresh stock" },
    { name: "Amit K.", role: "Admin Clerk", date: "2026-06-12", status: "Present", hours: 8, notes: "Updated ledger entries" },
  ]);

  // Selected DSR sheet name (defaults to "1306" or the latest sheet)
  const [activeSheetName, setActiveSheetName] = useState<string>("1306");

  // Temporal Cycle Phase Management States
  const [currentPhase, setCurrentPhase] = useState<number>(2); // 1 = Pre-Market, 2 = Market Execution, 3 = Reconciliation
  const [bypassPhaseLock, setBypassPhaseLock] = useState<boolean>(false);

  // Vault Cash Logs state for Phase 1 Pre-Market
  const [vaultCashLogs, setVaultCashLogs] = useState<any[]>([
    { Id: "vcl_1", SecurityStaff: "Ramesh Patil", Amount: 25000, Type: "Opening Vault Draw", Confirmed: true, Timestamp: "08:15 AM" },
    { Id: "vcl_2", SecurityStaff: "Amit K.", Amount: 14500, Type: "Transit Cash Carry Cashier", Confirmed: true, Timestamp: "08:45 AM" }
  ]);

  // Previous Day Returns processing state for Phase 1
  const [returnUnsoldStock, setReturnUnsoldStock] = useState<any[]>([
    { SKU: "PTFR-0065-72-05", Brand: "Frooti", Cases: 4, Pieces: 12, Route: "Sinhgad", Status: "Processed", Time: "09:10 AM" },
    { SKU: "PTBA-1000-12-20", Brand: "Bailey", Cases: 8, Pieces: 0, Route: "Purandar", Status: "Processed", Time: "09:30 AM" }
  ]);

  // Google Sheets link configurations
  const [spreadsheetId, setSpreadsheetId] = useState<string>("1Bxd_YsnshmYgU9K9V0G_m3g-XG5gq7r_8pWp5Yx3I");
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isGAuthenticated, setIsGAuthenticated] = useState<boolean>(false);

  // Check Google Auth status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          setIsGAuthenticated(true);
        }
      } catch (e) {
        console.error("Auth check failed:", e);
      }
    };
    checkAuth();
  }, []);

  const handleGoogleLogin = async () => {
    try {
      const res = await fetch("/api/auth/google/url");
      const { url } = await res.json();
      window.location.href = url;
    } catch (e) {
      alert("Failed to initiate Google Login");
    }
  };

  const handleSync = async () => {
    if (!spreadsheetId) {
      alert("Please provide a Spreadsheet ID first.");
      return;
    }
    setIsSyncing(true);
    try {
      await syncERPToGoogleSheets(
        spreadsheetId,
        null, // Token handled by server cookies
        reconciledSheets,
        invoices,
        collections,
        rateExceptions
      );
      alert("Successfully synchronized data to Google Sheets!");
    } catch (e: any) {
      console.error("Sync error:", e);
      alert(`Sync Error: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Initialize data with core seeded values on boot
  useEffect(() => {
    setSheets(getSeedSheets());
    setInvoices(getSeedInvoices());
    setCollections(getSeedCollections());
    setRateExceptions(RATES_OVERRIDES);
    setCustomers(CUSTOMERS);
    setSuppliers(SUPPLIERS);
    setPurchaseOrders([
      {
        PO_Number: "PO-2026-0001",
        Date: "2026-06-13",
        Supplier_Code: "SUP001",
        Supplier_Name: "Parle Agro Pvt Ltd (Juices, Soda & Dairy)",
        Items: [
          {
            Item_Code: "PTFR-0330-24-40",
            Item_Name: "Frooti Fresh Mango Drink Pet 330ml",
            Brand: "Frooti",
            Case_Pack: 24,
            Quantity_Cases: 40,
            Purchase_Rate: 310.0,
            Total_Before_Tax: 12400.0,
            GST_Percent: 12,
            GST_Amount: 1488.0,
            Total_Amount: 13888.0
          },
          {
            Item_Code: "PTSM-0250-24-15",
            Item_Name: "Smoodh Silk Chocolate Shake 250ml",
            Brand: "Smoodh",
            Case_Pack: 24,
            Quantity_Cases: 30,
            Purchase_Rate: 235.0,
            Total_Before_Tax: 7050.0,
            GST_Percent: 12,
            GST_Amount: 846.0,
            Total_Amount: 7896.0
          }
        ],
        Total_Before_Tax: 19450.0,
        Total_GST: 2334.0,
        Grand_Total: 21784.0,
        Status: "Draft",
        Expected_Delivery: "2026-06-15",
        Notes: "Initial warehouse stock replenish order"
      }
    ]);
    
    // Seed standard baseline operations expenses
    setExpenses([
      {
        Id: "exp_base_1",
        Date: "2026-06-12",
        Category: "Fixed Warehouse Rent",
        Amount: 18000,
        Description: "Swadraj wholesale warehouse monthly lease payment",
        VehicleOrLocation: "Counter/Warehouse"
      },
      {
        Id: "exp_base_2",
        Date: "2026-06-13",
        Category: "Employee Wages",
        Amount: 2400,
        Description: "Daily wage distribution for loaders & handlers",
        EmployeeName: "Ramesh Shinde"
      },
      {
        Id: "exp_base_3",
        Date: "2026-06-14",
        Category: "Vehicle Fuel",
        Amount: 1650,
        Description: "Sinhgad delivery vehicle diesel refill",
        VehicleOrLocation: "Sinhgad Vehicle"
      },
      {
        Id: "exp_base_4",
        Date: "2026-06-14",
        Category: "Cost of Electricity",
        Amount: 4200,
        Description: "Main warehouse & retail counter electricity bill",
        VehicleOrLocation: "Counter/Warehouse"
      },
      {
        Id: "exp_base_5",
        Date: "2026-06-14",
        Category: "Advance Taken",
        Amount: 3500,
        Description: "Salary advance taken for family emergency",
        EmployeeName: "Amit K."
      }
    ]);
  }, []);

  // Sync route billing quantities backward to the DSR sheet whenever invoices or sheets update.
  // This aggregates sold case-units of active beats in real-time, enforcing mathematical alignment!
  const reconciledSheets = useMemo(() => {
    return sheets.map(sheet => {
      const updatedRows = sheet.rows.map(row => {
        // Aggregate items count from invoices logged for this tab day & route node
        let sSale = 0;
        let pSale = 0;
        let rSale = 0;

        invoices.forEach(inv => {
          if (inv.Date === sheet.date) {
            const count = inv.Items[row.Item_Code] || 0;
            if (inv.Route === "Sinhgad") sSale += count;
            else if (inv.Route === "Purandar") pSale += count;
            else if (inv.Route === "Rajgad") rSale += count;
          }
        });

        const draftRow = {
          ...row,
          Sinhgad_Sale: sSale,
          Purandar_Sale: pSale,
          Rajgad_Sale: rSale,
        };

        // Re-evaluate operational formulas
        return calculateDailyRow(draftRow);
      });

      return {
        ...sheet,
        rows: updatedRows
      };
    });
  }, [sheets, invoices]);

  // Read active sheet object
  const activeSheetObj = useMemo(() => {
    return reconciledSheets.find(s => s.sheetName === activeSheetName) || reconciledSheets[reconciledSheets.length - 1];
  }, [reconciledSheets, activeSheetName]);

  // Date representation for Billing default
  const activeDateString = useMemo(() => {
    if (activeSheetObj) return activeSheetObj.date;
    return "2026-06-14";
  }, [activeSheetObj]);

  const handleUpdateSheet = (updated: DailyServiceSheet) => {
    setSheets(prev => prev.map(s => {
      if (s.sheetName === updated.sheetName) {
        return {
          ...updated,
          // Scrub calculated route collections back to flat row so they get aggregated dynamically
          rows: updated.rows.map(r => ({
            ...r,
            Sinhgad_Sale: r.Sinhgad_Sale,
            Purandar_Sale: r.Purandar_Sale,
            Rajgad_Sale: r.Rajgad_Sale
          }))
        };
      }
      return s;
    }));
  };

  const handleAddInvoice = (newInv: SalesInvoice) => {
    setInvoices(prev => [...prev, newInv]);
  };

  // Log AR payment collections and amortize credit outstandings
  const handleAddCollection = (billId: number, colAmount: number, method: "Cash" | "UPI" | "Cheque") => {
    // 1. Amortize bill's credit balance
    setInvoices(prev => prev.map(inv => {
      if (inv.BillId === billId) {
        const remainingCredit = Math.max(0, inv.CreditAmount - colAmount);
        const totalPaid = inv.CashReceived + inv.UPIReceived + inv.ChequeReceived + colAmount;

        let status: "Paid" | "Partial" | "Pending" | "Void" = "Partial";
        if (remainingCredit <= 0) {
          status = "Paid";
        }

        return {
          ...inv,
          CreditAmount: remainingCredit,
          CashReceived: method === "Cash" ? inv.CashReceived + colAmount : inv.CashReceived,
          UPIReceived: method === "UPI" ? inv.UPIReceived + colAmount : inv.UPIReceived,
          ChequeReceived: method === "Cheque" ? inv.ChequeReceived + colAmount : inv.ChequeReceived,
          PaymentStatus: status
        };
      }
      return inv;
    }));

    // 2. Append ledger collection run entry
    const matchedBill = invoices.find(i => i.BillId === billId);
    if (matchedBill) {
      const newCol: CollectionHistory = {
        Id: `col_${Date.now()}`,
        Date: activeDateString,
        BillId: billId,
        CustomerCode: matchedBill.CustomerCode,
        CustomerName: matchedBill.CustomerName,
        AmountCollected: colAmount,
        Method: method,
        Notes: "Reconciliation sweep"
      };
      setCollections(prev => [...prev, newCol]);
    }
  };

  const handleAddSupplier = (newSup: Supplier) => {
    setSuppliers(prev => [...prev, newSup]);
  };

  const handleAddPurchaseOrder = (newPo: PurchaseOrder) => {
    setPurchaseOrders(prev => [...prev, newPo]);
  };

  const handleUpdatePurchaseOrder = (updatedPo: PurchaseOrder) => {
    setPurchaseOrders(prev => prev.map(po => po.PO_Number === updatedPo.PO_Number ? updatedPo : po));
  };

  const handlePostPOStockToDSR = (po: PurchaseOrder, targetDate: string) => {
    setSheets(prev => prev.map(sheet => {
      if (sheet.date === targetDate) {
        const updatedRows = sheet.rows.map(row => {
          const poMatch = po.Items.find(item => item.Item_Code === row.Item_Code);
          if (poMatch) {
            const currentPrimary = row.Primary || 0;
            const updatedRow = {
              ...row,
              Primary: currentPrimary + poMatch.Quantity_Cases
            };
            return calculateDailyRow(updatedRow);
          }
          return row;
        });
        return {
          ...sheet,
          rows: updatedRows
        };
      }
      return sheet;
    }));
  };

  // Core Daily Rollover Routine - Runs the Apps Script state carrieover logic
  const handleRollover = () => {
    if (!activeSheetObj) return;

    // Estimate next date (Add 1 day)
    const currentD = new Date(activeSheetObj.date);
    const nextD = new Date(currentD);
    nextD.setDate(currentD.getDate() + 1);

    const year = nextD.getFullYear();
    const month = String(nextD.getMonth() + 1).padStart(2, "0");
    const day = String(nextD.getDate()).padStart(2, "0");
    const nextDateStr = `${year}-${month}-${day}`;
    const nextSheetName = getSheetNameForDate(nextDateStr);

    // Guard against duplicates
    if (sheets.some(s => s.sheetName === nextSheetName)) {
      alert(`Ledger node for day ${nextSheetName} (${nextDateStr}) already exists in sequence!`);
      return;
    }

    const confirmRoll = window.confirm(
      `🔔 INIT REGIONAL ROLLOVER SCRIPT:\n\n` +
      `Rolling over day [${activeSheetObj.sheetName}] (${activeSheetObj.date}) to next day [${nextSheetName}] (${nextDateStr}).\n` +
      `This will carry over warehouse totals to Day System openings and active transit fleet returns to openers.\n\n` +
      `Do you accept this double-entry ledger rollover?`
    );

    if (!confirmRoll) return;

    // Construct next day's row entries using standard carryover formulas
    const nextRows = activeSheetObj.rows.map(lastRow => {
      // System Open (Col D) on Day T = Total Warehouse Closing (Col K) of Day T-1
      const carrySystem = lastRow.Total_Closing;

      // Vehicle Open (Col F) on Day T = Total Load In (Col J) of Day T-1
      const carryVehicle = lastRow.Total_Load_In;

      // Vehicles individual openers carry over Load In returns of previous run
      const carrySinhgadOpen = lastRow.Sinhgad_Load_In;
      const carryPurandarOpen = lastRow.Purandar_Load_In;
      const carryRajgadOpen = lastRow.Rajgad_Load_In;

      return calculateDailyRow({
        Brand: lastRow.Brand,
        Net_Qty: lastRow.Net_Qty,
        Case_Pack: lastRow.Case_Pack,
        Item_Code: lastRow.Item_Code,

        System: carrySystem,
        Open: carrySystem, // defaults physical openers
        Vehicle_Open: carryVehicle,
        Primary: 0,
        Counter_Sale: 0,

        Sinhgad_Open: carrySinhgadOpen,
        Sinhgad_Load1: 0,
        Sinhgad_Load2: 0,
        Sinhgad_Sale: 0,
        Sinhgad_Load_In: 0,

        Purandar_Open: carryPurandarOpen,
        Purandar_Load1: 0,
        Purandar_Load2: 0,
        Purandar_Sale: 0,
        Purandar_Load_In: 0,

        Rajgad_Open: carryRajgadOpen,
        Rajgad_Load1: 0,
        Rajgad_Load2: 0,
        Rajgad_Sale: 0,
        Rajgad_Load_In: 0,
      });
    });

    const nextSheet: DailyServiceSheet = {
      date: nextDateStr,
      sheetName: nextSheetName,
      rows: nextRows
    };

    setSheets(prev => [...prev, nextSheet]);
    setActiveSheetName(nextSheetName);
    alert(`Rollover complete! Created Day sheet ${nextSheetName}. Closing physical stocks carry-over verified.`);
  };

  const selectTab = (tab: string) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#07080a] text-[#e4e9f2] flex flex-col font-sans selection:bg-amber-glow/20 select-none">
          {/* Header bar */}
      <header className="bg-[#0b0c10]/95 backdrop-blur-md border-b border-zinc-850 text-white px-4 md:px-8 py-4 flex items-center justify-between shadow-md relative z-40">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-tr from-amber-500/20 to-amber-400/5 border border-amber-500/30 rounded-xl text-[#ffb300] status-flash glow-subtle">
            <Building2 size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#ffb300] font-mono">Swadraj Agencies</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <h1 className="text-sm md:text-base font-bold tracking-tight text-white uppercase">Operations & Logistics Hub</h1>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Active Simulated Role Selector */}
          <div className="flex items-center space-x-1.5 bg-zinc-900 border border-zinc-800 p-1 rounded-xl">
            <span className="text-[9px] font-bold text-zinc-400 uppercase px-2 font-mono hidden md:inline">SYSTEM NODE ACCESS:</span>
            <select
              value={activeRole}
              onChange={(e) => {
                const role = e.target.value as "Admin" | "Warehouse" | "Logistics";
                setActiveRole(role);
                if (role === "Admin") selectTab("dashboard");
                if (role === "Warehouse") selectTab("inventory");
                if (role === "Logistics") selectTab("service-report");
              }}
              className="bg-[#07080a] text-xs font-black text-amber-glow border-0 rounded-lg py-1 px-3 focus:ring-1 focus:ring-amber-500 outline-none cursor-pointer"
            >
              <option value="Admin">🖥️ Office Manager (Admin)</option>
              <option value="Warehouse">📦 Warehouse Staff</option>
              <option value="Logistics">🚚 Logistics Team (Field)</option>
            </select>
          </div>

          {/* Working hours badge */}
          <div className="hidden md:flex items-center space-x-2 bg-zinc-900/60 px-3 py-1.5 rounded-lg border border-zinc-800 text-zinc-400 text-xs font-mono">
            <Clock size={12} className="text-[#ffb300]" />
            <span>08:00 AM - 08:00 PM</span>
          </div>

          {/* Interactive design.md Documentation Button */}
          <button 
            onClick={() => setIsDesignModalOpen(true)}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-[#ffb300]/60 text-xs font-bold text-amber-glow transition active:scale-95 cursor-pointer"
            id="open-design-modal-btn"
            title="Open Swadraj ERP Design Ledger (design.md)"
          >
            <Info size={13} />
            <span className="hidden sm:inline font-mono text-[10px]">design.md</span>
          </button>

          <div className="hidden sm:flex items-center space-x-2 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            <span className="text-[10px] uppercase tracking-wider font-mono font-bold text-emerald-400">Live Sync Engaged</span>
          </div>

          {/* Hamburger button */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-lg md:hidden focus:outline-none transition active:scale-95 cursor-pointer"
            id="mobile-hamburger-btn"
          >
            {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex flex-col md:flex-row relative">
        
        {/* Mobile Backdrop Overlay */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-xs z-40 md:hidden transition-all"
            onClick={() => setIsMobileMenuOpen(false)}
            id="mobile-drawer-backdrop"
          />
        )}

        {/* Navigation Sidebar */}
        <nav className={`
          fixed inset-y-0 left-0 z-50 bg-[#0d0f13] border-r border-[#191b22] flex flex-col justify-between shadow-2xl transition-all duration-300 ease-in-out md:static md:translate-x-0 md:flex md:h-auto overflow-y-auto max-h-screen
          ${isSidebarCollapsed ? "md:w-20 p-3" : "md:w-64 p-5"}
          ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `} id="main-navigation-sidebar">
          <div className="space-y-4">
            {/* Section 1: Office Operations */}
            {activeRole === "Admin" && (
              <div className="space-y-1">
                <div className="text-[10px] font-black text-amber-glow/70 uppercase tracking-widest font-mono py-1 mb-1 border-b border-zinc-900 flex justify-between items-center px-1.5">
                  {isSidebarCollapsed ? <span>🖥️</span> : <span>🖥️ Office Operations</span>}
                  {!isSidebarCollapsed && <span className="text-[7px] px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-md font-mono uppercase font-black tracking-widest">Core</span>}
                </div>
                
                <button
                  onClick={() => selectTab("dashboard")}
                  title={isSidebarCollapsed ? "Dashboard" : ""}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold transition flex items-center space-x-2 cursor-pointer border ${
                    activeTab === "dashboard" ? "bg-amber-glow/10 text-amber-glow border-amber-glow/30" : "text-zinc-400 border-transparent hover:bg-zinc-950/40 hover:text-white"
                  } ${isSidebarCollapsed ? "justify-center p-2.5 space-x-0" : ""}`}
                  id="nav-tab-dashboard"
                >
                  <LayoutDashboard size={14} />
                  {!isSidebarCollapsed && <span>Dashboard</span>}
                </button>

                <button
                  onClick={() => selectTab("billing")}
                  title={isSidebarCollapsed ? "Sales Billing" : ""}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold transition flex items-center space-x-2 cursor-pointer border ${
                    activeTab === "billing" ? "bg-amber-glow/10 text-amber-glow border-amber-glow/30" : "text-zinc-400 border-transparent hover:bg-zinc-950/40 hover:text-white"
                  } ${isSidebarCollapsed ? "justify-center p-2.5 space-x-0" : ""}`}
                  id="nav-tab-billing"
                >
                  <ReceiptIndianRupee size={14} />
                  {!isSidebarCollapsed && <span>Sales Billing</span>}
                </button>

                <button
                  onClick={() => selectTab("ar")}
                  title={isSidebarCollapsed ? "Ledger & Outstanding" : ""}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold transition flex items-center space-x-2 cursor-pointer border ${
                    activeTab === "ar" ? "bg-amber-glow/10 text-amber-glow border-amber-glow/30" : "text-zinc-400 border-transparent hover:bg-zinc-950/40 hover:text-white"
                  } ${isSidebarCollapsed ? "justify-center p-2.5 space-x-0" : ""}`}
                  id="nav-tab-ar"
                >
                  <UserSquare size={14} />
                  {!isSidebarCollapsed && <span>Ledger & Outstanding</span>}
                </button>

                <button
                  onClick={() => selectTab("register-outlet")}
                  title={isSidebarCollapsed ? "Outlet Master Desk" : ""}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold transition flex items-center space-x-2 cursor-pointer border ${
                    activeTab === "register-outlet" ? "bg-amber-glow/10 text-amber-glow border-amber-glow/30" : "text-zinc-400 border-transparent hover:bg-zinc-950/40 hover:text-white"
                  } ${isSidebarCollapsed ? "justify-center p-2.5 space-x-0" : ""}`}
                  id="nav-tab-register-outlet"
                >
                  <Building2 size={14} />
                  {!isSidebarCollapsed && <span>Outlet Master Desk</span>}
                </button>

                <button
                  onClick={() => selectTab("finance")}
                  title={isSidebarCollapsed ? "Cash & Finance Desk" : ""}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold transition flex items-center space-x-2 cursor-pointer border ${
                    activeTab === "finance" ? "bg-amber-glow/10 text-amber-glow border-[#ffb300]/30" : "text-zinc-400 border-transparent hover:bg-zinc-950/40 hover:text-white"
                  } ${isSidebarCollapsed ? "justify-center p-2.5 space-x-0" : ""}`}
                  id="nav-tab-finance"
                >
                  <Coins size={14} />
                  {!isSidebarCollapsed && <span>Cash & Finance Desk</span>}
                </button>

                <button
                  onClick={() => selectTab("payroll")}
                  title={isSidebarCollapsed ? "Staff Attendance & Payroll" : ""}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold transition flex items-center space-x-2 cursor-pointer border ${
                    activeTab === "payroll" ? "bg-amber-glow/10 text-amber-glow border-amber-glow/30" : "text-zinc-400 border-transparent hover:bg-zinc-950/40 hover:text-white"
                  } ${isSidebarCollapsed ? "justify-center p-2.5 space-x-0" : ""}`}
                  id="nav-tab-payroll"
                >
                  <Users size={14} />
                  {!isSidebarCollapsed && <span>Staff & Payroll Node</span>}
                </button>

                <button
                  onClick={() => selectTab("procurement")}
                  title={isSidebarCollapsed ? "Supplier Purchase" : ""}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold transition flex items-center space-x-2 cursor-pointer border ${
                    activeTab === "procurement" ? "bg-amber-glow/10 text-amber-glow border-amber-glow/30" : "text-zinc-400 border-transparent hover:bg-zinc-950/40 hover:text-white"
                  } ${isSidebarCollapsed ? "justify-center p-2.5 space-x-0" : ""}`}
                  id="nav-tab-procurement"
                >
                  <Truck size={14} />
                  {!isSidebarCollapsed && <span>Supplier Purchase</span>}
                </button>

                <button
                  onClick={() => selectTab("registries")}
                  title={isSidebarCollapsed ? "Master Registries" : ""}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold transition flex items-center space-x-2 cursor-pointer border ${
                    activeTab === "registries" ? "bg-amber-glow/10 text-amber-glow border-amber-glow/30" : "text-zinc-400 border-transparent hover:bg-zinc-950/40 hover:text-white"
                  } ${isSidebarCollapsed ? "justify-center p-2.5 space-x-0" : ""}`}
                  id="nav-tab-registries"
                >
                  <Server size={14} />
                  {!isSidebarCollapsed && <span>Master Registries Desk</span>}
                </button>
              </div>
            )}

            {/* Section 2: Warehouse Deck */}
            {(activeRole === "Admin" || activeRole === "Warehouse") && (
              <div className="space-y-1">
                <div className="text-[10px] font-black text-amber-glow/70 uppercase tracking-widest font-mono py-1 mb-1 border-b border-zinc-900 flex justify-between items-center px-1.5">
                  {isSidebarCollapsed ? <span>📦</span> : <span>📦 Warehouse Deck</span>}
                  {!isSidebarCollapsed && <span className="text-[7px] px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded font-mono">Store</span>}
                </div>

                <button
                  onClick={() => selectTab("inventory")}
                  title={isSidebarCollapsed ? "Stock Holding SKUs" : ""}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold transition flex items-center space-x-2 cursor-pointer border ${
                    activeTab === "inventory" ? "bg-amber-glow/10 text-amber-glow border-amber-glow/30" : "text-zinc-400 border-transparent hover:bg-zinc-950/40 hover:text-white"
                  } ${isSidebarCollapsed ? "justify-center p-2.5 space-x-0" : ""}`}
                  id="nav-tab-inventory"
                >
                  <Database size={14} />
                  {!isSidebarCollapsed && <span>Stock Holding SKUs</span>}
                </button>

                <button
                  onClick={() => selectTab("reconcile")}
                  title={isSidebarCollapsed ? "Stock Reconciliation" : ""}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold transition flex items-center space-x-2 cursor-pointer border ${
                    activeTab === "reconcile" ? "bg-amber-glow/10 text-amber-glow border-amber-glow/30" : "text-zinc-400 border-transparent hover:bg-zinc-950/40 hover:text-white"
                  } ${isSidebarCollapsed ? "justify-center p-2.5 space-x-0" : ""}`}
                  id="nav-tab-reconcile"
                >
                  <ClipboardCheck size={14} />
                  {!isSidebarCollapsed && <span>Stock Reconciliation</span>}
                </button>
              </div>
            )}

            {/* Section 3: Service Team */}
            {(activeRole === "Admin" || activeRole === "Logistics") && (
              <div className="space-y-1">
                <div className="text-[10px] font-black text-amber-glow/70 uppercase tracking-widest font-mono py-1 mb-1 border-b border-zinc-900 flex justify-between items-center px-1.5">
                  {isSidebarCollapsed ? <span>🚚</span> : <span>🚚 Service & Fleet</span>}
                  {!isSidebarCollapsed && <span className="text-[7px] px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded font-mono font-bold">Logistics</span>}
                </div>

                <button
                  onClick={() => selectTab("service-report")}
                  title={isSidebarCollapsed ? "Vehicle Dispatch" : ""}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold transition flex items-center space-x-2 cursor-pointer border ${
                    activeTab === "service-report" ? "bg-amber-glow/10 text-amber-glow border-amber-glow/30" : "text-zinc-400 border-transparent hover:bg-zinc-950/40 hover:text-white"
                  } ${isSidebarCollapsed ? "justify-center p-2.5 space-x-0" : ""}`}
                  id="nav-tab-service-report"
                >
                  <ListOrdered size={14} />
                  {!isSidebarCollapsed && <span>Vehicle dispatch</span>}
                </button>
              </div>
            )}

            {/* Section 4: Reports & Audits */}
            {activeRole === "Admin" && (
              <div className="space-y-1">
                <div className="text-[10px] font-black text-amber-glow/70 uppercase tracking-widest font-mono py-1 mb-1 border-b border-zinc-900 flex justify-between items-center px-1.5">
                  {isSidebarCollapsed ? <span>📊</span> : <span>📊 Reports & Node</span>}
                  {!isSidebarCollapsed && <span className="text-[7px] px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded font-mono font-bold">Audit</span>}
                </div>

                <button
                  onClick={() => selectTab("daily-reports")}
                  title={isSidebarCollapsed ? "Daily Sales Sheets" : ""}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold transition flex items-center space-x-2 cursor-pointer border ${
                    activeTab === "daily-reports" ? "bg-amber-glow/10 text-amber-glow border-amber-glow/30" : "text-zinc-400 border-transparent hover:bg-zinc-950/40 hover:text-white"
                  } ${isSidebarCollapsed ? "justify-center p-2.5 space-x-0" : ""}`}
                  id="nav-tab-daily-reports"
                >
                  <FileText size={14} />
                  {!isSidebarCollapsed && <span>Daily Sales Sheets</span>}
                </button>

                <button
                  onClick={() => selectTab("log-report")}
                  title={isSidebarCollapsed ? "Operational Log Report" : ""}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold transition flex items-center space-x-2 cursor-pointer border ${
                    activeTab === "log-report" ? "bg-amber-glow/10 text-amber-glow border-amber-glow/30" : "text-zinc-400 border-transparent hover:bg-zinc-950/40 hover:text-white"
                  } ${isSidebarCollapsed ? "justify-center p-2.5 space-x-0" : ""}`}
                  id="nav-tab-log-report"
                >
                  <Activity size={14} />
                  {!isSidebarCollapsed && <span>Operational Log Report</span>}
                </button>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-zinc-850 flex flex-col space-y-3">
            {/* Collapse/Expand toggle action button */}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-amber-glow/40 text-zinc-500 hover:text-amber-glow transition-all active:scale-95 cursor-pointer font-mono text-[10px]"
              title={isSidebarCollapsed ? "Expand Navigation Panel" : "Collapse Navigation Panel"}
            >
              {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
              {!isSidebarCollapsed && <span>Collapse Menu</span>}
            </button>

            {!isSidebarCollapsed && (
              <div className="hidden md:block">
                <div className="flex items-center space-x-2 text-[10px] text-zinc-500 font-mono">
                  <Clock size={11} className="shrink-0" />
                  <span>Shift Operations:<br/>08:00 AM - 08:00 PM</span>
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* Tab Content window */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          {activeTab === "dashboard" && (
            <Dashboard 
              sheets={reconciledSheets} 
              invoices={invoices} 
              purchaseOrders={purchaseOrders}
              expenses={expenses}
              onNavigate={(tab) => setActiveTab(tab)}
              spreadsheetId={spreadsheetId}
              onUpdateSpreadsheetId={(id) => setSpreadsheetId(id)}
              isSyncing={isSyncing}
              onSync={handleSync}
              isGAuthenticated={isGAuthenticated}
              onGoogleLogin={handleGoogleLogin}
              currentPhase={currentPhase}
              activeDateString={activeDateString}
            />
          )}

          {activeTab === "daily-reports" && (
            <DailyReports 
              sheets={reconciledSheets} 
              invoices={invoices}
              collections={collections}
              expenses={expenses}
              employees={employees}
              attendanceLog={attendanceLog}
              payrollRecords={payrollRecords}
              activeSheetDate={activeDateString}
            />
          )}

          {activeTab === "inventory" && (
            <Inventory 
              sheets={reconciledSheets} 
              activeSheetName={activeSheetName} 
            />
          )}

          {activeTab === "reconcile" && (
            <StockReconciliation
              sheets={reconciledSheets}
              activeSheetName={activeSheetName}
              onSelectSheet={(name) => setActiveSheetName(name)}
              onUpdateSheet={handleUpdateSheet}
              onRollover={handleRollover}
            />
          )}

          {activeTab === "billing" && (
            <BillingEngine
              invoices={invoices}
              onAddInvoice={handleAddInvoice}
              onUpdateInvoice={(upd) => setInvoices(prev => prev.map(inv => inv.BillId === upd.BillId ? upd : inv))}
              selectedDate={activeDateString}
              customers={customers}
              currentPhase={currentPhase}
              bypassPhaseLock={bypassPhaseLock}
            />
          )}

          {activeTab === "ar" && (
            <ARCollections
              invoices={invoices}
              collections={collections}
              onAddCollection={handleAddCollection}
              selectedDate={activeDateString}
            />
          )}

          {activeTab === "service-report" && (
            <ServiceReport
              invoices={invoices}
              expenses={expenses}
              sheets={reconciledSheets}
              activeSheetName={activeSheetName}
              onUpdateInvoice={(upd) => setInvoices(prev => prev.map(inv => inv.BillId === upd.BillId ? upd : inv))}
              onAddInvoice={(newInv) => setInvoices(prev => [newInv, ...prev])}
              onAddExpense={(exp) => setExpenses(prev => [...prev, exp])}
              vehicles={vehicles}
              onUpdateVehicles={setVehicles}
              customers={customers}
            />
          )}

          {activeTab === "finance" && (
            <FinanceDesk
              invoices={invoices}
              expenses={expenses}
              purchaseOrders={purchaseOrders}
              collections={collections}
              customers={customers}
              onAddExpense={(exp) => setExpenses(prev => [...prev, exp])}
              onRemoveExpense={(id) => setExpenses(prev => prev.filter(e => e.Id !== id))}
              selectedDate={activeDateString}
            />
          )}

          {activeTab === "register-outlet" && (
            <RegisterOutlet
              customers={customers}
              onUpdateCustomer={(updatedCust) => {
                setCustomers(prev => prev.map(c => c.Customer_Code === updatedCust.Customer_Code ? updatedCust : c));
              }}
              onAddCustomer={(newCust) => setCustomers(prev => [...prev, newCust])}
              existingCustomersCount={customers.length}
              invoices={invoices}
              collections={collections}
              onAddCollection={handleAddCollection}
              selectedDate={activeDateString}
              rateExceptions={rateExceptions}
              onUpdateRateExceptions={(upd) => setRateExceptions(upd)}
            />
          )}

          {activeTab === "payroll" && (
            <div className="space-y-6 animate-fade-in">
              {/* Internal Subtab Switcher */}
              <div className="flex bg-[#0b0c10] border border-zinc-800 p-1 rounded-xl w-fit">
                <button
                  onClick={() => setPayrollSubTab("roster")}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
                    payrollSubTab === "roster" ? "bg-amber-glow text-black font-extrabold" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Clock size={13} />
                  <span>Daily Shift Roster</span>
                </button>
                <button
                  onClick={() => setPayrollSubTab("compensation")}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
                    payrollSubTab === "compensation" ? "bg-amber-glow text-black font-extrabold" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Coins size={13} />
                  <span>Payroll & Advances Node</span>
                </button>
              </div>

              {payrollSubTab === "roster" ? (
                <AttendanceReport
                  attendanceLog={attendanceLog}
                  onLogAttendance={(record) => setAttendanceLog(prev => [record, ...prev])}
                  selectedDate={activeDateString}
                />
              ) : (
                <PayrollManagement
                  employees={employees}
                  advances={advances}
                  payrollRecords={payrollRecords}
                  attendanceLog={attendanceLog}
                  onUpdateEmployees={setEmployees}
                  onUpdateAdvances={setAdvances}
                  onUpdatePayroll={setPayrollRecords}
                />
              )}
            </div>
          )}

          {activeTab === "procurement" && (
            <SupplierPurchases
              suppliers={suppliers}
              onAddSupplier={handleAddSupplier}
              purchaseOrders={purchaseOrders}
              onAddPurchaseOrder={handleAddPurchaseOrder}
              onUpdatePurchaseOrder={handleUpdatePurchaseOrder}
              activeSheetDate={activeDateString}
              onPostPOStockToDSR={handlePostPOStockToDSR}
              availableSheets={reconciledSheets}
            />
          )}

          {activeTab === "registries" && (
            <ConnectedRegistries
              vehicles={vehicles}
              onUpdateVehicles={setVehicles}
              warehouses={warehouses}
              onUpdateWarehouses={setWarehouses}
              supplierCreditNotes={supplierCreditNotes}
              onUpdateSupplierCreditNotes={setSupplierCreditNotes}
              employees={employees}
              suppliers={suppliers}
            />
          )}

          {activeTab === "log-report" && (
            <LogReport
              invoices={invoices}
              purchaseOrders={purchaseOrders}
              expenses={expenses}
              customers={customers}
              activeDateString={activeDateString}
            />
          )}
        </main>
      </div>

      {/* Design and Architecture Modal (design.md reader) */}
      {isDesignModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in" id="design-md-modal-overlay">
          <div className="bg-[#0b0c10] border border-zinc-800 rounded-3xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl relative">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-zinc-850 flex items-center justify-between bg-gradient-to-r from-zinc-950 to-zinc-900">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-[#ffb300]/10 border border-[#ffb300]/30 rounded-xl text-[#ffb300]">
                  <Server size={18} fill="currentColor" fillOpacity={0.1} />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase text-amber-glow tracking-wider font-mono text-[#ffb300]">Swadraj Agencies design.md spec</h3>
                  <p className="text-[10px] text-zinc-500 font-mono font-black">STATED SOURCE: /design.md</p>
                </div>
              </div>
              <button 
                onClick={() => setIsDesignModalOpen(false)}
                className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-red-500/50 text-zinc-400 hover:text-red-400 transition cursor-pointer"
                id="close-design-modal-btn"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body (Rich Custom Rendered Content) */}
            <div className="p-8 overflow-y-auto space-y-8 text-zinc-300 text-sm leading-relaxed" id="design-md-modal-body bg-[#07080a]">
              <div>
                <h4 className="text-xl font-bold text-white mb-2 tracking-tight">1. Brand & Unified Visual System</h4>
                <p className="mb-4">
                  Swadraj ERP implements a high-contrast <span className="text-[#ffb300] font-bold">Industrial Amber Dark Theme</span>. Deep slate grids and hazard amber accent points ensure high readability during late-evening deliveries and heavy warehouse operations.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-900 flex items-center space-x-2">
                    <span className="w-3.5 h-3.5 rounded bg-[#07080a] border border-zinc-850 shrink-0" />
                    <span className="text-[11px] font-mono font-bold text-zinc-400">Obsidian Black (#07080a)</span>
                  </div>
                  <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-900 flex items-center space-x-2">
                    <span className="w-3.5 h-3.5 rounded bg-[#ffb300] border border-zinc-850 shrink-0" />
                    <span className="text-[11px] font-mono font-bold text-zinc-400">Hazard Amber (#ffb300)</span>
                  </div>
                  <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-900 flex items-center space-x-2">
                    <span className="w-3.5 h-3.5 rounded bg-[#10b981] border border-zinc-850 shrink-0" />
                    <span className="text-[11px] font-mono font-bold text-zinc-400">Emerald Sync (#10b981)</span>
                  </div>
                </div>
              </div>

              <hr className="border-zinc-850" />

              <div>
                <h4 className="text-lg font-extrabold text-white mb-3">2. Fleet & Location Registries (Masters Dashboard)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 bg-zinc-950 border border-zinc-900 rounded-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 text-amber-glow opacity-5">
                      <Truck size={60} />
                    </div>
                    <h5 className="text-[11px] font-mono text-amber-glow uppercase tracking-widest font-black mb-2 text-[#ffb300]">🚛 Active Delivery Fleet</h5>
                    <ul className="space-y-2.5 font-mono text-xs">
                      <li className="flex justify-between border-b border-zinc-900 pb-1.5">
                        <span className="text-zinc-400">Sinhgad (MH-14-GX-1102)</span>
                        <span className="text-amber-glow">Driver: Ramesh</span>
                      </li>
                      <li className="flex justify-between border-b border-zinc-900 pb-1.5">
                        <span className="text-zinc-400">Rajgad (MH-14-GX-8840)</span>
                        <span className="text-amber-glow">Driver: Sunil</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-zinc-400">Purandar (MH-14-GX-5519)</span>
                        <span className="text-amber-glow">Driver: Sachin</span>
                      </li>
                    </ul>
                  </div>

                  <div className="p-5 bg-zinc-950 border border-zinc-900 rounded-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 text-amber-glow opacity-5">
                      <Building2 size={60} />
                    </div>
                    <h5 className="text-[11px] font-mono text-amber-glow uppercase tracking-widest font-black mb-2 text-[#ffb300]">🏢 Connected Warehouses</h5>
                    <ul className="space-y-2.5 font-mono text-xs">
                      <li className="flex flex-col border-b border-zinc-900 pb-1.5">
                        <span className="text-zinc-100 font-bold">Main Godown 1 (Active)</span>
                        <span className="text-zinc-500 text-[10px]">Pimpri PCNTDA Area (5K cases limit)</span>
                      </li>
                      <li className="flex flex-col">
                        <span className="text-zinc-100 font-bold">Depot 2 Secondary Space</span>
                        <span className="text-zinc-500 text-[10px]">Moshi Toll Plaza Annex (2.5K cases)</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <hr className="border-zinc-850" />

              <div>
                <h4 className="text-lg font-extrabold text-white mb-3">3. FMCG Trade Promotions & Schemes</h4>
                <p className="mb-3">
                  Distributors run schemes to boost retailer volumes. The ERP's Sales Billing Engine checks active SKU offer specifications to inject free trade boxes seamlessly.
                </p>
                <div className="p-4 bg-zinc-950 border border-zinc-850 rounded-xl space-y-2 text-xs font-mono">
                  <div className="flex justify-between text-zinc-400">
                    <span>Scheme Mechanism:</span>
                    <span className="text-zinc-100">Buy-Get Free Master Schema</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Field Attribute:</span>
                    <span className="text-amber-glow font-bold">Offer_Buy_Qty + Offer_Free_Qty</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Bypass Parameter:</span>
                    <span className="text-zinc-100">Activated for qualifying product SKU categories</span>
                  </div>
                </div>
              </div>

              <hr className="border-zinc-850" />

              <div className="p-5 bg-gradient-to-tr from-yellow-500/5 to-[#ffb300]/0 border border-yellow-500/20 rounded-2xl">
                <h4 className="text-xs font-black uppercase text-amber-glow tracking-widest font-mono mb-2 text-[#ffb300]">💡 Operational Node Notice</h4>
                <p className="text-xs leading-relaxed text-zinc-400">
                  You can explore this ERP node as an <strong>Office Manager</strong>, <strong>Warehouse Handler</strong>, or <strong>Logistics delivery driver</strong>. Switch simulated roles in the top header menu to immediately notice user task isolation.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-zinc-850 flex justify-end bg-zinc-950/70">
              <button 
                onClick={() => setIsDesignModalOpen(false)}
                className="px-5 py-2 text-xs font-bold bg-[#ffb300] hover:bg-[#ffa000] text-black rounded-xl transition cursor-pointer"
                id="close-design-btn-footer"
              >
                Close Document
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
