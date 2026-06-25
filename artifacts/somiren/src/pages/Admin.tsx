import { useState, useEffect, useCallback } from "react";
import { Lock, LogOut, Plus, Trash2, Edit3, Save, X, Package, Boxes, ChevronDown, ChevronUp, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";
import { getApiBase } from "@/lib/api";

type ShipmentStatus = "pending" | "collected" | "in_transit" | "customs" | "out_for_delivery" | "delivered" | "exception";
type ShipmentType = "parcel" | "mineral";

const STATUS_LABELS: Record<ShipmentStatus, string> = {
  pending: "En attente",
  collected: "Collecté",
  in_transit: "En transit",
  customs: "En douane",
  out_for_delivery: "En cours de livraison",
  delivered: "Livré",
  exception: "Exception",
};

const STATUS_COLORS: Record<ShipmentStatus, string> = {
  pending: "text-gray-400 bg-gray-400/10 border-gray-400/30",
  collected: "text-blue-400 bg-blue-400/10 border-blue-400/30",
  in_transit: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
  customs: "text-orange-400 bg-orange-400/10 border-orange-400/30",
  out_for_delivery: "text-amber-400 bg-amber-400/10 border-amber-400/30",
  delivered: "text-green-400 bg-green-400/10 border-green-400/30",
  exception: "text-red-400 bg-red-400/10 border-red-400/30",
};

interface Shipment {
  id: number;
  trackingCode: string;
  type: ShipmentType;
  status: ShipmentStatus;
  senderName: string;
  senderCity: string;
  senderCountry: string;
  recipientName: string;
  recipientCity: string;
  recipientCountry: string;
  description: string;
  weight?: string;
  dimensions?: string;
  estimatedDelivery?: string;
  referenceNumber?: string;
  notes?: string;
  createdAt: string;
}

function useAdminApi(token: string) {
  const base = getApiBase();
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const get = (path: string) => fetch(`${base}${path}`, { headers }).then((r) => r.json());
  const post = (path: string, body: object) =>
    fetch(`${base}${path}`, { method: "POST", headers, body: JSON.stringify(body) }).then((r) => r.json());
  const put = (path: string, body: object) =>
    fetch(`${base}${path}`, { method: "PUT", headers, body: JSON.stringify(body) }).then((r) => r.json());
  const del = (path: string) =>
    fetch(`${base}${path}`, { method: "DELETE", headers }).then((r) => r.json());

  return { get, post, put, del };
}

const EMPTY_SHIPMENT = {
  trackingCode: "",
  type: "parcel" as ShipmentType,
  status: "pending" as ShipmentStatus,
  senderName: "SOMIREN S.A.",
  senderCity: "Niamey",
  senderCountry: "Niger",
  recipientName: "",
  recipientCity: "",
  recipientCountry: "",
  description: "",
  weight: "",
  dimensions: "",
  estimatedDelivery: "",
  referenceNumber: "",
  notes: "",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-white/40 uppercase tracking-widest mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full bg-black/40 border border-white/10 text-white text-sm px-3 py-2 focus:outline-none focus:border-primary/60 transition-colors placeholder-white/20";
const selectCls = "w-full bg-black/40 border border-white/10 text-white text-sm px-3 py-2 focus:outline-none focus:border-primary/60 transition-colors";

function ShipmentForm({
  initial,
  onSave,
  onCancel,
  loading,
}: {
  initial: typeof EMPTY_SHIPMENT;
  onSave: (data: typeof EMPTY_SHIPMENT) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [form, setForm] = useState(initial);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="border border-primary/30 bg-primary/5 p-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Code de suivi *">
          <input className={inputCls} value={form.trackingCode} onChange={(e) => set("trackingCode", e.target.value.toUpperCase())}
            placeholder="SMR-2026-000001" />
        </Field>
        <Field label="Type *">
          <select className={selectCls} value={form.type} onChange={(e) => set("type", e.target.value)}>
            <option value="parcel">Colis collaborateur</option>
            <option value="mineral">Expédition minière</option>
          </select>
        </Field>
        <Field label="Statut initial *">
          <select className={selectCls} value={form.status} onChange={(e) => set("status", e.target.value)}>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Nom expéditeur *"><input className={inputCls} value={form.senderName} onChange={(e) => set("senderName", e.target.value)} /></Field>
        <Field label="Ville expéditeur *"><input className={inputCls} value={form.senderCity} onChange={(e) => set("senderCity", e.target.value)} /></Field>
        <Field label="Pays expéditeur *"><input className={inputCls} value={form.senderCountry} onChange={(e) => set("senderCountry", e.target.value)} /></Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Nom destinataire *"><input className={inputCls} value={form.recipientName} onChange={(e) => set("recipientName", e.target.value)} /></Field>
        <Field label="Ville destinataire *"><input className={inputCls} value={form.recipientCity} onChange={(e) => set("recipientCity", e.target.value)} /></Field>
        <Field label="Pays destinataire *"><input className={inputCls} value={form.recipientCountry} onChange={(e) => set("recipientCountry", e.target.value)} /></Field>
      </div>

      <Field label="Description *"><input className={inputCls} value={form.description} onChange={(e) => set("description", e.target.value)}
        placeholder="Ex: Matériel informatique, équipements de terrain…" /></Field>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Field label="Poids"><input className={inputCls} value={form.weight} onChange={(e) => set("weight", e.target.value)} placeholder="Ex: 12 kg" /></Field>
        <Field label="Dimensions"><input className={inputCls} value={form.dimensions} onChange={(e) => set("dimensions", e.target.value)} placeholder="Ex: 40×30×20 cm" /></Field>
        <Field label="Livraison estimée"><input type="date" className={inputCls} style={{ colorScheme: "dark" }} value={form.estimatedDelivery} onChange={(e) => set("estimatedDelivery", e.target.value)} /></Field>
        <Field label="Réf. interne"><input className={inputCls} value={form.referenceNumber} onChange={(e) => set("referenceNumber", e.target.value)} placeholder="Ex: BON-2026-001" /></Field>
      </div>

      <Field label="Notes internes"><input className={inputCls} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Commentaires visibles pour l'admin uniquement" /></Field>

      <div className="flex gap-3 pt-2">
        <button onClick={() => onSave(form)} disabled={loading} className="flex items-center gap-2 bg-primary text-black px-6 py-2 text-sm font-bold uppercase tracking-wider hover:bg-primary/90 disabled:opacity-40">
          <Save className="w-4 h-4" /> Enregistrer
        </button>
        <button onClick={onCancel} className="flex items-center gap-2 border border-white/20 text-white/70 px-6 py-2 text-sm hover:border-white/40">
          <X className="w-4 h-4" /> Annuler
        </button>
      </div>
    </div>
  );
}

function EventForm({
  shipmentId,
  onSave,
  onCancel,
  loading,
}: {
  shipmentId: number;
  onSave: (data: any) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [form, setForm] = useState({
    status: "in_transit" as ShipmentStatus,
    location: "",
    description: "",
    timestamp: new Date().toISOString().slice(0, 16),
    isCompleted: true,
  });
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="border border-white/10 bg-white/5 p-4 mt-3 space-y-3">
      <p className="text-xs text-primary uppercase tracking-widest font-semibold">Ajouter un événement</p>
      <div className="grid grid-cols-1 gap-3">
        <Field label="Statut *">
          <select className={selectCls} value={form.status} onChange={(e) => set("status", e.target.value)}>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
        <Field label="Date & Heure * (vous pouvez antidater)">
          <input type="datetime-local" className={inputCls} style={{ colorScheme: "dark" }} value={form.timestamp} onChange={(e) => set("timestamp", e.target.value)} />
        </Field>
      </div>
      <Field label="Localisation *"><input className={inputCls} value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Ex: Hub de tri — Paris, France" /></Field>
      <Field label="Description *"><input className={inputCls} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Ex: Colis pris en charge par le transporteur" /></Field>
      <div className="flex gap-3">
        <button onClick={() => onSave({ ...form, shipmentId })} disabled={loading} className="flex items-center gap-2 bg-white/10 text-white px-4 py-2 text-sm hover:bg-white/20 disabled:opacity-40">
          <Save className="w-4 h-4" /> Ajouter
        </button>
        <button onClick={onCancel} className="text-white/40 hover:text-white text-sm px-3">Annuler</button>
      </div>
    </div>
  );
}

function EventEditForm({
  event,
  onSave,
  onCancel,
  loading,
}: {
  event: any;
  onSave: (data: any) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const toLocalDatetime = (iso: string) => {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [form, setForm] = useState({
    status: event.status as ShipmentStatus,
    location: event.location,
    description: event.description,
    timestamp: toLocalDatetime(event.timestamp),
  });
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="p-3 space-y-3 border-t border-primary/20 bg-primary/5">
      <p className="text-xs text-primary uppercase tracking-widest font-semibold">Modifier l'événement</p>
      <div className="grid grid-cols-1 gap-3">
        <Field label="Statut *">
          <select className={selectCls} value={form.status} onChange={(e) => set("status", e.target.value)}>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
        <Field label="Date & Heure * (vous pouvez antidater)">
          <input type="datetime-local" className={inputCls} style={{ colorScheme: "dark" }} value={form.timestamp} onChange={(e) => set("timestamp", e.target.value)} />
        </Field>
      </div>
      <Field label="Localisation *">
        <input className={inputCls} value={form.location} onChange={(e) => set("location", e.target.value)} />
      </Field>
      <Field label="Description *">
        <input className={inputCls} value={form.description} onChange={(e) => set("description", e.target.value)} />
      </Field>
      <div className="flex gap-3">
        <button onClick={() => onSave(form)} disabled={loading} className="flex items-center gap-2 bg-primary text-black px-4 py-2 text-sm font-bold hover:bg-primary/90 disabled:opacity-40">
          <Save className="w-4 h-4" /> Enregistrer
        </button>
        <button onClick={onCancel} className="text-white/40 hover:text-white text-sm px-3">Annuler</button>
      </div>
    </div>
  );
}

function ShipmentRow({
  shipment,
  api,
  onDeleted,
  onUpdated,
}: {
  shipment: Shipment;
  api: ReturnType<typeof useAdminApi>;
  onDeleted: () => void;
  onUpdated: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [addingEvent, setAddingEvent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const loadEvents = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const data = await api.get(`/tracking/${shipment.trackingCode}`);
      if (data.events) setEvents(data.events);
    } finally {
      setLoadingEvents(false);
    }
  }, [shipment.trackingCode]);

  useEffect(() => { if (expanded) loadEvents(); }, [expanded]);

  const handleDelete = async () => {
    if (!confirm(`Supprimer l'envoi ${shipment.trackingCode} ?`)) return;
    setLoading(true);
    await api.del(`/admin/shipments/${shipment.id}`);
    onDeleted();
  };

  const handleUpdate = async (data: any) => {
    setLoading(true);
    await api.put(`/admin/shipments/${shipment.id}`, data);
    setEditing(false);
    setLoading(false);
    onUpdated();
    showToast("Envoi mis à jour");
  };

  const handleAddEvent = async (data: any) => {
    setLoading(true);
    await api.post("/admin/events", data);
    setAddingEvent(false);
    setLoading(false);
    onUpdated();
    await loadEvents();
    showToast("Événement ajouté");
  };

  const handleDeleteEvent = async (eventId: number) => {
    if (!confirm("Supprimer cet événement ?")) return;
    await api.del(`/admin/events/${eventId}`);
    await loadEvents();
    showToast("Événement supprimé");
  };

  const handleUpdateEvent = async (eventId: number, data: any) => {
    setLoading(true);
    await api.put(`/admin/events/${eventId}`, data);
    setLoading(false);
    setEditingEventId(null);
    onUpdated();
    await loadEvents();
    showToast("Événement modifié");
  };

  const [editingEventId, setEditingEventId] = useState<number | null>(null);

  const TypeIcon = shipment.type === "mineral" ? Boxes : Package;

  return (
    <div className="border border-white/10 bg-white/3">
      {toast && (
        <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border-b border-green-500/20 text-green-400 text-xs">
          <CheckCircle className="w-3 h-3" /> {toast}
        </div>
      )}
      <div className="flex items-center gap-4 p-4">
        <TypeIcon className="w-5 h-5 text-primary flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono font-bold text-white tracking-wider">{shipment.trackingCode}</span>
            <span className={`text-xs px-2 py-0.5 border font-medium ${STATUS_COLORS[shipment.status]}`}>
              {STATUS_LABELS[shipment.status]}
            </span>
            <span className="text-xs text-white/30">
              {shipment.type === "mineral" ? "Expédition minière" : "Colis collaborateur"}
            </span>
          </div>
          <p className="text-xs text-white/40 mt-0.5">
            {shipment.senderCity}, {shipment.senderCountry} → {shipment.recipientCity}, {shipment.recipientCountry}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setEditing(!editing)} className="p-2 text-white/40 hover:text-primary transition-colors"><Edit3 className="w-4 h-4" /></button>
          <button onClick={handleDelete} disabled={loading} className="p-2 text-white/40 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
          <button onClick={() => setExpanded(!expanded)} className="p-2 text-white/40 hover:text-white transition-colors">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {editing && (
        <div className="px-4 pb-4">
          <ShipmentForm
            initial={{ ...EMPTY_SHIPMENT, ...shipment }}
            onSave={handleUpdate}
            onCancel={() => setEditing(false)}
            loading={loading}
          />
        </div>
      )}

      {expanded && (
        <div className="border-t border-white/10 px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-white/40 uppercase tracking-widest">Historique ({events.length} événements)</p>
            <div className="flex gap-2">
              <button onClick={loadEvents} className="flex items-center gap-1 text-white/40 hover:text-white text-xs">
                <RefreshCw className="w-3 h-3" />
              </button>
              <button onClick={() => setAddingEvent(!addingEvent)} className="flex items-center gap-1 text-primary text-xs hover:text-primary/80">
                <Plus className="w-3 h-3" /> Ajouter
              </button>
            </div>
          </div>

          {addingEvent && (
            <EventForm
              shipmentId={shipment.id}
              onSave={handleAddEvent}
              onCancel={() => setAddingEvent(false)}
              loading={loading}
            />
          )}

          {loadingEvents ? (
            <p className="text-xs text-white/30 py-2">Chargement…</p>
          ) : events.length === 0 ? (
            <p className="text-xs text-white/30 py-2">Aucun événement.</p>
          ) : (
            <div className="space-y-2 mt-3">
              {[...events].reverse().map((ev) => (
                <div key={ev.id} className="bg-black/20 border border-white/5">
                  {editingEventId === ev.id ? (
                    <EventEditForm
                      event={ev}
                      onSave={(data) => handleUpdateEvent(ev.id, data)}
                      onCancel={() => setEditingEventId(null)}
                      loading={loading}
                    />
                  ) : (
                    <div className="flex items-start justify-between gap-3 p-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 border font-medium ${STATUS_COLORS[ev.status as ShipmentStatus]}`}>
                            {STATUS_LABELS[ev.status as ShipmentStatus]}
                          </span>
                          <span className="text-xs text-white/30">{new Date(ev.timestamp).toLocaleString("fr-FR")}</span>
                        </div>
                        <p className="text-sm text-white/80 mt-1">{ev.description}</p>
                        <p className="text-xs text-white/30">{ev.location}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => setEditingEventId(ev.id)} className="p-1 text-white/20 hover:text-primary transition-colors">
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button onClick={() => handleDeleteEvent(ev.id)} className="p-1 text-white/20 hover:text-red-400 transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AdminDashboard({ token, onLogout }: { token: string; onLogout: () => void }) {
  const api = useAdminApi(token);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | ShipmentType>("all");

  const loadShipments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get("/admin/shipments");
      if (data.shipments) setShipments(data.shipments);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadShipments(); }, []);

  const handleCreate = async (data: typeof EMPTY_SHIPMENT) => {
    setCreating(true);
    setError(null);
    try {
      const res = await api.post("/admin/shipments", data);
      if (res.error) { setError(res.error); }
      else { setShowForm(false); await loadShipments(); }
    } finally {
      setCreating(false);
    }
  };

  const filtered = shipments.filter((s) => filter === "all" || s.type === filter);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="border-b border-white/10 bg-black/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <img src="/logo.svg" alt="" className="w-5 h-5" />
              <span className="font-bold tracking-widest text-white">SOMIREN</span>
              <span className="text-white/30 text-sm">/ Admin</span>
            </div>
            <p className="text-xs text-primary tracking-widest mt-0.5">SOMIREN Logistics — Gestion des envois</p>
          </div>
          <button onClick={onLogout} className="flex items-center gap-2 text-white/40 hover:text-white text-sm transition-colors">
            <LogOut className="w-4 h-4" /> Déconnexion
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total envois", val: shipments.length, color: "text-white" },
            { label: "En transit", val: shipments.filter((s) => s.status === "in_transit").length, color: "text-yellow-400" },
            { label: "Livrés", val: shipments.filter((s) => s.status === "delivered").length, color: "text-green-400" },
            { label: "Exceptions", val: shipments.filter((s) => s.status === "exception").length, color: "text-red-400" },
          ].map((stat) => (
            <div key={stat.label} className="border border-white/10 bg-white/5 p-4">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.val}</p>
              <p className="text-xs text-white/40 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex gap-2">
            {(["all", "parcel", "mineral"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-4 py-1.5 text-xs uppercase tracking-wider border transition-colors ${
                  filter === f ? "bg-primary text-black border-primary" : "border-white/20 text-white/60 hover:border-primary/60"
                }`}>
                {f === "all" ? "Tous" : f === "parcel" ? "Colis" : "Minéraux"}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={loadShipments} className="flex items-center gap-2 border border-white/20 text-white/60 px-4 py-2 text-sm hover:border-white/40">
              <RefreshCw className="w-4 h-4" /> Actualiser
            </button>
            <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-primary text-black px-5 py-2 text-sm font-bold uppercase tracking-wider hover:bg-primary/90">
              <Plus className="w-4 h-4" /> Nouvel envoi
            </button>
          </div>
        </div>

        {showForm && (
          <div className="mb-6">
            {error && (
              <div className="flex items-center gap-2 p-3 mb-3 border border-red-500/30 bg-red-500/10 text-red-400 text-sm">
                <AlertTriangle className="w-4 h-4" /> {error}
              </div>
            )}
            <ShipmentForm initial={EMPTY_SHIPMENT} onSave={handleCreate} onCancel={() => { setShowForm(false); setError(null); }} loading={creating} />
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 text-white/30">Chargement…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 border border-white/10">
            <Package className="w-10 h-10 text-white/20 mx-auto mb-3" />
            <p className="text-white/40">Aucun envoi. Créez votre premier envoi ci-dessus.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((s) => (
              <ShipmentRow key={s.id} shipment={s} api={api} onDeleted={loadShipments} onUpdated={loadShipments} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LoginScreen({ onLogin }: { onLogin: (token: string) => void }) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${getApiBase()}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.token) onLogin(data.token);
      else setError(data.error ?? "Identifiants incorrects.");
    } catch {
      setError("Connexion impossible.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/logo.svg" alt="Somiren" className="w-10 h-10 mx-auto mb-4" />
          <h1 className="text-2xl font-bold tracking-widest text-white">SOMIREN</h1>
          <p className="text-xs text-primary tracking-widest mt-1">ESPACE ADMINISTRATEUR</p>
        </div>
        <form onSubmit={handleSubmit} className="border border-white/10 bg-white/5 p-8 space-y-6">
          <div>
            <label className="block text-xs text-white/40 uppercase tracking-widest mb-2">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
              placeholder="••••••••••••"
              disabled={loading}
              autoFocus
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4" /> {error}
            </div>
          )}
          <button type="submit" disabled={loading || !password} className="w-full flex items-center justify-center gap-2 bg-primary text-black py-3 font-bold uppercase tracking-wider hover:bg-primary/90 disabled:opacity-40">
            <Lock className="w-4 h-4" />
            {loading ? "Connexion…" : "Accéder"}
          </button>
        </form>
        <p className="text-center text-xs text-white/20 mt-4">Accès réservé aux administrateurs SOMIREN</p>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem("somiren:admin_token"));

  const handleLogin = (t: string) => {
    sessionStorage.setItem("somiren:admin_token", t);
    setToken(t);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("somiren:admin_token");
    setToken(null);
  };

  if (!token) return <LoginScreen onLogin={handleLogin} />;
  return <AdminDashboard token={token} onLogout={handleLogout} />;
}
