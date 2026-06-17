/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { Customer, SalesInvoice, CollectionHistory } from "../types";
import { PRODUCTS } from "../data/masterData";
import { getSimplifiedProductName } from "./StockReconciliation";
import { 
  Building2, 
  User, 
  Phone, 
  MapPin, 
  Camera, 
  FileCheck, 
  CheckCircle, 
  Sparkles, 
  ShieldCheck, 
  RefreshCw, 
  HelpCircle,
  Clock,
  Search,
  Edit,
  ArrowRight,
  Plus,
  ArrowLeft,
  DollarSign,
  FileText,
  CheckCircle2,
  AlertCircle,
  Info,
  X,
  SlidersHorizontal,
  ChevronDown,
  ArrowUpDown
} from "lucide-react";

interface RegisterOutletProps {
  customers: Customer[];
  onUpdateCustomer: (updatedCust: Customer) => void;
  onAddCustomer: (newCust: Customer) => void;
  existingCustomersCount: number;
  invoices: SalesInvoice[];
  collections: CollectionHistory[];
  onAddCollection: (billId: number, colAmount: number, method: "Cash" | "UPI" | "Cheque") => void;
  selectedDate: string;
  rateExceptions?: any;
  onUpdateRateExceptions?: (upd: any) => void;
}

export default function RegisterOutlet({ 
  customers, 
  onUpdateCustomer, 
  onAddCustomer, 
  existingCustomersCount, 
  invoices, 
  collections,
  onAddCollection,
  selectedDate,
  rateExceptions = {},
  onUpdateRateExceptions = () => {}
}: RegisterOutletProps) {

  // Search, Filters & Sorting state
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterType, setFilterType] = useState<"All" | "OutstandingOnly" | "VerifiedOnly">("All");
  const [sortBy, setSortBy] = useState<"name-asc" | "name-desc" | "outstanding-high" | "code-asc">("name-asc");

  // Selected states for double split view
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);

  // Profile forms editable state (inside activeCustomer panel)
  const [editCustName, setEditCustName] = useState("");
  const [editContact, setEditContact] = useState("");
  const [editSecPhone, setEditSecPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editGst, setEditGst] = useState("");
  const [editFssai, setEditFssai] = useState("");
  const [editShopact, setEditShopact] = useState("");
  const [editCreditLimit, setEditCreditLimit] = useState<number>(5000);

  // Search inside custom product rate override tool
  const [rateQuery, setRateQuery] = useState("");

  // New Outlet Registration Overlay modal
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);

  // Register Form Fields (New Outlet modal)
  const [outletName, setOutletName] = useState<string>("");
  const [ownerName, setOwnerName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [secondaryPhone, setSecondaryPhone] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [googleLocation, setGoogleLocation] = useState<string>("");
  const [gstNum, setGstNum] = useState<string>("");
  const [fssaiNum, setFssaiNum] = useState<string>("");
  const [shopactNum, setShopactNum] = useState<string>("");
  const [creditLimit, setCreditLimit] = useState<number>(5000);

  // OTP Verification System state for new registration
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [otpCode, setOtpCode] = useState<string>("");
  const [enteredOtp, setEnteredOtp] = useState<string>("");
  const [otpVerified, setOtpVerified] = useState<boolean>(false);
  const [otpTimer, setOtpTimer] = useState<number>(0);
  const [otpNotification, setOtpNotification] = useState<string | null>(null);

  // Success enrollment state
  const [successCode, setSuccessCode] = useState<string | null>(null);

  // Pagination limit
  const [visibleCount, setVisibleCount] = useState<number>(30);

  // Reset pagination on filters
  useEffect(() => {
    setVisibleCount(30);
  }, [searchTerm, filterType, sortBy]);

  // Sync edit form when active customer changes
  useEffect(() => {
    if (activeCustomer) {
      setEditCustName(activeCustomer.Customer_Name);
      setEditContact(activeCustomer.Contact || "");
      setEditSecPhone(activeCustomer.Secondary_Phone || "");
      setEditAddress(activeCustomer.Postal_Address || "");
      setEditGst(activeCustomer.GST_Number || "UNREGISTERED");
      setEditFssai(activeCustomer.FSSAI_Number || "NA");
      setEditShopact(activeCustomer.Shopact_Uddyam || "NA");
      setEditCreditLimit(activeCustomer.Credit_Limit || 5000);
    }
  }, [activeCustomer]);

  // Precompute outstanding balance of customers high-performance
  const outstandingBalMap = useMemo(() => {
    const balMap: { [code: string]: number } = {};
    invoices.forEach(inv => {
      if (inv.CreditAmount > 0) {
        balMap[inv.CustomerCode] = (balMap[inv.CustomerCode] || 0) + inv.CreditAmount;
      }
    });
    return balMap;
  }, [invoices]);

  // Evaluates KYC compliance metrics
  const getKYCStatus = (cust: Customer) => {
    const hasGst = cust.GST_Number && cust.GST_Number !== "UNREGISTERED" && cust.GST_Number !== "NA";
    const hasFssai = cust.FSSAI_Number && cust.FSSAI_Number !== "NA";
    
    if (hasGst && hasFssai) {
      return { label: "✅ FULLY VERIFIED", color: "text-emerald-400 bg-emerald-950/40 border-emerald-500/20", score: 100 };
    } else if (hasGst || hasFssai) {
      return { label: "⚡ PARTIAL COMPLIANCE", color: "text-amber-400 bg-amber-950/40 border-amber-500/20", score: 60 };
    } else {
      return { label: "❌ PENDING DOCUMENTS", color: "text-red-400 bg-red-950/40 border-red-500/20", score: 20 };
    }
  };

  // OTP Countdown timer
  useEffect(() => {
    let timerId: NodeJS.Timeout;
    if (otpSent && otpTimer > 0) {
      timerId = setTimeout(() => {
        setOtpTimer(otpTimer - 1);
      }, 1000);
    } else if (otpSent && otpTimer === 0) {
      setOtpNotification("🔐 OTP Verification Token has expired. Please re-trigger send.");
    }
    return () => clearTimeout(timerId);
  }, [otpSent, otpTimer]);

  const triggerMockOTP = () => {
    if (!phone || phone.length < 10) {
      alert("Please enter a valid 10-digit primary phone number first.");
      return;
    }
    const generated = Math.floor(1000 + Math.random() * 9000).toString();
    setOtpCode(generated);
    setOtpSent(true);
    setOtpTimer(20);
    setOtpVerified(false);
    setOtpNotification(`🔐 SMS Sent: One-Time PIN for Swadraj B2B is [ ${generated} ] (active for 20s)`);
    setTimeout(() => {
      setOtpNotification(null);
    }, 8500);
  };

  const handleVerifyOTP = () => {
    if (otpTimer === 0) {
      alert("Verification timeout! Please request a new OTP.");
      return;
    }
    if (enteredOtp === otpCode) {
      setOtpVerified(true);
      setOtpNotification("✅ Phone number verified successfully!");
      setTimeout(() => setOtpNotification(null), 3000);
    } else {
      alert("Incorrect OTP pin. Try again!");
    }
  };

  // Filter & Sort customers
  const filteredCustomers = useMemo(() => {
    const matched = customers.filter(cust => {
      const matchesSearch = 
        cust.Customer_Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cust.Customer_Code.includes(searchTerm) ||
        (cust.Contact && cust.Contact.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (cust.Secondary_Phone && cust.Secondary_Phone.includes(searchTerm));
      
      const totalOutstanding = outstandingBalMap[cust.Customer_Code] || 0;
      let matchesFilter = true;
      if (filterType === "OutstandingOnly") {
        matchesFilter = totalOutstanding > 0;
      } else if (filterType === "VerifiedOnly") {
        const kyc = getKYCStatus(cust);
        matchesFilter = kyc.score === 100;
      }
      return matchesSearch && matchesFilter;
    });

    // Sort operations
    return matched.sort((a, b) => {
      if (sortBy === "name-asc") {
        return a.Customer_Name.localeCompare(b.Customer_Name);
      }
      if (sortBy === "name-desc") {
        return b.Customer_Name.localeCompare(a.Customer_Name);
      }
      if (sortBy === "code-asc") {
        return a.Customer_Code.localeCompare(b.Customer_Code);
      }
      if (sortBy === "outstanding-high") {
        const outA = outstandingBalMap[a.Customer_Code] || 0;
        const outB = outstandingBalMap[b.Customer_Code] || 0;
        return outB - outA;
      }
      return 0;
    });
  }, [customers, searchTerm, filterType, sortBy, outstandingBalMap]);

  // Submit New Outlet Onboarding
  const handleSubmitOutlet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpVerified) {
      alert("Compliance Block: Mobile number verification (OTP) is mandatory for new registrations.");
      return;
    }

    const newCodeNum = 100 + existingCustomersCount + 1;
    const newCustomerCode = newCodeNum.toString();

    const registeredCustomer: Customer = {
      Customer_Code: newCustomerCode,
      Customer_Name: outletName.trim().toUpperCase(),
      Beat: "Main Route", // Flatten beat route structures
      Contact: ownerName.trim(),
      Geolocated_Code: googleLocation || "18.6253, 73.8037",
      Credit_Limit: Number(creditLimit) || 5000,
      Secondary_Phone: secondaryPhone.trim(),
      Postal_Address: address.trim(),
      Outlet_Photo: "Asset loaded",
      GST_Number: gstNum.trim().toUpperCase() || "UNREGISTERED",
      FSSAI_Number: fssaiNum.trim() || "NA",
      Shopact_Uddyam: shopactNum.trim() || "NA"
    };

    onAddCustomer(registeredCustomer);
    setSuccessCode(newCustomerCode);

    // Reset fields
    setOutletName("");
    setOwnerName("");
    setPhone("");
    setSecondaryPhone("");
    setAddress("");
    setGoogleLocation("");
    setGstNum("");
    setFssaiNum("");
    setShopactNum("");
    setCreditLimit(5000);
    setOtpVerified(false);
    setOtpSent(false);
  };

  // Trigger Save Edited Customer Profile
  const handleSaveEditCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCustomer) return;

    const updated: Customer = {
      ...activeCustomer,
      Customer_Name: editCustName.trim().toUpperCase(),
      Contact: editContact.trim(),
      Secondary_Phone: editSecPhone.trim(),
      Postal_Address: editAddress.trim(),
      GST_Number: editGst.trim().toUpperCase(),
      FSSAI_Number: editFssai.trim(),
      Shopact_Uddyam: editShopact.trim(),
      Credit_Limit: editCreditLimit
    };

    onUpdateCustomer(updated);
    setActiveCustomer(updated);
    alert(`Enrolled profile for ${updated.Customer_Name} has been recalculated & saved successfully!`);
  };

  // Ledger calculation for active Customer
  const customerLedgerDetails = useMemo(() => {
    if (!activeCustomer) return { statement: [], stats: { totalBilled: 0, totalPaid: 0, balance: 0 } };

    const code = activeCustomer.Customer_Code;
    const customerInvoices = invoices.filter(inv => inv.CustomerCode === code);
    const customerCollections = collections.filter(col => col.CustomerCode === code);

    let transactions: any[] = [];

    customerInvoices.forEach(inv => {
      transactions.push({
        date: inv.Date,
        type: "INVOICE",
        description: `Tax Invoice Outward (Bill #${inv.BillId})`,
        reference: `INV-${inv.BillId}`,
        debit: inv.TotalAmount,
        credit: 0
      });

      const instantPaid = inv.CashReceived + inv.UPIReceived + inv.ChequeReceived;
      if (instantPaid > 0) {
        transactions.push({
          date: inv.Date,
          type: "PAYMENT",
          description: `Upfront Counter Credit (Bill #${inv.BillId})`,
          reference: `REC-${inv.BillId}`,
          debit: 0,
          credit: instantPaid
        });
      }
    });

    customerCollections.forEach(col => {
      transactions.push({
        date: col.Date,
        type: "COLLECTION",
        description: `Collection Credit Slip (${col.Method}) - Bill #${col.BillId}`,
        reference: col.Id.substring(0, 8).toUpperCase(),
        debit: 0,
        credit: col.AmountCollected,
        notes: col.Notes
      });
    });

    // Chronology Sorting
    transactions.sort((a, b) => {
      if (a.date < b.date) return -1;
      if (a.date > b.date) return 1;
      if (a.type === "INVOICE" && b.type !== "INVOICE") return -1;
      if (a.type !== "INVOICE" && b.type === "INVOICE") return 1;
      return 0;
    });

    let runningBalance = 0;
    let totalBilled = 0;
    let totalPaid = 0;

    const statementChronology = transactions.map(tx => {
      if (tx.debit > 0) totalBilled += tx.debit;
      if (tx.credit > 0) totalPaid += tx.credit;
      runningBalance = runningBalance + tx.debit - tx.credit;
      return { ...tx, runningBalance };
    });

    return {
      statement: statementChronology,
      stats: { totalBilled, totalPaid, balance: runningBalance }
    };
  }, [activeCustomer, invoices, collections]);

  // Products filtered inside exceptions override tool
  const filteredOverridableProducts = useMemo(() => {
    return PRODUCTS.filter(p => 
      p.Item_Name.toLowerCase().includes(rateQuery.toLowerCase()) || 
      p.Brand.toLowerCase().includes(rateQuery.toLowerCase())
    );
  }, [rateQuery]);

  return (
    <div className="space-y-6" id="outlet-master-portal">
      
      {/* Dynamic Popups */}
      {otpNotification && (
        <div className="fixed top-6 right-6 max-w-md bg-zinc-950 border-2 border-amber-glow p-4 rounded-xl shadow-2xl z-[9999] font-mono text-xs text-amber-glow">
          <div className="flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-amber-glow animate-ping"></span>
            <span className="font-bold uppercase text-[9px] tracking-wide">SMS Service gateway</span>
          </div>
          <p className="mt-1 text-white font-sans">{otpNotification}</p>
        </div>
      )}

      {/* Hero Welcome banner */}
      <div className="bg-zinc-900 border border-zinc-850 rounded-2xl p-6 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight font-tech text-amber-glow uppercase flex items-center gap-2">
            <Building2 size={24} className="text-amber-glow" />
            <span>Outlet Master Desk & KYC Council</span>
          </h1>
          <p className="text-zinc-400 text-xs mt-1 max-w-2xl font-sans">
            Direct outlet directory, integrated chronological cash ledgers, and customized product rate override tables.
          </p>
        </div>
        <div>
          <button
            onClick={() => { setSuccessCode(null); setShowRegistrationForm(true); }}
            className="px-5 py-2.5 bg-amber-glow hover:bg-[#ffa000] text-black font-tech uppercase text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-lg active:scale-95 cursor-pointer hover:shadow-amber-glow/25"
          >
            <Plus size={15} className="stroke-[3]" />
            <span>Register New Outlet</span>
          </button>
        </div>
      </div>

      {/* Main double split layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Directory Names Catalog */}
        <div className={`bg-[#0d0f13] border border-zinc-850 rounded-2xl p-4 space-y-4 ${activeCustomer ? "lg:col-span-4" : "lg:col-span-12"}`}>
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-zinc-900 pb-3 gap-2.5">
            <div>
              <span className="text-[10px] uppercase font-mono font-bold text-zinc-400">Merchant Directory</span>
              <span className="text-[9px] text-zinc-550 block">All registered outlet names list</span>
            </div>
            <span className="bg-zinc-950 border border-zinc-900 font-mono text-[9px] text-zinc-500 py-1 px-3 rounded-full">
              Showing: {filteredCustomers.length} Outlets
            </span>
          </div>

          {/* Search, Filter & Sort inputs */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
            <div className="relative md:col-span-5">
              <Search size={14} className="absolute left-3 top-2.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search by name, code or contact..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-amber-glow font-mono"
              />
            </div>

            <div className="md:col-span-4 grid grid-cols-2 gap-2">
              <select
                value={filterType}
                onChange={(e: any) => setFilterType(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-xl px-2 py-2 text-zinc-400 outline-none focus:border-amber-glow text-[10px] uppercase font-mono cursor-pointer"
              >
                <option value="All">All Outlets</option>
                <option value="OutstandingOnly">Has Debit Bal</option>
                <option value="VerifiedOnly">Verified KYC</option>
              </select>

              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-xl px-2 py-2 text-zinc-400 outline-none focus:border-amber-glow text-[10px] uppercase font-mono cursor-pointer"
              >
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="code-asc">Code</option>
                <option value="outstanding-high">Debt: High</option>
              </select>
            </div>

            {activeCustomer && (
              <button 
                onClick={() => setActiveCustomer(null)}
                className="md:col-span-3 w-full bg-zinc-950 border border-zinc-850 hover:bg-zinc-900 hover:text-white px-3 py-2 rounded-xl text-xs font-mono font-bold text-zinc-400 transition cursor-pointer flex justify-center items-center gap-1.5"
              >
                <SlidersHorizontal size={12} /> Clear Split
              </button>
            )}
          </div>

          {/* Simple compact List view option instead of bulky card details */}
          <div className="space-y-1 max-h-[640px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent pr-1">
            {filteredCustomers.slice(0, visibleCount).map((cust) => {
              const isActive = activeCustomer?.Customer_Code === cust.Customer_Code;
              const debt = outstandingBalMap[cust.Customer_Code] || 0;
              const kyc = getKYCStatus(cust);

              return (
                <div
                  key={cust.Customer_Code}
                  onClick={() => setActiveCustomer(cust)}
                  className={`p-3 rounded-xl border transition cursor-pointer flex justify-between items-center group font-mono text-xs ${
                    isActive 
                      ? "bg-amber-glow/[0.05] border-amber-glow/55 text-white" 
                      : "bg-[#07080b]/40 border-zinc-900 hover:bg-[#07080a] text-zinc-300 hover:border-zinc-800"
                  }`}
                >
                  <div className="truncate pr-4 space-y-0.5">
                    <span className="text-[10px] text-zinc-500 font-bold block">CODE: {cust.Customer_Code}</span>
                    <h4 className="font-extrabold text-zinc-200 group-hover:text-amber-glow transition truncate max-w-[280px]">
                      {cust.Customer_Name}
                    </h4>
                    <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                      <User size={10} /> {cust.Contact || "No Owner"}
                    </span>
                  </div>

                  <div className="text-right shrink-0">
                    <span className={`text-[11px] font-bold block ${debt > 0 ? "text-amber-glow" : "text-zinc-500"}`}>
                      ₹{debt.toLocaleString("en-IN")}
                    </span>
                    <span className={`text-[8px] font-bold block uppercase ${kyc.score === 100 ? "text-emerald-450" : "text-zinc-650"}`}>
                      {kyc.score === 100 ? "VERIFIED" : "PENDING"}
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredCustomers.length > visibleCount && (
              <button
                onClick={() => setVisibleCount(p => p + 30)}
                className="w-full py-2.5 mt-2 bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 rounded-xl text-[10px] font-bold uppercase tracking-wider text-amber-glow transition cursor-pointer"
              >
                Display More Outlets (+30)
              </button>
            )}

            {filteredCustomers.length === 0 && (
              <div className="bg-zinc-950 border border-dashed border-zinc-850 p-8 rounded-xl text-center text-zinc-600">
                <span>No outlets matching the selected layout criteria.</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Active Outlet Double Split Details (Editable details, overall ledger statement, custom rate exceptions) */}
        <div className={`lg:col-span-8 space-y-6 ${activeCustomer ? "block" : "hidden lg:block lg:opacity-30 lg:pointer-events-none"}`}>
          {activeCustomer ? (
            <div className="space-y-6">
              
              {/* Part 1: Clicked Outlet Editable details profile */}
              <div className="bg-[#0d0f13] border border-zinc-850 rounded-2xl p-5 space-y-4">
                <div className="flex justify-between items-center border-b border-zinc-900 pb-2.5">
                  <span className="text-[10px] uppercase font-mono font-bold text-amber-glow flex items-center gap-1">
                     <Edit size={13} /> Edit Outlet profile & KYC details
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">ID Reference: SWAD-{activeCustomer.Customer_Code}</span>
                </div>

                <form onSubmit={handleSaveEditCustomer} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono text-zinc-300">
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-500 uppercase block">Shop Name</label>
                      <input
                        type="text"
                        value={editCustName}
                        onChange={(e) => setEditCustName(e.target.value.toUpperCase())}
                        required
                        className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700 px-3 py-2 rounded-lg text-white outline-none focus:border-amber-glow"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] text-zinc-500 uppercase block">Owner</label>
                        <input
                          type="text"
                          value={editContact}
                          onChange={(e) => setEditContact(e.target.value)}
                          required
                          className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700 px-3 py-1.5 rounded-lg text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-zinc-500 uppercase block">Phone</label>
                        <input
                          type="text"
                          value={editSecPhone}
                          onChange={(e) => setEditSecPhone(e.target.value.replace(/\D/g, ""))}
                          maxLength={10}
                          className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700 px-3 py-1.5 rounded-lg text-white"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-500 uppercase block">Delivery physical address</label>
                      <textarea
                        value={editAddress}
                        onChange={(e) => setEditAddress(e.target.value)}
                        required
                        rows={2}
                        className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700 px-3 py-1.5 rounded-lg text-white resize-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] text-zinc-500 uppercase block">Credit Limit (₹)</label>
                        <input
                          type="number"
                          value={editCreditLimit}
                          onChange={(e) => setEditCreditLimit(parseInt(e.target.value) || 0)}
                          required
                          className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700 px-3 py-1.5 rounded-lg text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-zinc-500 uppercase block font-sans">GSTIN Number</label>
                        <input
                          type="text"
                          value={editGst}
                          onChange={(e) => setEditGst(e.target.value.toUpperCase())}
                          className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700 px-3 py-1.5 rounded-lg text-white"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] text-zinc-500 uppercase block">FSSAI Number</label>
                        <input
                          type="text"
                          value={editFssai}
                          onChange={(e) => setEditFssai(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700 px-3 py-1.5 rounded-lg text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-zinc-500 uppercase block">ShopAct Reg</label>
                        <input
                          type="text"
                          value={editShopact}
                          onChange={(e) => setEditShopact(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700 px-3 py-1.5 rounded-lg text-white"
                        />
                      </div>
                    </div>
                    <div className="pt-2 flex justify-end">
                      <button
                        type="submit"
                        className="px-5 py-2.5 bg-[#ffb300] hover:bg-[#ffa000] text-black text-[11px] font-black uppercase rounded-xl transition cursor-pointer select-none active:scale-95 flex items-center gap-1.5"
                      >
                        <CheckCircle size={14} className="stroke-[3]" /> Save Profile Updates
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* Part 2: Custom Product Rate Editor with Dedicated Search */}
              <div className="bg-[#0d0f13] border border-zinc-850 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-zinc-900 pb-2.5 select-none">
                  <div>
                    <span className="text-[10px] uppercase font-mono font-bold text-emerald-400 block">⚡ Custom Item Rate Overrides list</span>
                    <span className="text-[9px] text-zinc-600 block">Define client-specific trade discount selling prices</span>
                  </div>
                  <div className="relative w-full sm:w-60">
                    <Search size={12} className="absolute left-2.5 top-2 text-zinc-500" />
                    <input
                      type="text"
                      placeholder="Quick SKU search..."
                      value={rateQuery}
                      onChange={(e) => setRateQuery(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-2 py-1 text-[10px] text-white outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-52 overflow-y-auto pr-1">
                  {filteredOverridableProducts.map(p => {
                    const cid = activeCustomer.Customer_Code;
                    const customPrice = rateExceptions[cid]?.[p.Item_Code];
                    
                    return (
                      <div key={p.Item_Code} className="bg-zinc-950 border border-zinc-900 p-2 rounded-xl flex flex-col justify-between hover:border-zinc-800 transition">
                        <div className="truncate pb-1 border-b border-zinc-900">
                          <span className="text-[8.5px] font-bold text-zinc-500 font-mono block truncate">{p.Brand}</span>
                          <h5 className="text-[10.5px] font-extrabold text-zinc-300 truncate">{getSimplifiedProductName(p.Item_Name)}</h5>
                        </div>
                        <div className="flex items-center justify-between pt-1.5 text-[10px]">
                          <div>
                            <span className="text-[8px] text-zinc-650 block">MRP / Whl</span>
                            <span className="text-zinc-500 font-bold font-mono">₹{p.MRP} / ₹{p.Sale_Rate_Wholesale}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] text-emerald-500 font-bold">₹</span>
                            <input
                              type="number"
                              placeholder="Price"
                              value={customPrice || ""}
                              onChange={(e) => {
                                const newOverrides = { ...rateExceptions };
                                if (!newOverrides[cid]) newOverrides[cid] = {};
                                newOverrides[cid][p.Item_Code] = parseInt(e.target.value) || 0;
                                onUpdateRateExceptions(newOverrides);
                              }}
                              className="w-16 bg-zinc-900 border border-emerald-950 rounded py-1 px-1 text-center font-bold text-emerald-450 text-[10px] outline-none focus:border-emerald-500"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {filteredOverridableProducts.length === 0 && (
                    <div className="col-span-full py-4 text-center text-zinc-600 font-mono text-[10px]">
                      No items matched your SKUs search filter.
                    </div>
                  )}
                </div>
              </div>

              {/* Part 3: Overall Ledger Statement double-entry log chart */}
              <div className="bg-[#0d0f13] border border-zinc-850 rounded-2xl p-5 space-y-4">
                <div className="flex justify-between items-center border-b border-zinc-900 pb-2.5 select-none">
                  <div>
                    <span className="text-[10px] uppercase font-mono font-bold text-zinc-400 block">📈 Outward Ledger Account Balance Sheet</span>
                    <span className="text-[9px] text-zinc-600 block">Sequential double-entry balance statements</span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-400 bg-zinc-950 border border-zinc-900 px-3 py-1.5 rounded-lg select-none">
                    <span>Gross Billed: <b className="text-white">₹{customerLedgerDetails.stats.totalBilled.toLocaleString("en-IN")}</b></span>
                    <span className="text-zinc-800">|</span>
                    <span>Closing Debt: <b className="text-amber-glow">₹{customerLedgerDetails.stats.balance.toLocaleString("en-IN")}</b></span>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-zinc-900 maxHeight-72 scrollbar-thin">
                  <table className="w-full text-left font-mono text-[10.5px] border-collapse">
                    <thead>
                      <tr className="bg-zinc-950 text-zinc-500 uppercase text-[9px] font-extrabold border-b border-zinc-850">
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Ref ID</th>
                        <th className="p-2.5">Description Details</th>
                        <th className="p-2.5 text-right font-sans">Debit (Dr)</th>
                        <th className="p-2.5 text-right font-sans">Credit (Cr)</th>
                        <th className="p-2.5 text-right text-white">Running Bal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-90 w font-bold text-zinc-400">
                      {customerLedgerDetails.statement.map((tx, idx) => (
                        <tr key={idx} className="hover:bg-zinc-900/40 divide-x divide-zinc-905">
                          <td className="p-2 text-zinc-500">{tx.date}</td>
                          <td className="p-2 text-zinc-300 font-extrabold">{tx.reference}</td>
                          <td className="p-2 font-sans font-medium text-[11px]">
                            {tx.description}
                            {tx.notes && <span className="text-[9.5px] text-zinc-500 block italic font-sans font-normal">Memo: "{tx.notes}"</span>}
                          </td>
                          <td className="p-2 text-right text-yellow-500">
                            {tx.debit > 0 ? `+ ₹${tx.debit.toLocaleString("en-IN")}` : "—"}
                          </td>
                          <td className="p-2 text-right text-emerald-450">
                            {tx.credit > 0 ? `- ₹${tx.credit.toLocaleString("en-IN")}` : "—"}
                          </td>
                          <td className="p-2 text-right text-white bg-zinc-950/20">
                            ₹{tx.runningBalance.toLocaleString("en-IN")}
                          </td>
                        </tr>
                      ))}
                      {customerLedgerDetails.statement.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-zinc-600 italic font-mono">
                            No chronological invoice deliveries or credits mapped against this account directory sequence.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-zinc-900/20 border border-dashed border-zinc-850 rounded-2xl p-24 text-center text-zinc-550 select-none">
              <SlidersHorizontal size={32} className="mx-auto text-zinc-800 mb-2.5" />
              <h4 className="font-tech text-xs uppercase tracking-wide">Ready for selection split view</h4>
              <p className="text-[10px] text-zinc-500 font-mono mt-1 max-w-sm mx-auto">
                Choose any B2B customer profile code from the directory catalog list to instantly view editable settings, custom individual product trade pricing logs, and ledger statement balance trees.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* RENDER NEW OUTLET REGISTRATION MODAL ENROLLMENT POPUP OVERLAY */}
      {showRegistrationForm && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c0d12] border-2 border-zinc-850 rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            <div className="bg-zinc-950 px-6 py-4 border-b border-zinc-850 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <Building2 className="text-amber-glow" size={18} />
                <h3 className="font-tech text-white uppercase text-xs font-bold font-mono">
                  Enrolling B1B Customer Registration Master Registry
                </h3>
              </div>
              <button 
                onClick={() => { setShowRegistrationForm(false); setSuccessCode(null); }} 
                className="text-zinc-500 hover:text-white bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 p-1.5 rounded-xl transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto scrollbar-thin">
              {successCode ? (
                <div className="bg-zinc-950 border border-emerald-500/30 rounded-2xl p-8 max-w-md mx-auto text-center space-y-6 font-mono text-xs">
                  <div className="inline-flex p-3 bg-emerald-950/20 text-emerald-450 rounded-full border border-emerald-500/20">
                    <CheckCircle size={28} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white uppercase font-tech">Compliance Approved</h2>
                    <p className="text-zinc-500 mt-0.5">Custom account codes geocoded and added instantly to database tables.</p>
                  </div>
                  
                  <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 space-y-1 text-left">
                    <div className="flex justify-between">
                      <span>CUSTOMER BUSINESS ID:</span>
                      <span className="text-white font-bold">SWAD-{successCode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>VERIFIED OUTLET:</span>
                      <span className="text-emerald-400 font-bold uppercase">ACTIVE ENROLLED</span>
                    </div>
                  </div>

                  <button
                    onClick={() => { setShowRegistrationForm(false); setSuccessCode(null); }}
                    className="w-full py-3 bg-[#ffb300] text-black text-xs font-bold rounded-xl hover:bg-[#ffa000] cursor-pointer"
                  >
                    Close & Check Directory
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmitOutlet} className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs text-zinc-300">
                  
                  {/* Left Column: Form Details */}
                  <div className="space-y-4">
                    <div className="border-b border-zinc-900 pb-2">
                      <span className="text-[10px] uppercase font-bold text-amber-glow">1. Business Profile Details</span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-zinc-400 font-semibold uppercase block">Outlet / Shop Name *</label>
                      <input
                        type="text"
                        placeholder="E.G. NEW MAHARASHTRA SUPERMARKET"
                        value={outletName}
                        onChange={(e) => setOutletName(e.target.value)}
                        required
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-glow"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-zinc-400 font-semibold uppercase block">Owner Contact Name *</label>
                      <input
                        type="text"
                        placeholder="E.G. KIRAN DESHMUKH"
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        required
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-glow"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-zinc-400 font-semibold uppercase block">Credit Limit Base Threshold *</label>
                      <input
                        type="number"
                        value={creditLimit}
                        onChange={(e) => setCreditLimit(Number(e.target.value))}
                        required
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-glow"
                      />
                    </div>

                    <div className="space-y-2.5">
                      <label className="text-zinc-405 font-semibold uppercase block">Primary Mobile Phone (OTP Verification) *</label>
                      <div className="flex gap-2">
                        <input
                          type="tel"
                          placeholder="e.g. 9876543210"
                          maxLength={10}
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                          required
                          disabled={otpVerified}
                          className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white outline-none disabled:opacity-50"
                        />
                        {!otpVerified ? (
                          <button
                            type="button"
                            onClick={triggerMockOTP}
                            className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-amber-glow px-4 py-2 rounded-xl text-xs cursor-pointer"
                          >
                            {otpSent ? "Retry Send" : "Verify SMS"}
                          </button>
                        ) : (
                          <span className="bg-emerald-950 text-emerald-450 border border-emerald-900 font-bold px-3 py-2 rounded-xl flex items-center gap-1 shrink-0">
                            <CheckCircle2 size={13} /> Verified
                          </span>
                        )}
                      </div>

                      {otpSent && !otpVerified && (
                        <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-850 space-y-3 animate-fade-in">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-zinc-400 uppercase flex items-center gap-1">
                              <Clock size={11} className="text-amber-glow animate-spin" /> PIN active for {otpTimer}s
                            </span>
                            <span className="text-zinc-500">Wait for code</span>
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              maxLength={4}
                              placeholder="Enter Pin"
                              value={enteredOtp}
                              onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ""))}
                              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1.5 text-center tracking-widest text-base font-bold text-white outline-none"
                            />
                            <button
                              type="button"
                              onClick={handleVerifyOTP}
                              className="bg-emerald-950 text-emerald-400 border border-emerald-900 font-bold px-4 rounded-lg cursor-pointer text-xs"
                            >
                              Verify Code
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-zinc-400 font-semibold uppercase block">Secondary Phone line</label>
                      <input
                        type="tel"
                        maxLength={10}
                        placeholder="Alternate shop number"
                        value={secondaryPhone}
                        onChange={(e) => setSecondaryPhone(e.target.value.replace(/\D/g, ""))}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-glow"
                      />
                    </div>
                  </div>

                  {/* Right Column: Address and Licenses */}
                  <div className="space-y-4">
                    <div className="border-b border-zinc-900 pb-2">
                      <span className="text-[10px] uppercase font-bold text-emerald-400">2. Address & Compliance Credentials</span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-zinc-400 font-semibold uppercase block">Postal Physical Address *</label>
                      <textarea
                        placeholder="Enter complete shop or delivery address..."
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        required
                        rows={2}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white outline-none resize-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-zinc-400 font-semibold uppercase block">Google coordinates URL link *</label>
                      <input
                        type="text"
                        placeholder="Maps coordinates pin URL link"
                        value={googleLocation}
                        onChange={(e) => setGoogleLocation(e.target.value)}
                        required
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white outline-none"
                      />
                    </div>

                    <div className="space-y-3 pt-2">
                      <span className="text-[9px] uppercase font-semibold text-zinc-500 block border-b border-zinc-900 pb-1">Tax licenses</span>
                      <div className="grid grid-cols-3 gap-2 text-[10px]">
                        <div>
                          <label className="text-[8px] text-zinc-650 block mb-1">GSTIN</label>
                          <input
                            type="text"
                            maxLength={15}
                            placeholder="GSTIN Code"
                            value={gstNum}
                            onChange={(e) => setGstNum(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 font-bold text-white uppercase outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[8px] text-zinc-650 block mb-1">FSSAI</label>
                          <input
                            type="text"
                            maxLength={14}
                            placeholder="fssai"
                            value={fssaiNum}
                            onChange={(e) => setFssaiNum(e.target.value.replace(/\D/g, ""))}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 font-bold text-white outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[8px] text-zinc-650 block mb-1">ShopAct</label>
                          <input
                            type="text"
                            placeholder="Udyam Code"
                            value={shopactNum}
                            onChange={(e) => setShopactNum(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-805 rounded-lg p-2 font-bold text-white outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                      <button
                        type="button"
                        onClick={() => setShowRegistrationForm(false)}
                        className="flex-1 py-3.5 bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl uppercase font-bold text-[10px] transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-3.5 bg-amber-glow hover:bg-[#ffa000] text-black rounded-xl uppercase font-extrabold text-[10px] transition cursor-pointer shadow-lg active:scale-95"
                      >
                        Submit Verified Master Outlet
                      </button>
                    </div>
                  </div>

                </form>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
