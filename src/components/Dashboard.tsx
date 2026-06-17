/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from "react";
import { DailyServiceSheet, SalesInvoice, Product, PurchaseOrder, Expense } from "../types";
import { PRODUCTS, CUSTOMERS } from "../data/masterData";
import { calculateCreditRisk } from "../utils/math";
import { 
  TrendingUp, 
  Truck, 
  Package, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight,
  Sparkles,
  Database,
  ChevronRight,
  Eye,
  Edit2,
  X,
  CreditCard,
  ShoppingBag,
  Info
} from "lucide-react";
import DailyWorkFlowChecklist from "./DailyWorkFlowChecklist";

interface DashboardProps {
  sheets: DailyServiceSheet[];
  invoices: SalesInvoice[];
  purchaseOrders: PurchaseOrder[];
  expenses: Expense[];
  onNavigate: (tab: string) => void;
  spreadsheetId: string;
  onUpdateSpreadsheetId: (id: string) => void;
  isSyncing: boolean;
  onSync: () => void;
  isGAuthenticated?: boolean;
  onGoogleLogin?: () => void;
  onUpdateInvoice?: (inv: SalesInvoice) => void;
  currentPhase: number;
  activeDateString: string;
}

export default function Dashboard({ 
  sheets, 
  invoices, 
  purchaseOrders = [],
  expenses = [],
  onNavigate,
  spreadsheetId,
  onUpdateSpreadsheetId,
  isSyncing,
  onSync,
  isGAuthenticated,
  onGoogleLogin,
  onUpdateInvoice,
  currentPhase,
  activeDateString
}: DashboardProps) {
  // Modal visibility states
  const [activeOverlay, setActiveOverlay] = useState<null | "billing" | "purchase" | "warehouse" | "fleet">(null);
  const [editingInvoice, setEditingInvoice] = useState<SalesInvoice | null>(null);

  // Edit invoice local form fields
  const [editCash, setEditCash] = useState<number>(0);
  const [editUPI, setEditUPI] = useState<number>(0);
  const [editCheque, setEditCheque] = useState<number>(0);
  const [editRoute, setEditRoute] = useState<"Sinhgad" | "Purandar" | "Rajgad" | "Counter">("Counter");

  // State to hold selected credit customer for collection details modal
  const [selectedCollectionCustomer, setSelectedCollectionCustomer] = useState<{ name: string; invoices: SalesInvoice[] } | null>(null);

  // Individual payment auditing mode helper state on dashboard clicks
  const [auditModeFilter, setAuditModeFilter] = useState<null | "Cash" | "UPI" | "Cheque" | "Credit">(null);

  // 1. Current Sheet details (Today's DSR)
  const currentSheet = useMemo(() => {
    if (sheets.length === 0) return null;
    return sheets[sheets.length - 1]; // Latest DSR sheet
  }, [sheets]);

  // 2. Financial Metrics Sums
  const financialMetrics = useMemo(() => {
    let salesToday = 0;
    let transactionsTodayCount = 0;
    let totalCreditOwed = 0;
    let totalCashReceived = 0;
    let totalUPIReceived = 0;
    let totalChequeReceived = 0;

    // Filter invoices for today
    const todayStr = currentSheet?.date || "";
    
    invoices.forEach(inv => {
      totalCreditOwed += inv.CreditAmount;
      totalCashReceived += inv.CashReceived;
      totalUPIReceived += inv.UPIReceived;
      totalChequeReceived += inv.ChequeReceived;

      if (inv.Date === todayStr) {
        salesToday += inv.TotalAmount;
        transactionsTodayCount++;
      }
    });

    const grossTurnover = invoices.reduce((sum, inv) => sum + inv.TotalAmount, 0);
    const totalPurchasesAmount = purchaseOrders.reduce((sum, po) => sum + po.Grand_Total, 0);

    return {
      salesToday,
      transactionsTodayCount,
      totalCreditOwed,
      totalCashReceived,
      totalUPIReceived,
      totalChequeReceived,
      grossTurnover,
      totalPurchasesAmount
    };
  }, [invoices, currentSheet, purchaseOrders]);

  // 3. Stock Level Counts
  const stockMetrics = useMemo(() => {
    if (!currentSheet) return { outOfStock: 0, runLow: 0, items: [] };

    let outOfStock = 0;
    let runLow = 0;
    const itemsList: { code: string; name: string; brand: string; open: number; loadIn: number; sold: number; stock: number; status: string }[] = [];

    currentSheet.rows.forEach(row => {
      const stock = row.Total_Closing;
      const product = PRODUCTS.find(p => p.Item_Code === row.Item_Code);
      const name = product?.Item_Name || row.Net_Qty;
      
      let status = "In Stock";
      if (stock === 0) {
        outOfStock++;
        status = "No Stock";
      } else if (stock <= 10) {
        runLow++;
        status = "Low Stock";
      }

      itemsList.push({
        code: row.Item_Code,
        name,
        brand: row.Brand,
        open: row.Open,
        loadIn: row.Total_Load_In,
        sold: row.Total_Sale,
        stock,
        status
      });
    });

    return {
      outOfStock,
      runLow,
      items: itemsList
    };
  }, [currentSheet]);

  // 4. Transit Fleet Inventory
  const fleetMetrics = useMemo(() => {
    if (!currentSheet) {
      return { sinhgad: { items: 0, amt: 0, open: 0, loadIn: 0, sale: 0 }, purandar: { items: 0, amt: 0, open: 0, loadIn: 0, sale: 0 }, rajgad: { items: 0, amt: 0, open: 0, loadIn: 0, sale: 0 }, counter: { items: 0, amt: 0, open: 0, loadIn: 0, sale: 0 }, total: 0 };
    }

    let sinhgadItems = 0;
    let purandarItems = 0;
    let rajgadItems = 0;
    let counterItems = 0;

    let sinhgadOpen = 0; let sinhgadLoadIn = 0; let sinhgadSale = 0;
    let purandarOpen = 0; let purandarLoadIn = 0; let purandarSale = 0;
    let rajgadOpen = 0; let rajgadLoadIn = 0; let rajgadSale = 0;
    let counterSale = 0;

    currentSheet.rows.forEach(row => {
      // Stock remaining on vehicle = Open + Load 1 + Load 2 - Sales - Load In
      sinhgadItems += (row.Sinhgad_Open + row.Sinhgad_Load1 + row.Sinhgad_Load2 - row.Sinhgad_Sale - row.Sinhgad_Load_In);
      purandarItems += (row.Purandar_Open + row.Purandar_Load1 + row.Purandar_Load2 - row.Purandar_Sale - row.Purandar_Load_In);
      rajgadItems += (row.Rajgad_Open + row.Rajgad_Load1 + row.Rajgad_Load2 - row.Rajgad_Sale - row.Rajgad_Load_In);
      counterItems += row.Counter_Sale;

      sinhgadOpen += row.Sinhgad_Open;
      sinhgadLoadIn += (row.Sinhgad_Load1 + row.Sinhgad_Load2);
      sinhgadSale += row.Sinhgad_Sale;

      purandarOpen += row.Purandar_Open;
      purandarLoadIn += (row.Purandar_Load1 + row.Purandar_Load2);
      purandarSale += row.Purandar_Sale;

      rajgadOpen += row.Rajgad_Open;
      rajgadLoadIn += (row.Rajgad_Load1 + row.Rajgad_Load2);
      rajgadSale += row.Rajgad_Sale;

      counterSale += row.Counter_Sale;
    });

    // Approximate values assuming general ₹320 billing rate per case
    const avgRate = 320;

    return {
      sinhgad: {
        items: Math.max(0, sinhgadItems),
        open: sinhgadOpen,
        loadIn: sinhgadLoadIn,
        sale: sinhgadSale,
        amt: Math.max(0, sinhgadItems) * avgRate
      },
      purandar: {
        items: Math.max(0, purandarItems),
        open: purandarOpen,
        loadIn: purandarLoadIn,
        sale: purandarSale,
        amt: Math.max(0, purandarItems) * avgRate
      },
      rajgad: {
        items: Math.max(0, rajgadItems),
        open: rajgadOpen,
        loadIn: rajgadLoadIn,
        sale: rajgadSale,
        amt: Math.max(0, rajgadItems) * avgRate
      },
      counter: {
        items: Math.max(0, counterItems),
        open: 0,
        loadIn: 0,
        sale: counterSale,
        amt: Math.max(0, counterItems) * avgRate
      },
      total: Math.max(0, sinhgadItems + purandarItems + rajgadItems)
    };
  }, [currentSheet]);

  // 5. AR Outstanding Aging list (credit log with cleared credits removed)
  const agedArRecords = useMemo(() => {
    return invoices
      .filter(inv => inv.CreditAmount > 0)
      .map(inv => {
        const invoiceDate = new Date(inv.Date);
        const todayDate = new Date("2026-06-14");
        const diffTime = todayDate.getTime() - invoiceDate.getTime();
        const agingDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

        return {
          invoiceDate: inv.Date,
          billId: inv.BillId,
          customerCode: inv.CustomerCode,
          customerName: inv.CustomerName,
          originalValue: inv.TotalAmount,
          creditBalance: inv.CreditAmount,
          agingDays,
          status: inv.CreditAmount === 0 ? "✅ Cleared / Paid" : calculateCreditRisk(inv.CreditAmount, agingDays)
        };
      })
      .sort((a, b) => b.agingDays - a.agingDays); // oldest first
  }, [invoices]);

  // Aggregate credit accounts collection grouped by customer
  const customerCollections = useMemo(() => {
    const grouped: { [customerCode: string]: { customerCode: string; name: string; outstanding: number; billsCount: number; invoices: SalesInvoice[] } } = {};
    invoices.forEach(inv => {
      if (inv.CreditAmount > 0) {
        if (!grouped[inv.CustomerCode]) {
          grouped[inv.CustomerCode] = {
            customerCode: inv.CustomerCode,
            name: inv.CustomerName,
            outstanding: 0,
            billsCount: 0,
            invoices: []
          };
        }
        grouped[inv.CustomerCode].outstanding += inv.CreditAmount;
        grouped[inv.CustomerCode].billsCount += 1;
        grouped[inv.CustomerCode].invoices.push(inv);
      }
    });
    return Object.values(grouped).sort((a, b) => b.outstanding - a.outstanding);
  }, [invoices]);

  // Click to edit invoice trigger
  const handleOpenEditInvoice = (inv: SalesInvoice) => {
    setEditingInvoice(inv);
    setEditCash(inv.CashReceived);
    setEditUPI(inv.UPIReceived);
    setEditCheque(inv.ChequeReceived);
    setEditRoute(inv.Route);
  };

  const handleSaveInvoiceEdit = () => {
    if (!editingInvoice || !onUpdateInvoice) return;
    const totalAmt = editingInvoice.TotalAmount;
    const newCredit = Math.max(0, totalAmt - (editCash + editUPI + editCheque));
    
    let status: "Paid" | "Partial" | "Pending" | "Void" = "Pending";
    if (totalAmt === 0) status = "Void";
    else if (newCredit <= 0) status = "Paid";
    else if (editCash + editUPI + editCheque > 0) status = "Partial";

    const updated: SalesInvoice = {
      ...editingInvoice,
      CashReceived: editCash,
      UPIReceived: editUPI,
      ChequeReceived: editCheque,
      Route: editRoute,
      CreditAmount: newCredit,
      PaymentStatus: status
    };

    onUpdateInvoice(updated);
    setEditingInvoice(null);
  };

  // Precomputations for Transit Fleet Sold highlight and Total Expenses
  const { totalVehicleSoldQty, totalVehicleSoldAmount } = useMemo(() => {
    let q = 0;
    let a = 0;
    invoices.forEach(inv => {
      if (inv.Route !== "Counter" && (inv.Status === undefined || inv.Status === "Delivered" || inv.Status === "Order Revised")) {
        a += inv.TotalAmount;
        // count cases
        q += Object.values(inv.Items).reduce((sum, qty) => sum + qty, 0);
      }
    });
    return { totalVehicleSoldQty: q, totalVehicleSoldAmount: a };
  }, [invoices]);

  // Aggregate received purchases (status Received)
  const receivedPurchasesAmount = useMemo(() => {
    return purchaseOrders
      .filter(po => po.Status === "Received")
      .reduce((sum, po) => sum + po.Grand_Total, 0);
  }, [purchaseOrders]);

  // Warehouse stats
  const warehouseTotals = useMemo(() => {
    let open = 0;
    let purchase = 0;
    let sale = 0;
    let closing = 0;
    if (currentSheet) {
      currentSheet.rows.forEach(row => {
        open += row.Open || 0;
        purchase += row.Primary || 0;
        sale += row.Total_Sale || 0;
        closing += row.Total_Closing || 0;
      });
    }
    return { open, purchase, sale, closing };
  }, [currentSheet]);

  // Total Offer Packs based on Parle Agro schemes
  const totalOfferPacks = useMemo(() => {
    let total = 0;
    invoices.forEach(inv => {
      if (inv.Route !== "Counter" && inv.Status !== "Cancelled") {
        Object.entries(inv.Items).forEach(([itemCode, qty]) => {
          const prod = PRODUCTS.find(p => p.Item_Code === itemCode);
          if (prod?.Brand?.toLowerCase()?.includes("parle") || 
              prod?.Brand?.toLowerCase()?.includes("appy") || 
              prod?.Brand?.toLowerCase()?.includes("frooti") || 
              prod?.Brand?.toLowerCase()?.includes("fizz")) {
            total += Math.floor(qty / 10);
          }
        });
      }
    });
    return total;
  }, [invoices]);

  const totalExpense = useMemo(() => {
    return expenses.reduce((sum, e) => sum + e.Amount, 0);
  }, [expenses]);

  return (
    <div className="space-y-6 animate-fade-in" id="dashboard-tab">
      {/* KPI Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        
        {/* Metric 1: Total Billing (Sales) & Received Amount */}
        <div 
          onClick={() => setActiveOverlay("billing")}
          className="bg-[#0b0c10] border border-zinc-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-amber-glow/40 cursor-pointer transition-all duration-300 hover:scale-[1.02]"
          title="Billing log journal detailing current ledger invoices raised"
        >
          <div className="flex items-center justify-between border-b border-zinc-850 pb-2">
            <span className="text-zinc-400 font-bold text-xs uppercase tracking-wider font-sans">Total Billing (Sales)</span>
            <div className="p-1.5 bg-amber-glow/10 border border-amber-glow/20 rounded-xl text-amber-glow">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div>
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest block">Gross Billing</span>
              <h3 className="text-xl font-extrabold font-mono text-white tracking-tight">
                ₹{financialMetrics.grossTurnover.toLocaleString("en-IN", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              </h3>
            </div>
            <div className="border-t border-zinc-900/50 pt-2">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest block">Total Cash/UPI/Chq Received</span>
              <h4 className="text-sm font-semibold font-mono text-emerald-400">
                ₹{(financialMetrics.totalCashReceived + financialMetrics.totalUPIReceived + financialMetrics.totalChequeReceived).toLocaleString("en-IN", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              </h4>
            </div>
            <p className="text-zinc-650 font-mono text-[9px] pt-1 flex items-center justify-between">
              <span>{invoices.length} general invoices</span>
              <span className="text-amber-glow/70 flex items-center gap-0.5 font-bold"><Eye size={11} /></span>
            </p>
          </div>
        </div>

        {/* Metric 2: Total Purchases */}
        <div 
          onClick={() => setActiveOverlay("purchase")}
          className="bg-[#0b0c10] border border-zinc-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-indigo-400 cursor-pointer transition-all duration-300 hover:scale-[1.02]"
          title="Supplier procurement ledger of received warehouse inventory"
        >
          <div className="flex items-center justify-between border-b border-zinc-850 pb-2">
            <span className="text-zinc-400 font-bold text-xs uppercase tracking-wider font-sans">Total Purchases</span>
            <div className="p-1.5 bg-indigo-950/40 border border-indigo-900/40 rounded-xl text-indigo-400">
              <ShoppingBag size={16} />
            </div>
          </div>
          <div className="mt-4 flex-1 flex flex-col justify-between">
            <div>
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest block">Delivered Purchases</span>
              {receivedPurchasesAmount === 0 ? (
                <h3 className="text-lg font-bold font-sans text-rose-400 uppercase tracking-wider italic mt-1">
                  No Purchase
                </h3>
              ) : (
                <h3 className="text-xl font-extrabold font-mono text-white tracking-tight">
                  ₹{receivedPurchasesAmount.toLocaleString("en-IN", { minimumFractionDigits: 1 })}
                </h3>
              )}
            </div>
            <div className="border-t border-zinc-900/50 pt-2 mt-4">
              <span className="text-[10px] text-zinc-650 font-mono block">
                {purchaseOrders.length} supplier orders placed
              </span>
              <p className="text-zinc-650 font-mono text-[9px] pt-1 flex items-center justify-between">
                <span>Completed orders</span>
                <span className="text-indigo-400/70 flex items-center gap-0.5 font-bold"><Eye size={11} /></span>
              </p>
            </div>
          </div>
        </div>

        {/* Metric 3: Transit Fleet Route Report (with Hover Zoom effect) */}
        <div 
          onClick={() => setActiveOverlay("fleet")}
          className="bg-[#0b0c10] border border-zinc-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-emerald-450 cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:shadow-emerald-900/5 hover:shadow-2xl"
          title="Live transit vehicles inventory dispatch logs and case load outs"
        >
          <div className="flex items-center justify-between border-b border-zinc-850 pb-2">
            <span className="text-zinc-300 font-bold text-xs uppercase tracking-wider font-sans">Transit Fleet Report</span>
            <div className="p-1.5 bg-emerald-950/40 border border-emerald-900/30 rounded-xl text-emerald-400">
              <Truck size={16} />
            </div>
          </div>
          <div className="mt-4 space-y-2.5">
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px] text-zinc-400 font-mono border-b border-zinc-900/40 pb-0.5">
                <span className="font-semibold text-zinc-500">Overall Cases Sold:</span>
                <span className="text-white font-bold">{totalVehicleSoldQty} Cases</span>
              </div>
              <div className="flex justify-between items-center text-[10px] text-zinc-400 font-mono border-b border-zinc-900/40 pb-0.5">
                <span className="font-semibold text-zinc-500">Cases Sale Value:</span>
                <span className="text-emerald-400 font-bold">₹{totalVehicleSoldAmount.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] text-zinc-400 font-mono">
                <span className="font-semibold text-zinc-500">Total Offer Packs:</span>
                <span className="text-amber-500 font-bold">{totalOfferPacks} Packs</span>
              </div>
            </div>
            <p className="text-zinc-550 font-mono text-[9px] pt-1.5 border-t border-zinc-850/50 flex items-center justify-between">
              <span>Vehicles load: {fleetMetrics.total} Cases</span>
              <span className="text-emerald-400/70 flex items-center gap-0.5 font-bold"><Eye size={11} /></span>
            </p>
          </div>
        </div>

        {/* Metric 4: Total Expense */}
        <div 
          onClick={() => onNavigate("finance")}
          className="bg-[#0b0c10] border border-zinc-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-rose-400 cursor-pointer transition-all duration-300 hover:scale-[1.02]"
          title="Direct business expenses and vehicle maintenance fuel outlays"
        >
          <div className="flex items-center justify-between border-b border-zinc-850 pb-2">
            <span className="text-zinc-300 font-bold text-xs uppercase tracking-wider font-sans">Total Expense</span>
            <div className="p-1.5 bg-rose-955/35 border border-rose-950 text-rose-455 rounded-xl">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="mt-4 flex-1 flex flex-col justify-between">
            <div>
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest block">Aggregate Expense</span>
              <h3 className="text-xl font-extrabold font-mono text-rose-400 tracking-tight">
                ₹{totalExpense.toLocaleString("en-IN", { minimumFractionDigits: 1 })}
              </h3>
            </div>
            <div className="border-t border-zinc-900/50 pt-2 mt-4">
              <p className="text-zinc-650 font-mono text-[9px] flex items-center justify-between">
                <span>{expenses.length} slips logged</span>
                <span className="text-rose-450 font-bold">&rarr;</span>
              </p>
            </div>
          </div>
        </div>

        {/* Metric 5: Warehouse Opening, Purchases, Sales and Closing */}
        <div 
          onClick={() => setActiveOverlay("warehouse")}
          className="bg-[#0b0c10] border border-zinc-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-amber-glow/40 cursor-pointer transition-all duration-300 hover:scale-[1.02]"
          title="Warehouse structural stock sheet quantities audit registers"
        >
          <div className="flex items-center justify-between border-b border-zinc-850 pb-2">
            <span className="text-zinc-400 font-bold text-xs uppercase tracking-wider font-sans">Warehouse Stock</span>
            <div className="p-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-amber-500">
              <Package size={16} />
            </div>
          </div>
          <div className="mt-3.5 space-y-1 text-[10px] text-zinc-405 font-mono">
            <div className="flex justify-between">
              <span>Total Opening:</span>
              <span className="text-white font-bold">{warehouseTotals.open} Cs</span>
            </div>
            <div className="flex justify-between">
              <span>Main Purchases:</span>
              <span className="text-indigo-400 font-bold">+{warehouseTotals.purchase} Cs</span>
            </div>
            <div className="flex justify-between">
              <span>Sales Dispatched:</span>
              <span className="text-zinc-300 font-bold">-{warehouseTotals.sale} Cs</span>
            </div>
            <div className="flex justify-between border-t border-zinc-900/60 pt-1 text-emerald-400 font-bold text-[11px]">
              <span>Closing Stock:</span>
              <span>{warehouseTotals.closing} Cs</span>
            </div>
            <div className="text-[9px] text-rose-400/90 pt-1 font-sans flex items-center justify-between">
              <span>{stockMetrics.outOfStock} SKUs empty</span>
              <span className="text-amber-500/70"><Eye size={10} /></span>
            </div>
          </div>
        </div>
      </div>

      {/* Structured Chronological Workspace Checklist */}
      <DailyWorkFlowChecklist
        sheets={sheets}
        invoices={invoices}
        purchaseOrders={purchaseOrders}
        expenses={expenses}
        currentPhase={currentPhase}
        activeDateString={activeDateString}
      />

      {/* Total Separate Sale Summary section */}
      <div 
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        <div 
          onClick={() => onNavigate("ar")}
          className="lg:col-span-2 bg-[#0b0c10] border border-zinc-800 rounded-2xl p-6 shadow-md cursor-pointer hover:border-amber-glow/40 transition duration-300"
          title="Click to view all receipts and general ledger accounts"
        >
          <div className="flex items-center justify-between border-b border-zinc-805 pb-3 mb-4">
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight uppercase font-mono text-amber-glow">
                💳 distributor payment receipt audit summary
              </h2>
            </div>
            <span className="text-[10px] font-mono text-amber-glow uppercase bg-zinc-950 border border-amber-glow hover:text-white px-2.5 py-1 rounded-md font-bold tracking-wider">
              Audit Report &rarr;
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Total Cash Box */}
            <div 
              onClick={(e) => { e.stopPropagation(); setAuditModeFilter("Cash"); }}
              className="bg-zinc-950 p-4 rounded-xl border border-zinc-850 flex flex-col justify-between cursor-pointer hover:bg-zinc-900 hover:border-emerald-400/40 transition transform hover:-translate-y-0.5 duration-200"
            >
              <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 flex items-center justify-between">
                <span>Total Cash Collected</span>
                <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
              </div>
              <div className="mt-2">
                <h4 className="text-base font-bold font-mono text-white flex justify-between items-center">
                  <span>₹{financialMetrics.totalCashReceived.toLocaleString("en-IN")}</span>
                </h4>
              </div>
            </div>

            {/* Total Online Box */}
            <div 
              onClick={(e) => { e.stopPropagation(); setAuditModeFilter("UPI"); }}
              className="bg-zinc-950 p-4 rounded-xl border border-zinc-850 flex flex-col justify-between cursor-pointer hover:bg-zinc-900 hover:border-indigo-400/40 transition transform hover:-translate-y-0.5 duration-200"
            >
              <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 flex items-center justify-between">
                <span>Total Online (UPI)</span>
                <span className="h-2 w-2 rounded-full bg-indigo-400"></span>
              </div>
              <div className="mt-2">
                <h4 className="text-base font-bold font-mono text-white flex justify-between items-center">
                  <span>₹{financialMetrics.totalUPIReceived.toLocaleString("en-IN")}</span>
                </h4>
              </div>
            </div>

            {/* Total Cheque Box */}
            <div 
              onClick={(e) => { e.stopPropagation(); setAuditModeFilter("Cheque"); }}
              className="bg-zinc-950 p-4 rounded-xl border border-zinc-850 flex flex-col justify-between cursor-pointer hover:bg-zinc-900 hover:border-amber-400/40 transition transform hover:-translate-y-0.5 duration-200"
            >
              <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 flex items-center justify-between">
                <span>Total Cheque Received</span>
                <span className="h-2 w-2 rounded-full bg-amber-400"></span>
              </div>
              <div className="mt-2">
                <h4 className="text-base font-bold font-mono text-white flex justify-between items-center">
                  <span>₹{financialMetrics.totalChequeReceived.toLocaleString("en-IN")}</span>
                </h4>
              </div>
            </div>

            {/* Total Credit Box */}
            <div 
              onClick={(e) => { e.stopPropagation(); setAuditModeFilter("Credit"); }}
              className="bg-zinc-950 p-4 rounded-xl border border-zinc-850 flex flex-col justify-between cursor-pointer hover:bg-zinc-900 hover:border-rose-400/45 transition transform hover:-translate-y-0.5 duration-200"
            >
              <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 flex items-center justify-between">
                <span>Total Credit Outstanding</span>
                <span className="h-2 w-2 rounded-full bg-rose-450"></span>
              </div>
              <div className="mt-2">
                <h4 className="text-base font-bold font-mono text-rose-400 flex justify-between items-center">
                  <span>₹{financialMetrics.totalCreditOwed.toLocaleString("en-IN")}</span>
                </h4>
              </div>
            </div>
          </div>
        </div>

        {/* Cloud Sync Status Card */}
        <div className="bg-[#0b0c10] border border-zinc-805 rounded-2xl p-6 shadow-lg flex flex-col">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider text-indigo-400 flex items-center gap-2 mb-4">
            <Sparkles size={16} /> Cloud Services Ledger Sync
          </h2>
          
           {!isGAuthenticated ? (
            <div className="flex-1 flex flex-col justify-center items-center text-center space-y-4">
              <p className="text-[11px] text-zinc-500 font-sans italic">Connect your Google Workspace to enable real-time cloud synchronization of ERP records.</p>
              <button 
                onClick={onGoogleLogin}
                className="w-full industrial-btn-primary py-3 flex items-center justify-center gap-2"
              >
                <Database size={16} /> Sign in with Google
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-mono text-zinc-500 block mb-1.5 ml-1">Spreadsheet Master ID (V4)</label>
                <div className="flex items-center gap-2">
                   <div className="p-2 bg-zinc-950 border border-zinc-800 rounded-lg flex-1">
                      <input 
                        type="text"
                        value={spreadsheetId}
                        onChange={(e) => onUpdateSpreadsheetId(e.target.value)}
                        placeholder="Enter Google Sheet ID..."
                        className="w-full bg-transparent text-white text-[11px] outline-none font-mono tracking-tight"
                      />
                   </div>
                </div>
              </div>

              <button 
                onClick={onSync}
                disabled={isSyncing}
                className={`w-full py-4 rounded-xl font-bold font-tech text-xs tracking-widest transition-all flex items-center justify-center gap-3 ${
                  isSyncing 
                    ? "bg-indigo-900/40 text-indigo-400 cursor-not-allowed border border-indigo-800/50" 
                    : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 active:scale-95"
                }`}
              >
                {isSyncing ? (
                   <>
                     <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                     SYNCING DATA...
                   </>
                ) : (
                  <>
                    <ArrowUpRight size={18} />
                    PUSH DATA TO GOOGLE SHEETS
                  </>
                )}
              </button>
              
              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-1">
                <span>Last Sync: 16-Jun-2026</span>
                <span className="text-emerald-500 font-bold uppercase tracking-tighter flex items-center gap-1">
                  <CheckCircle2 size={10} /> Cloud Connected
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Grid for Registers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Sales Summary - Detailed Table */}
        <div className="bg-[#0b0c10] border border-zinc-800 rounded-2xl p-6 shadow-lg lg:col-span-2 text-white">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h2 className="text-base font-semibold text-white tracking-tight flex items-center space-x-2">
              <CheckCircle2 size={18} className="text-emerald-450" />
              <span>📋 Sales Summary Logs</span>
            </h2>
            <button 
              onClick={() => onNavigate("billing")}
              className="text-xs text-amber-glow hover:underline font-medium cursor-pointer"
            >
              Raise / Manage Orders &rarr;
            </button>
          </div>
          <p className="text-xs text-zinc-455 mt-2 mb-4 font-sans">
            Latest itemized sales log including items, quantities, transaction modes of payment, and route status. Click any row to audit.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="border-b border-zinc-805 text-zinc-400 font-medium uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-2 font-normal">TIME</th>
                  <th className="py-3 px-2 font-normal">OUTLET</th>
                  <th className="py-3 px-2 font-normal">SKU</th>
                  <th className="py-3 px-2 font-normal text-center">QUANTITY</th>
                  <th className="py-3 px-2 font-normal text-right">AMOUNT (₹)</th>
                  <th className="py-3 px-2 font-normal">Mode of Payment</th>
                  <th className="py-3 px-2 font-normal text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 text-zinc-350">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-zinc-500 font-mono">
                      No stock delivery logs compiled yet.
                    </td>
                  </tr>
                ) : (
                  invoices.slice(-10).reverse().map((inv, idx) => {
                    // Compute Quantities
                    const totalQty = Object.values(inv.Items).reduce((s, v) => s + v, 0);
                    // Compute SKU summary text
                    const skusText = Object.entries(inv.Items).map(([skuCode, qty]) => {
                      const prod = PRODUCTS.find(p => p.Item_Code === skuCode);
                      const sName = prod ? prod.Item_Name.replace("Swadraj ", "").replace("Swadraj-", "") : skuCode;
                      return `${sName} (${qty}cs)`;
                    }).join(", ");

                    // Compute Mode of Payment string representation
                    let pMethods = [];
                    if (inv.CashReceived > 0) pMethods.push(`Cash (₹${inv.CashReceived})`);
                    if (inv.UPIReceived > 0) pMethods.push(`UPI (₹${inv.UPIReceived})`);
                    if (inv.ChequeReceived > 0) pMethods.push(`Chq (₹${inv.ChequeReceived})`);
                    if (inv.CreditAmount > 0) pMethods.push(`Cr (₹${inv.CreditAmount})`);
                    const paymentDesc = pMethods.join(" + ") || "Pending";

                    // Determine Status color badges
                    const currentStatus = inv.Status || "Delivered";
                    let badgeStyle = "bg-emerald-950/60 text-emerald-450 border border-emerald-900/40";
                    if (currentStatus === "Cancelled") {
                      badgeStyle = "bg-rose-950/60 text-rose-450 border border-rose-900/40";
                    } else if (currentStatus === "Outlet Closed") {
                      badgeStyle = "bg-amber-950/60 text-amber-500 border border-amber-900/40";
                    } else if (currentStatus === "Order Revised") {
                      badgeStyle = "bg-cyan-950/60 text-cyan-455 border border-cyan-900/30";
                    }

                    return (
                      <tr 
                        key={idx} 
                        className="hover:bg-zinc-850/50 cursor-pointer transition"
                        onClick={() => {
                          handleOpenEditInvoice(inv);
                        }}
                        title="Click to audit/adjust payments or details"
                      >
                        <td className="py-3 px-2 text-zinc-400 whitespace-nowrap">{inv.Time || "12:15 PM"}</td>
                        <td className="py-3 px-2 uppercase font-sans text-xs text-white font-medium max-w-[130px] truncate" title={inv.CustomerName}>
                          {inv.CustomerName}
                        </td>
                        <td className="py-3 px-2 text-[11px] text-zinc-400 max-w-[200px] truncate" title={skusText}>
                          {skusText}
                        </td>
                        <td className="py-3 px-2 text-center text-white font-bold">{totalQty} cs</td>
                        <td className="py-3 px-2 text-right font-bold text-emerald-400">
                          ₹{inv.TotalAmount.toLocaleString("en-IN", { minimumFractionDigits: 1 })}
                        </td>
                        <td className="py-3 px-2 text-[11px] text-zinc-300 max-w-[150px] truncate" title={paymentDesc}>
                          {paymentDesc}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-sans ${badgeStyle}`}>
                            {currentStatus}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Dynamic Credit Log */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h2 className="text-base font-semibold text-white tracking-tight flex items-center space-x-2">
                <Clock size={16} className="text-rose-400" />
                <span>📋 Active Outstanding Credit Log Ledger</span>
              </h2>
            </div>
            <p className="text-xs text-zinc-455 mt-2 mb-4 font-sans leading-relaxed">
              Unreconciled specific billing records exceeding net cash receipts. Click on any record row to inspect items or reallocate receipts.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="border-b border-zinc-805 text-zinc-400 font-medium">
                    <th className="py-2 font-normal">Customer</th>
                    <th className="py-2 font-normal text-right font-sans">Owed Bill</th>
                    <th className="py-2 font-normal text-center">Aging</th>
                    <th className="py-2 font-normal text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 text-zinc-350">
                  {agedArRecords.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-zinc-500 font-mono">
                        No active outstanding credits.
                      </td>
                    </tr>
                  ) : (
                    agedArRecords.slice(0, 7).map((ar, idx) => (
                      <tr 
                        key={idx} 
                        className="hover:bg-zinc-850/40 cursor-pointer transition"
                        title="Click to audit this specific invoice bill receipt details"
                        onClick={() => {
                          const matchingInv = invoices.find(inv => inv.BillId === ar.billId);
                          if (matchingInv) {
                            handleOpenEditInvoice(matchingInv);
                          }
                        }}
                      >
                        <td className="py-2.5 font-bold text-white uppercase truncate max-w-[130px] font-sans text-xs" title={ar.customerName}>
                          {ar.customerName}
                        </td>
                        <td className="py-2.5 text-right font-bold text-rose-400">
                          ₹{ar.creditBalance.toLocaleString("en-IN")}
                        </td>
                        <td className="py-2.5 text-center text-zinc-400 font-medium font-mono">
                          {ar.agingDays} d
                        </td>
                        <td className="py-2.5 text-right font-sans">
                          <span className="inline-flex px-1.5 py-0.5 rounded text-[8px] font-bold border bg-rose-950/40 text-rose-450 border-rose-900/30 uppercase tracking-wider">
                            {ar.status.replace("✅ ", "").replace("🚨 ", "").replace("⚠️ ", "")}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Credit Accounts Collection Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h2 className="text-base font-semibold text-white tracking-tight flex items-center space-x-2">
                <CreditCard size={16} className="text-amber-glow" />
                <span>💰 Credit Accounts Collection</span>
              </h2>
            </div>
            <p className="text-xs text-zinc-455 mt-2 mb-4 font-sans leading-relaxed">
              Consolidated outstanding receivable balance grouped per client entity. Click any row to view individual customer unpaid bills.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="border-b border-zinc-805 text-zinc-400 font-medium">
                    <th className="py-2 font-normal">Customer</th>
                    <th className="py-2 font-normal text-center font-sans">Unresolved Bills</th>
                    <th className="py-2 font-normal text-right">Combine Owed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 text-zinc-350">
                  {customerCollections.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-zinc-500 font-mono">
                        No pending collections.
                      </td>
                    </tr>
                  ) : (
                    customerCollections.slice(0, 7).map((col, idx) => (
                      <tr 
                        key={idx} 
                        className="hover:bg-zinc-850/40 cursor-pointer transition"
                        title="Click to view all unpaid bill statements for this customer"
                        onClick={() => {
                          setSelectedCollectionCustomer({
                            name: col.name,
                            invoices: col.invoices
                          });
                        }}
                      >
                        <td className="py-2.5 font-bold text-white uppercase truncate max-w-[140px] font-sans text-xs" title={col.name}>
                          {col.name}
                        </td>
                        <td className="py-2.5 text-center font-bold text-zinc-400">
                          {col.billsCount} Bills
                        </td>
                        <td className="py-2.5 text-right font-extrabold text-amber-glow text-xs font-mono">
                          ₹{col.outstanding.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* --- OVERLAYS MODALS --- */}
      
      {/* 0. Grouped Customer Credit Invoices Collection Popup */}
      {selectedCollectionCustomer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-mono text-xs animate-fade-in">
          <div className="bg-[#0b0c10] border border-zinc-800 w-full max-w-md rounded-2xl overflow-hidden flex flex-col p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-850 pb-3">
              <div>
                <strong className="text-[10px] text-amber-500 uppercase tracking-widest block font-bold">Credit Customer Ledger Account</strong>
                <span className="text-sm font-extrabold text-white font-sans mt-1 block uppercase">{selectedCollectionCustomer.name}</span>
                <p className="text-[10px] text-zinc-500 font-sans mt-0.5 leading-relaxed">
                  Active unpaid credit balances. Click 'Audit Bill' to load the full item-wise record to adjust cash/online receipts.
                </p>
              </div>
              <button 
                onClick={() => setSelectedCollectionCustomer(null)} 
                className="text-zinc-500 hover:text-white p-1 hover:bg-zinc-900 rounded transition"
              >
                <X size={16} />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[300px] pr-1">
              <table className="w-full text-left text-[11px] border-collapse font-mono">
                <thead>
                  <tr className="border-b border-zinc-900 text-zinc-500 font-medium">
                    <th className="py-2 text-zinc-600 font-normal">BILL ID</th>
                    <th className="py-2 text-zinc-600 font-normal">DATE</th>
                    <th className="py-2 text-rose-500/90 font-bold text-right">CREDIT (₹)</th>
                    <th className="py-2 text-center text-zinc-600 font-normal">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900 text-zinc-400">
                  {selectedCollectionCustomer.invoices.map((inv) => (
                    <tr key={inv.BillId} className="hover:bg-zinc-900/60 transition">
                      <td className="py-3 font-extrabold text-white">#{inv.BillId}</td>
                      <td className="py-3 text-[10px] text-zinc-500">{inv.Date}</td>
                      <td className="py-3 text-right font-extrabold text-rose-455">₹{inv.CreditAmount.toLocaleString("en-IN")}</td>
                      <td className="py-3 text-center">
                        <button
                          onClick={() => {
                            setSelectedCollectionCustomer(null);
                            handleOpenEditInvoice(inv);
                          }}
                          className="bg-zinc-950 text-zinc-300 hover:bg-amber-glow hover:text-zinc-950 px-2 py-0.5 rounded text-[9px] font-bold transition duration-200 cursor-pointer border border-zinc-800"
                        >
                          Audit Bill
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-900 flex justify-between items-center text-xs text-zinc-400">
              <span className="font-sans">Combined Owed Ledger:</span>
              <strong className="text-rose-400 text-sm font-mono font-black">
                ₹{selectedCollectionCustomer.invoices.reduce((sum, i) => sum + i.CreditAmount, 0).toLocaleString("en-IN")}
              </strong>
            </div>
          </div>
        </div>
      )}
      
      {/* 1. Total Billing Modals (All Sales Data) */}
      {activeOverlay === "billing" && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-mono text-xs">
          <div className="bg-zinc-950 border border-zinc-800 w-full max-w-4xl rounded-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-zinc-900 p-5 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider text-amber-glow">Chronological Sales Invoice double-entry ledger</h3>
                <p className="text-[10px] text-zinc-400 font-sans mt-0.5">Aggregate records of distributor customer sales invoices and cash ledger deposits.</p>
              </div>
              <button 
                onClick={() => setActiveOverlay(null)}
                className="text-zinc-400 hover:text-white p-2 hover:bg-zinc-850 rounded-xl"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 font-bold bg-zinc-900 uppercase">
                    <th className="p-2.5 font-semibold">Bill ID</th>
                    <th className="p-2.5 font-semibold">Date</th>
                    <th className="p-2.5 font-semibold">Outlet Name</th>
                    <th className="p-2.5 font-semibold">Route</th>
                    <th className="p-2.5 font-semibold text-right">Debit Balance (₹)</th>
                    <th className="p-2.5 font-semibold text-center">Mode of Payment</th>
                    <th className="p-2.5 font-semibold text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850">
                  {invoices.map((inv, idx) => {
                    let pMethods = [];
                    if (inv.CashReceived > 0) pMethods.push(`Cash (₹${inv.CashReceived})`);
                    if (inv.UPIReceived > 0) pMethods.push(`UPI (₹${inv.UPIReceived})`);
                    if (inv.ChequeReceived > 0) pMethods.push(`Chq (₹${inv.ChequeReceived})`);
                    if (inv.CreditAmount > 0) pMethods.push(`Cr (₹${inv.CreditAmount})`);
                    const paymentDesc = pMethods.join(" + ") || "Pending";

                    return (
                      <tr key={idx} className="hover:bg-zinc-900">
                        <td className="p-2.5 font-bold text-white">#{inv.BillId}</td>
                        <td className="p-2.5">{inv.Date}</td>
                        <td className="p-2.5 font-sans font-bold uppercase">{inv.CustomerName}</td>
                        <td className="p-2.5">
                          <span className="bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded text-[10px]">
                            {inv.Route}
                          </span>
                        </td>
                        <td className="p-2.5 text-right font-bold text-white">₹{inv.TotalAmount.toLocaleString()}</td>
                        <td className="p-2.5 text-zinc-300 text-center font-mono text-[10px]">{paymentDesc}</td>
                        <td className="p-2.5 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold ${inv.PaymentStatus === "Paid" ? "text-emerald-400 bg-emerald-950/20" : "text-rose-400 bg-rose-950/20"}`}>
                            {inv.PaymentStatus}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. Total Purchase Modal (All Purchase Data) */}
      {activeOverlay === "purchase" && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-mono text-xs">
          <div className="bg-zinc-950 border border-zinc-800 w-full max-w-4xl rounded-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-zinc-900 p-5 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider text-amber-glow">Supplier Purchase Procurement list</h3>
                <p className="text-[10px] text-zinc-400 font-sans mt-0.5 flex items-center gap-1"><Info size={12} /> Supplier invoice orders registered for primary stock replenishing.</p>
              </div>
              <button 
                onClick={() => setActiveOverlay(null)}
                className="text-zinc-400 hover:text-white p-2 hover:bg-zinc-850 rounded-xl"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4">
              {purchaseOrders.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 italic">No purchase orders logged yet. Raise a PO from Procurement tab.</div>
              ) : (
                <div className="space-y-6">
                  {purchaseOrders.map((po, idx) => (
                    <div key={idx} className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-3">
                      <div className="flex justify-between items-center border-b border-zinc-800 pb-2 text-[11px]">
                        <div>
                          <strong className="text-white text-xs">Vouch: {po.PO_Number}</strong>
                          <span className="text-zinc-500 block">Supplier: {po.Supplier_Name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-zinc-450 font-semibold">Ordered: {po.Date}</span>
                          <span className="text-emerald-400 font-bold block">Status: {po.Status}</span>
                        </div>
                      </div>
                      
                      <table className="w-full text-left text-[10px]">
                        <thead>
                          <tr className="text-zinc-500 uppercase">
                            <th>Item Details</th>
                            <th className="text-center">Cases</th>
                            <th className="text-right">Cost Price</th>
                            <th className="text-right">Total (₹)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {po.Items.map((item, itemIdx) => (
                            <tr key={itemIdx} className="text-zinc-300">
                              <td className="py-1 font-sans">{item.Item_Name}</td>
                              <td className="py-1 text-center font-bold text-white">{item.Quantity_Cases}</td>
                              <td className="py-1 text-right">₹{item.Purchase_Rate}</td>
                              <td className="py-1 text-right font-bold text-white">₹{item.Total_Amount.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="flex justify-between items-center text-xs border-t border-zinc-850 pt-2 font-bold text-amber-glow">
                        <span>Grand Total (Tax Included)</span>
                        <span>₹{po.Grand_Total.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Warehouse Stock Modal (All Stock Data) */}
      {activeOverlay === "warehouse" && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-mono text-xs">
          <div className="bg-zinc-950 border border-zinc-800 w-full max-w-4xl rounded-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-zinc-900 p-5 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider text-amber-glow">Warehouse inventory register (All SKU records)</h3>
                <p className="text-[10px] text-zinc-400 font-sans mt-0.5">Displays SKU wise opening, dispatches, load out, sales and current closing shelf inventory.</p>
              </div>
              <button 
                onClick={() => setActiveOverlay(null)}
                className="text-zinc-400 hover:text-white p-2 hover:bg-zinc-850 rounded-xl"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 font-bold bg-zinc-900 uppercase">
                    <th className="p-2.5">SKU Name</th>
                    <th className="p-2.5 text-center">Open Stock</th>
                    <th className="p-2.5 text-center">Load In (Return)</th>
                    <th className="p-2.5 text-center">Sold Qty</th>
                    <th className="p-2.5 text-center">Closing Stock</th>
                    <th className="p-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850">
                  {stockMetrics.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-zinc-900">
                      <td className="p-2.5">
                        <div className="font-bold font-sans text-white uppercase text-xs">{item.name}</div>
                        <div className="text-[9px] text-zinc-500 font-mono">{item.code}</div>
                      </td>
                      <td className="p-2.5 text-center font-bold text-zinc-200">{item.open}</td>
                      <td className="p-2.5 text-center font-bold text-zinc-400">{item.loadIn}</td>
                      <td className="p-2.5 text-center font-bold text-zinc-200">{item.sold}</td>
                      <td className="p-2.5 text-center font-bold text-emerald-400">{item.stock}</td>
                      <td className="p-2.5 text-center">
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          item.stock === 0 ? "bg-rose-950/40 text-rose-400 border border-rose-900/30" :
                          item.stock <= 10 ? "bg-amber-955/35 text-amber-500 border border-amber-900/30" :
                          "bg-zinc-900 text-zinc-400"
                        }`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. Active Fleet load (Vehicle Wise Details) */}
      {activeOverlay === "fleet" && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-mono text-xs">
          <div className="bg-zinc-950 border border-zinc-800 w-full max-w-4xl rounded-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-zinc-900 p-5 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider text-amber-glow">Transit Fleet Vehicle report</h3>
                <p className="text-[10px] text-zinc-400 font-sans mt-0.5">Shows current transit inventories loaded into route trucks and counters.</p>
              </div>
              <button 
                onClick={() => setActiveOverlay(null)}
                className="text-zinc-400 hover:text-white p-2 hover:bg-zinc-850 rounded-xl"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Sinhgad Route Vehicle */}
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
                  <span className="text-xs font-bold text-white block border-b border-zinc-800 pb-2 flex items-center justify-between uppercase">
                    <span>Sinhgad Route vehicle (v1)</span>
                    <Truck size={14} className="text-emerald-400" />
                  </span>
                  <div className="grid grid-cols-2 gap-2 mt-3 text-[11px] text-zinc-300">
                    <div>Vehicle Opening Stock:</div><div className="font-bold text-right text-white">{fleetMetrics.sinhgad.open} Cases</div>
                    <div>Vehicle Load In (Refills):</div><div className="font-bold text-right text-white">{fleetMetrics.sinhgad.loadIn} Cases</div>
                    <div>Total Route Sales Qty:</div><div className="font-bold text-right text-white text-emerald-400">{fleetMetrics.sinhgad.sale} Cases</div>
                    <div>Closing Route Stock Hand:</div><div className="font-bold text-right text-white text-amber-glow">{fleetMetrics.sinhgad.items} Cases</div>
                    <div className="col-span-2 border-t border-zinc-805 pt-2 text-[11px] font-bold text-amber-glow flex justify-between">
                      <span>Total Load Stock value</span><span>₹{fleetMetrics.sinhgad.amt.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Purandar Route Vehicle */}
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
                  <span className="text-xs font-bold text-white block border-b border-zinc-800 pb-2 flex items-center justify-between uppercase">
                    <span>Purandar Route vehicle (v2)</span>
                    <Truck size={14} className="text-indigo-400" />
                  </span>
                  <div className="grid grid-cols-2 gap-2 mt-3 text-[11px] text-zinc-300">
                    <div>Vehicle Opening Stock:</div><div className="font-bold text-right text-white">{fleetMetrics.purandar.open} Cases</div>
                    <div>Vehicle Load In (Refills):</div><div className="font-bold text-right text-white">{fleetMetrics.purandar.loadIn} Cases</div>
                    <div>Total Route Sales Qty:</div><div className="font-bold text-right text-white text-indigo-400">{fleetMetrics.purandar.sale} Cases</div>
                    <div>Closing Route Stock Hand:</div><div className="font-bold text-right text-white text-amber-glow">{fleetMetrics.purandar.items} Cases</div>
                    <div className="col-span-2 border-t border-zinc-805 pt-2 text-[11px] font-bold text-amber-glow flex justify-between">
                      <span>Total Load Stock value</span><span>₹{fleetMetrics.purandar.amt.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Rajgad Route Vehicle */}
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
                  <span className="text-xs font-bold text-white block border-b border-zinc-800 pb-2 flex items-center justify-between uppercase">
                    <span>Rajgad Route vehicle (v3)</span>
                    <Truck size={14} className="text-amber-500" />
                  </span>
                  <div className="grid grid-cols-2 gap-2 mt-3 text-[11px] text-zinc-300">
                    <div>Vehicle Opening Stock:</div><div className="font-bold text-right text-white">{fleetMetrics.rajgad.open} Cases</div>
                    <div>Vehicle Load In (Refills):</div><div className="font-bold text-right text-white">{fleetMetrics.rajgad.loadIn} Cases</div>
                    <div>Total Route Sales Qty:</div><div className="font-bold text-right text-white text-amber-500">{fleetMetrics.rajgad.sale} Cases</div>
                    <div>Closing Route Stock Hand:</div><div className="font-bold text-right text-white text-amber-glow">{fleetMetrics.rajgad.items} Cases</div>
                    <div className="col-span-2 border-t border-zinc-805 pt-2 text-[11px] font-bold text-amber-glow flex justify-between">
                      <span>Total Load Stock value</span><span>₹{fleetMetrics.rajgad.amt.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Counter Sale Details */}
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
                  <span className="text-xs font-bold text-white block border-b border-zinc-800 pb-2 flex items-center justify-between uppercase">
                    <span>Godown Sales Counter Node</span>
                    <Clock size={14} className="text-zinc-400" />
                  </span>
                  <div className="grid grid-cols-2 gap-2 mt-3 text-[11px] text-zinc-300">
                    <div>Warehouse Counter Opening:</div><div className="font-bold text-right text-white">0 Cases</div>
                    <div>Replenishments/Procured:</div><div className="font-bold text-right text-white">No Vehicles</div>
                    <div>Total Counter Sales Qty:</div><div className="font-bold text-right text-emerald-400">{fleetMetrics.counter.sale} Cases</div>
                    <div>Total Sales Amount:</div><div className="font-bold text-right text-white text-amber-glow">₹{fleetMetrics.counter.amt.toLocaleString()}</div>
                    <div className="col-span-2 border-t border-zinc-805 pt-2 text-[11px] font-bold text-zinc-450 text-center italic">
                      Counter sales are reconciled from invoices.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Edit Invoice payment Modal */}
      {editingInvoice && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-mono text-xs">
          <div className="bg-zinc-950 border border-zinc-800 w-full max-w-3xl rounded-2xl overflow-hidden flex flex-col">
            <div className="bg-zinc-900 px-5 py-4 border-b border-zinc-850 flex justify-between items-center">
              <div>
                <strong className="text-xs text-amber-glow uppercase tracking-wider block font-bold">Double-Entry Payment Audit & Re-allocation</strong>
                <span className="text-sm font-extrabold text-white font-sans mt-0.5 block uppercase">Bill #{editingInvoice.BillId} — {editingInvoice.CustomerName}</span>
              </div>
              <button 
                onClick={() => setEditingInvoice(null)} 
                className="text-zinc-500 hover:text-white p-1 hover:bg-zinc-800 rounded transition"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 overflow-y-auto max-h-[75vh]">
              {/* Left Column: Itemized detailed item-by-item table of the bill */}
              <div className="bg-zinc-90 w-full border border-zinc-850/65 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <h4 className="text-[10px] text-amber-500 uppercase tracking-widest font-black mb-3 border-b border-zinc-855 pb-1.5 flex items-center justify-between">
                    <span>🛒 Itemized Bill Details</span>
                    <span className="text-[8px] uppercase font-mono py-0.5 px-1.5 rounded-md bg-zinc-900 text-zinc-500">Route: {editingInvoice.Route}</span>
                  </h4>
                  
                  <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
                    {Object.entries(editingInvoice.Items).map(([skuCode, qty]) => {
                      const matchPr = PRODUCTS.find(p => p.Item_Code === skuCode);
                      const prName = matchPr ? matchPr.Item_Name : skuCode;
                      const unitPrice = editingInvoice.UnitPrices[skuCode] || 0;
                      const qtyVal = Number(qty);
                      const lineTotal = qtyVal * unitPrice;
                      
                      return (
                        <div key={skuCode} className="border-b border-zinc-900 pb-2 flex items-center justify-between text-[11px] font-mono">
                          <div className="max-w-[70%]">
                            <span className="font-sans font-bold text-white block uppercase truncate" title={prName}>{prName}</span>
                            <span className="text-zinc-500 font-normal">Rate: ₹{unitPrice.toLocaleString("en-IN")} / cs</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-zinc-300 block">{qtyVal} cs</span>
                            <span className="font-black text-white text-[11px]">₹{lineTotal.toLocaleString("en-IN")}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-900 mt-4 flex justify-between items-center text-xs">
                  <span className="font-sans text-zinc-400">Total Purchase Value:</span>
                  <strong className="text-white text-sm font-mono font-black">
                    ₹{editingInvoice.TotalAmount.toLocaleString("en-IN")}
                  </strong>
                </div>
              </div>

              {/* Right Column: Route configuration and dynamic payment reallocation form entries */}
              <div className="space-y-3 flex flex-col justify-between">
                <div className="space-y-3.5">
                  <p className="text-[11px] text-zinc-450 font-sans leading-relaxed">
                    Modify route allocation and payments received below. Outstanding credit is adjusted automatically in real time:
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label className="text-zinc-500 block mb-1 text-[10px] uppercase font-mono">Route Dispatch Fleet</label>
                      <select
                        value={editRoute}
                        onChange={(e) => setEditRoute(e.target.value as any)}
                        className="w-full bg-zinc-900 border border-zinc-800 text-white rounded p-2 outline-none focus:border-amber-glow"
                      >
                        <option value="Sinhgad">Sinhgad Beast (v1)</option>
                        <option value="Purandar">Purandar Beast (v2)</option>
                        <option value="Rajgad">Rajgad Beast (v3)</option>
                        <option value="Counter">Counter Sale (Godown)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-zinc-500 block mb-1 text-[10px] uppercase font-mono">Cash Collected (₹)</label>
                      <input
                        type="number"
                        value={editCash}
                        onChange={(e) => setEditCash(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full bg-zinc-900 border border-zinc-800 text-white rounded p-2 outline-none font-mono focus:border-amber-glow"
                      />
                    </div>

                    <div>
                      <label className="text-zinc-500 block mb-1 text-[10px] uppercase font-mono">Online UPI Received (₹)</label>
                      <input
                        type="number"
                        value={editUPI}
                        onChange={(e) => setEditUPI(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full bg-zinc-900 border border-zinc-800 text-white rounded p-2 outline-none font-mono focus:border-amber-glow"
                      />
                    </div>

                    <div>
                      <label className="text-zinc-500 block mb-1 text-[10px] uppercase font-mono">Cheque Amount (₹)</label>
                      <input
                        type="number"
                        value={editCheque}
                        onChange={(e) => setEditCheque(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full bg-zinc-900 border border-zinc-800 text-white rounded p-2 outline-none font-mono focus:border-amber-glow"
                      />
                    </div>

                    <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-850 text-[11px] font-sans">
                      <div className="flex justify-between">
                        <span>Invoice Total Amount:</span>
                        <strong className="text-zinc-405 font-mono">₹{editingInvoice.TotalAmount.toLocaleString("en-IN")}</strong>
                      </div>
                      <div className="flex justify-between mt-1 text-rose-400 font-extrabold border-t border-zinc-850/40 pt-1">
                        <span>Resulting Debt Balance:</span>
                        <strong className="font-mono text-rose-400">₹{Math.max(0, editingInvoice.TotalAmount - (editCash + editUPI + editCheque)).toLocaleString("en-IN")}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSaveInvoiceEdit}
                  className="w-full bg-amber-glow hover:bg-amber-500 font-black text-zinc-950 py-3 rounded-xl transition cursor-pointer text-xs uppercase tracking-wider mt-2 hover:shadow-lg hover:shadow-amber-500/10 active:scale-95 duration-100"
                >
                  Log Payment Changes to General Ledger
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Dynamic individual audit report overlays for Cash, UPI, Cheques, and Credits */}
      {auditModeFilter && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-mono text-xs">
          <div className="bg-[#0b0c10] border-2 border-zinc-800 w-full max-w-4xl rounded-2xl overflow-hidden flex flex-col max-h-[85vh] shadow-2xl">
            <div className="bg-zinc-950 p-5 border-b border-zinc-850 flex items-center justify-between select-none">
              <div className="flex items-center gap-3">
                <span className={`h-3 w-3 rounded-full ${
                  auditModeFilter === "Cash" ? "bg-emerald-400 animate-pulse" :
                  auditModeFilter === "UPI" ? "bg-indigo-400 animate-pulse" :
                  auditModeFilter === "Cheque" ? "bg-amber-400 animate-pulse" :
                  "bg-rose-500 animate-pulse"
                }`}></span>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    {auditModeFilter} Cash Receipts & Ledger Audit Log
                  </h3>
                  <p className="text-[10px] text-zinc-400 font-sans mt-0.5">
                    Itemized list of billing invoices that recorded {auditModeFilter === "Credit" ? "outstanding customer credit" : `${auditModeFilter} allocations`}.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setAuditModeFilter(null)}
                className="text-zinc-400 hover:text-white p-2 hover:bg-zinc-900 rounded-xl transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400 font-bold bg-zinc-950 uppercase text-[9px] select-none">
                      <th className="p-3">Bill ID</th>
                      <th className="p-3">Date / Time</th>
                      <th className="p-3">Outlet Name</th>
                      <th className="p-3">Route Path</th>
                      <th className="p-3 text-right">Invoice Sum</th>
                      <th className="p-3 text-right text-amber-glow">{auditModeFilter === "Credit" ? "Outstanding Credit" : `${auditModeFilter} Amount`}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900 text-zinc-350">
                    {(() => {
                      const filtered = invoices.filter(inv => {
                        if (auditModeFilter === "Cash") return inv.CashReceived > 0;
                        if (auditModeFilter === "UPI") return inv.UPIReceived > 0;
                        if (auditModeFilter === "Cheque") return inv.ChequeReceived > 0;
                        if (auditModeFilter === "Credit") return inv.CreditAmount > 0;
                        return false;
                      });

                      if (filtered.length === 0) {
                        return (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-zinc-600 italic">
                              No invoices recorded {auditModeFilter} receipts.
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <>
                          {filtered.map((inv, idx) => {
                            const valueShow = 
                              auditModeFilter === "Cash" ? inv.CashReceived :
                              auditModeFilter === "UPI" ? inv.UPIReceived :
                              auditModeFilter === "Cheque" ? inv.ChequeReceived :
                              inv.CreditAmount;

                            return (
                              <tr key={idx} className="hover:bg-zinc-950/40 font-mono">
                                <td className="p-3 font-bold text-white">#{inv.BillId}</td>
                                <td className="p-3 text-zinc-400">{inv.Date} {inv.Time ? `| ${inv.Time}` : ""}</td>
                                <td className="p-3 font-sans font-bold uppercase text-white truncate max-w-[200px]" title={inv.CustomerName}>{inv.CustomerName}</td>
                                <td className="p-3">
                                  <span className="bg-zinc-950 border border-zinc-900 px-2 py-0.5 rounded text-[10px] text-zinc-400 font-bold">
                                    {inv.Route}
                                  </span>
                                </td>
                                <td className="p-3 text-right">₹{inv.TotalAmount.toLocaleString("en-IN", { minimumFractionDigits: 1 })}</td>
                                <td className="p-3 text-right font-black text-amber-glow">₹{valueShow.toLocaleString("en-IN", { minimumFractionDigits: 1 })}</td>
                              </tr>
                            );
                          })}
                          <tr className="bg-zinc-950/40 text-white font-bold border-t border-zinc-800 text-[10px] uppercase select-none">
                            <td colSpan={4} className="p-3 text-zinc-405">Aggregate Sums</td>
                            <td className="p-3 text-right text-zinc-400">
                              ₹{filtered.reduce((sum, inv) => sum + inv.TotalAmount, 0).toLocaleString("en-IN", { minimumFractionDigits: 1 })}
                            </td>
                            <td className="p-3 text-right text-amber-glow text-xs">
                              ₹{filtered.reduce((sum, inv) => {
                                const value = 
                                  auditModeFilter === "Cash" ? inv.CashReceived :
                                  auditModeFilter === "UPI" ? inv.UPIReceived :
                                  auditModeFilter === "Cheque" ? inv.ChequeReceived :
                                  inv.CreditAmount;
                                return sum + value;
                              }, 0).toLocaleString("en-IN", { minimumFractionDigits: 1 })}
                            </td>
                          </tr>
                        </>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="bg-zinc-950 p-4 border-t border-zinc-850 text-right">
              <button 
                onClick={() => setAuditModeFilter(null)}
                className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white font-bold px-4 py-2 rounded-xl transition cursor-pointer font-sans"
              >
                Close Audit Register View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
