"use client";
import { useEffect, useState } from "react";
import { Search, Plus, X, Users, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { PageHeader }  from "@/components/ui/page-header";
import { SkeletonRow } from "@/components/ui/skeleton";
import { FloatingPaths } from "@/components/ui/background-paths";
import { adminAuthHeader } from "@/lib/admin-token";

interface Customer {
  id: string;
  company_name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  sector?: string;
  account_status: string;
  total_claims: number;
  approved_claims: number;
  created_at: string;
}

const SECTOR_LABEL: Record<string, string> = {
  renewable_energy: "Renewable Energy",
  logistics:        "Logistics",
  infrastructure:   "Infrastructure",
};

const STATUS_COLOR: Record<string, string> = {
  active:    "bg-green-500/15 text-green-400 border border-green-500/20",
  suspended: "bg-amber-500/15 text-amber-400 border border-amber-500/20",
  closed:    "bg-white/8 text-white/40 border border-white/12",
};

const FILTER_BTN = (active: boolean) =>
  cn(
    "px-3 py-2 text-xs font-semibold rounded-lg border transition-colors",
    active
      ? "bg-[#1A3A5C] text-white border-[#1A3A5C]"
      : "bg-white/5 text-white/55 border-white/12 hover:bg-white/8 hover:text-white"
  );

const INPUT_CLS = [
  "w-full rounded-xl px-3.5 py-2.5 text-sm",
  "bg-white/5 border border-white/12 text-white",
  "placeholder:text-white/25 focus:outline-none",
  "focus:ring-2 focus:ring-sky/30 focus:border-sky/50",
  "hover:border-white/20 transition-all backdrop-blur-sm",
].join(" ");

const LABEL_CLS = "block text-xs font-medium text-white/45 mb-1";

export default function CustomersPage() {
  const [customers,    setCustomers]    = useState<Customer[]>([]);
  const [total,        setTotal]        = useState(0);
  const [page,         setPage]         = useState(1);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [sectorFilter, setSectorFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showModal,    setShowModal]    = useState(false);
  const [addError,     setAddError]     = useState<string | null>(null);
  const [adding,       setAdding]       = useState(false);
  const [newCustomer,  setNewCustomer]  = useState({
    company_name: "", contact_name: "", email: "", phone: "", sector: "",
  });

  const [authRequired, setAuthRequired] = useState(false);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (sectorFilter !== "all") params.set("sector", sectorFilter);
    if (statusFilter !== "all") params.set("account_status", statusFilter);
    fetch(`/api/customers?${params}`, { headers: { ...adminAuthHeader() } })
      .then(async (r) => {
        if (r.status === 401 || r.status === 503) { setAuthRequired(true); return null; }
        return r.json();
      })
      .then((d) => {
        if (d) { setCustomers(d.customers || []); setTotal(d.total || 0); setAuthRequired(false); }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [page, sectorFilter, statusFilter]);

  const filtered = search
    ? customers.filter(
        (c) =>
          c.company_name?.toLowerCase().includes(search.toLowerCase()) ||
          c.contact_name?.toLowerCase().includes(search.toLowerCase())
      )
    : customers;

  const handleAddCustomer = async () => {
    if (!newCustomer.company_name.trim()) return;
    setAdding(true); setAddError(null);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...adminAuthHeader() },
        body: JSON.stringify({
          company_name: newCustomer.company_name,
          contact_name: newCustomer.contact_name || undefined,
          email:        newCustomer.email        || undefined,
          phone:        newCustomer.phone        || undefined,
          sector:       newCustomer.sector       || undefined,
          account_status: "active",
        }),
      });
      const data = await res.json();
      if (res.status === 401 || res.status === 503) {
        setAddError("Admin key required — sign in again with your admin password.");
        return;
      }
      if (!res.ok) { setAddError(data.error || "Failed to create customer"); return; }
      setNewCustomer({ company_name: "", contact_name: "", email: "", phone: "", sector: "" });
      setShowModal(false);
      setPage(1);
      const fetchRes  = await fetch(`/api/customers?page=1&limit=20`, { headers: { ...adminAuthHeader() } });
      const listData  = await fetchRes.json();
      setCustomers(listData.customers || []);
      setTotal(listData.total || 0);
    } catch {
      setAddError("Network error. Please try again.");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#040810] overflow-hidden">
      <FloatingPaths position={1} />
      <FloatingPaths position={-1} />
    <div className="relative z-10 p-8 space-y-6">

      <PageHeader
        title="Customers"
        description={`${total} total customers`}
        actions={
          <button onClick={() => setShowModal(true)} className="btn-primary-3d">
            <Plus size={15} /> Add Customer
          </button>
        }
      />

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input placeholder="Search company or contact…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm bg-white/5 border border-white/12 text-white rounded-xl placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-sky/30 focus:border-sky/50 hover:border-white/20 transition-all backdrop-blur-sm" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["all", "renewable_energy", "logistics", "infrastructure"].map((s) => (
            <button key={s} onClick={() => setSectorFilter(s)} className={FILTER_BTN(sectorFilter === s)}>
              {s === "all" ? "All Sectors" : SECTOR_LABEL[s] ?? s}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          {["all", "active", "suspended", "closed"].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={FILTER_BTN(statusFilter === s)}>
              {s === "all" ? "All Status" : s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card-dark rounded-2xl overflow-hidden shadow-glass-lg">
        <table className="w-full text-sm">
          <thead className="bg-white/3 border-b border-white/8">
            <tr>
              {["Company","Contact","Sector","Status","Claims","Approval","Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-white/40 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/6">
            {loading ? (
              [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
            ) : authRequired ? (
              <tr>
                <td colSpan={7} className="px-4 py-14 text-center">
                  <Lock size={32} className="mx-auto text-white/15 mb-3" />
                  <p className="text-white/50 font-medium">Admin sign-in required</p>
                  <p className="mt-1 text-xs text-white/35">
                    Customer records contain PII. Sign in again with your admin password to view them.
                  </p>
                  <Link href="/login"
                    className="mt-3 inline-block text-xs text-sky/70 hover:text-sky font-semibold transition-colors">
                    Go to sign in →
                  </Link>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-14 text-center">
                  <Users size={32} className="mx-auto text-white/15 mb-3" />
                  <p className="text-white/50 font-medium">No customers found</p>
                  <button onClick={() => setShowModal(true)}
                    className="mt-3 text-xs text-sky/70 hover:text-sky font-semibold transition-colors">
                    + Add your first customer
                  </button>
                </td>
              </tr>
            ) : (
              filtered.map((cust) => (
                <tr key={cust.id} className="hover:bg-white/4 transition-colors">
                  <td className="px-4 py-3 font-semibold text-white">{cust.company_name}</td>
                  <td className="px-4 py-3 text-white/60 text-sm">{cust.contact_name ?? "--"}</td>
                  <td className="px-4 py-3 text-white/60 text-sm">{cust.sector ? (SECTOR_LABEL[cust.sector] ?? cust.sector) : "--"}</td>
                  <td className="px-4 py-3">
                    <span className={cn("px-2.5 py-1 rounded-full text-xs font-semibold capitalize", STATUS_COLOR[cust.account_status])}>
                      {cust.account_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/60 tabular-nums text-sm">{cust.total_claims}</td>
                  <td className="px-4 py-3 text-sm tabular-nums">
                    {cust.total_claims > 0 ? (
                      <span className={cn("font-semibold", (cust.approved_claims / cust.total_claims) >= 0.5 ? "text-green-400" : "text-red-400")}>
                        {Math.round((cust.approved_claims / cust.total_claims) * 100)}%
                      </span>
                    ) : <span className="text-white/25">--</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/claims?customer_id=${cust.id}`}
                      className="text-xs text-sky/70 hover:text-sky font-semibold transition-colors">
                      View Claims
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {total > 20 && (
          <div className="px-4 py-3 border-t border-white/8 flex items-center justify-between">
            <span className="text-xs text-white/35">Page {page} of {Math.ceil(total / 20)}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 text-xs font-medium border border-white/12 bg-white/5 text-white/60 rounded-lg disabled:opacity-40 hover:bg-white/8 transition-colors">← Prev</button>
              <button onClick={() => setPage((p) => Math.min(Math.ceil(total / 20), p + 1))} disabled={page >= Math.ceil(total / 20)}
                className="px-3 py-1.5 text-xs font-medium border border-white/12 bg-white/5 text-white/60 rounded-lg disabled:opacity-40 hover:bg-white/8 transition-colors">Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="glass-card-dark rounded-2xl shadow-glass-lg w-full max-w-md overflow-hidden border border-white/12">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
              <h2 className="text-base font-bold text-white">Add Customer</h2>
              <button onClick={() => { setShowModal(false); setAddError(null); }}
                className="text-white/35 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Modal form */}
            <div className="px-6 py-5 space-y-4">
              {[
                { k: "company_name", label: "Company Name *", type: "text",  ph: "Adani Green Energy" },
                { k: "contact_name", label: "Contact Name",   type: "text",  ph: "Jane Doe" },
                { k: "email",        label: "Email",          type: "email", ph: "jane@company.com" },
                { k: "phone",        label: "Phone",          type: "tel",   ph: "+91 98765 43210" },
              ].map(({ k, label, type, ph }) => (
                <div key={k}>
                  <label className={LABEL_CLS}>{label}</label>
                  <input type={type} placeholder={ph}
                    value={(newCustomer as any)[k]}
                    onChange={(e) => setNewCustomer({ ...newCustomer, [k]: e.target.value })}
                    className={INPUT_CLS} />
                </div>
              ))}
              <div>
                <label className={LABEL_CLS}>Sector</label>
                <select value={newCustomer.sector}
                  onChange={(e) => setNewCustomer({ ...newCustomer, sector: e.target.value })}
                  className={INPUT_CLS + " cursor-pointer"}>
                  <option value="" className="bg-[#0e2640]">Select sector</option>
                  <option value="renewable_energy" className="bg-[#0e2640]">Renewable Energy</option>
                  <option value="logistics"        className="bg-[#0e2640]">Logistics</option>
                  <option value="infrastructure"   className="bg-[#0e2640]">Infrastructure</option>
                </select>
              </div>

              {addError && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                  {addError}
                </p>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-white/8 bg-white/2">
              <button onClick={() => { setShowModal(false); setAddError(null); }}
                className="flex-1 px-4 py-2.5 border border-white/12 bg-white/5 rounded-xl text-sm font-semibold text-white/60 hover:bg-white/8 hover:text-white transition-colors">
                Cancel
              </button>
              <button onClick={handleAddCustomer}
                disabled={!newCustomer.company_name.trim() || adding}
                className="flex-1 btn-primary-3d justify-center disabled:opacity-50">
                {adding ? "Creating…" : "Create Customer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
