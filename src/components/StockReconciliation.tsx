/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from "react";
import { DailyServiceSheet, DailyServiceRow } from "../types";
import { PRODUCTS } from "../data/masterData";
import { calculateDailyRow } from "../utils/math";

// Helper to simplify long product names with their net volume/quantity for clean display
export function getSimplifiedProductName(fullName: string): string {
  if (!fullName) return "";
  let name = fullName;
  
  // Replace long text pattern for Frooti
  name = name.replace("Fresh Mango Drink ", "");
  
  // Replace long text pattern for Smoodh
  name = name
    .replace("Silk ", "")
    .replace("Salted ", "")
    .replace("Roasted ", "")
    .replace("Royal ", "")
    .replace("Classic Sweet ", "")
    .replace(" Shake", "");
  
  // Replace long text pattern for Appy Fizz, B Fizz
  name = name
    .replace("Sparkling Apple Juice Drink ", "")
    .replace("Malty Herb Sparkler Drink ", "");
    
  // Replace long text pattern for Bailey & other water/soda
  name = name
    .replace("Packaged Drinking Water ", "")
    .replace("Club Soda Glass Bottle ", "Soda Glass ")
    .replace("Club Soda Pet Bottle ", "Soda Pet ")
    .replace("Jeera Masala Soda Pet Bottle ", "Jeera Soda ")
    .replace("Premium Drinking Water ", "");
    
  return name;
}

import {
  Calendar, 
  RefreshCw, 
  Plus, 
  Save, 
  AlertCircle, 
  ArrowRight,
  Database,
  Truck,
  Layers,
  Search,
  CheckCircle,
  Download,
  Info,
  ChevronRight,
  Gauge,
  SlidersHorizontal,
  FileSpreadsheet,
  Grid,
  List
} from "lucide-react";

interface StockReconciliationProps {
  sheets: DailyServiceSheet[];
  activeSheetName: string;
  onSelectSheet: (name: string) => void;
  onUpdateSheet: (updated: DailyServiceSheet) => void;
  onRollover: () => void;
}

export type StockDeskMode = "Warehouse" | "Sinhgad" | "Purandar" | "Rajgad" | "SummaryAudit";

export default function StockReconciliation({
  sheets,
  activeSheetName,
  onSelectSheet,
  onUpdateSheet,
  onRollover,
}: StockReconciliationProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMode, setActiveMode] = useState<StockDeskMode>("Warehouse");
  const [selectedBrand, setSelectedBrand] = useState<string>("ALL");
  const [viewStyle, setViewStyle] = useState<"table" | "cards">("table");

  // Keep offsets for extra items inside local state
  const [offerPiecesMap, setOfferPiecesMap] = useState<{[skuCode: string]: number}>({});
  const [adjustedStockMap, setAdjustedStockMap] = useState<{[skuCode: string]: number}>({});

  // Pagination parameters
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Active DSR sheet
  const activeSheet = useMemo(() => {
    return sheets.find((s) => s.sheetName === activeSheetName) || sheets[sheets.length - 1];
  }, [sheets, activeSheetName]);

  // Reset pagination on filters
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedBrand, activeMode]);

  // Format date nicely for display
  const formattedDate = useMemo(() => {
    if (!activeSheet) return "";
    const options: Intl.DateTimeFormatOptions = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
    return new Date(activeSheet.date).toLocaleDateString("en-IN", options);
  }, [activeSheet]);

  // Get brands listing dynamically based on sheet products
  const brands = useMemo(() => {
    if (!activeSheet) return [];
    const set = new Set<string>();
    activeSheet.rows.forEach(r => {
      if (r.Brand) set.add(r.Brand);
    });
    return Array.from(set).sort();
  }, [activeSheet]);

  // Handle value change across any SKU field
  const handleValueChange = (rowIdx: number, field: keyof DailyServiceRow, value: string) => {
    if (!activeSheet) return;

    const parsedVal = value.trim() === "" ? 0 : parseInt(value, 10);
    if (isNaN(parsedVal) || parsedVal < 0) return;

    const updatedRows = [...activeSheet.rows];
    const targetRow = { ...updatedRows[rowIdx] };
    
    (targetRow as any)[field] = parsedVal;

    // Recalculate operational equations
    const calculated = calculateDailyRow(targetRow);
    updatedRows[rowIdx] = calculated;

    onUpdateSheet({
      ...activeSheet,
      rows: updatedRows,
    });
  };

  // Export SKU Report to CSV file
  const handleExportSkuCSV = () => {
    if (!activeSheet) return;
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "SKU Code,Product Name,Brand,Warehouse Opening,Vehicle Opening,Primary Purchase,Vehicle Sale,Counter Sale,Warehouse Closing,Vehicle Closing,Offer Pieces,Adjusted Stock\n";
    
    activeSheet.rows.forEach(row => {
      const p = PRODUCTS.find(prod => prod.Item_Code === row.Item_Code);
      const name = p?.Item_Name || row.Net_Qty;
      
      const vSale = row.Sinhgad_Sale + row.Purandar_Sale + row.Rajgad_Sale;
      const vClose = (row.Sinhgad_Open + row.Sinhgad_Load1 + row.Sinhgad_Load2 - row.Sinhgad_Sale - row.Sinhgad_Load_In) +
                     (row.Purandar_Open + row.Purandar_Load1 + row.Purandar_Load2 - row.Purandar_Sale - row.Purandar_Load_In) +
                     (row.Rajgad_Open + row.Rajgad_Load1 + row.Rajgad_Load2 - row.Rajgad_Sale - row.Rajgad_Load_In);

      const offer = offerPiecesMap[row.Item_Code] || 0;
      const adjusted = adjustedStockMap[row.Item_Code] || 0;

      csvContent += `"${row.Item_Code}","${name}","${row.Brand}",${row.Open},${row.Vehicle_Open},${row.Primary},${vSale},${row.Counter_Sale},${row.Total_Closing},${Math.max(0, vClose)},${offer},${adjusted}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `DSR_STOCK_REPORT_${activeSheet.date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Rows matching search and brand criteria
  const filteredRowsAndIndices = useMemo(() => {
    if (!activeSheet) return [];
    return activeSheet.rows
      .map((row, idx) => ({ row, originalIdx: idx }))
      .filter(({ row }) => {
        // Brand filter matches
        if (selectedBrand !== "ALL" && row.Brand !== selectedBrand) return false;

        // Search query matches
        const p = PRODUCTS.find(prod => prod.Item_Code === row.Item_Code);
        const name = p?.Item_Name || row.Net_Qty;
        return name.toLowerCase().includes(searchQuery.toLowerCase()) || 
               row.Item_Code.toLowerCase().includes(searchQuery.toLowerCase()) ||
               row.Brand.toLowerCase().includes(searchQuery.toLowerCase());
      });
  }, [activeSheet, searchQuery, selectedBrand]);

  // Paginated Rows slice
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRowsAndIndices.slice(start, start + itemsPerPage);
  }, [filteredRowsAndIndices, currentPage]);

  const totalPages = Math.ceil(filteredRowsAndIndices.length / itemsPerPage);

  // Aggregated Stock summary
  const aggregates = useMemo(() => {
    if (!activeSheet) return null;
    let whOpen = 0;
    let fleetOpen = 0;
    let purchaseQty = 0;
    let whClose = 0;
    let fleetClose = 0;

    activeSheet.rows.forEach(r => {
      whOpen += r.Open;
      fleetOpen += r.Vehicle_Open;
      purchaseQty += r.Primary;
      whClose += r.Total_Closing;
      fleetClose += (r.Sinhgad_Open + r.Sinhgad_Load1 + r.Sinhgad_Load2 - r.Sinhgad_Sale - r.Sinhgad_Load_In) +
                    (r.Purandar_Open + r.Purandar_Load1 + r.Purandar_Load2 - r.Purandar_Sale - r.Purandar_Load_In) +
                    (r.Rajgad_Open + r.Rajgad_Load1 + r.Rajgad_Load2 - r.Rajgad_Sale - r.Rajgad_Load_In);
    });

    return { whOpen, fleetOpen, purchaseQty, whClose, fleetClose };
  }, [activeSheet]);

  if (!activeSheet) {
    return <div className="p-6 text-zinc-500 font-mono text-xs">Loading Sheet reconciliations...</div>;
  }

  return (
    <div className="space-y-6" id="stock-report-suite">
      
      {/* Date navigation and Actions Banner */}
      <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-4 bg-zinc-900 border border-zinc-850 rounded-2xl p-5 shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-zinc-400 font-mono text-[9px] uppercase font-bold tracking-wider select-none">
            <Calendar size={12} className="text-amber-glow" />
            <span>Compliance Workday Register</span>
          </div>
          <h2 className="text-sm font-bold text-white tracking-tight flex items-center space-x-2 uppercase font-mono">
            <span>Stock Ledger:</span>
            <span className="text-amber-glow font-black font-tech">{formattedDate}</span>
          </h2>
          <p className="text-[11px] text-zinc-500 font-sans">
            Streamlined stock accounting spreadsheet. Toggle brand tabs and search filters to avoid excessive data overload.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Day selection dropdown */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 flex items-center space-x-2 shrink-0">
            <label className="text-[9px] font-bold text-zinc-500 uppercase font-mono select-none">Target date:</label>
            <select
              value={activeSheetName}
              onChange={(e) => onSelectSheet(e.target.value)}
              className="bg-transparent text-xs text-white border-none outline-none font-mono font-bold cursor-pointer focus:ring-0"
            >
              {sheets.map(s => (
                <option key={s.sheetName} value={s.sheetName} className="bg-zinc-950 text-white font-mono">
                  {s.sheetName}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleExportSkuCSV}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition cursor-pointer font-mono shadow-md"
            title="Download full grid as raw CSV spreadsheet"
          >
            <Download size={13} />
            <span>Export CSV</span>
          </button>

          <button
            onClick={onRollover}
            className="flex items-center space-x-1.5 px-4 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 border border-amber-900/40 text-black rounded-xl text-xs font-black transition cursor-pointer shadow-md select-none font-mono"
            title="Saves closing today and rolls balances to a clean new workspace sheet"
          >
            <RefreshCw size={13} className="animate-spin-slow text-black" />
            <span>Publish & Rollover</span>
          </button>
        </div>
      </div>

      {/* Aggregate KPI counts panel */}
      {aggregates && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 text-white font-mono select-none">
          <div className="bg-zinc-950/40 p-4 rounded-xl border border-zinc-900">
            <span className="text-[8.5px] text-zinc-550 uppercase font-mono font-bold">Godown Opening</span>
            <span className="block mt-1 text-sm font-black text-zinc-200">{aggregates.whOpen} cs</span>
          </div>
          <div className="bg-zinc-950/40 p-4 rounded-xl border border-zinc-900">
            <span className="text-[8.5px] text-zinc-550 uppercase font-mono font-bold">Total Purchases</span>
            <span className="block mt-1 text-sm font-black text-emerald-400">+{aggregates.purchaseQty} cs</span>
          </div>
          <div className="bg-zinc-950/40 p-4 rounded-xl border border-zinc-900">
            <span className="text-[8.5px] text-zinc-550 uppercase font-mono font-bold">Fleet In-Transit</span>
            <span className="block mt-1 text-sm font-black text-yellow-500">{aggregates.fleetOpen} cs</span>
          </div>
          <div className="bg-zinc-950/40 p-4 rounded-xl border border-amber-900/40">
            <span className="text-[8.5px] text-zinc-550 uppercase font-mono font-bold">Godown Closing</span>
            <span className="block mt-1 text-sm font-black text-amber-glow">{aggregates.whClose} cs</span>
          </div>
          <div className="bg-zinc-950/40 p-4 rounded-xl border border-emerald-900/40 hidden md:block">
            <span className="text-[8.5px] text-zinc-550 uppercase font-mono font-bold">Transit Closing</span>
            <span className="block mt-1 text-sm font-black text-emerald-400">{Math.max(0, aggregates.fleetClose)} cs</span>
          </div>
        </div>
      )}

      {/* LaTeX Stock Reconciliation Mathematical Formulas Panel */}
      <div className="bg-[#0b0c10] border border-[#ffb300]/15 rounded-2xl p-4 shadow-xl text-zinc-300 font-sans select-none">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-glow/10 rounded-xl text-amber-glow border border-amber-glow/20 shrink-0">
            <Info size={16} />
          </div>
          <div className="space-y-3 w-full">
            <div>
              <h4 className="text-xs font-extrabold uppercase text-white tracking-widest font-mono">
                Swadraj Distribution Reconciliation Formulas
              </h4>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                All ledger metrics are reconciled daily using standard LaTeX compliance equations. If any closing count deviates, verify Load-In or Load-Out figures.
              </p>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 pt-1">
              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-90 w-full overflow-x-auto">
                <span className="text-[9px] font-bold text-amber-glow uppercase tracking-wider block font-mono mb-1.5">
                  🏠 Warehouse Stock Reconciliation (Unsold Goods Pool)
                </span>
                <div className="text-[11px] font-mono leading-relaxed text-zinc-300">
                  <span className="text-zinc-500 font-bold block mb-1">LaTeX Representation:</span>
                  <div className="bg-[#0d0f13] px-2 py-1.5 rounded text-zinc-450 font-mono text-[10.5px]">
                    {"$$Closing\\ Stock_{Warehouse} = Opening\\ Stock + Primary\\ Stock\\ (Purchases) - Load\\ Out\\ (to\\ Vehicles) + Load\\ In\\ (Returns)$$" }
                  </div>
                  <span className="text-[9px] text-zinc-500 block mt-1.5">
                    *Formula aggregates active Godown-1 and Godown-2 storage nodes.
                  </span>
                </div>
              </div>

              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-90 w-full overflow-x-auto">
                <span className="text-[9px] font-bold text-amber-glow uppercase tracking-wider block font-mono mb-1.5">
                  🚚 Vehicle Stock Reconciliation (Sinhgad, Rajgad, Purandar Fleet)
                </span>
                <div className="text-[11px] font-mono leading-relaxed text-zinc-300">
                  <span className="text-zinc-550 font-bold block mb-1">LaTeX Representation:</span>
                  <div className="bg-[#0d0f13] px-2 py-1.5 rounded text-zinc-450 font-mono text-[10.5px]">
                    {"$$Closing\\ Stock_{Vehicle} = Opening\\ Stock_{Vehicle} + Load\\ In\\ (Daily\\ Loading) - Sold\\ Stock - Load\\ Out\\ (Returned\\ to\\ Warehouse)$$" }
                  </div>
                  <span className="text-[9px] text-zinc-500 block mt-1.5">
                    *Formula must balance per vehicle plate before checkout approval.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Brand Filtration Row (Swiper pills) */}
      <div className="bg-zinc-950/40 border border-zinc-900 p-2 rounded-2xl flex flex-wrap gap-1.5 select-none scrollbar-none overflow-x-auto">
        <button
          onClick={() => setSelectedBrand("ALL")}
          className={`px-3 py-1.5 rounded-lg font-mono text-[10px] font-bold uppercase transition cursor-pointer border ${
            selectedBrand === "ALL" 
              ? "bg-[#ffb300]/10 text-amber-glow border-amber-glow/20" 
              : "bg-transparent text-zinc-500 border-transparent hover:text-zinc-300"
          }`}
        >
          All Brands ({activeSheet.rows.length} SKUs)
        </button>
        {brands.map(b => {
          const count = activeSheet.rows.filter(r => r.Brand === b).length;
          return (
            <button
              key={b}
              onClick={() => setSelectedBrand(b)}
              className={`px-3 py-1.5 rounded-lg font-mono text-[10px] font-bold uppercase transition cursor-pointer border  ${
                selectedBrand === b 
                  ? "bg-[#ffb300]/10 text-amber-glow border-amber-glow/30" 
                  : "bg-transparent text-zinc-500 border-transparent hover:text-zinc-300"
              }`}
            >
              {b} ({count})
            </button>
          );
        })}
      </div>

      {/* Advanced toolbar & Active mode selectors */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 bg-[#0c0d12] border border-zinc-850 rounded-2xl p-4 shadow-lg select-none">
        
        {/* Horizontal Mode selectors with clean icons */}
        <div className="flex flex-wrap border-b border-zinc-900 text-[10px] font-mono uppercase font-bold shrink-0 gap-1 select-none">
          <button
            onClick={() => setActiveMode("Warehouse")}
            className={`px-3 py-2.5 border-b-2 font-black transition cursor-pointer flex items-center space-x-1.5 ${
              activeMode === "Warehouse" ? "border-[#ffb300] text-amber-glow bg-zinc-950/20" : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Database size={13} />
            <span>🏠 Godown Desk</span>
          </button>
          
          <button
            onClick={() => setActiveMode("Sinhgad")}
            className={`px-3 py-2.5 border-b-2 font-black transition cursor-pointer flex items-center space-x-1.5 ${
              activeMode === "Sinhgad" ? "border-amber-500 text-amber-glow bg-zinc-950/20" : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Truck size={13} />
            <span>🚛 Sinhgad</span>
          </button>

          <button
            onClick={() => setActiveMode("Purandar")}
            className={`px-3 py-2.5 border-b-2 font-black transition cursor-pointer flex items-center space-x-1.5 ${
              activeMode === "Purandar" ? "border-amber-500 text-amber-glow bg-zinc-950/20" : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Truck size={13} />
            <span>🚚 Purandar</span>
          </button>

          <button
            onClick={() => setActiveMode("Rajgad")}
            className={`px-3 py-2.5 border-b-2 font-black transition cursor-pointer flex items-center space-x-1.5 ${
              activeMode === "Rajgad" ? "border-amber-500 text-amber-glow bg-zinc-950/20" : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Truck size={13} />
            <span>🚛 Rajgad</span>
          </button>

          <button
            onClick={() => setActiveMode("SummaryAudit")}
            className={`px-3 py-2.5 border-b-2 font-black transition cursor-pointer flex items-center space-x-1.5 ${
              activeMode === "SummaryAudit" ? "border-emerald-500 text-emerald-400 bg-zinc-950/20" : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Gauge size={13} />
            <span>📑 Audit Summary</span>
          </button>
        </div>

        {/* Toolbar parameters */}
        <div className="flex items-center gap-3 w-full xl:w-auto">
          {/* Search query input */}
          <div className="relative flex-1 xl:w-64 max-w-md">
            <Search size={13} className="absolute left-3 top-2.5 text-zinc-550" />
            <input
              type="text"
              placeholder="Search SKU name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white outline-none focus:border-amber-glow font-mono"
            />
          </div>

          {/* Grid/Table Switch Options layout */}
          <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-850 shrink-0 select-none">
            <button
              onClick={() => setViewStyle("table")}
              className={`p-1.5 rounded-lg transition ${viewStyle === "table" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
              title="Compact Table Grid layout"
            >
              <FileSpreadsheet size={14} />
            </button>
            <button
              onClick={() => setViewStyle("cards")}
              className={`p-1.5 rounded-lg transition ${viewStyle === "cards" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
              title="Bento cards layout"
            >
              <Grid size={14} />
            </button>
          </div>
        </div>

      </div>

      {/* CORE DISPLAY WINDOW - BRAND GROUPED OR COMPACT TABULAR SHEET */}
      {filteredRowsAndIndices.length === 0 ? (
        <div className="bg-[#0b0c10] border border-dashed border-zinc-850 p-16 rounded-3xl text-center text-zinc-500 font-mono text-xs select-none">
          <AlertCircle size={24} className="mx-auto text-zinc-600 mb-2" />
          <span>No SKU records matching search or selected Brand filter constraints.</span>
        </div>
      ) : (
        <div className="space-y-4">
          
          {viewStyle === "table" ? (
            /* Layout A: Highly optimized compact spreadsheet table style */
            <div className="bg-[#0c0d12] border border-zinc-850 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left font-mono text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-950 text-zinc-550 uppercase text-[9.5px] font-extrabold border-b border-zinc-855 select-none sticky top-0 z-10">
                      <th className="p-3">SKU Code</th>
                      <th className="p-3">Product Description</th>
                      <th className="p-3">Brand Category</th>
                      
                      {activeMode === "Warehouse" && (
                        <>
                          <th className="p-3 text-center">Godown Open</th>
                          <th className="p-3 text-center text-emerald-400">Purchased (+)</th>
                          <th className="p-3 text-center text-amber-250">Counter Sold</th>
                          <th className="p-3 text-right text-amber-glow">Godown Close</th>
                        </>
                      )}

                      {(activeMode === "Sinhgad" || activeMode === "Purandar" || activeMode === "Rajgad") && (
                        <>
                          <th className="p-3 text-center">Opener Balance</th>
                          <th className="p-3 text-center">Load-Out Qty (L1+L2)</th>
                          <th className="p-3 text-center text-emerald-400">Cases Sold</th>
                          <th className="p-3 text-center text-rose-455">Returned (L In)</th>
                          <th className="p-3 text-right text-yellow-500">Route Closing</th>
                        </>
                      )}

                      {activeMode === "SummaryAudit" && (
                        <>
                          <th className="p-3 text-right">Godown Stock</th>
                          <th className="p-3 text-right text-yellow-550">Fleet Stock</th>
                          <th className="p-3 text-right text-emerald-450">Active Worth (₹)</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900 text-zinc-300 font-bold select-none">
                    {paginatedRows.map(({ row, originalIdx }) => {
                      const p = PRODUCTS.find(prod => prod.Item_Code === row.Item_Code);
                      const simplName = getSimplifiedProductName(p?.Item_Name || row.Net_Qty);
                      
                      // Computed vehicle counts
                      const sinhgadClosing = row.Sinhgad_Open + row.Sinhgad_Load1 + row.Sinhgad_Load2 - row.Sinhgad_Sale - row.Sinhgad_Load_In;
                      const purandarClosing = row.Purandar_Open + row.Purandar_Load1 + row.Purandar_Load2 - row.Purandar_Sale - row.Purandar_Load_In;
                      const rajgadClosing = row.Rajgad_Open + row.Rajgad_Load1 + row.Rajgad_Load2 - row.Rajgad_Sale - row.Rajgad_Load_In;
                      
                      // Active Mode specifications
                      let activeRouteOpen = 0;
                      let activeRouteSale = 0;
                      let activeRouteIn = 0;
                      const activeRouteLoad = 
                        activeMode === "Sinhgad" ? (row.Sinhgad_Load1 + row.Sinhgad_Load2) :
                        activeMode === "Purandar" ? (row.Purandar_Load1 + row.Purandar_Load2) :
                        activeMode === "Rajgad" ? (row.Rajgad_Load1 + row.Rajgad_Load2) : 0;

                      if (activeMode === "Sinhgad") {
                        activeRouteOpen = row.Sinhgad_Open;
                        activeRouteSale = row.Sinhgad_Sale;
                        activeRouteIn = row.Sinhgad_Load_In;
                      } else if (activeMode === "Purandar") {
                        activeRouteOpen = row.Purandar_Open;
                        activeRouteSale = row.Purandar_Sale;
                        activeRouteIn = row.Purandar_Load_In;
                      } else if (activeMode === "Rajgad") {
                        activeRouteOpen = row.Rajgad_Open;
                        activeRouteSale = row.Rajgad_Sale;
                        activeRouteIn = row.Rajgad_Load_In;
                      }

                      const activeRouteClose = activeRouteOpen + activeRouteLoad - activeRouteSale - activeRouteIn;
                      const totalVehicleStock = Math.max(0, sinhgadClosing) + Math.max(0, purandarClosing) + Math.max(0, rajgadClosing);

                      return (
                        <tr key={row.Item_Code} className="hover:bg-zinc-950/40 transition">
                          <td className="p-3 text-[10.5px] text-zinc-500 font-extrabold">{row.Item_Code}</td>
                          <td className="p-3 text-[12.5px] font-extrabold text-white max-w-[200px] truncate">{simplName}</td>
                          <td className="p-3 uppercase text-[10px] text-zinc-450">{row.Brand}</td>

                          {activeMode === "Warehouse" && (
                            <>
                              <td className="p-2 text-center w-28">
                                <input
                                  type="number"
                                  value={row.Open === 0 ? "" : row.Open}
                                  placeholder="0"
                                  onChange={(e) => handleValueChange(originalIdx, "Open", e.target.value)}
                                  className="w-16 bg-zinc-950/60 border border-zinc-800 rounded px-1.5 py-1 text-center font-bold text-white focus:border-amber-glow text-xs"
                                />
                              </td>
                              <td className="p-2 text-center w-28">
                                <input
                                  type="number"
                                  value={row.Primary === 0 ? "" : row.Primary}
                                  placeholder="0"
                                  onChange={(e) => handleValueChange(originalIdx, "Primary", e.target.value)}
                                  className="w-16 bg-zinc-950/60 border border-zinc-800 rounded px-1.5 py-1 text-center font-bold text-emerald-400 focus:border-amber-glow text-xs"
                                />
                              </td>
                              <td className="p-2 text-center w-28">
                                <input
                                  type="number"
                                  value={row.Counter_Sale === 0 ? "" : row.Counter_Sale}
                                  placeholder="0"
                                  onChange={(e) => handleValueChange(originalIdx, "Counter_Sale", e.target.value)}
                                  className="w-16 bg-zinc-950/60 border border-zinc-800 rounded px-1.5 py-1 text-center font-bold text-amber-200 focus:border-amber-glow text-xs"
                                />
                              </td>
                              <td className="p-3 text-right text-amber-glow font-black text-sm pr-6">
                                {row.Total_Closing} cs
                              </td>
                            </>
                          )}

                          {(activeMode === "Sinhgad" || activeMode === "Purandar" || activeMode === "Rajgad") && (
                            <>
                              <td className="p-2 text-center w-24">
                                <input
                                  type="number"
                                  value={activeRouteOpen === 0 ? "" : activeRouteOpen}
                                  placeholder="0"
                                  onChange={(e) => handleValueChange(originalIdx, `${activeMode}_Open` as any, e.target.value)}
                                  className="w-16 bg-zinc-950/60 border border-zinc-800 rounded px-1.5 py-1 text-center font-bold text-zinc-400 focus:border-amber-glow text-xs"
                                />
                              </td>
                              <td className="p-3 text-center font-bold text-zinc-300">
                                {activeRouteLoad} cs
                              </td>
                              <td className="p-2 text-center w-24">
                                <input
                                  type="number"
                                  value={activeRouteSale === 0 ? "" : activeRouteSale}
                                  placeholder="0"
                                  disabled // Sync sales orders lock
                                  className="w-16 bg-zinc-950/30 border border-zinc-850 rounded px-1.5 py-1 text-center font-bold text-emerald-400 text-xs opacity-80"
                                />
                              </td>
                              <td className="p-2 text-center w-24">
                                <input
                                  type="number"
                                  value={activeRouteIn === 0 ? "" : activeRouteIn}
                                  placeholder="0"
                                  onChange={(e) => handleValueChange(originalIdx, `${activeMode}_Load_In` as any, e.target.value)}
                                  className="w-16 bg-zinc-950/60 border border-zinc-800 rounded px-1.5 py-1 text-center font-bold text-rose-455 focus:border-amber-glow text-xs"
                                />
                              </td>
                              <td className="p-3 text-right text-yellow-500 font-extrabold pr-6 text-xs">
                                {activeRouteClose} cs
                              </td>
                            </>
                          )}

                          {activeMode === "SummaryAudit" && (
                            <>
                              <td className="p-3 text-right text-amber-glow text-xs font-black">{row.Total_Closing} cs</td>
                              <td className="p-3 text-right text-zinc-200 text-xs font-black">{totalVehicleStock} cs</td>
                              <td className="p-3 text-right text-emerald-450 text-[12px] font-black pr-6">
                                ₹{((row.Total_Closing + totalVehicleStock) * (p?.Purchase_Rate || 250)).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                              </td>
                            </>
                          )}

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Layout B: High-end compact Bento Cards Mode */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedRows.map(({ row, originalIdx }) => {
                const p = PRODUCTS.find((prod) => prod.Item_Code === row.Item_Code);
                const simplName = getSimplifiedProductName(p?.Item_Name || row.Net_Qty);
                const sinhgadClosing = row.Sinhgad_Open + row.Sinhgad_Load1 + row.Sinhgad_Load2 - row.Sinhgad_Sale - row.Sinhgad_Load_In;
                const purandarClosing = row.Purandar_Open + row.Purandar_Load1 + row.Purandar_Load2 - row.Purandar_Sale - row.Purandar_Load_In;
                const rajgadClosing = row.Rajgad_Open + row.Rajgad_Load1 + row.Rajgad_Load2 - row.Rajgad_Sale - row.Rajgad_Load_In;
                const vehicleClosingAgg = Math.max(0, sinhgadClosing) + Math.max(0, purandarClosing) + Math.max(0, rajgadClosing);

                return (
                  <div key={row.Item_Code} className="bg-[#0b0c10] border border-zinc-850 rounded-2xl p-4 flex flex-col justify-between">
                    <div className="flex justify-between border-b border-zinc-900 pb-2 mb-2">
                      <span className="text-[8.5px] font-mono text-zinc-500">{row.Item_Code}</span>
                      <span className="text-[8.5px] font-mono text-amber-glow uppercase font-bold">{row.Brand}</span>
                    </div>
                    <h4 className="text-[11.5px] font-extrabold text-white uppercase truncate mb-3">{simplName}</h4>
                    
                    {activeMode === "Warehouse" && (
                      <div className="space-y-2 text-[10px] font-mono">
                        <div className="flex justify-between"><span>Open:</span><span className="text-white">{row.Open} cs</span></div>
                        <div className="flex justify-between"><span>Primary Received:</span><span className="text-emerald-400">+{row.Primary} cs</span></div>
                        <div className="flex justify-between"><span>Counter Sold:</span><span className="text-amber-200">-{row.Counter_Sale} cs</span></div>
                        <div className="flex justify-between border-t border-zinc-900 pt-1 text-amber-glow font-bold">
                          <span>Godown Closing:</span><span>{row.Total_Closing} cs</span>
                        </div>
                      </div>
                    )}

                    {(activeMode === "Sinhgad" || activeMode === "Purandar" || activeMode === "Rajgad") && (
                      <div className="space-y-2 text-[10px] font-mono">
                        <div className="flex justify-between"><span>Opener:</span><span className="text-zinc-400">{activeMode === "Sinhgad" ? row.Sinhgad_Open : activeMode === "Purandar" ? row.Purandar_Open : row.Rajgad_Open} cs</span></div>
                        <div className="flex justify-between"><span>Sold:</span><span className="text-emerald-450">-{activeMode === "Sinhgad" ? row.Sinhgad_Sale : activeMode === "Purandar" ? row.Purandar_Sale : row.Rajgad_Sale} cs</span></div>
                        <div className="flex justify-between"><span>load In:</span><span className="text-rose-455">-{activeMode === "Sinhgad" ? row.Sinhgad_Load_In : activeMode === "Purandar" ? row.Purandar_Load_In : row.Rajgad_Load_In} cs</span></div>
                      </div>
                    )}

                    {activeMode === "SummaryAudit" && (
                      <div className="space-y-2 text-[10px] font-mono">
                        <div className="flex justify-between"><span>🏠 Godown Close:</span><span className="text-amber-glow">{row.Total_Closing} cs</span></div>
                        <div className="flex justify-between"><span>🚚 Fleet Close:</span><span className="text-white">{vehicleClosingAgg} cs</span></div>
                        <div className="flex justify-between border-t border-zinc-900 pt-1 text-emerald-400 font-bold">
                          <span>Mkt Valuation:</span>
                          <span>₹{((row.Total_Closing + vehicleClosingAgg) * (p?.Purchase_Rate || 250)).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Table Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center bg-zinc-950 p-4 border border-zinc-900 rounded-2xl select-none font-mono text-[10.5px]">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 disabled:opacity-30 rounded-xl transition cursor-pointer"
              >
                Previous Page
              </button>
              <span className="text-zinc-500 font-bold uppercase">
                Page <b className="text-white">{currentPage}</b> of <b className="text-white">{totalPages}</b> ({filteredRowsAndIndices.length} products)
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 disabled:opacity-30 rounded-xl transition cursor-pointer"
              >
                Next Page
              </button>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
