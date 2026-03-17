"use client";

import { useState, useEffect } from "react";
import {
  Truck, Plus, Edit, Trash2, X, Check, AlertTriangle, MapPin,
  PackageCheck, Clock, PoundSterling, Zap, ShoppingBag, AlertCircle, Eye,
} from "lucide-react";
import { API_BASE_URL, API_ENDPOINTS } from "@/lib/api-config";
import { useToast } from "@/app/admin/_components/CustomToast";

interface DeliveryOption {
  id: string; name: string; displayName: string; description?: string;
  price: number; freeShippingThreshold?: number;
  deliveryMinDays: number; deliveryMaxDays: number; isActive: boolean; displayOrder: number;
}
interface PostcodeRule {
  id: string; postcodePattern: string; ruleType: "Surcharge" | "Restricted";
  surchargeAmount: number; notes?: string; isActive: boolean;
}

const emptyDelivery: Omit<DeliveryOption, "id"> = { name: "", displayName: "", description: "", price: 0, freeShippingThreshold: undefined, deliveryMinDays: 1, deliveryMaxDays: 5, isActive: true, displayOrder: 0 };
const emptyRule: Omit<PostcodeRule, "id"> = { postcodePattern: "", ruleType: "Surcharge", surchargeAmount: 0, notes: "", isActive: true };

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
  const res = await fetch(url, { headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...options });
  if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
  const json = await res.json();
  return (json.data ?? json) as T;
}

const inp = "w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500";

export default function ShippingPage() {
  const [tab, setTab] = useState<"delivery" | "postcodes">("delivery");
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">Shipping</h1>
          <p className="text-slate-500 text-xs mt-0.5">Manage delivery options and postcode rules</p>
        </div>
      </div>

      <div className="flex gap-0.5 bg-slate-800/60 border border-slate-700/50 rounded-lg p-0.5 w-fit">
        {(["delivery", "postcodes"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium transition-all ${tab === t ? "bg-gradient-to-r from-violet-500 to-cyan-500 text-white shadow-sm" : "text-slate-400 hover:text-white"}`}>
            {t === "delivery" ? <><PackageCheck className="w-3.5 h-3.5" /> Delivery Options</> : <><MapPin className="w-3.5 h-3.5" /> Postcode Rules</>}
          </button>
        ))}
      </div>

      {tab === "delivery" ? <DeliveryTab /> : <PostcodeTab />}
    </div>
  );
}

function DeliveryTab() {
  const toast = useToast();
  const [options, setOptions] = useState<DeliveryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [viewing, setViewing] = useState<DeliveryOption | null>(null);
  const [editing, setEditing] = useState<DeliveryOption | null>(null);
  const [form, setForm] = useState<Omit<DeliveryOption, "id">>(emptyDelivery);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true);
    try { setOptions(await apiFetch<DeliveryOption[]>(`${API_ENDPOINTS.deliveryOptions}?includeInactive=true`)); }
    catch { setOptions([]); } finally { setLoading(false); }
  }
  function openCreate() { setEditing(null); setForm({ ...emptyDelivery }); setError(""); setModal(true); }
  function openEdit(o: DeliveryOption) {
    setEditing(o); setForm({ name: o.name, displayName: o.displayName, description: o.description ?? "", price: o.price, freeShippingThreshold: o.freeShippingThreshold, deliveryMinDays: o.deliveryMinDays, deliveryMaxDays: o.deliveryMaxDays, isActive: o.isActive, displayOrder: o.displayOrder });
    setError(""); setModal(true);
  }
  async function save() {
    if (!form.name.trim() || !form.displayName.trim()) { setError("Name and Display Name are required."); return; }
    setSaving(true); setError("");
    try {
      const body = { ...form, freeShippingThreshold: form.freeShippingThreshold || null, description: form.description || null };
      editing ? await apiFetch(`${API_ENDPOINTS.deliveryOptions}/${editing.id}`, { method: "PUT", body: JSON.stringify({ id: editing.id, ...body }) })
              : await apiFetch(API_ENDPOINTS.deliveryOptions, { method: "POST", body: JSON.stringify(body) });
      toast.success(editing ? "Updated!" : "Created!"); setModal(false); await load();
    } catch (e: any) { setError(e.message || "Failed to save."); } finally { setSaving(false); }
  }
  async function remove(id: string, name: string) {
    if (!confirm(`Delete "${name}"?`)) return;
    try { await apiFetch(`${API_ENDPOINTS.deliveryOptions}/${id}`, { method: "DELETE" }); toast.success("Deleted!"); await load(); }
    catch (e: any) { toast.error(e.message || "Failed."); }
  }

  const sorted = [...options].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Total", value: options.length, color: "violet", icon: <PackageCheck className="h-3.5 w-3.5 text-violet-400" /> },
          { label: "Active", value: options.filter(o => o.isActive).length, color: "green", icon: <Check className="h-3.5 w-3.5 text-green-400" /> },
          { label: "Free Shipping", value: options.filter(o => o.freeShippingThreshold).length, color: "cyan", icon: <ShoppingBag className="h-3.5 w-3.5 text-cyan-400" /> },
        ].map(({ label, value, color, icon }) => (
          <div key={label} className={`bg-gradient-to-br from-${color}-500/10 to-${color}-600/5 border border-${color}-500/20 rounded-xl p-3 flex items-center justify-between`}>
            <div>
              <p className="text-slate-400 text-xs">{label}</p>
              <p className="text-xl font-bold text-white mt-0.5">{value}</p>
            </div>
            <div className={`w-8 h-8 bg-${color}-500/20 rounded-lg flex items-center justify-center`}>{icon}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-700/50">
          <p className="text-slate-400 text-xs">{options.length} option{options.length !== 1 ? "s" : ""}</p>
          <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-violet-600 hover:to-cyan-600 text-white text-xs font-semibold rounded-lg shadow-sm transition-all">
            <Plus className="w-3.5 h-3.5" /> Add Option
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10"><div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : options.length === 0 ? (
          <div className="text-center py-10">
            <PackageCheck className="w-8 h-8 mx-auto mb-2 text-slate-600" />
            <p className="text-slate-400 text-sm">No delivery options yet</p>
            <button onClick={openCreate} className="mt-2 text-violet-400 hover:text-violet-300 text-xs">Add your first option →</button>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/30">
            {sorted.map(opt => (
              <div key={opt.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-700/20 transition-colors">
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${opt.isActive ? "bg-green-400" : "bg-slate-600"}`} />
                <div className="w-7 h-7 bg-slate-700/60 rounded-lg flex items-center justify-center flex-shrink-0">
                  {opt.price === 0 ? <ShoppingBag className="w-3 h-3 text-cyan-400" /> : opt.deliveryMaxDays <= 1 ? <Zap className="w-3 h-3 text-amber-400" /> : <Truck className="w-3 h-3 text-violet-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-white text-xs font-semibold">{opt.displayName}</span>
                    {!opt.isActive && <span className="text-[10px] bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded border border-slate-600">Inactive</span>}
                  </div>
                  <div className="flex items-center gap-2.5 mt-0.5 flex-wrap">
                    <span className="text-slate-300 text-xs font-medium">£{opt.price.toFixed(2)}</span>
                    {opt.freeShippingThreshold && <span className="text-[10px] text-green-400 bg-green-500/10 border border-green-500/20 px-1.5 py-0.5 rounded-full">Free &gt;£{opt.freeShippingThreshold.toFixed(2)}</span>}
                    <span className="flex items-center gap-1 text-[10px] text-slate-500"><Clock className="w-2.5 h-2.5" />{opt.deliveryMinDays}–{opt.deliveryMaxDays}d</span>
                    {opt.description && <span className="text-[10px] text-slate-500 truncate max-w-xs hidden lg:block">{opt.description}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  <button onClick={() => setViewing(opt)} className="p-1 text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded transition-all" title="View"><Eye className="w-3 h-3" /></button>
                  <button onClick={() => openEdit(opt)} className="p-1 text-slate-500 hover:text-violet-400 hover:bg-violet-500/10 rounded transition-all" title="Edit"><Edit className="w-3 h-3" /></button>
                  <button onClick={() => remove(opt.id, opt.displayName)} className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-all" title="Delete"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* View Modal */}
      {viewing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-slate-700 rounded-md flex items-center justify-center">
                  {viewing.price === 0 ? <ShoppingBag className="w-3 h-3 text-cyan-400" /> : viewing.deliveryMaxDays <= 1 ? <Zap className="w-3 h-3 text-amber-400" /> : <Truck className="w-3 h-3 text-violet-400" />}
                </div>
                <h2 className="text-sm font-semibold text-white">{viewing.displayName}</h2>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${viewing.isActive ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-slate-700 border-slate-600 text-slate-400"}`}>
                  {viewing.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <button onClick={() => setViewing(null)} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-2.5">
              {[
                ["Internal Name", viewing.name],
                ["Display Name", viewing.displayName],
                ["Description", viewing.description || "—"],
                ["Price", `£${viewing.price.toFixed(2)}`],
                ["Free Shipping Over", viewing.freeShippingThreshold ? `£${viewing.freeShippingThreshold.toFixed(2)}` : "Not set"],
                ["Delivery Time", `${viewing.deliveryMinDays}–${viewing.deliveryMaxDays} working days`],
                ["Display Order", String(viewing.displayOrder)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between items-center py-1.5 border-b border-slate-800 last:border-0">
                  <span className="text-[10px] text-slate-500 font-medium">{label}</span>
                  <span className="text-xs text-slate-200 font-medium text-right max-w-[60%]">{value}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 px-4 py-3 border-t border-slate-800">
              <button onClick={() => setViewing(null)} className="flex-1 px-3 py-1.5 border border-slate-700 text-slate-400 text-xs font-medium rounded-lg hover:bg-slate-800 hover:text-white transition-all">Close</button>
              <button onClick={() => { openEdit(viewing); setViewing(null); }} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-violet-500 to-cyan-500 text-white text-xs font-semibold rounded-lg transition-all">
                <Edit className="w-3 h-3" /> Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <h2 className="text-sm font-semibold text-white">{editing ? "Edit Delivery Option" : "Add Delivery Option"}</h2>
              <button onClick={() => setModal(false)} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-3">
              {error && <div className="flex items-center gap-2 p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs"><AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />{error}</div>}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-medium text-slate-400 mb-1">Internal Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. standard" className={inp} />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-slate-400 mb-1">Display Name *</label>
                  <input value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} placeholder="e.g. Standard Delivery" className={inp} />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-medium text-slate-400 mb-1">Description</label>
                  <input value={form.description ?? ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Delivered within 3–5 working days" className={inp} />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-slate-400 mb-1">Price (£)</label>
                  <input type="number" min="0" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))} className={inp} />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-slate-400 mb-1">Free Shipping Over (£)</label>
                  <input type="number" min="0" step="0.01" value={form.freeShippingThreshold ?? ""} onChange={e => setForm(f => ({ ...f, freeShippingThreshold: e.target.value ? parseFloat(e.target.value) : undefined }))} placeholder="Blank = disabled" className={inp} />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-slate-400 mb-1">Min Days</label>
                  <input type="number" min="0" value={form.deliveryMinDays} onChange={e => setForm(f => ({ ...f, deliveryMinDays: parseInt(e.target.value) || 0 }))} className={inp} />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-slate-400 mb-1">Max Days</label>
                  <input type="number" min="0" value={form.deliveryMaxDays} onChange={e => setForm(f => ({ ...f, deliveryMaxDays: parseInt(e.target.value) || 0 }))} className={inp} />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-slate-400 mb-1">Display Order</label>
                  <input type="number" min="0" value={form.displayOrder} onChange={e => setForm(f => ({ ...f, displayOrder: parseInt(e.target.value) || 0 }))} className={inp} />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[10px] font-medium text-slate-400">Active</span>
                  <button type="button" onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                    className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${form.isActive ? "bg-violet-500" : "bg-slate-700"}`}>
                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform shadow ${form.isActive ? "translate-x-3.5" : "translate-x-0.5"}`} />
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-2 px-4 py-3 border-t border-slate-800">
              <button onClick={() => setModal(false)} className="flex-1 px-3 py-1.5 border border-slate-700 text-slate-400 text-xs font-medium rounded-lg hover:bg-slate-800 hover:text-white transition-all">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-violet-600 hover:to-cyan-600 text-white text-xs font-semibold rounded-lg transition-all disabled:opacity-50">
                {saving ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                {editing ? "Save Changes" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function PostcodeTab() {
  const toast = useToast();
  const [rules, setRules] = useState<PostcodeRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [viewing, setViewing] = useState<PostcodeRule | null>(null);
  const [editing, setEditing] = useState<PostcodeRule | null>(null);
  const [form, setForm] = useState<Omit<PostcodeRule, "id">>(emptyRule);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "Surcharge" | "Restricted">("all");

  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true);
    try { setRules(await apiFetch<PostcodeRule[]>(`${API_ENDPOINTS.postcodeRules}?includeInactive=true`)); }
    catch { setRules([]); } finally { setLoading(false); }
  }
  function openCreate() { setEditing(null); setForm({ ...emptyRule }); setError(""); setModal(true); }
  function openEdit(r: PostcodeRule) {
    setEditing(r); setForm({ postcodePattern: r.postcodePattern, ruleType: r.ruleType, surchargeAmount: r.surchargeAmount, notes: r.notes ?? "", isActive: r.isActive });
    setError(""); setModal(true);
  }
  async function save() {
    if (!form.postcodePattern.trim()) { setError("Postcode pattern is required."); return; }
    setSaving(true); setError("");
    try {
      const body = { ...form, notes: form.notes || null };
      editing ? await apiFetch(`${API_ENDPOINTS.postcodeRules}/${editing.id}`, { method: "PUT", body: JSON.stringify({ id: editing.id, ...body }) })
              : await apiFetch(API_ENDPOINTS.postcodeRules, { method: "POST", body: JSON.stringify(body) });
      toast.success(editing ? "Updated!" : "Created!"); setModal(false); await load();
    } catch (e: any) { setError(e.message || "Failed."); } finally { setSaving(false); }
  }
  async function remove(id: string, pattern: string) {
    if (!confirm(`Delete rule for "${pattern}"?`)) return;
    try { await apiFetch(`${API_ENDPOINTS.postcodeRules}/${id}`, { method: "DELETE" }); toast.success("Deleted!"); await load(); }
    catch (e: any) { toast.error(e.message || "Failed."); }
  }

  const surchargeCount = rules.filter(r => r.ruleType === "Surcharge").length;
  const restrictedCount = rules.filter(r => r.ruleType === "Restricted").length;
  const filtered = rules.filter(r => filter === "all" || r.ruleType === filter);

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Total", value: rules.length, color: "violet", icon: <MapPin className="h-3.5 w-3.5 text-violet-400" /> },
          { label: "Surcharge", value: surchargeCount, color: "amber", icon: <PoundSterling className="h-3.5 w-3.5 text-amber-400" /> },
          { label: "Restricted", value: restrictedCount, color: "red", icon: <AlertCircle className="h-3.5 w-3.5 text-red-400" /> },
        ].map(({ label, value, color, icon }) => (
          <div key={label} className={`bg-gradient-to-br from-${color}-500/10 to-${color}-600/5 border border-${color}-500/20 rounded-xl p-3 flex items-center justify-between`}>
            <div>
              <p className="text-slate-400 text-xs">{label}</p>
              <p className="text-xl font-bold text-white mt-0.5">{value}</p>
            </div>
            <div className={`w-8 h-8 bg-${color}-500/20 rounded-lg flex items-center justify-center`}>{icon}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-700/50 gap-2 flex-wrap">
          <div className="flex gap-0.5 bg-slate-800 border border-slate-700 rounded-lg p-0.5">
            {(["all", "Surcharge", "Restricted"] as const).map(t => (
              <button key={t} onClick={() => setFilter(t)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ${filter === t ? "bg-slate-600 text-white" : "text-slate-500 hover:text-white"}`}>
                {t === "all" ? `All (${rules.length})` : t === "Surcharge" ? `Surcharge (${surchargeCount})` : `Restricted (${restrictedCount})`}
              </button>
            ))}
          </div>
          <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-violet-600 hover:to-cyan-600 text-white text-xs font-semibold rounded-lg shadow-sm transition-all">
            <Plus className="w-3.5 h-3.5" /> Add Rule
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10"><div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10">
            <MapPin className="w-8 h-8 mx-auto mb-2 text-slate-600" />
            <p className="text-slate-400 text-sm">{rules.length === 0 ? "No postcode rules yet" : "No rules match"}</p>
            {rules.length === 0 && <button onClick={openCreate} className="mt-2 text-violet-400 hover:text-violet-300 text-xs">Add your first rule →</button>}
          </div>
        ) : (
          <div className="divide-y divide-slate-700/30">
            {filtered.map(rule => (
              <div key={rule.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-700/20 transition-colors">
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${rule.isActive ? "bg-green-400" : "bg-slate-600"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <code className="text-white font-mono font-bold bg-slate-700 px-2 py-0.5 rounded text-xs border border-slate-600">{rule.postcodePattern}</code>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${rule.ruleType === "Restricted" ? "bg-red-500/10 border-red-500/30 text-red-400" : "bg-amber-500/10 border-amber-500/30 text-amber-400"}`}>
                      {rule.ruleType}
                    </span>
                    {!rule.isActive && <span className="text-[10px] bg-slate-700 border border-slate-600 text-slate-400 px-1.5 py-0.5 rounded-full">Inactive</span>}
                    {rule.ruleType === "Surcharge" && rule.surchargeAmount > 0 && <span className="text-[10px] text-amber-400 font-medium">+£{rule.surchargeAmount.toFixed(2)}</span>}
                    {rule.notes && <span className="text-[10px] text-slate-500 truncate">{rule.notes}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  <button onClick={() => setViewing(rule)} className="p-1 text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded transition-all" title="View"><Eye className="w-3 h-3" /></button>
                  <button onClick={() => openEdit(rule)} className="p-1 text-slate-500 hover:text-violet-400 hover:bg-violet-500/10 rounded transition-all" title="Edit"><Edit className="w-3 h-3" /></button>
                  <button onClick={() => remove(rule.id, rule.postcodePattern)} className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-all" title="Delete"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[10px] text-slate-500">
        <span className="text-slate-400 font-medium">Tips:</span>
        {[["BT","N. Ireland"],["IV","Highlands"],["GY","Guernsey"],["IM","Isle of Man"],["JE","Jersey"]].map(([c,l]) => (
          <span key={c}><code className="text-violet-400 font-mono">{c}</code> {l}</span>
        ))}
      </div>

      {/* View Modal */}
      {viewing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <code className="text-white font-mono font-bold bg-slate-700 px-2 py-0.5 rounded text-xs border border-slate-600">{viewing.postcodePattern}</code>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${viewing.ruleType === "Restricted" ? "bg-red-500/10 border-red-500/30 text-red-400" : "bg-amber-500/10 border-amber-500/30 text-amber-400"}`}>{viewing.ruleType}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${viewing.isActive ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-slate-700 border-slate-600 text-slate-400"}`}>{viewing.isActive ? "Active" : "Inactive"}</span>
              </div>
              <button onClick={() => setViewing(null)} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-2.5">
              {[
                ["Postcode Pattern", viewing.postcodePattern],
                ["Rule Type", viewing.ruleType],
                ["Surcharge Amount", viewing.ruleType === "Surcharge" ? `£${viewing.surchargeAmount.toFixed(2)}` : "N/A"],
                ["Notes", viewing.notes || "—"],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between items-center py-1.5 border-b border-slate-800 last:border-0">
                  <span className="text-[10px] text-slate-500 font-medium">{label}</span>
                  <span className="text-xs text-slate-200 font-medium text-right max-w-[60%]">{value}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 px-4 py-3 border-t border-slate-800">
              <button onClick={() => setViewing(null)} className="flex-1 px-3 py-1.5 border border-slate-700 text-slate-400 text-xs font-medium rounded-lg hover:bg-slate-800 hover:text-white transition-all">Close</button>
              <button onClick={() => { openEdit(viewing); setViewing(null); }} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-violet-500 to-cyan-500 text-white text-xs font-semibold rounded-lg transition-all">
                <Edit className="w-3 h-3" /> Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <h2 className="text-sm font-semibold text-white">{editing ? "Edit Rule" : "Add Postcode Rule"}</h2>
              <button onClick={() => setModal(false)} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-3">
              {error && <div className="flex items-center gap-2 p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs"><AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />{error}</div>}
              <div>
                <label className="block text-[10px] font-medium text-slate-400 mb-1">Postcode Prefix *</label>
                <input value={form.postcodePattern} onChange={e => setForm(f => ({ ...f, postcodePattern: e.target.value.toUpperCase() }))} placeholder="e.g. BT, IV, GY" className={`${inp} font-mono`} />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-400 mb-1">Rule Type *</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["Surcharge", "Restricted"] as const).map(type => (
                    <button key={type} type="button" onClick={() => setForm(f => ({ ...f, ruleType: type }))}
                      className={`py-2 rounded-lg text-xs font-semibold border transition-all ${form.ruleType === type ? type === "Restricted" ? "bg-red-500/15 border-red-500/50 text-red-400" : "bg-amber-500/15 border-amber-500/50 text-amber-400" : "border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300"}`}>
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              {form.ruleType === "Surcharge" && (
                <div>
                  <label className="block text-[10px] font-medium text-slate-400 mb-1">Surcharge Amount (£)</label>
                  <input type="number" min="0" step="0.01" value={form.surchargeAmount} onChange={e => setForm(f => ({ ...f, surchargeAmount: parseFloat(e.target.value) || 0 }))} className={inp} />
                </div>
              )}
              <div>
                <label className="block text-[10px] font-medium text-slate-400 mb-1">Notes (optional)</label>
                <input value={form.notes ?? ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g. Northern Ireland surcharge" className={inp} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium text-slate-400">Active</span>
                <button type="button" onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                  className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${form.isActive ? "bg-violet-500" : "bg-slate-700"}`}>
                  <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform shadow ${form.isActive ? "translate-x-3.5" : "translate-x-0.5"}`} />
                </button>
              </div>
            </div>
            <div className="flex gap-2 px-4 py-3 border-t border-slate-800">
              <button onClick={() => setModal(false)} className="flex-1 px-3 py-1.5 border border-slate-700 text-slate-400 text-xs font-medium rounded-lg hover:bg-slate-800 hover:text-white transition-all">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-violet-600 hover:to-cyan-600 text-white text-xs font-semibold rounded-lg transition-all disabled:opacity-50">
                {saving ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                {editing ? "Save" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
