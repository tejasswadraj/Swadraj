/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { Supplier, PurchaseOrder, PurchaseOrderItem, Product, DailyServiceSheet } from "../types";
import { PRODUCTS } from "../data/masterData";
import { getSimplifiedProductName } from "./StockReconciliation";
import { 
  Plus, 
  Trash2, 
  Truck, 
  FileText, 
  Calendar, 
  Coins, 
  UserPlus, 
  Layers, 
  Clock, 
  CheckCircle, 
  X, 
  AlertCircle, 
  ArrowRight,
  Download,
  Mail,
  Phone,
  MapPin,
  FileCheck
} from "lucide-react";

interface SupplierPurchasesProps {
  suppliers: Supplier[];
  onAddSupplier: (newSup: Supplier) => void;
  purchaseOrders: PurchaseOrder[];
  onAddPurchaseOrder: (newPo: PurchaseOrder) => void;
  onUpdatePurchaseOrder: (updatedPo: PurchaseOrder) => void;
  activeSheetDate: string;
  onPostPOStockToDSR: (po: PurchaseOrder, targetDate: string) => void;
  availableSheets: DailyServiceSheet[];
}

export default function SupplierPurchases({ 
  suppliers, 
  onAddSupplier, 
  purchaseOrders, 
  onAddPurchaseOrder, 
  onUpdatePurchaseOrder,
  activeSheetDate,
  onPostPOStockToDSR,
  availableSheets
}: SupplierPurchasesProps) {
  
  // Tabs: "pos" (Purchase Orders List), "suppliers" (Supplier Directory)
  const [subTab, setSubTab] = useState<"pos" | "suppliers">("pos");
  
  // Status filter for purchase orders list
  const [poStatusFilter, setPoStatusFilter] = useState<string>("All");
  
  // UI states
  const [isCreatingPO, setIsCreatingPO] = useState(false);
  const [isCreatingSupplier, setIsCreatingSupplier] = useState(false);
  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null);
  const [editingPoNumber, setEditingPoNumber] = useState<string | null>(null);

  // New Supplier form state
  const [newSupName, setNewSupName] = useState("");
  const [newSupCode, setNewSupCode] = useState("");
  const [newSupLead, setNewSupLead] = useState("2 Days");
  const [newSupContact, setNewSupContact] = useState("");
  const [newSupEmail, setNewSupEmail] = useState("");
  const [newSupAddress, setNewSupAddress] = useState("");

  // New PO form state
  const [selectedSupCode, setSelectedSupCode] = useState(suppliers[0]?.Supplier_Code || "");
  const [poDate, setPoDate] = useState(activeSheetDate);
  const [expectedDelivery, setExpectedDelivery] = useState("");
  const [poNotes, setPoNotes] = useState("");
  const [poItems, setPoItems] = useState<PurchaseOrderItem[]>([]);
  
  // New PO item picker state
  const [currentSkuCode, setCurrentSkuCode] = useState("");
  const [currentQty, setCurrentQty] = useState<number>(10);
  const [currentRate, setCurrentRate] = useState<number>(0);

  // Set default rate & default expected delivery on supplier/sku updates
  const selectedSupplier = useMemo(() => {
    return suppliers.find(s => s.Supplier_Code === selectedSupCode) || suppliers[0];
  }, [suppliers, selectedSupCode]);

  // Available SKUs grouped or prioritized for selected supplier
  const filteredProducts = useMemo(() => {
    if (!selectedSupCode) return PRODUCTS;
    // Highlight or sort supplier products first
    const match = PRODUCTS.filter(p => p.Supplier_Code === selectedSupCode);
    const nonMatch = PRODUCTS.filter(p => p.Supplier_Code !== selectedSupCode);
    return [...match, ...nonMatch];
  }, [selectedSupCode]);

  // Set initial default SKU when supplier/form changes
  React.useEffect(() => {
    if (filteredProducts.length > 0 && !currentSkuCode) {
      const firstSku = filteredProducts[0];
      setCurrentSkuCode(firstSku.Item_Code);
      const defaultRate = (firstSku.Sale_Rate_Wholesale || (firstSku.MRP * firstSku.Case_Pack * 0.70)) * 0.90;
      setCurrentRate(Number(defaultRate.toFixed(1)));
    }
  }, [filteredProducts, currentSkuCode]);

  // Update expected delivery date automatically based on lead times
  React.useEffect(() => {
    if (selectedSupplier && poDate) {
      const daysMatch = selectedSupplier.Lead_Times.match(/\d+/);
      const days = daysMatch ? parseInt(daysMatch[0], 10) : 2;
      const d = new Date(poDate);
      d.setDate(d.getDate() + days);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dayStr = String(d.getDate()).padStart(2, "0");
      setExpectedDelivery(`${y}-${m}-${dayStr}`);
    }
  }, [selectedSupplier, poDate]);

  // Handle SKU picker trigger to auto-calculate default purchase rate
  const handleSkuChange = (skuCode: string) => {
    setCurrentSkuCode(skuCode);
    const prod = PRODUCTS.find(p => p.Item_Code === skuCode);
    if (prod) {
      // purchase rate estimation: Wholesales rate * 0.90, or 63% of MRP Cases equivalent
      const defaultRate = (prod.Sale_Rate_Wholesale || (prod.MRP * prod.Case_Pack * 0.70)) * 0.90;
      setCurrentRate(Number(defaultRate.toFixed(1)));
    }
  };

  // Add Item to draft PO items array
  const handleAddItem = () => {
    if (!currentSkuCode) return;
    const prod = PRODUCTS.find(p => p.Item_Code === currentSkuCode);
    if (!prod) return;

    // Check duplicate
    if (poItems.some(item => item.Item_Code === currentSkuCode)) {
      alert("This item already exists in your purchase order draft list! Edit or delete the existing row.");
      return;
    }

    if (currentQty <= 0) {
      alert("Please specify a positive integer quantity in cases.");
      return;
    }

    if (currentRate <= 0) {
      alert("Please specify a genuine purchase cost price per case.");
      return;
    }

    const totalBeforeTax = currentQty * currentRate;
    const gstPct = prod.GST_Percent;
    // Backward calculation or forward?
    // Factory purchase rates are usually specified before GST in standard commercial systems, or inclusive?
    // Let's treat standard input cost rates as BEFORE-GST (taxable baseline), then mount GST on top!
    const gstAmt = totalBeforeTax * (gstPct / 100);
    const totalAmount = totalBeforeTax + gstAmt;

    const newItem: PurchaseOrderItem = {
      Item_Code: prod.Item_Code,
      Item_Name: prod.Item_Name,
      Brand: prod.Brand,
      Case_Pack: prod.Case_Pack,
      Quantity_Cases: currentQty,
      Purchase_Rate: currentRate,
      Total_Before_Tax: totalBeforeTax,
      GST_Percent: gstPct,
      GST_Amount: gstAmt,
      Total_Amount: totalAmount
    };

    setPoItems(prev => [...prev, newItem]);
  };

  // Remove Item from Draft List
  const handleRemoveDraftItem = (itemCode: string) => {
    setPoItems(prev => prev.filter(i => i.Item_Code !== itemCode));
  };

  // Draft Calculations
  const draftTotals = useMemo(() => {
    let beforeTax = 0;
    let totalGst = 0;
    let grandTotal = 0;
    poItems.forEach(i => {
      beforeTax += i.Total_Before_Tax;
      totalGst += i.GST_Amount;
      grandTotal += i.Total_Amount;
    });
    return { beforeTax, totalGst, grandTotal };
  }, [poItems]);

  // Handle PO Save/Draft issuing
  const handleSubmitPO = () => {
    if (poItems.length === 0) {
      alert("You cannot issue an empty Purchase Order! Add at least one SKU.");
      return;
    }

    if (editingPoNumber) {
      const orig = purchaseOrders.find(p => p.PO_Number === editingPoNumber);
      if (!orig) return;

      const updatedPO: PurchaseOrder = {
        ...orig,
        Date: poDate,
        Supplier_Code: selectedSupplier.Supplier_Code,
        Supplier_Name: selectedSupplier.Supplier_Name,
        Items: poItems,
        Total_Before_Tax: draftTotals.beforeTax,
        Total_GST: draftTotals.totalGst,
        Grand_Total: draftTotals.grandTotal,
        Expected_Delivery: expectedDelivery,
        Notes: poNotes
      };

      onUpdatePurchaseOrder(updatedPO);
      setIsCreatingPO(false);
      setEditingPoNumber(null);
      // Reset form
      setPoItems([]);
      setPoNotes("");
      setSelectedPo(updatedPO); // immediately open details
      alert(`Purchase Order ${editingPoNumber} has been updated successfully.`);
    } else {
      const nextPoIndex = purchaseOrders.length + 1;
      const paddedId = String(nextPoIndex).padStart(4, "0");
      const yearStr = poDate.substring(0, 4) || "2026";
      const poNum = `PO-${yearStr}-${paddedId}`;

      const newPO: PurchaseOrder = {
        PO_Number: poNum,
        Date: poDate,
        Supplier_Code: selectedSupplier.Supplier_Code,
        Supplier_Name: selectedSupplier.Supplier_Name,
        Items: poItems,
        Total_Before_Tax: draftTotals.beforeTax,
        Total_GST: draftTotals.totalGst,
        Grand_Total: draftTotals.grandTotal,
        Status: "Draft",
        Expected_Delivery: expectedDelivery,
        Notes: poNotes
      };

      onAddPurchaseOrder(newPO);
      setIsCreatingPO(false);
      // Reset form
      setPoItems([]);
      setPoNotes("");
      setSelectedPo(newPO); // immediately open details
    }
  };

  const handleCreateSupplier = () => {
    if (!newSupName.trim()) {
      alert("Supplier Name is required.");
      return;
    }
    
    const supCode = newSupCode.trim().toUpperCase() || `SUP${String(suppliers.length + 1).padStart(3, "0")}`;
    
    if (suppliers.some(s => s.Supplier_Code === supCode)) {
      alert(`Supplier code '${supCode}' is already registered in database.`);
      return;
    }

    const newSupplier: Supplier = {
      Supplier_Code: supCode,
      Supplier_Name: newSupName.trim(),
      Lead_Times: newSupLead,
      Contact: newSupContact.trim() || undefined,
      Email: newSupEmail.trim() || undefined,
      Address: newSupAddress.trim() || undefined
    };

    onAddSupplier(newSupplier);
    setIsCreatingSupplier(false);
    setNewSupName("");
    setNewSupCode("");
    setNewSupContact("");
    setNewSupEmail("");
    setNewSupAddress("");
  };

  // Trigger DSR primary stocks synchronization
  const [postingSheetDate, setPostingSheetDate] = useState(activeSheetDate);
  const handlePostToDSR = (po: PurchaseOrder) => {
    const targetSheet = availableSheets.find(s => s.date === postingSheetDate);
    if (!targetSheet) {
      alert(`No active inventory day sheet found for date ${postingSheetDate}. Create the sheet / roll-over first!`);
      return;
    }

    const confirmPost = window.confirm(
      `📥 CONFIRM DSR INVENTORY BATCH POSTING:\n\n` +
      `This will increase the 'Primary' stock received column in DSR date node [${targetSheet.sheetName}] (${postingSheetDate})\n` +
      `by the cases specified in this Purchase Order (${po.Items.reduce((acc, i) => acc + i.Quantity_Cases, 0)} Total Cases).\n\n` +
      `Do you accept this inventory posting?`
    );

    if (!confirmPost) return;

    onPostPOStockToDSR(po, postingSheetDate);
    
    // Update PO itself to reflect synchronization state
    const updatedPO: PurchaseOrder = {
      ...po,
      Sync_To_DSR: true,
      Synced_Sheet_Date: postingSheetDate
    };
    onUpdatePurchaseOrder(updatedPO);
    setSelectedPo(updatedPO);
    alert(`Successfully synced stock ledger entries! ${po.Items.length} SKUs posted to Day [${targetSheet.sheetName}] ('Primary' stock columns).`);
  };

  // Computed filtered list of purchase orders
  const filteredPurchaseOrders = useMemo(() => {
    if (poStatusFilter === "All") return purchaseOrders;
    return purchaseOrders.filter(po => po.Status === poStatusFilter);
  }, [purchaseOrders, poStatusFilter]);

  return (
    <div id="supplier-purchases-root" className="space-y-6">
      
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-850 pb-5">
        <div>
          <h2 className="text-xl font-bold font-tech text-white uppercase tracking-tight flex items-center gap-2">
            <Truck className="text-amber-glow" size={22} />
            Procurement & Supplier Purchase Logs
          </h2>
          <p className="text-xs text-zinc-400 font-mono mt-1">
            Supplier lists, itemized industrial purchase orders drafting, and direct warehouse stock updates.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => { setSubTab("pos"); setIsCreatingPO(true); setSelectedPo(null); }}
            className="px-4 py-2 bg-[#ffb300] hover:bg-[#ffa000] text-black font-tech uppercase text-xs font-bold rounded-xl transition flex items-center gap-2 active:scale-95 cursor-pointer"
            id="draft-po-btn"
          >
            <Plus size={14} className="stroke-[3]" />
            Draft Purchase Order
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs and quick stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-850/60 pb-3">
        <div className="flex space-x-2 bg-zinc-950 p-1.5 rounded-xl border border-zinc-900 self-start">
          <button
            onClick={() => setSubTab("pos")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition font-tech uppercase flex items-center gap-2 ${
              subTab === "pos" ? "bg-zinc-900 text-white border border-zinc-800 shadow" : "text-zinc-500 hover:text-white"
            }`}
          >
            <FileText size={13} />
            Purchase Orders ({purchaseOrders.length})
          </button>
          <button
            onClick={() => setSubTab("suppliers")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition font-tech uppercase flex items-center gap-2 ${
              subTab === "suppliers" ? "bg-zinc-900 text-white border border-zinc-800 shadow" : "text-zinc-500 hover:text-white"
            }`}
          >
            <Truck size={13} />
            Suppliers Directory ({suppliers.length})
          </button>
        </div>

        <div className="flex items-center space-x-3 font-mono text-[10px] text-zinc-500 bg-zinc-950/20 py-1.5 px-3 border border-zinc-900 rounded-xl">
          <span>Active Warehouse: <b className="text-amber-glow">CENTRAL GODOWN</b></span>
          <span className="text-zinc-800">|</span>
          <span>DSR Live Date: <b className="text-white">{activeSheetDate}</b></span>
        </div>
      </div>

      {/* RENDER FOR REGISTER SUPPLIER OVERLAY */}
      {isCreatingSupplier && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c0d12] border-2 border-zinc-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl">
            <div className="bg-zinc-950 p-4 border-b border-zinc-850 flex justify-between items-center">
              <h3 className="font-tech text-white uppercase text-sm font-bold flex items-center gap-2">
                <UserPlus size={16} className="text-amber-glow" />
                Register New Supplier Partner
              </h3>
              <button 
                onClick={() => setIsCreatingSupplier(false)} 
                className="text-zinc-500 hover:text-white p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 font-mono text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block mb-1">Supplier Code (Auto if empty)</label>
                  <input
                    type="text"
                    value={newSupCode}
                    onChange={(e) => setNewSupCode(e.target.value)}
                    placeholder="e.g. SUP005"
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 block mb-1 uppercase">Lead Times Estimate</label>
                  <select
                    value={newSupLead}
                    onChange={(e) => setNewSupLead(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg text-white"
                  >
                    <option value="1 Day">1 Day Delivery</option>
                    <option value="2 Days">2 Days Delivery</option>
                    <option value="3 Days">3 Days Delivery</option>
                    <option value="4 Days">4 Days Delivery</option>
                    <option value="5 Days">5 Days Delivery</option>
                    <option value="7 Days">7 Days Delivery</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 block mb-1 uppercase">Supplier Legal Company Name *</label>
                <input
                  type="text"
                  value={newSupName}
                  onChange={(e) => setNewSupName(e.target.value)}
                  placeholder="e.g. Swadraj Premium Beverages Factory Ltd."
                  className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg text-white font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 col-span-2">
                <div>
                  <label className="text-[10px] text-zinc-500 block mb-1 uppercase">Contact Coordinates</label>
                  <input
                    type="text"
                    value={newSupContact}
                    onChange={(e) => setNewSupContact(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 block mb-1 uppercase">Email Address</label>
                  <input
                    type="email"
                    value={newSupEmail}
                    onChange={(e) => setNewSupEmail(e.target.value)}
                    placeholder="e.g. orders@supplier.com"
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg text-white text-xs lowercase"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 block mb-1 uppercase">Physical Depot / Registered Office Address</label>
                <textarea
                  value={newSupAddress}
                  onChange={(e) => setNewSupAddress(e.target.value)}
                  placeholder="Depot No 14, MIDC Industrial Area, Pune 411026"
                  className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg text-white font-sans resize-none h-16"
                />
              </div>
            </div>

            <div className="bg-zinc-950 p-4 border-t border-zinc-850 flex justify-end space-x-2">
              <button
                onClick={() => setIsCreatingSupplier(false)}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSupplier}
                className="px-4 py-2 bg-amber-glow text-black rounded-lg text-xs font-bold font-tech uppercase hover:bg-[#ffa000] transition cursor-pointer"
              >
                Register Supplier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RENDER MAIN PO DRAFTER */}
      {isCreatingPO && (
        <div className="bg-zinc-900/30 border border-zinc-850 rounded-2xl p-5 space-y-6">
          <div className="flex justify-between items-center border-b border-zinc-850 pb-3">
            <div>
              <h3 className="font-tech text-white uppercase text-sm font-bold flex items-center gap-2 font-mono">
                <FileText size={16} className="text-[#ffb300]" />
                {editingPoNumber ? `Edit Purchase Order [${editingPoNumber}]` : "Draft New B2B Supplier Purchase Order"}
              </h3>
              <p className="text-[10px] text-zinc-500 font-mono">Define suppliers, dispatch expected coordinates, and create digital stock invoice logs.</p>
            </div>
            <button 
              onClick={() => { setIsCreatingPO(false); setEditingPoNumber(null); setPoItems([]); }}
              className="text-zinc-500 hover:text-white bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 p-1.5 rounded-lg transition cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* Supplier Picker */}
            <div>
              <label className="text-[10px] text-zinc-500 uppercase block mb-1 font-mono">1. Select supplier partner</label>
              <select
                value={selectedSupCode}
                onChange={(e) => {
                  setSelectedSupCode(e.target.value);
                  setPoItems([]); // reset items if supplier changes to enforce product matching
                }}
                className="w-full bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 rounded-xl text-xs text-white font-sans font-medium focus:border-amber-glow/40 cursor-pointer"
              >
                {suppliers.map(s => (
                  <option key={s.Supplier_Code} value={s.Supplier_Code}>
                    {s.Supplier_Name} ({s.Supplier_Code})
                  </option>
                ))}
              </select>
            </div>

            {/* PO Date */}
            <div>
              <label className="text-[10px] text-zinc-500 uppercase block mb-1 font-mono">2. Purchase Order Date</label>
              <div className="relative">
                <Calendar size={13} className="absolute left-3.5 top-3 text-zinc-500" />
                <input
                  type="date"
                  value={poDate}
                  onChange={(e) => setPoDate(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 pl-9 pr-3 py-2.5 rounded-xl text-xs text-white font-mono cursor-pointer focus:border-amber-glow/40"
                />
              </div>
            </div>

            {/* Delivery Date */}
            <div>
              <label className="text-[10px] text-zinc-500 uppercase block mb-1 font-mono">Expected Delivery (Est)</label>
              <div className="relative">
                <Truck size={13} className="absolute left-3.5 top-3 text-zinc-500" />
                <input
                  type="date"
                  value={expectedDelivery}
                  onChange={(e) => setExpectedDelivery(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 pl-9 pr-3 py-2.5 rounded-xl text-xs text-white font-mono cursor-pointer focus:border-amber-glow/40"
                />
              </div>
            </div>

            {/* PO Notes */}
            <div>
              <label className="text-[10px] text-zinc-500 uppercase block mb-1 font-mono">Memo Notes / Instructions</label>
              <input
                type="text"
                value={poNotes}
                onChange={(e) => setPoNotes(e.target.value)}
                placeholder="e.g. Urgent monsoon stack replenish"
                className="w-full bg-zinc-950 border border-zinc-800 px-3.5 py-2 rounded-xl text-xs text-white font-sans focus:border-amber-glow/40"
              />
            </div>
          </div>

          {/* ADD ITEM CONTAINER */}
          <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-xl space-y-3.5">
            <span className="text-[10px] uppercase font-mono font-bold text-zinc-400 block border-b border-zinc-900 pb-2">Add Stock Items to Invoice Draft</span>
            
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              
              {/* Product SKU selection */}
              <div className="sm:col-span-6">
                <label className="text-[10px] text-zinc-500 block mb-1 font-mono uppercase">Select Product SKU</label>
                <select
                  value={currentSkuCode}
                  onChange={(e) => handleSkuChange(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg text-xs text-white font-sans font-medium focus:border-amber-glow/40"
                >
                  {filteredProducts.map(p => {
                    const isPreferred = p.Supplier_Code === selectedSupCode;
                    return (
                      <option key={p.Item_Code} value={p.Item_Code}>
                        {isPreferred ? "★ " : "   "}{getSimplifiedProductName(p.Item_Name)} (MRP ₹{p.MRP})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Quantity in Cases */}
              <div className="sm:col-span-2">
                <label className="text-[10px] text-zinc-500 block mb-1 font-mono uppercase">Qty (Cases)</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={currentQty}
                  onChange={(e) => setCurrentQty(Math.max(1, parseInt(e.target.value, 10) || 0))}
                  className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg text-xs text-white text-center font-mono font-bold"
                />
              </div>

              {/* Purchase Rate per case */}
              <div className="sm:col-span-2">
                <label className="text-[10px] text-zinc-500 block mb-1 font-mono uppercase flex justify-between">
                  <span>Rate / Case</span>
                  <span className="text-zinc-600 font-normal">Before Tax</span>
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1.5 text-zinc-500 text-xs">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={currentRate}
                    onChange={(e) => setCurrentRate(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full bg-zinc-900 border border-zinc-800 pl-6 pr-2 py-2 rounded-lg text-xs text-white font-mono font-bold"
                  />
                </div>
              </div>

              {/* Add item Action button */}
              <button
                type="button"
                onClick={handleAddItem}
                className="col-span-1 sm:col-span-2 w-full py-2 bg-zinc-800 hover:bg-zinc-750 text-white font-tech uppercase text-xs font-bold rounded-lg transition border border-zinc-700 active:scale-95 cursor-pointer flex justify-center items-center gap-1.5"
              >
                <Plus size={14} className="text-amber-glow" />
                Add Item
              </button>
            </div>
            
            <span className="text-[9px] text-zinc-500 block pt-1.5 font-mono">
              * Note: Default purchase rate estimated at a commercial 10% discount off standard wholesale logistics prices. You may manual override as per actual factory purchase sheets.
            </span>
          </div>

          {/* ITEM LIST PREVIEW TABLE */}
          <div className="bg-zinc-950 border border-zinc-850 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse font-mono text-[10px]">
              <thead>
                <tr className="bg-zinc-900 text-zinc-400 uppercase text-[9px] font-bold border-b border-zinc-800 select-none">
                  <th className="px-4 py-2.5">Brand</th>
                  <th className="px-4 py-2.5">Product SKU Description</th>
                  <th className="px-3 py-2.5 text-center">Cases</th>
                  <th className="px-3 py-2.5 text-right">Rate / Case</th>
                  <th className="px-3 py-2.5 text-right">Taxable Tax Base</th>
                  <th className="px-3 py-2.5 text-center">GST %</th>
                  <th className="px-3 py-2.5 text-right text-yellow-600">GST Share</th>
                  <th className="px-3 py-2.5 text-right text-amber-glow">Net Sum</th>
                  <th className="px-3 py-2.5 text-center w-[60px]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 text-zinc-300">
                {poItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-zinc-600">
                      No products added to this purchase order yet. Choose items above and add them!
                    </td>
                  </tr>
                ) : (
                  poItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-zinc-900/60 transition-colors">
                      <td className="px-4 py-2 font-bold text-white">{item.Brand}</td>
                      <td className="px-4 py-2 font-sans font-semibold text-zinc-100">{getSimplifiedProductName(item.Item_Name)}</td>
                      <td className="px-3 py-2 text-center text-white font-bold">{item.Quantity_Cases} Cs</td>
                      <td className="px-3 py-2 text-right">₹{item.Purchase_Rate.toFixed(1)}</td>
                      <td className="px-3 py-2 text-right">₹{item.Total_Before_Tax.toLocaleString("en-IN", { minimumFractionDigits: 1 })}</td>
                      <td className="px-3 py-2 text-center font-semibold text-yellow-500">{item.GST_Percent}%</td>
                      <td className="px-3 py-2 text-right text-zinc-400">₹{item.GST_Amount.toLocaleString("en-IN", { minimumFractionDigits: 1 })}</td>
                      <td className="px-3 py-2 text-right font-bold text-amber-glow">₹{item.Total_Amount.toLocaleString("en-IN", { minimumFractionDigits: 1 })}</td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => handleRemoveDraftItem(item.Item_Code)}
                          className="p-1 hover:bg-zinc-800 text-zinc-500 hover:text-rose-500 rounded transition cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
                {poItems.length > 0 && (
                  <tr className="bg-zinc-900/40 text-white font-bold text-[9px] uppercase border-t border-zinc-800">
                    <td colSpan={2} className="px-4 py-2 text-zinc-400">Total Summaries</td>
                    <td className="px-3 py-2 text-center text-emerald-450 text-[11px] font-sans">
                      {poItems.reduce((acc, i) => acc + i.Quantity_Cases, 0)} Cases
                    </td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2 text-right text-xs">
                      ₹{draftTotals.beforeTax.toLocaleString("en-IN", { minimumFractionDigits: 1 })}
                    </td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2 text-right text-yellow-600 text-xs">
                      ₹{draftTotals.totalGst.toLocaleString("en-IN", { minimumFractionDigits: 1 })}
                    </td>
                    <td className="px-3 py-2 text-right text-amber-glow text-xs font-sans">
                      ₹{draftTotals.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 1 })}
                    </td>
                    <td className="px-3 py-2"></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* DRAFT TRIGGER CONTROLS */}
          <div className="flex justify-end gap-2 border-t border-zinc-800 pt-4">
            <button
              onClick={() => { setIsCreatingPO(false); setPoItems([]); setEditingPoNumber(null); }}
              className="px-4 py-2 bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 text-zinc-400 font-tech text-xs uppercase font-bold rounded-xl transition cursor-pointer"
            >
              {editingPoNumber ? "Discard Edits" : "Discard Draft"}
            </button>
            <button
              onClick={handleSubmitPO}
              className="px-5 py-2 bg-[#ffb300] hover:bg-[#ffa000] text-black font-tech text-xs uppercase font-bold rounded-xl shadow-lg transition active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <FileCheck size={14} className="stroke-[3]" />
              {editingPoNumber ? "Save Details Update" : "Save PO as Draft"}
            </button>
          </div>
        </div>
      )}

      {/* RENDER PO TABLE AND DETAILS EXPANSION */}
      {subTab === "pos" && !isCreatingPO && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* List of generated POs */}
          <div className="lg:col-span-7 bg-[#0d0f13] border border-zinc-850 rounded-2xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-3 border-b border-zinc-900 mb-3 select-none gap-2">
                <div>
                  <span className="text-[10px] uppercase font-mono font-bold text-zinc-400">All Purchase Orders</span>
                  <span className="text-[9px] text-zinc-500 block">Status filters for checking Sent, Received & Cancelled</span>
                </div>
                <span className="bg-zinc-950 border border-zinc-850 font-mono text-[9px] text-zinc-500 py-1 px-2.5 rounded-full">
                  Count: {filteredPurchaseOrders.length} / {purchaseOrders.length}
                </span>
              </div>

              {/* Status Filters Toolbar */}
              {purchaseOrders.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3 select-none text-[8.5px] font-mono font-bold uppercase tracking-wider">
                  {["All", "Draft", "Sent", "Received", "Cancelled"].map(st => {
                    const isActive = poStatusFilter === st;
                    return (
                      <button
                        key={st}
                        onClick={() => {
                          setPoStatusFilter(st);
                          setSelectedPo(null);
                        }}
                        className={`px-3 py-1.5 rounded-lg border transition cursor-pointer ${
                          isActive 
                            ? "bg-amber-glow/15 border border-amber-glow/40 text-amber-glow font-extrabold" 
                            : "bg-[#07080a] border-zinc-900 text-zinc-550 hover:text-white"
                        }`}
                      >
                        {st}
                      </button>
                    );
                  })}
                </div>
              )}

              {filteredPurchaseOrders.length === 0 ? (
                <div className="text-center py-16">
                  <FileText className="mx-auto text-zinc-805 mb-3" size={32} />
                  <span className="text-zinc-500 block font-tech uppercase text-xs">No PO records matched</span>
                  <p className="text-zinc-650 font-mono text-[10px] mt-1 max-w-sm mx-auto">
                    There are no PO entries matching the "{poStatusFilter}" status. Choose another tab or draft a fresh B2B order.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                  {filteredPurchaseOrders.slice().reverse().map((po) => {
                    const isSelected = selectedPo?.PO_Number === po.PO_Number;
                    const itemsCount = po.Items.length;
                    const casesCount = po.Items.reduce((acc, i) => acc + i.Quantity_Cases, 0);

                    // Badge configurations
                    let statusColor = "bg-zinc-950 text-zinc-400 border-zinc-800";
                    if (po.Status === "Sent") statusColor = "bg-sky-950/40 text-sky-400 border-sky-905/60";
                    else if (po.Status === "Received") statusColor = "bg-emerald-950/40 text-emerald-450 border-emerald-905/60";
                    else if (po.Status === "Cancelled") statusColor = "bg-rose-950/30 text-rose-450 border-rose-905/40";

                    return (
                      <div
                        key={po.PO_Number}
                        onClick={() => setSelectedPo(po)}
                        className={`p-3.5 rounded-xl border transition cursor-pointer select-none relative group ${
                          isSelected 
                            ? "bg-amber-glow/[0.04] border-amber-glow/45 shadow" 
                            : "bg-zinc-950/30 border-zinc-900 hover:bg-zinc-950/50 hover:border-zinc-850"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-tech text-xs font-bold text-white tracking-wide">{po.PO_Number}</span>
                              <span className={`text-[8px] px-2 py-0.5 rounded-full uppercase font-mono font-bold border ${statusColor}`}>
                                {po.Status}
                              </span>
                              {po.Sync_To_DSR && (
                                <span className="bg-emerald-950 text-emerald-400 text-[8px] font-mono px-2 py-0.5 rounded-full border border-emerald-900 flex items-center gap-1">
                                  <CheckCircle size={8} className="fill-emerald-400 text-emerald-950" /> Posted DSR
                                </span>
                              )}
                            </div>
                            <h4 className="text-[11px] font-sans font-bold text-zinc-300 mt-1.5 group-hover:text-amber-glow transition-colors">
                              {po.Supplier_Name}
                            </h4>
                            <div className="flex items-center space-x-4 text-[9px] font-mono text-zinc-500 mt-1">
                              <span>Date: <b>{po.Date}</b></span>
                              <span>Expected: <b>{po.Expected_Delivery}</b></span>
                            </div>
                          </div>

                          <div className="text-right font-mono">
                            <span className="text-xs font-bold text-amber-glow block">
                              ₹{po.Grand_Total.toLocaleString("en-IN", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                            </span>
                            <span className="text-[9px] text-zinc-550 block mt-0.5">
                              {casesCount} Cases ({itemsCount} SKUs)
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            {purchaseOrders.length > 0 && (
              <div className="mt-4 pt-3 border-t border-zinc-900 font-mono text-[9px] text-zinc-500 flex justify-between">
                <span>Select any purchase order in the register to audit and view delivery logistics.</span>
                <span className="text-amber-glow/60 uppercase">★ Authorized logistics ledger</span>
              </div>
            )}
          </div>

          {/* ACTIVE EXPANDED PO DETAILS VIEW */}
          <div className="lg:col-span-5">
            {selectedPo ? (
              <div className="bg-[#0d0f13] border-2 border-zinc-850 rounded-2xl overflow-hidden shadow-xl flex flex-col relative">
                
                {/* Visual Header / Corporate Invoice styling */}
                <div className="bg-zinc-950 p-4 border-b border-zinc-850">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[8px] uppercase tracking-widest text-amber-glow font-mono block">Logistics Procurement Voucher Code</span>
                      <h4 className="text-sm font-black text-white font-tech tracking-wider mt-0.5 uppercase">{selectedPo.PO_Number}</h4>
                      <p className="text-[9px] font-mono text-zinc-500 mt-0.5">Logged: {selectedPo.Date}</p>
                    </div>

                    <div className="flex flex-col items-end">
                      {/* Interactive PO status actions */}
                      <span className="text-[8px] text-zinc-500 uppercase font-mono font-bold block mb-1">State operations</span>
                      <div className="flex bg-zinc-900 p-0.5 border border-zinc-800 rounded-lg space-x-0.5">
                        {["Draft", "Sent", "Received", "Cancelled"].map((st) => {
                          const isActive = selectedPo.Status === st;
                          let activeClass = "bg-zinc-800 text-white font-bold";
                          if (isActive && st === "Received") activeClass = "bg-emerald-950 text-emerald-400 font-black border border-emerald-900/60";
                          if (isActive && st === "Cancelled") activeClass = "bg-rose-950 text-rose-450 font-black border border-rose-900/40";
                          if (isActive && st === "Sent") activeClass = "bg-sky-950 text-sky-400 font-bold border border-sky-900/40";

                          return (
                            <button
                              key={st}
                              onClick={() => {
                                const updated: PurchaseOrder = {
                                  ...selectedPo,
                                  Status: st as any,
                                  // Reset sync flag if state changes away from received
                                  Sync_To_DSR: st === "Received" ? selectedPo.Sync_To_DSR : false
                                };
                                onUpdatePurchaseOrder(updated);
                                setSelectedPo(updated);
                              }}
                              className={`px-2 py-1 rounded text-[8px] uppercase font-mono transition cursor-pointer ${
                                isActive ? activeClass : "text-zinc-500 hover:text-white"
                              }`}
                            >
                              {st}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Corporate Logistics Body - Printable format */}
                <div className="p-4 space-y-4 font-mono text-[10px] text-zinc-300">
                  
                  {/* EDIT DRAFT ACTION IF STATUS IS DRAFT */}
                  {selectedPo.Status === "Draft" && (
                    <div className="bg-[#ffb300]/[0.08] border border-[#ffb300]/30 p-3.5 rounded-xl flex items-center justify-between gap-3 select-none">
                      <div className="space-y-0.5">
                        <span className="text-[9px] uppercase tracking-wider text-[#ffb300] font-black block">Editable Document Draft</span>
                        <p className="text-[10px] text-zinc-400 font-sans leading-tight">This PO is in draft stage. You can modify quantities, add products, or adjust custom rates before dispatch.</p>
                      </div>
                      <button
                        onClick={() => {
                          setEditingPoNumber(selectedPo.PO_Number);
                          setSelectedSupCode(selectedPo.Supplier_Code);
                          setPoDate(selectedPo.Date);
                          setExpectedDelivery(selectedPo.Expected_Delivery);
                          setPoNotes(selectedPo.Notes || "");
                          setPoItems(selectedPo.Items);
                          setIsCreatingPO(true);
                        }}
                        className="px-3 py-1.5 bg-[#ffb300] hover:bg-[#ffa000] text-black text-[9px] font-extrabold font-tech uppercase rounded-lg transition active:scale-95 shrink-0 cursor-pointer"
                      >
                        ✏️ Edit Draft
                      </button>
                    </div>
                  )}

                  {/* Supplier Coordinates */}
                  <div className="bg-zinc-950/40 border border-zinc-900 p-3 rounded-xl space-y-2">
                    <span className="text-[8px] uppercase font-bold text-zinc-550 block">SUPPLIER DISPATCH COORDS</span>
                    <div>
                      <h5 className="font-sans font-bold text-zinc-200 text-xs">{selectedPo.Supplier_Name}</h5>
                      <span className="text-[9px] text-zinc-500 mt-0.5 block">Vendor Code reference: <b>{selectedPo.Supplier_Code}</b></span>
                    </div>

                    {/* Metadata contact row */}
                    {suppliers.find(s => s.Supplier_Code === selectedPo.Supplier_Code) && (
                      <div className="pt-2 border-t border-zinc-900 grid grid-cols-2 gap-2 text-[9px] text-zinc-450">
                        {suppliers.find(s => s.Supplier_Code === selectedPo.Supplier_Code)?.Contact && (
                          <span className="flex items-center gap-1.5 truncate">
                            <Phone size={10} className="text-zinc-600 shrink-0" />
                            {suppliers.find(s => s.Supplier_Code === selectedPo.Supplier_Code)?.Contact}
                          </span>
                        )}
                        {suppliers.find(s => s.Supplier_Code === selectedPo.Supplier_Code)?.Email && (
                          <span className="flex items-center gap-1.5 truncate text-zinc-400">
                            <Mail size={10} className="text-zinc-650 shrink-0" />
                            {suppliers.find(s => s.Supplier_Code === selectedPo.Supplier_Code)?.Email}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Delivery Schedule Coordinates */}
                  <div className="grid grid-cols-2 gap-3 bg-zinc-950/20 border border-zinc-900 p-2 rounded-xl text-[9px]">
                    <div>
                      <span className="text-zinc-550 block uppercase">Est. Arrival window</span>
                      <span className="text-white font-bold font-sans mt-0.5 block">{selectedPo.Expected_Delivery}</span>
                    </div>
                    <div>
                      <span className="text-zinc-550 block uppercase">Logistics state</span>
                      <span className="text-zinc-400 mt-0.5 block">
                        {selectedPo.Status === "Received" ? "🟩 Stock Physically Received" : "⏳ Goods in transit / pending"}
                      </span>
                    </div>
                  </div>

                  {/* Stock SKU Details inside PO */}
                  <div className="space-y-1.5">
                    <span className="text-[8px] uppercase font-bold text-zinc-550 block">ITEMIZED PROCURED STOCK MATRIX</span>
                    
                    <div className="border border-zinc-900 bg-zinc-950/40 rounded-xl overflow-hidden divide-y divide-zinc-900">
                      {selectedPo.Items.map((item, idx) => (
                        <div key={idx} className="p-2.5 flex justify-between items-center bg-zinc-950/10">
                          <div>
                            <span className="text-zinc-400 text-[9px] font-bold font-sans">{getSimplifiedProductName(item.Item_Name)}</span>
                            <div className="flex items-center space-x-2 text-[9px] text-zinc-600 mt-0.5">
                              <span>Code: <b>{item.Item_Code}</b></span>
                              <span>Pack: {item.Case_Pack} Pcs</span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-zinc-200 font-bold block">{item.Quantity_Cases} Cases</span>
                            <span className="text-[9px] text-zinc-500 block mt-0.5">@ ₹{item.Purchase_Rate.toFixed(1)} / Cs (Excl Tax)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Aggregate Financial Receipt Footer */}
                  <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-3 space-y-1.5 text-[10px]">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Taxable Net baseline:</span>
                      <span className="text-zinc-300">₹{selectedPo.Total_Before_Tax.toLocaleString("en-IN", { minimumFractionDigits: 1 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">CGST/SGST Included portion:</span>
                      <span className="text-zinc-405">₹{selectedPo.Total_GST.toLocaleString("en-IN", { minimumFractionDigits: 1 })}</span>
                    </div>
                    <div className="flex justify-between border-t border-zinc-900 pt-1.5 font-bold">
                      <span className="text-zinc-300 font-tech">GRAND TOTAL TAX INCL:</span>
                      <span className="text-amber-glow text-xs">₹{selectedPo.Grand_Total.toLocaleString("en-IN", { minimumFractionDigits: 1 })}</span>
                    </div>
                  </div>

                  {/* Notes Memo */}
                  {selectedPo.Notes && (
                    <div className="bg-zinc-950/10 border border-zinc-900 border-dashed rounded-xl p-2.5">
                      <span className="text-[8px] text-zinc-500 block uppercase font-bold">Logistics Memo Notes</span>
                      <p className="text-[9px] text-zinc-400 mt-0.5 font-sans leading-relaxed">{selectedPo.Notes}</p>
                    </div>
                  )}

                  {/* SYNC TO DSR CONTROLS (Only if status is "Received") */}
                  {selectedPo.Status === "Received" && (
                    <div className="bg-gradient-to-r from-emerald-950/20 to-zinc-950 border border-emerald-900/60 rounded-xl p-3 space-y-3">
                      <div className="flex items-start space-x-2">
                        <CheckCircle size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[9px] uppercase tracking-wider text-emerald-450 font-bold block">
                            STOCK SYNCHRONIZATION LEDGER GATEWAY
                          </span>
                          <p className="text-[9px] text-zinc-400 font-sans mt-0.5">
                            This purchase has been delivered. Do you want to post these physical case stocks received directly into a specific inventory day's DSR sheet "Primary" column?
                          </p>
                        </div>
                      </div>

                      {selectedPo.Sync_To_DSR ? (
                        <div className="bg-zinc-950/80 p-2.5 rounded-lg border border-zinc-900/60 flex justify-between items-center text-[9px] text-emerald-450">
                          <span className="font-bold">✓ Successfully Synchronized Stock</span>
                          <span>Day Sheet Posted: <b>{selectedPo.Synced_Sheet_Date}</b></span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 pt-1">
                          <div className="w-1/2">
                            <label className="text-[8px] text-zinc-500 uppercase block mb-1">Target DSR Day Date</label>
                            <select
                              value={postingSheetDate}
                              onChange={(e) => setPostingSheetDate(e.target.value)}
                              className="w-full bg-zinc-950 border border-zinc-800 px-2 py-1 rounded-md text-[9px] text-white focus:border-amber-glow/40 cursor-pointer"
                            >
                              {availableSheets.map(s => (
                                <option key={s.sheetName} value={s.date}>
                                  Day Node {s.sheetName} ({s.date})
                                </option>
                              ))}
                            </select>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => handlePostToDSR(selectedPo)}
                            className="w-1/2 py-2 bg-emerald-600 hover:bg-emerald-500 text-black font-tech uppercase text-[9px] font-extrabold rounded-lg transition active:scale-95 cursor-pointer flex justify-center items-center gap-1 shadow-lg"
                          >
                            <Download size={11} className="stroke-[3]" />
                            Post stocks to DSR
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </div>
            ) : (
              <div className="bg-[#0d0f13] border-2 border-dashed border-zinc-850 rounded-2xl p-8 text-center h-full flex flex-col justify-center items-center">
                <FileText className="text-zinc-800 mb-3" size={36} />
                <span className="text-zinc-500 font-tech uppercase text-xs">No active PO Selected</span>
                <p className="text-zinc-650 font-mono text-[10px] mt-1 max-w-xs mx-auto">
                  Click on any purchase order in the database records tab to audit items, modify logistics delivery state, or synchronize cases received directly with active godown opener worksheets.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RENDER FOR SUPPLIERS LIST */}
      {subTab === "suppliers" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <div>
              <span className="text-xs uppercase font-mono font-bold text-zinc-305">Registered Supplier Accounts</span>
              <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Factory supply partners, delivery wait lead time indexes, and emergency support hotlines.</p>
            </div>
            
            <button
              onClick={() => setIsCreatingSupplier(true)}
              className="px-3.5 py-2 bg-zinc-950 border border-zinc-800 text-amber-glow font-tech uppercase text-xs font-bold rounded-xl transition flex items-center gap-2 hover:bg-zinc-900 active:scale-95 cursor-pointer"
            >
              <UserPlus size={14} className="text-amber-glow" />
              Add Supplier Partner
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {suppliers.map((s) => {
              // Calculate PO Count & sum of totals
              const relatedPos = purchaseOrders.filter(po => po.Supplier_Code === s.Supplier_Code);
              const totalProcuredSum = relatedPos.reduce((sum, po) => sum + (po.Status === "Received" ? po.Grand_Total : 0), 0);

              return (
                <div key={s.Supplier_Code} className="bg-[#0e1014] border border-zinc-850 p-4 rounded-xl space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono text-[8.5px] text-zinc-500 uppercase tracking-widest font-bold">Partner ID: {s.Supplier_Code}</span>
                      <h4 className="font-sans font-bold text-white text-sm mt-0.5 truncate max-w-[200px]" title={s.Supplier_Name}>
                        {s.Supplier_Name}
                      </h4>
                    </div>

                    <span className="bg-zinc-950 px-2.5 py-1 text-[9px] font-mono font-bold text-[#ffb300] border border-zinc-800 rounded-md">
                      Lead time: {s.Lead_Times}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-zinc-950 p-2 rounded-lg text-center font-mono text-[9px]">
                    <div>
                      <span className="text-zinc-600 block">POs Count</span>
                      <span className="text-zinc-200 block font-bold font-sans mt-0.5">{relatedPos.length} POs</span>
                    </div>
                    <div>
                      <span className="text-zinc-600 block">Sum Received</span>
                      <span className="text-emerald-400 block font-bold font-sans mt-0.5">₹{totalProcuredSum.toLocaleString("en-IN")}</span>
                    </div>
                    <div>
                      <span className="text-zinc-600 block">DSR Auto Sync</span>
                      <span className="text-sky-400 font-bold block mt-0.5">Active</span>
                    </div>
                  </div>

                  {/* Supplier Coordinates footer */}
                  <div className="pt-2 border-t border-zinc-900 divide-y divide-zinc-900 font-mono text-[9px] text-zinc-500 space-y-1.5 pt-1.5">
                    
                    {s.Contact && (
                      <div className="flex items-center gap-2 py-0.5">
                        <Phone size={11} className="text-zinc-700 mt-0.5 shrink-0" />
                        <span>Hotline: <b className="text-zinc-300 select-all">{s.Contact}</b></span>
                      </div>
                    )}

                    {s.Email && (
                      <div className="flex items-center gap-2 py-0.5 pt-1">
                        <Mail size={11} className="text-zinc-700 mt-0.5 shrink-0" />
                        <span>B2B Email: <b className="text-zinc-400 lowercase select-all">{s.Email}</b></span>
                      </div>
                    )}

                    {s.Address && (
                      <div className="flex items-start gap-2 py-1 pt-1">
                        <MapPin size={11} className="text-zinc-700 mt-0.5 shrink-0" />
                        <span className="font-sans leading-tight">Address: <span className="text-zinc-400">{s.Address}</span></span>
                      </div>
                    )}

                  </div>

                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
