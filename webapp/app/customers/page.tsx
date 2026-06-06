"use client";
import { useEffect, useState } from "react";
import { Search, Plus, X, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { PageHeader }  from "@/components/ui/page-header";
import { SkeletonRow } from "@/components/ui/skeleton";

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
  logistics: "Logistics",
  infrastructure: "Infrastructure",
};

const STATUS_COLOR: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  suspended: "bg-amber-100 text-amber-700",
  closed: "bg-gray-100 text-gray-600",
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [addError,  setAddError]  = useState<string | null>(null);
  const [adding,    setAdding]    = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    company_name: "",
    contact_name: "",
    email: "",
    phone: "",
    sector: "",
  });

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (sectorFilter !== "all") params.set("sector", sectorFilter);
    if (statusFilter !== "all") params.set("account_status", statusFilter);
    fetch(`/api/customers?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setCustomers(d.customers || []);
        setTotal(d.total || 0);
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
    setAdding(true);
    setAddError(null);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: newCustomer.company_name,
          contact_name: newCustomer.contact_name || undefined,
          email: newCustomer.email || undefined,
          phone: newCustomer.phone || undefined,
          sector: newCustomer.sector || undefined,
          account_status: "active",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error || "Failed to create customer");
        return;
      }
      setNewCustomer({ company_name: "", contact_name: "", email: "", phone: "", sector: "" });
      setShowModal(false);
      setPage(1);
      // Re-fetch list
      const fetchRes = await fetch(`/api/customers?page=1&limit=20`);
      const listData = await fetchRes.json();
      setCustomers(listData.customers || []);
      setTotal(listData.total || 0);
    } catch (err) {
      setAddError("Network error. Please try again.");
    } finally {
      setAdding(false);
    }
  };

  const FILTER_BTN = (active: boolean) =>
    cn("px-3 py-2 text-xs font-semibold rounded-lg border transition-colors",
      active ? "bg-[#1A3A5C] text-white border-[#1A3A5C]" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50");

  const INPUT_CLS = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]/20 focus:border-[#1A3A5C] transition-all hover:border-gray-300";
  const LABEL_CLS = "block text-xs font-medium text-gray-600 mb-1";

  return (
    <div className="p-8 space-y-6">

      <PageHeader
        title="Customers"
        description={`${total} total customers`}
        actions={
          <button onClick={() => setShowModal(true)}
            className="bg-gradient-to-r from-[#1A3A5C] to-[#0D6B8E] hover:from-[#0D6B8E] hover:to-[#1E88BE] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-all flex items-center gap-2 shadow-sm hover:shadow-md hover:-translate-y-0.5">
            <Plus size={15} /> Add Customer
          </button>
        }
      />

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input placeholder="Search company or contact…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]/20 focus:border-[#1A3A5C] transition-all hover:border-gray-300" />
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
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {["Company", "Contact", "Sector", "Status", "Claims", "Approval", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-14 text-center">
                  <Users size={32} className="mx-auto text-gray-200 mb-3" />
                  <p className="text-gray-500 font-medium">No customers found</p>
                  <button onClick={() => setShowModal(true)}
                    className="mt-3 text-xs text-[#1A3A5C] hover:text-[#0D6B8E] font-semibold">
                    + Add your first customer
                  </button>
                </td>
              </tr>
            ) : (
              filtered.map((cust) => (
                <tr key={cust.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-gray-900">{cust.company_name}</td>
                  <td className="px-4 py-3 text-gray-600 text-sm">{cust.contact_name ?? "--"}</td>
                  <td className="px-4 py-3 text-gray-600 text-sm">{cust.sector ? (SECTOR_LABEL[cust.sector] ?? cust.sector) : "--"}</td>
                  <td className="px-4 py-3">
                    <span className={cn("px-2.5 py-1 rounded-full text-xs font-semibold capitalize", STATUS_COLOR[cust.account_status])}>
                      {cust.account_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 tabular-nums text-sm">{cust.total_claims}</td>
                  <td className="px-4 py-3 text-sm tabular-nums">
                    {cust.total_claims > 0 ? (
                      <span className={cn("font-semibold", (cust.approved_claims / cust.total_claims) >= 0.5 ? "text-green-700" : "text-red-600")}>
                        {Math.round((cust.approved_claims / cust.total_claims) * 100)}%
                      </span>
                    ) : <span className="text-gray-400">--</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/claims?customer_id=${cust.id}`}
                      className="text-xs text-[#1A3A5C] hover:text-[#0D6B8E] font-semibold transition-colors">
                      View Claims
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {total > 20 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between text-sm text-gray-500">
            <span className="text-xs">Page {page} of {Math.ceil(total / 20)}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">← Prev</button>
              <button onClick={() => setPage((p) => Math.min(Math.ceil(total / 20), p + 1))} disabled={page >= Math.ceil(total / 20)}
                className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">Next →</button>
            </div>
          </div>
        )}
      </div>

      {/*  Add Customer Modal  */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md space-y-0 overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">Add Customer</h2>
              <button onClick={() => { setShowModal(false); setAddError(null); }}
                className="text-gray-400 hover:text-gray-600 transition-colors">
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
                  className={INPUT_CLS}>
                  <option value="">Select sector</option>
                  <option value="renewable_energy">Renewable Energy</option>
                  <option value="logistics">Logistics</option>
                  <option value="infrastructure">Infrastructure</option>
                </select>
              </div>

              {addError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {addError}
                </p>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
              <button onClick={() => { setShowModal(false); setAddError(null); }}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleAddCustomer}
                disabled={!newCustomer.company_name.trim() || adding}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#1A3A5C] to-[#0D6B8E] hover:from-[#0D6B8E] hover:to-[#1E88BE] text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-all shadow-sm hover:shadow-md">
                {adding ? "Creating…" : "Create Customer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
