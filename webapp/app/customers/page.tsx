"use client";
import { useEffect, useState } from "react";
import { Search, Plus } from "lucide-react";
import { clsx } from "clsx";
import Link from "next/link";

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
      if (res.ok) {
        setNewCustomer({
          company_name: "",
          contact_name: "",
          email: "",
          phone: "",
          sector: "",
        });
        setShowModal(false);
        setPage(1);
        // Re-fetch
        const params = new URLSearchParams({ page: "1", limit: "20" });
        const fetchRes = await fetch(`/api/customers?${params}`);
        const data = await fetchRes.json();
        setCustomers(data.customers || []);
        setTotal(data.total || 0);
      }
    } catch {
      // Silently fail for now
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500">{total} total customers</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-[#1A3A5C] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#0D6B8E] transition-colors flex items-center gap-2"
        >
          <Plus size={16} /> Add Customer
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            placeholder="Search company or contact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]"
          />
        </div>
        <div className="flex gap-2">
          {["all", "renewable_energy", "logistics", "infrastructure"].map(
            (sector) => (
              <button
                key={sector}
                onClick={() => setSectorFilter(sector)}
                className={clsx(
                  "px-3 py-2 text-xs font-medium rounded-lg border transition-colors capitalize",
                  sectorFilter === sector
                    ? "bg-[#1A3A5C] text-white border-[#1A3A5C]"
                    : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                )}
              >
                {sector === "all" ? "All Sectors" : SECTOR_LABEL[sector]}
              </button>
            )
          )}
        </div>
        <div className="flex gap-2">
          {["all", "active", "suspended", "closed"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={clsx(
                "px-3 py-2 text-xs font-medium rounded-lg border transition-colors capitalize",
                statusFilter === status
                  ? "bg-[#1A3A5C] text-white border-[#1A3A5C]"
                  : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
              )}
            >
              {status === "all" ? "All Status" : status}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left font-semibold text-gray-600">
                Company
              </th>
              <th className="px-6 py-3 text-left font-semibold text-gray-600">
                Contact
              </th>
              <th className="px-6 py-3 text-left font-semibold text-gray-600">
                Sector
              </th>
              <th className="px-6 py-3 text-left font-semibold text-gray-600">
                Status
              </th>
              <th className="px-6 py-3 text-left font-semibold text-gray-600">
                Claims
              </th>
              <th className="px-6 py-3 text-left font-semibold text-gray-600">
                Approval Rate
              </th>
              <th className="px-6 py-3 text-left font-semibold text-gray-600">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  No customers found.
                </td>
              </tr>
            ) : (
              filtered.map((cust) => (
                <tr key={cust.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-semibold text-gray-900">
                    {cust.company_name}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {cust.contact_name || "—"}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {cust.sector ? SECTOR_LABEL[cust.sector] : "—"}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={clsx(
                        "px-2 py-1 rounded text-xs font-semibold capitalize",
                        STATUS_COLOR[cust.account_status]
                      )}
                    >
                      {cust.account_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {cust.total_claims}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {cust.total_claims > 0
                      ? `${Math.round((cust.approved_claims / cust.total_claims) * 100)}%`
                      : "—"}
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/claims?customer_id=${cust.id}`}
                      className="text-[#1A3A5C] hover:text-[#0D6B8E] font-medium text-xs"
                    >
                      View Claims
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Page {page} of {Math.ceil(total / 20)}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() =>
                setPage((p) => Math.min(Math.ceil(total / 20), p + 1))
              }
              disabled={page >= Math.ceil(total / 20)}
              className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Add Customer</h2>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Company Name *
              </label>
              <input
                type="text"
                value={newCustomer.company_name}
                onChange={(e) =>
                  setNewCustomer({
                    ...newCustomer,
                    company_name: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]"
                placeholder="Acme Energy Solutions"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Contact Name
              </label>
              <input
                type="text"
                value={newCustomer.contact_name}
                onChange={(e) =>
                  setNewCustomer({
                    ...newCustomer,
                    contact_name: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={newCustomer.email}
                onChange={(e) =>
                  setNewCustomer({ ...newCustomer, email: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]"
                placeholder="john@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Sector
              </label>
              <select
                value={newCustomer.sector}
                onChange={(e) =>
                  setNewCustomer({ ...newCustomer, sector: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]"
              >
                <option value="">Select sector</option>
                <option value="renewable_energy">Renewable Energy</option>
                <option value="logistics">Logistics</option>
                <option value="infrastructure">Infrastructure</option>
              </select>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCustomer}
                disabled={!newCustomer.company_name.trim()}
                className="flex-1 px-4 py-2 bg-[#1A3A5C] text-white rounded-lg font-medium hover:bg-[#0D6B8E] disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
