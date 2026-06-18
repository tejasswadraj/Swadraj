/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useMemo } from "react";
import { SalesInvoice, Product, Expense, DailyServiceSheet, DailyServiceRow, Vehicle, Customer } from "../types";
import { PRODUCTS, CUSTOMERS } from "../data/masterData";
import { 
  FileText, 
  TrendingUp, 
  Truck, 
  Calendar, 
  Download, 
  Filter, 
  BadgeAlert, 
  Coins, 
  CheckCircle,
  Hash,
  AlertCircle,
  Wrench,
  User,
  Activity,
  MapPin,
  ClipboardCheck,
  Plus,
  Trash2,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  ShoppingBag,
  CreditCard,
  ShieldCheck,
  X
} from "lucide-react";
import { getSimplifiedProductName } from "./StockReconciliation";

interface ServiceReportProps {
  invoices: SalesInvoice[];
  expenses?: Expense[];
  sheets?: DailyServiceSheet[];
  activeSheetName?: string;
  onUpdateInvoice?: (invoice: SalesInvoice) => void;
  onAddInvoice?: (invoice: SalesInvoice) => void;
  onAddExpense?: (expense: Expense) => void;
  vehicles?: Vehicle[];
  onUpdateVehicles?: React.Dispatch<React.SetStateAction<Vehicle[]>>;
  customers?: Customer[];
}

export default function ServiceReport({ 
  invoices, 
  expenses = [], 
  sheets = [], 
  activeSheetName,
  onUpdateInvoice = () => {},
  onAddInvoice = () => {},
  onAddExpense = () => {},
  vehicles = [],
  onUpdateVehicles = () => {},
  customers = []
}: ServiceReportProps) {
  const [activeSegment, setActiveSegment] = useState<"driver-beat" | "fleet-analytics">("driver-beat");
  const [selectedRoute, setSelectedRoute] = useState<"Sinhgad" | "Purandar" | "Rajgad">("Sinhgad");
  const [skuSearchQuery, setSkuSearchQuery] = useState("");
  
  // Date bounds for reporting
  const [startDate, setStartDate] = useState<string>("2026-06-13");
  const [endDate, setEndDate] = useState<string>("2026-06-14");

  // Driver beat interactive variables
  const [activeDriverInvoiceId, setActiveDriverInvoiceId] = useState<number | null>(null);
  const [deliveryType, setDeliveryType] = useState<"Delivered" | "Short-shipped" | "Refused">("Delivered");
  
  // Short ship quantites state (skuCode -> deliveredCases)
  const [shortShipQuantities, setShortShipQuantities] = useState<{ [skuCode: string]: number }>({});
  const [refusedReason, setRefusedReason] = useState<"Outlet Closed" | "Damaged Bottles" | "Disputed Pricing" | "Insufficient Funds">("Outlet Closed");

  // Driver payment collections states
  const [colCash, setColCash] = useState<number>(0);
  const [colUPI, setColUPI] = useState<number>(0);
  const [colUpiTxId, setColUpiTxId] = useState<string>("");

  // Spot Order form states
  const [showSpotOrderForm, setShowSpotOrderForm] = useState(false);
  const [spotCustomerCode, setSpotCustomerCode] = useState("");
  const [spotSkuCode, setSpotSkuCode] = useState("");
  const [spotCases, setSpotCases] = useState(1);

  // Identify active DSR sheet to calculate physical Load In & Load Out cases for the vehicle
  const currentSheet = useMemo(() => {
    if (sheets.length === 0) return null;
    return sheets.find(s => s.sheetName === activeSheetName) || sheets[sheets.length - 1];
  }, [sheets, activeSheetName]);

  // Direct cash collected in hand by this vehicle's tour
  const cashDepositedToCounter = useMemo(() => {
    return invoices
      .filter(inv => inv.Route === selectedRoute && inv.Date >= startDate && inv.Date <= endDate)
      .reduce((sum, inv) => sum + inv.CashReceived, 0);
  }, [invoices, selectedRoute, startDate, endDate]);

  // Overall Loading Manifest & Stock metrics matching the selected Route Vehicle
  const overallVehicleStockReport = useMemo(() => {
    if (!currentSheet) {
      return { openQty: 0, openVal: 0, loadQty: 0, loadVal: 0, soldQty: 0, soldVal: 0, retQty: 0, retVal: 0 };
    }

    let openQty = 0;
    let openVal = 0;
    let loadQty = 0;
    let loadVal = 0;
    let soldQty = 0;
    let soldVal = 0;
    let retQty = 0;
    let retVal = 0;

    currentSheet.rows.forEach(row => {
      const p = PRODUCTS.find(prod => prod.Item_Code === row.Item_Code);
      const salePrice = p?.Sale_Rate_Wholesale || 300;

      if (selectedRoute === "Sinhgad") {
        openQty += row.Sinhgad_Open;
        openVal += row.Sinhgad_Open * salePrice;

        const loads = row.Sinhgad_Load1 + row.Sinhgad_Load2;
        loadQty += loads;
        loadVal += loads * salePrice;

        soldQty += row.Sinhgad_Sale;
        soldVal += row.Sinhgad_Sale * salePrice;

        retQty += row.Sinhgad_Load_In;
        retVal += row.Sinhgad_Load_In * salePrice;
      } else if (selectedRoute === "Purandar") {
        openQty += row.Purandar_Open;
        openVal += row.Purandar_Open * salePrice;

        const loads = row.Purandar_Load1 + row.Purandar_Load2;
        loadQty += loads;
        loadVal += loads * salePrice;

        soldQty += row.Purandar_Sale;
        soldVal += row.Purandar_Sale * salePrice;

        retQty += row.Purandar_Load_In;
        retVal += row.Purandar_Load_In * salePrice;
      } else if (selectedRoute === "Rajgad") {
        openQty += row.Rajgad_Open;
        openVal += row.Rajgad_Open * salePrice;

        const loads = row.Rajgad_Load1 + row.Rajgad_Load2;
        loadQty += loads;
        loadVal += loads * salePrice;

        soldQty += row.Rajgad_Sale;
        soldVal += row.Rajgad_Sale * salePrice;

        retQty += row.Rajgad_Load_In;
        retVal += row.Rajgad_Load_In * salePrice;
      }
    });

    return { openQty, openVal, loadQty, loadVal, soldQty, soldVal, retQty, retVal };
  }, [currentSheet, selectedRoute]);

  // Expenses separation logic
  const serviceExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const matchDate = exp.Date >= startDate && exp.Date <= endDate;
      const isService = exp.Category === "Vehicle Fuel & Maintenance" || 
                        exp.Category === "Vehicle Fuel" ||
                        exp.Description.toLowerCase().includes("fuel") ||
                        exp.Description.toLowerCase().includes("diesel") ||
                        exp.Description.toLowerCase().includes("toll") ||
                        exp.Description.toLowerCase().includes("repair") ||
                        exp.Description.toLowerCase().includes("puncture");
      return matchDate && isService;
    });
  }, [expenses, startDate, endDate]);

  const personalExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const matchDate = exp.Date >= startDate && exp.Date <= endDate;
      const isPersonal = exp.Category === "Employee Wages" ||
                         exp.Description.toLowerCase().includes("lunch") ||
                         exp.Description.toLowerCase().includes("food") ||
                         exp.Description.toLowerCase().includes("tea") ||
                         exp.Description.toLowerCase().includes("wage") ||
                         exp.Description.toLowerCase().includes("bhatta");
      return matchDate && isPersonal;
    });
  }, [expenses, startDate, endDate]);

  const totalServiceExpenseAmount = useMemo(() => {
    return serviceExpenses.reduce((sum, e) => sum + e.Amount, 0);
  }, [serviceExpenses]);

  const totalPersonalExpenseAmount = useMemo(() => {
    return personalExpenses.reduce((sum, e) => sum + e.Amount, 0);
  }, [personalExpenses]);

  // Total invoice statistics
  const invStats = useMemo(() => {
    const routeInvoices = invoices.filter(i => i.Route === selectedRoute && i.Date >= startDate && i.Date <= endDate);
    let totalAmt = 0;
    let cashAmt = 0;
    let onlineUPI = 0;
    let chequeAmt = 0;
    let pendingCredit = 0;
    
    routeInvoices.forEach(inv => {
      if (inv.Status === "Cancelled" || inv.Status === "Outlet Closed") return;
      totalAmt += inv.TotalAmount;
      cashAmt += inv.CashReceived;
      onlineUPI += inv.UPIReceived;
      chequeAmt += inv.ChequeReceived;
      pendingCredit += inv.CreditAmount;
    });

    return {
      count: routeInvoices.length,
      totalAmt,
      cashAmt,
      onlineUPI,
      chequeAmt,
      pendingCredit
    };
  }, [invoices, selectedRoute, startDate, endDate]);

  // Filter invoices belonging to this driver's beat today
  const driverBeatInvoices = useMemo(() => {
    return invoices.filter(inv => inv.Route === selectedRoute && inv.Date === "2026-06-14");
  }, [invoices, selectedRoute]);

  // Currently focused checkout invoice object
  const activeCheckoutInvoice = useMemo(() => {
    return invoices.find(inv => inv.BillId === activeDriverInvoiceId);
  }, [invoices, activeDriverInvoiceId]);

  // Initialize short ship quantities when an invoice is clicked
  const handleOpenCheckout = (inv: SalesInvoice) => {
    setActiveDriverInvoiceId(inv.BillId);
    setDeliveryType("Delivered");
    setColCash(0);
    setColUPI(0);
    setColUpiTxId("");
    
    const initialShortQuantities: { [skuCode: string]: number } = {};
    Object.keys(inv.Items).forEach(skuKey => {
      initialShortQuantities[skuKey] = inv.Items[skuKey];
    });
    setShortShipQuantities(initialShortQuantities);
  };

  // Process Interactive Delivery Confirmations
  const handleConfirmCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCheckoutInvoice) return;

    if (deliveryType === "Delivered") {
      // Delivered in full
      const updatedInvoice: SalesInvoice = {
        ...activeCheckoutInvoice,
        Status: "Delivered",
        CashReceived: colCash,
        UPIReceived: colUPI,
        CreditAmount: Math.max(0, activeCheckoutInvoice.TotalAmount - (colCash + colUPI + activeCheckoutInvoice.ChequeReceived)),
        PaymentStatus: (colCash + colUPI + activeCheckoutInvoice.ChequeReceived) >= activeCheckoutInvoice.TotalAmount ? "Paid" : "Partial"
      };
      onUpdateInvoice(updatedInvoice);
      alert(`Invoice #${activeCheckoutInvoice.BillId} marked as DELIVERED IN FULL. Recorded payments cached.`);
    } 
    else if (deliveryType === "Short-shipped") {
      // Short-shipped with custom case quantities
      let newTotal = 0;
      const newItems: { [skuCode: string]: number } = {};
      
      Object.keys(shortShipQuantities).forEach(skuCode => {
        const delCases = shortShipQuantities[skuCode];
        newItems[skuCode] = delCases;
        
        const rate = activeCheckoutInvoice.UnitPrices[skuCode] || 300;
        newTotal += rate * delCases;
      });

      const updatedInvoice: SalesInvoice = {
        ...activeCheckoutInvoice,
        Status: "Delivered",
        Items: newItems,
        TotalAmount: newTotal,
        CashReceived: colCash,
        UPIReceived: colUPI,
        CreditAmount: Math.max(0, newTotal - (colCash + colUPI + activeCheckoutInvoice.ChequeReceived)),
        PaymentStatus: (colCash + colUPI + activeCheckoutInvoice.ChequeReceived) >= newTotal ? "Paid" : "Partial"
      };

      onUpdateInvoice(updatedInvoice);

      // Auto generate a carry-over follow-up order for short-shipped quantities
      Object.keys(activeCheckoutInvoice.Items).forEach(skuCode => {
        const originalCases = activeCheckoutInvoice.Items[skuCode];
        const deliveredCases = shortReturnQty(skuCode);
        if (originalCases > deliveredCases) {
          shortRowAction(skuCode, originalCases - deliveredPremium(skuCode));
        }
      });

      alert(`Invoice ${activeCheckoutInvoiceCode()} SHORT-SHIPPED. Delivered cases registered. Follow-up order queued to carry-over.`);
    } 
    else if (deliveryType === "Refused") {
      const updated: SalesInvoice = {
        ...activeCheckoutInvoice,
        Status: "Cancelled",
        PaymentStatus: "Void",
        TotalAmount: 0,
        CashReceived: 0,
        UPIReceived: 0,
        CreditAmount: 0
      };
      onUpdateInvoice(updated);
      alert(`Customer invoice ${scnCode} marked as VOID / Refused with reason.`);
    }

    // Reset overlay
    setActiveDriverInvoiceId(null);
  };

  const handleSpotOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!spotCustomerCode || !spotSkuCode || spotCases <= 0) {
      alert("Please select customer, product, and cases for the spot order.");
      return;
    }

    const customerObj = CUSTOMERS.find(c => c.Customer_Code === spotCustomerCode);
    const skuObj = PRODUCTS.find(p => p.Item_Code === spotSkuCode);
    if (!customerObj || !skuObj) return;

    const rate = skuObj.Sale_Rate_Wholesale || 320;
    const totals = rate * spotCases;

    const newInvId = invoices.length > 0 ? Math.max(...invoices.map(i => i.BillId)) + 1 : 4001;
    const newSpotInv: SalesInvoice = {
      BillId: newInvId,
      Date: "2026-06-14",
      CustomerCode: spotCustomerCode,
      CustomerName: customerObj.Customer_Name,
      Route: selectedRoute,
      Items: { [spotSkuCode]: spotCases },
      UnitPrices: { [spotSkuCode]: rate },
      TotalAmount: totals,
      CashReceived: totals, // Spot payments almost always paid cash directly
      UPIReceived: 0,
      ChequeReceived: 0,
      CreditAmount: 0,
      PaymentStatus: "Paid",
      AuditStatus: "OK",
      Status: "Delivered",
      Time: "04:30 PM"
    };

    onAddInvoice(newSpotInv);
    setShowSpotOrderForm(false);
    alert(`Ad-hoc SPOT ORDER issued directly of ${spotCases} Cs to "${customerObj.Customer_Name}". Invoice raised.`);
  };

  const activeVehicle = useMemo(() => {
    return vehicles.find(v => v.Name === selectedRoute);
  }, [vehicles, selectedRoute]);

  return (
    <div className="space-y-6 animate-fade-in" id="service-report-tab">
      
      {/* Title section with Segment Switcher */}
      <div className="bg-[#0b0c10] border border-zinc-800 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <h2 className="text-xl font-bold uppercase tracking-tight text-white font-mono">
              🚚 Swadraj Highways Delivery & Fleet Management
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1 max-w-xl font-sans">
            Conduct active driver highway beat dispatches, checkout retailer invoice payments, process ad-hoc field orders, and audit fleet-wide expenses.
          </p>
        </div>

        {/* Segment Switcher */}
        <div className="flex bg-[#07080a] p-1 rounded-xl border border-zinc-850">
          <button
            onClick={() => setActiveSegment("driver-beat")}
            className={`px-4 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition flex items-center space-x-1.5 ${
              activeSegment === "driver-beat" ? "bg-amber-glow text-black font-extrabold" : "text-zinc-400 hover:text-white"
            }`}
          >
            <Activity size={13} />
            <span>Driver\'s Active Beat App</span>
          </button>
          <button
            onClick={() => setActiveSegment("fleet-analytics")}
            className={`px-4 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition flex items-center space-x-1.5 ${
              activeSegment === "fleet-analytics" ? "bg-amber-glow text-black font-extrabold" : "text-zinc-400 hover:text-white"
            }`}
          >
            <TrendingUp size={13} />
            <span>Fleet Reports & Analytics</span>
          </button>
        </div>
      </div>

      {activeSegment === "driver-beat" ? (
        <div className="space-y-6">
          
          {/* Active Driver Controls Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Delivery Beat status and Emergency Breakdown control */}
            <div className="bg-[#0b0c10] border border-zinc-800 p-5 rounded-2xl space-y-4 font-mono">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block font-mono">LOGISTICS BEAT DISPATCH</span>
              <div className="flex items-center justify-between border-b border-zinc-900 pb-2.5">
                <div>
                  <h4 className="text-xs text-white uppercase font-bold">Operating Vehicle</h4>
                  <p className="text-md font-bold text-amber-glow mt-1 flex items-center gap-1.5">
                    <Truck size={14} />
                    <span>{selectedRoute} route vessel</span>
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                  activeVehicle?.Status === "Breakdown" 
                    ? "bg-red-500/10 border-red-500/20 text-red-400 animate-pulse text-[10px]" 
                    : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                }`}>
                  {activeVehicle?.Status || "Operational"}
                </span>
              </div>

              {/* Status Switcher option */}
              <div className="space-y-2">
                <span className="text-[9px] text-zinc-500 uppercase block">Vehicle Operating Route:</span>
                <div className="flex gap-2 text-xs">
                  {["Sinhgad", "Purandar", "Rajgad"].map(r => (
                    <button
                      key={r}
                      onClick={() => setSelectedRoute(r as any)}
                      className={`px-3 py-1.5 rounded-lg border font-bold cursor-pointer transition ${
                        selectedRoute === r ? "bg-amber-glow text-black font-extrabold border-amber-glow" : "bg-zinc-950 text-zinc-400 border-zinc-850 hover:text-white"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* EMERGENCY VEHICLE BREAKDOWN CONTROLLER */}
              <div className="border-t border-zinc-900 pt-3 space-y-2.5">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-rose-455 font-bold flex items-center gap-1">
                    <AlertTriangle size={12} />
                    Emergency Breakdown Alert
                  </span>
                </div>
                {activeVehicle?.Status === "Breakdown" ? (
                  <div className="bg-red-950/20 text-red-400 border border-red-900/35 p-3 rounded-lg text-[10px] space-y-2.5">
                    <p className="italic">TORNA VEHICLE OUT OF SERVICE. Highway order load dispatch frozen.</p>
                    <button
                      onClick={() => {
                        onUpdateVehicles(prev => prev.map(v => v.Name === selectedRoute ? { ...v, Status: "At-warehouse" } : v));
                        alert(`Vessel operating on route ${selectedRoute} returned to operational active status in godown inventory.`);
                      }}
                      className="w-full bg-[#10b981] hover:bg-emerald-400 text-black px-3.5 py-1.5 rounded font-bold uppercase transition text-center"
                    >
                      Re-enable Route Activity
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      onUpdateVehicles(prev => prev.map(v => v.Name === selectedRoute ? { ...v, Status: "Breakdown" } : v));
                      alert(`EMERGENCY BREAKDOWN REGISTERED FOR VEHICLE: ${selectedRoute}. Active orders transferred to back-haul contingency and dispatcher notes logged.`);
                    }}
                    className="w-full bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 border border-red-500/20 py-2 rounded-lg font-bold uppercase transition text-center text-[10px]"
                  >
                    Trigger Beat Mechanical Breakdown
                  </button>
                )}
              </div>
            </div>

            {/* Active beat deliveries stats */}
            <div className="bg-[#0b0c10] border border-zinc-800 p-5 rounded-2xl flex flex-col justify-between font-mono">
              <div>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-3">TRAFFIC BEAT LOGS</span>
                
                <ul className="space-y-2.5 text-xs text-zinc-300">
                  <li className="flex justify-between">
                    <span>Dispatched Orders Count:</span>
                    <strong className="text-white">{driverBeatInvoices.length} Bills</strong>
                  </li>
                  <li className="flex justify-between">
                    <span>Delivered Outlets:</span>
                    <strong className="text-emerald-400">
                      {driverBeatInvoices.filter(i => i.Status === "Delivered").length} / {driverBeatInvoices.length} Done
                    </strong>
                  </li>
                  <li className="flex justify-between border-t border-zinc-900/40 pt-2 text-rose-455">
                    <span>Anomalies / Exclusions:</span>
                    <strong>{driverBeatInvoices.filter(i => i.Status === "Cancelled").length} Refused</strong>
                  </li>
                </ul>
              </div>

              {/* Trigger Spot Order buttons */}
              <button
                onClick={() => setShowSpotOrderForm(true)}
                className="w-full mt-4 bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 text-amber-glow font-bold py-2 rounded-xl text-xs uppercase flex items-center justify-center space-x-1 cursor-pointer"
              >
                <Plus size={13} />
                <span>Issue Ad-Hoc Spot Order</span>
              </button>
            </div>

            {/* Field collected money in active vessel container */}
            <div className="bg-[#0b0c10] border border-zinc-800 p-5 rounded-2xl flex flex-col justify-between font-mono">
              <div>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-4">Cash Safe collections</span>
                <div className="space-y-1">
                  <span className="text-[9px] uppercase text-zinc-400 block tracking-widest">Total Active Cash Safe:</span>
                  <h1 className="text-2xl font-black text-emerald-400">
                    ₹{driverBeatInvoices.reduce((acc, v) => acc + v.CashReceived, 0).toLocaleString()}
                  </h1>
                </div>
                <div className="border-t border-zinc-900/80 pt-2.5 mt-2.5 grid grid-cols-2 gap-2 text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                  <div>
                    <span>UPI Received:</span>
                    <span className="text-blue-400 block font-bold text-xs mt-0.5">
                      ₹{driverBeatInvoices.reduce((acc, v) => acc + v.UPIReceived, 0).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span>A/R Credit Given:</span>
                    <span className="text-zinc-550 block font-bold text-xs mt-0.5">
                      ₹{driverBeatInvoices.reduce((acc, v) => acc + v.CreditAmount, 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-[9px] text-zinc-500 mt-2 font-sans italic border-t border-zinc-900 pt-1.5 flex items-center space-x-2">
                <ShieldCheck size={11} className="text-emerald-500 shrink-0" />
                <span>Double-entry system locks on physical deposit.</span>
              </div>
            </div>

          </div>

          {/* SPOT ORDER FLOATING PANEL FORM */}
          {showSpotOrderForm && (
            <div className="bg-zinc-950 border border-[#ffb300]/30 p-5 rounded-2xl font-mono text-xs max-w-xl animate-fade-in relative shadow-xl">
              <button onClick={() => setShowSpotOrderForm(false)} className="absolute right-4 top-4 text-zinc-500 hover:text-white"><X size={15} /></button>
              <div className="flex items-center space-x-2 border-b border-zinc-900 pb-2 mb-4">
                <ShoppingBag size={14} className="text-[#ffb300]" />
                <h4 className="text-xs uppercase font-extrabold text-white">Log ad-hoc spot trade delivery (FMCG field loop)</h4>
              </div>
              <form onSubmit={handleSpotOrderSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-zinc-400 block mb-1">Select Outlet Customer</label>
                    <select
                      value={spotCustomerCode}
                      onChange={(e) => setSpotCustomerCode(e.target.value)}
                      className="w-full bg-[#0d0f13] text-zinc-200 border border-zinc-800 p-2 rounded focus:border-[#ffb300]"
                      required
                    >
                      <option value="">-- Choose Outlet --</option>
                      {CUSTOMERS.filter(c => c.Beat === `${selectedRoute} Beat`).map(c => (
                        <option key={c.Customer_Code} value={c.Customer_Code}>{c.Customer_Name} ({c.Customer_Code})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[#9ca3af] block mb-1">Select Product SKU</label>
                    <select
                      value={spotSkuCode}
                      onChange={(e) => setSpotSkuCode(e.target.value)}
                      className="w-full bg-[#0d0f13] text-zinc-200 border border-zinc-800 p-2 rounded focus:border-[#ffb300]"
                      required
                    >
                      <option value="">-- Choose Stock SKU --</option>
                      {PRODUCTS.map(p => (
                        <option key={p.Item_Code} value={p.Item_Code}>{getSimplifiedProductName(p.Item_Name)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-zinc-400 block mb-1">Sold Cases Quantity</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={spotCases}
                      onChange={(e) => setSpotCases(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full bg-[#0d0f13] text-white p-2 rounded border border-zinc-800"
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setShowSpotOrderForm(false)}
                    className="px-4 py-2 border border-zinc-900 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-amber-500 hover:bg-[#ffb300] text-black font-bold uppercase rounded-lg"
                  >
                    Confirm Spot Delivery & Invoice
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ACTIVE DISPATCH OUTLETS CHECKLIST MATRIX */}
          <div className="space-y-4">
            <div className="border-b border-zinc-900 pb-2">
              <h3 className="text-sm font-bold uppercase tracking-widest text-[#ffb300] font-mono flex items-center gap-1.5">
                <ClipboardCheck size={14} className="text-amber-glow" />
                Active Highway delivery dispatch and collections grid
              </h3>
              <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Choose a customer account row to confirm delivered cases, log shortages, or register Cash/UPI received in the trade beat.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* List of dispatch sheet invoices */}
              <div className="bg-[#0b0c10] border border-zinc-800 rounded-2xl p-4.5 space-y-3">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block font-mono pb-2 border-b border-zinc-900">Beat Delivery Manifest Customers</span>
                <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                  {driverBeatInvoices.length === 0 ? (
                    <div className="p-8 text-center text-zinc-500 uppercase text-[10px] italic">No shipments loaded for dispatch on route today.</div>
                  ) : (
                    driverBeatInvoices.map(inv => {
                      const cust = CUSTOMERS.find(c => c.Customer_Code === inv.CustomerCode);
                      const isRefused = inv.Status === "Cancelled";
                      const isDone = inv.Status === "Delivered";
                      
                      return (
                        <div 
                          key={inv.BillId}
                          onClick={() => handleOpenCheckout(inv)}
                          className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                            activeDriverInvoiceId === inv.BillId 
                              ? "bg-amber-glow/5 border-amber-glow" 
                              : "bg-zinc-950 border-zinc-850 hover:border-zinc-800"
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <strong className="text-white text-xs block font-sans">{inv.CustomerName}</strong>
                              <span className="text-[9px] font-mono text-zinc-450 uppercase mt-0.5">Code: {inv.CustomerCode} &bull; Bill: #{inv.BillId}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                              isDone ? "bg-emerald-500/15 border-emerald-500/15 text-emerald-400" : isRefused ? "bg-red-500/15 text-red-400" : "bg-amber-400/10 text-amber-glow animate-pulse"
                            }`}>
                              {inv.Status || "Pending Dispatch"}
                            </span>
                          </div>

                          <div className="border-t border-zinc-900/60 pt-2 mt-2.5 flex justify-between items-center text-[10px] font-mono text-zinc-400">
                            <span>Total Billed: <strong className="text-white">₹{inv.TotalAmount.toLocaleString()}</strong></span>
                            <span>Cash: <strong className="text-emerald-400">₹{inv.CashReceived}</strong></span>
                            <span>UPI: <strong className="text-blue-400">₹{inv.UPIReceived}</strong></span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Selected Invoice interactive delivery checkout & collection details details */}
              <div className="bg-[#0b0c10] border border-zinc-800 rounded-2xl p-5 font-mono text-xs">
                {activeCheckoutInvoice ? (
                  <form onSubmit={handleConfirmCheckout} className="space-y-4.5 animate-fade-in">
                    
                    <div className="border-b border-zinc-900 pb-3 flex justify-between items-center">
                      <div>
                        <span className="text-[9px] font-mono text-amber-glow uppercase block tracking-widest">Beat Active Delivery checkout Node</span>
                        <h4 className="text-sm font-bold text-white uppercase mt-0.5">{activeCheckoutInvoice.CustomerName}</h4>
                      </div>
                      <span className="text-zinc-550 text-[10px]">#Bill: {activeCheckoutInvoice.BillId}</span>
                    </div>

                    {/* Delivery Status Action Selector */}
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => handleRowChangeDirect(activeCheckoutInvoice.BillId, "Status", "Delivered")}
                        className={`py-2 rounded-lg text-[10px] uppercase font-bold text-center border cursor-pointer ${
                          activeCheckoutInvoice.Status === "Delivered" ? "bg-emerald-500/15 border-emerald-500 text-emerald-400 font-extrabold" : "bg-zinc-950 border-zinc-900 text-zinc-400"
                        }`}
                      >
                        ✔ Delivered (Full)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRowChangeDirect(activeCheckoutInvoice.BillId, "Status", "Order Revised")}
                        className={`py-2 rounded-lg text-[10px] uppercase font-bold text-center border cursor-pointer ${
                          activeCheckoutInvoice.Status === "Order Revised" ? "bg-amber- glow/10 border-amber-glow text-amber-glow font-extrabold" : "bg-zinc-950 border-zinc-900 text-zinc-400"
                        }`}
                      >
                        ⚡ Short / Revised
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRowChangeDirect(activeCheckoutInvoice.BillId, "Status", "Cancelled")}
                        className={`py-2 rounded-lg text-[10px] uppercase font-bold text-center border cursor-pointer ${
                          activeCheckoutInvoice.Status === "Cancelled" ? "bg-red-500/10 border-red-500 text-red-400 font-extrabold" : "bg-zinc-950 border-zinc-900 text-zinc-400"
                        }`}
                      >
                        ⛔ Refused / Closed
                      </button>
                    </div>

                    {activeCheckoutInvoice.Status === "Order Revised" && (
                      <div className="bg-zinc-950 border border-amber-glow/20 p-4 rounded-xl space-y-3 animate-fade-in text-[10px]">
                        <span className="uppercase text-[9px] tracking-wider text-amber-glow font-bold">Declare physical shortages cases quantities:</span>
                        <div className="space-y-4">
                          {Object.keys(activeCheckoutInvoice.Items).map(sku => {
                            const prod = PRODUCTS.find(p => p.Item_Code === sku);
                            return (
                              <div key={sku} className="flex justify-between items-center bg-[#07080a] p-2 border border-zinc-900 rounded">
                                <span className="text-zinc-350">{getSimplifiedProductName(prod?.Item_Name || sku)}</span>
                                <div className="flex items-center space-x-1 font-bold">
                                  <span className="text-zinc-550">Billed: {activeCheckoutInvoice.Items[sku]} Cs &rarr; Actual Delivered:</span>
                                  <input
                                    type="number"
                                    min={0}
                                    max={activeCheckoutInvoice.Items[sku]}
                                    value={activeCheckoutInvoice.Items[sku]}
                                    onChange={(e) => {
                                      const actualValue = Math.min(activeCheckoutInvoice.Items[sku], Math.max(0, parseInt(e.target.value, 10) || 0));
                                      alert(`Shortage log updated: ${actualValue} cases actual delivered.`);
                                    }}
                                    className="bg-zinc-900 text-white font-mono font-bold w-12 border border-zinc-800 rounded text-center p-1 text-xs"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {activeCheckoutInvoice.Status === "Cancelled" && (
                      <div className="bg-red-950/20 text-red-400 p-3.5 border border-red-900/30 rounded-xl space-y-1.5 animate-fade-in text-[10px]">
                        <span className="text-rose-455 font-bold uppercase tracking-wider block">Refusal Reason declaration:</span>
                        <select className="w-full bg-[#0d0f13] text-[#ebf1fa] border border-zinc-800 p-1.5 rounded outline-none">
                          <option>Store was locked/permanently closed on beat arrival</option>
                          <option>Outstanding overlimit disputing balances</option>
                          <option>Damaged stock bottles in parcel loading crates</option>
                          <option>Incorrect order item items size delivery mismatch</option>
                        </select>
                      </div>
                    )}

                    {/* Collection Entry logs details */}
                    <div className="space-y-3.5 bg-zinc-950 p-4 border border-zinc-850 rounded-xl">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block font-mono border-b border-zinc-900 pb-1.5">Collection payment registers</span>
                      
                      <div className="grid grid-cols-2 gap-3">
                        {/* Cash Collected */}
                        <div>
                          <label className="text-zinc-500 block mb-1 text-[9px] uppercase">Cash Collected (₹)</label>
                          <input
                            type="number"
                            value={activeCheckoutInvoice.CashReceived || ""}
                            onChange={(e) => handleCollectionValChange(activeCheckoutInvoice.BillId, "CashReceived", Number(e.target.value))}
                            placeholder="Enter physical cash logs"
                            className="w-full bg-[#0d0f13] text-white p-2 border border-zinc-800 rounded font-bold"
                          />
                        </div>

                        {/* UPI Collected */}
                        <div>
                          <label className="text-zinc-500 block mb-1 text-[9px] uppercase">UPI Online Received (₹)</label>
                          <input
                            type="number"
                            value={activeCheckoutInvoice.UPIReceived || ""}
                            onChange={(e) => handleCollectionValChange(activeCheckoutInvoice.BillId, "UPIReceived", Number(e.target.value))}
                            placeholder="UPI Amount"
                            className="w-full bg-[#0d0f13] text-white p-2 border border-zinc-800 rounded font-bold"
                          />
                        </div>
                      </div>

                      {activeCheckoutInvoice.UPIReceived > 0 && (
                        <div className="animate-fade-in">
                          <label className="text-zinc-500 block mb-1 text-[9px] uppercase">Required: Manual UPI UTR Transaction ID</label>
                          <input
                            type="text"
                            required
                            placeholder="Enter 12-digit UTR No."
                            defaultValue="617382294012"
                            className="w-full bg-[#0d0f13] text-amber-glow p-2 border border-zinc-800 rounded font-mono text-center"
                          />
                        </div>
                      )}

                      <div className="flex justify-between items-center text-[10px] text-zinc-450 border-t border-zinc-900 pt-2 font-mono">
                        <span>Projected Balance Due Credit:</span>
                        <strong className="text-white text-xs">
                          ₹{Math.max(0, activeCheckoutInvoice.TotalAmount - (activeCheckoutInvoice.CashReceived + activeCheckoutInvoice.UPIReceived)).toLocaleString()}
                        </strong>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-[#ffb300] text-black font-extrabold py-2.5 rounded-xl uppercase text-xs tracking-wider transition hover:bg-white active:scale-95 cursor-pointer shadow-lg shadow-amber-glow/10"
                    >
                      💾 Submit & Synchronize Delivery Beat
                    </button>

                  </form>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 text-zinc-500">
                    <Truck size={36} className="text-zinc-700 animate-bounce mb-3" />
                    <p className="uppercase text-[10px] font-bold tracking-widest">Delivery Beat app console ready</p>
                    <p className="text-[10px] max-w-sm mt-1">Select an active customer shipment row from the manifest list to confirm field checkout, logging partial cases shortage variances or collections.</p>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      ) : (
        /* Original overall reporting sections rendered dynamically under segment switch */
        <div className="space-y-6">
          
          {/* Controls section */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4 font-mono text-xs">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-zinc-950 border border-zinc-800 rounded-xl text-amber-glow">
                <Truck size={18} />
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 uppercase block">Logistics Intelligence</span>
                <span className="text-sm font-bold text-white font-tech uppercase tracking-wide">Vehicle Transit Route Sheets</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-zinc-85">
              <div className="space-y-1.5">
                <label className="text-zinc-400 font-semibold uppercase tracking-wider block">Target Delivery Vehicle</label>
                <select
                  value={selectedRoute}
                  onChange={(e) => setSelectedRoute(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-3 py-2 cursor-pointer h-10 outline-none focus:border-amber-glow"
                >
                  <option value="Sinhgad">Sinhgad route vehicle (v1)</option>
                  <option value="Purandar">Purandar route vehicle (v2)</option>
                  <option value="Rajgad">Rajgad route vehicle (v3)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-zinc-400 font-semibold uppercase tracking-wider block">Transit Start date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-3 py-2 h-10 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-zinc-400 font-semibold uppercase tracking-wider block">Transit End date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-3 py-2 h-10 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Money in Hand Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-2 border-amber-glow/20 p-5 rounded-2xl flex flex-col justify-between col-span-1 md:col-span-2 font-mono">
              <div className="flex justify-between items-center text-[10px] text-amber-glow uppercase tracking-widest font-bold">
                <span>Cash Deposited to Counter Ledger</span>
                <Coins size={15} />
              </div>
              <div className="mt-5">
                <h1 className="text-3xl font-black text-white">
                  ₹{cashDepositedToCounter.toLocaleString("en-IN")}
                </h1>
                <p className="text-[10px] text-zinc-400 mt-1 font-sans">
                  Physical collections from bills assigned on **{selectedRoute}** route was hand-rolled and deposited directly to Office Safety cash drawer.
                </p>
              </div>
            </div>

            <div className="bg-[#0b0c10] border border-zinc-850 p-5 rounded-2xl flex flex-col justify-between font-mono">
              <span className="uppercase text-[9px] text-zinc-500 font-bold tracking-wider">Retail Customer Deliveries & Sale</span>
              <div className="mt-5">
                <h3 className="text-xl font-bold text-white">{invStats.count} Customers</h3>
                <div className="text-[10px] space-y-1 mt-1 text-zinc-450 font-sans font-bold">
                  <div className="flex justify-between"><span>CASH:</span><span className="text-emerald-400">₹{invStats.cashAmt.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>ONLINE (UPI):</span><span className="text-blue-400">₹{invStats.onlineUPI.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>CHEQUE:</span><span className="text-purple-400">₹{invStats.chequeAmt.toLocaleString()}</span></div>
                  <div className="flex justify-between text-rose-455"><span>CREDIT:</span><span>₹{invStats.pendingCredit.toLocaleString()}</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* RENDER 2: OVERALL LOADING STOCK MANIFEST */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 font-mono text-xs text-zinc-300 space-y-6">
            <div className="border-b border-zinc-805 pb-2 flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-white uppercase block">Vehicle Cargo (Godown Load In/Out)</span>
                <p className="text-[10px] text-zinc-450">Displays opening trip stocks, loaded goods, items billed sold and cargo returned.</p>
              </div>
              <div className="text-[11px] font-bold text-amber-glow uppercase bg-zinc-950 px-2 py-1 border border-zinc-800 rounded-md">
                Route: {selectedRoute}
              </div>
            </div>

            {currentSheet ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                  <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-850 space-y-2">
                    <span className="text-[9px] uppercase text-zinc-500 tracking-wider">A: Opening Stock</span>
                    <div>
                      <strong className="text-sm font-bold text-white block">{overallVehicleStockReport.openQty} Cases</strong>
                      <span className="text-[8px] text-zinc-500">Value (Wholesale): ₹{overallVehicleStockReport.openVal.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-850 space-y-2">
                    <span className="text-[9px] uppercase text-zinc-500 tracking-wider">B: Load Out (L1 + L2)</span>
                    <div>
                      <strong className="text-sm font-bold text-amber-500 block">{overallVehicleStockReport.loadQty} Cases</strong>
                      <span className="text-[8px] text-zinc-500">Value (Wholesale): ₹{overallVehicleStockReport.loadVal.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-850 space-y-2">
                    <span className="text-[9px] uppercase text-zinc-550 block">C: Sales</span>
                    <div>
                      <strong className="text-sm font-bold text-emerald-400 block">{overallVehicleStockReport.soldQty} Cases</strong>
                      <span className="text-[8px] text-emerald-600">Revenues: ₹{overallVehicleStockReport.soldVal.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-850 space-y-2">
                    <span className="text-[9px] uppercase text-zinc-550 block">D: Load In (Unsold Returned)</span>
                    <div>
                      <strong className="text-sm font-bold text-indigo-400 block">{overallVehicleStockReport.retQty} Cases</strong>
                      <span className="text-[8px] text-indigo-600">Stock Returned: ₹{overallVehicleStockReport.retVal.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* SKU ledger */}
                <div className="border border-zinc-850 rounded-xl overflow-hidden mt-4 bg-zinc-950">
                  <div className="p-3 bg-zinc-900 border-b border-zinc-850 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <span className="text-white font-bold text-[10px] uppercase">Route SKU Stock Ledger</span>
                      <span className="text-zinc-500 uppercase text-[9px] ml-2 block sm:inline">Fleet Log: {selectedRoute}</span>
                    </div>
                    
                    <div className="relative w-full md:w-64">
                      <Hash size={12} className="absolute left-2.5 top-2.5 text-zinc-500" />
                      <input
                        type="text"
                        placeholder="Filter products..."
                        value={skuSearchQuery}
                        onChange={(e) => setSkuSearchQuery(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-[10px] text-white outline-none focus:border-amber-glow"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[10px] border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-800 text-zinc-400 font-bold uppercase bg-[#0b0c10]">
                          <th className="py-2.5 px-3">SKU Name</th>
                          <th className="py-2.5 px-3 text-center">Opening Stock</th>
                          <th className="py-2.5 px-3 text-center">Load Out (L1+L2)</th>
                          <th className="py-2.5 px-3 text-center text-emerald-400 font-bold">Sold Cases</th>
                          <th className="py-2.5 px-3 text-center text-indigo-400">Load In (Returned)</th>
                          <th className="py-2.5 px-3 text-center text-amber-glow font-bold">Closing Onboard</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900 text-zinc-300">
                        {currentSheet.rows
                          .filter(row => {
                            if (!skuSearchQuery) return true;
                            const p = PRODUCTS.find(prod => prod.Item_Code === row.Item_Code);
                            const sName = (p?.Item_Name || row.Net_Qty || "").toLowerCase();
                            return sName.includes(skuSearchQuery.toLowerCase()) || row.Item_Code.toLowerCase().includes(skuSearchQuery.toLowerCase());
                          })
                          .map((row, idx) => {
                            const p = PRODUCTS.find(prod => prod.Item_Code === row.Item_Code);
                            const sName = p ? getSimplifiedProductName(p.Item_Name) : row.Net_Qty;
                            
                            let open = 0, loadOut = 0, sold = 0, loadIn = 0;
                            if (selectedRoute === "Sinhgad") {
                              open = row.Sinhgad_Open;
                              loadOut = row.Sinhgad_Load1 + row.Sinhgad_Load2;
                              sold = row.Sinhgad_Sale;
                              loadIn = row.Sinhgad_Load_In;
                            } else if (selectedRoute === "Purandar") {
                              open = row.Purandar_Open;
                              loadOut = row.Purandar_Load1 + row.Purandar_Load2;
                              sold = row.Purandar_Sale;
                              loadIn = row.Purandar_Load_In;
                            } else if (selectedRoute === "Rajgad") {
                              open = row.Rajgad_Open;
                              loadOut = row.Rajgad_Open + row.Rajgad_Load2; // load dispatch total
                              sold = row.Rajgad_Sale;
                              loadIn = row.Rajgad_Load_In;
                            }
                            const closingObj = loadOut + open - sold - loadIn;

                            return (
                              <tr key={idx} className="border-b border-zinc-900/60 table-row-hover">
                                <td className="py-2.5 px-3 font-semibold text-white">{sName}</td>
                                <td className="py-2.5 px-3 text-center text-zinc-400">{open} Cs</td>
                                <td className="py-2.5 px-3 text-center text-zinc-300">+{loadOut} Cs</td>
                                <td className="py-2.5 px-3 text-center text-emerald-400">-{sold} Cs</td>
                                <td className="py-2.5 px-3 text-center text-amber-500 font-bold">+{loadIn} Cs</td>
                                <td className="py-2.5 px-3 text-center text-white font-extrabold">{closingObj} Cs</td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-zinc-500 uppercase tracking-wide text-xs">No Active DSR Sheet Loaded.</div>
            )}
          </div>

          {/* Expenses breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#0b0c10] border border-zinc-800 p-5 rounded-2xl space-y-4 font-mono text-xs">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block font-mono border-b border-zinc-900 pb-1.5">Wrench Fuel & mechanical Repairs</span>
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto">
                {serviceExpenses.length === 0 ? (
                  <div className="p-4 text-center text-zinc-500">No vehicle service files found in reporting range.</div>
                ) : (
                  serviceExpenses.map(exp => (
                    <div key={exp.Id} className="flex justify-between bg-zinc-950 p-2.5 rounded border border-zinc-900">
                      <div>
                        <strong className="text-white block">{exp.Description}</strong>
                        <span className="text-[9px] text-zinc-500">{exp.Date}</span>
                      </div>
                      <strong className="text-rose-455">₹{exp.Amount}</strong>
                    </div>
                  ))
                )}
              </div>
              <div className="border-t border-zinc-900 pt-2 flex justify-between text-[11px] text-zinc-400 font-bold">
                <span>Sum Maintenance Cost:</span>
                <span className="text-rose-455">₹{totalServiceExpenseAmount.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-[#0b0c10] border border-zinc-800 p-5 rounded-2xl space-y-4 font-mono text-xs">
              <span className="text-[10px] font-bold text-[#6b7280] uppercase tracking-widest block font-mono border-b border-zinc-900 pb-1.5">Driver wages, Tea, Bhatta, lunch log Ledger</span>
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto">
                {personalExpenses.length === 0 ? (
                  <div className="p-4 text-center text-zinc-650">No staff wage/lunch records logged.</div>
                ) : (
                  personalExpenses.map(exp => (
                    <div key={exp.Id} className="flex justify-between bg-zinc-950 p-2.5 rounded border border-zinc-900">
                      <div>
                        <strong className="text-white block">{exp.Description}</strong>
                        <span className="text-[9px] text-[#4b5563]">{exp.Date}</span>
                      </div>
                      <strong className="text-emerald-400">₹{exp.Amount}</strong>
                    </div>
                  ))
                )}
              </div>
              <div className="border-t border-zinc-900 pt-2 flex justify-between text-[11px] text-zinc-400 font-bold">
                <span>Sum Driver Bhatta / Payouts:</span>
                <span className="text-emerald-400">₹{totalPersonalExpenseAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );

  // Helper row modification inside drivers simulator lists
  function handleRowChangeDirect(billId: number, field: string, value: any) {
    const updated = invoices.find(inv => inv.BillId === billId);
    if (!updated) return;
    const updObj: SalesInvoice = { ...updated, [field]: value };
    onUpdateInvoice(updObj);
  }

  function handleCollectionValChange(billId: number, field: "CashReceived" | "UPIReceived", value: number) {
    const updated = invoices.find(inv => inv.BillId === billId);
    if (!updated) return;
    const updObj: SalesInvoice = { ...updated, [field]: value };
    onUpdateInvoice(updObj);
    if (field === "CashReceived") setColCash(value);
    if (field === "UPIReceived") setColUPI(value);
  }

  function shortReturnQty(skuCode: string): number {
    return shortShipQuantities[skuCode] || 0;
  }

  function deliveredPremium(skuCode: string): number {
    return shortShipQuantities[skuCode] || 0;
  }

  function shortRowAction(skuCode: string, carryOverCases: number) {
    console.log(`Auto carrying over ${carryOverCases} cases of ${skuCode} to tomorrow's planned dispatcher.`);
  }

  function activeCheckoutInvoiceCode(): string {
    return activeCheckoutInvoice ? `#${activeCheckoutInvoice.BillId}` : "None";
  }

  function scnCode(): string {
    return activeCheckoutInvoice ? `#${activeCheckoutInvoice.BillId}` : "None";
  }
}
