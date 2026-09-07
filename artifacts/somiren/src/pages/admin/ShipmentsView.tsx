import { useState, useEffect, useCallback } from "react";
import { Package, Boxes, Plus, Save, X, Edit3, Trash2, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { C, SectionCard, PrimaryBtn, GhostBtn, Pill, Field, Input, Select, Feedback } from "./shared";
import { useAdminApi } from "./api";

type ShipmentStatus = "pending" | "collected" | "in_transit" | "customs" | "out_for_delivery" | "delivered" | "exception";
type ShipmentType = "parcel" | "mineral";

const STATUS_LABELS: Record<ShipmentStatus, string> = {
  pending: "En attente", collected: "Collecté", in_transit: "En transit", customs: "En douane", out_for_delivery: "En cours de livraison", delivered: "Livré", exception: "Exception",
};

const STATUS_COLORS: Record<ShipmentStatus, string> = {
  pending: "neutral", collected: "info", in_transit: "moyenne", customs: "haute", out_for_delivery: "moyenne", delivered: "actif", exception: "suspendu",
};

const EMPTY_SHIPMENT = {
  trackingCode: "", type: "parcel" as ShipmentType, status: "pending" as ShipmentStatus, senderName: "SOMIREN S.A.", senderCity: "Niamey", senderCountry: "Niger", recipientName: "", recipientCity: "", recipientCountry: "", description: "", weight: "", dimensions: "", estimatedDelivery: "", referenceNumber: "", notes: "",
};

function ShipmentForm({ initial, onSave, onCancel, loading }: any) {
  const [form, setForm] = useState(initial);
  const set = (k: string, v: string) => setForm((f: any) => ({ ...f, [k]: v }));
  
  const submit = () => {
    // Only send non-empty string fields that the backend expects, plus basic ones
    const payload: any = {};
    Object.keys(form).forEach(k => {
      if (form[k] !== "" && form[k] !== null && form[k] !== undefined) payload[k] = form[k];
    });
    // Convert estimatedDelivery to Date if present
    if (payload.estimatedDelivery) payload.estimatedDelivery = new Date(payload.estimatedDelivery).toISOString();
    
    onSave(payload);
  };
  
  return (
    <div className="p-5 bg-gray-50 space-y-4" style={{ borderBottom: `1px solid ${C.line}` }}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Code de suivi *"><Input value={form.trackingCode} onChange={(e: any) => set("trackingCode", e.target.value.toUpperCase())} placeholder="SMR-2026-000001" /></Field>
        <Field label="Type *"><Select value={form.type} onChange={(e: any) => set("type", e.target.value)}>
          <option value="parcel">Colis collaborateur</option><option value="mineral">Expédition minière</option>
        </Select></Field>
        <Field label="Statut initial *"><Select value={form.status} onChange={(e: any) => set("status", e.target.value)}>
          {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select></Field>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Nom expéditeur *"><Input value={form.senderName} onChange={(e: any) => set("senderName", e.target.value)} /></Field>
        <Field label="Ville expéditeur *"><Input value={form.senderCity} onChange={(e: any) => set("senderCity", e.target.value)} /></Field>
        <Field label="Pays expéditeur *"><Input value={form.senderCountry} onChange={(e: any) => set("senderCountry", e.target.value)} /></Field>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Nom destinataire *"><Input value={form.recipientName} onChange={(e: any) => set("recipientName", e.target.value)} /></Field>
        <Field label="Ville destinataire *"><Input value={form.recipientCity} onChange={(e: any) => set("recipientCity", e.target.value)} /></Field>
        <Field label="Pays destinataire *"><Input value={form.recipientCountry} onChange={(e: any) => set("recipientCountry", e.target.value)} /></Field>
      </div>
      <Field label="Description *"><Input value={form.description} onChange={(e: any) => set("description", e.target.value)} placeholder="Ex: Matériel informatique..." /></Field>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Field label="Poids"><Input value={form.weight || ""} onChange={(e: any) => set("weight", e.target.value)} placeholder="Ex: 12 kg" /></Field>
        <Field label="Dimensions"><Input value={form.dimensions || ""} onChange={(e: any) => set("dimensions", e.target.value)} placeholder="Ex: 40×30×20 cm" /></Field>
        <Field label="Livraison estimée"><Input type="date" value={form.estimatedDelivery?.split("T")[0] || ""} onChange={(e: any) => set("estimatedDelivery", e.target.value)} /></Field>
        <Field label="Réf. interne"><Input value={form.referenceNumber || ""} onChange={(e: any) => set("referenceNumber", e.target.value)} /></Field>
      </div>
      <Field label="Notes internes"><Input value={form.notes || ""} onChange={(e: any) => set("notes", e.target.value)} /></Field>
      <div className="flex gap-3 pt-2">
        <PrimaryBtn icon={Save} onClick={submit} disabled={loading}>Enregistrer</PrimaryBtn>
        <GhostBtn icon={X} onClick={onCancel}>Annuler</GhostBtn>
      </div>
    </div>
  );
}

function EventForm({ shipmentId, onSave, onCancel, loading, initial }: any) {
  const [form, setForm] = useState(initial || { status: "in_transit", location: "", description: "", timestamp: new Date().toISOString().slice(0, 16) });
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  
  const submit = () => {
    const payload: any = { ...form };
    if (!initial) payload.shipmentId = shipmentId;
    payload.timestamp = new Date(payload.timestamp).toISOString();
    onSave(payload);
  };
  
  return (
    <div className="p-3 mt-3 bg-gray-50 rounded-md border" style={{ borderColor: C.line }}>
      <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: C.ink }}>{initial ? "Modifier l'événement" : "Ajouter un événement"}</p>
      <div className="grid grid-cols-1 gap-3">
        <Field label="Statut *"><Select value={form.status} onChange={(e: any) => set("status", e.target.value)}>
          {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select></Field>
        <Field label="Date & Heure *"><Input type="datetime-local" value={form.timestamp} onChange={(e: any) => set("timestamp", e.target.value)} /></Field>
        <Field label="Localisation *"><Input value={form.location} onChange={(e: any) => set("location", e.target.value)} /></Field>
        <Field label="Description *"><Input value={form.description} onChange={(e: any) => set("description", e.target.value)} /></Field>
      </div>
      <div className="flex gap-3 mt-4">
        <PrimaryBtn icon={Save} onClick={submit} disabled={loading}>{initial ? "Enregistrer" : "Ajouter"}</PrimaryBtn>
        <GhostBtn onClick={onCancel}>Annuler</GhostBtn>
      </div>
    </div>
  );
}

function ShipmentRow({ shipment, api, onDeleted, onUpdated, onError }: any) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [addingEvent, setAddingEvent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);

  const loadEvents = useCallback(async () => {
    try {
      const data = await api.get(`/tracking/${shipment.trackingCode}`);
      if (data && data.events) setEvents(data.events);
    } catch (e: any) {
      onError(e.error || "Erreur de chargement de l'historique");
    }
  }, [shipment.trackingCode, api, onError]);

  useEffect(() => { if (expanded) loadEvents(); }, [expanded, loadEvents]);

  const handleDelete = async () => {
    if (!confirm(`Supprimer l'envoi ${shipment.trackingCode} ?`)) return;
    setLoading(true);
    try {
      await api.del(`/admin/shipments/${shipment.id}`);
      onDeleted();
    } catch (e: any) {
      onError(e.error || "Erreur suppression");
      setLoading(false);
    }
  };

  const handleUpdate = async (data: any) => {
    setLoading(true);
    try {
      await api.put(`/admin/shipments/${shipment.id}`, data);
      setEditing(false); onUpdated();
    } catch (e: any) {
      onError(e.error || "Erreur mise à jour");
    } finally {
      setLoading(false);
    }
  };

  const handleEventAction = async (action: () => Promise<any>) => {
    setLoading(true);
    try {
      await action();
      onUpdated(); 
      loadEvents();
      setAddingEvent(false);
      setEditingEventId(null);
    } catch (e: any) {
      onError(e.error || "Erreur action événement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-md mb-3" style={{ border: `1px solid ${C.line}` }}>
      <div className="flex items-center gap-4 p-4">
        {shipment.type === "mineral" ? <Boxes className="w-5 h-5 shrink-0" style={{ color: C.inkSoft }} /> : <Package className="w-5 h-5 shrink-0" style={{ color: C.inkSoft }} />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap mb-1">
            <span className="font-mono font-bold tracking-wider" style={{ color: C.ink }}>{shipment.trackingCode}</span>
            <Pill tone={STATUS_COLORS[shipment.status as ShipmentStatus]}>{STATUS_LABELS[shipment.status as ShipmentStatus]}</Pill>
            <span className="text-xs" style={{ color: C.inkSoft }}>{shipment.type === "mineral" ? "Expédition minière" : "Colis collaborateur"}</span>
          </div>
          <p className="text-[12.5px]" style={{ color: C.inkFaint }}>{shipment.senderCity}, {shipment.senderCountry} → {shipment.recipientCity}, {shipment.recipientCountry}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setEditing(!editing)} className="p-2 transition-colors hover:bg-gray-100 rounded-md" style={{ color: C.inkSoft }}><Edit3 className="w-4 h-4" /></button>
          <button onClick={handleDelete} disabled={loading} className="p-2 transition-colors hover:bg-red-50 hover:text-red-600 rounded-md disabled:opacity-50" style={{ color: C.inkSoft }}><Trash2 className="w-4 h-4" /></button>
          <button onClick={() => setExpanded(!expanded)} className="p-2 transition-colors hover:bg-gray-100 rounded-md" style={{ color: C.inkSoft }}>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>
      
      {editing && <ShipmentForm initial={{ ...EMPTY_SHIPMENT, ...shipment }} onSave={handleUpdate} onCancel={() => setEditing(false)} loading={loading} />}
      
      {expanded && (
        <div className="border-t px-4 py-4" style={{ borderColor: C.line }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: C.inkSoft }}>Historique ({events.length})</p>
            <div className="flex gap-2">
              <GhostBtn icon={RefreshCw} onClick={loadEvents}>Actualiser</GhostBtn>
              <PrimaryBtn icon={Plus} onClick={() => setAddingEvent(!addingEvent)}>Ajouter</PrimaryBtn>
            </div>
          </div>
          {addingEvent && <EventForm shipmentId={shipment.id} onSave={(d:any) => handleEventAction(() => api.post("/admin/events", d))} onCancel={() => setAddingEvent(false)} loading={loading} />}
          <div className="space-y-2 mt-3">
            {[...events].reverse().map(ev => (
              <div key={ev.id} className="bg-white p-3 rounded-md border" style={{ borderColor: C.line }}>
                {editingEventId === ev.id ? (
                  <EventForm initial={{ ...ev, timestamp: new Date(ev.timestamp).toISOString().slice(0, 16) }} onSave={(d:any) => handleEventAction(() => api.put(`/admin/events/${ev.id}`, d))} onCancel={() => setEditingEventId(null)} loading={loading} />
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Pill tone={STATUS_COLORS[ev.status as ShipmentStatus]}>{STATUS_LABELS[ev.status as ShipmentStatus]}</Pill>
                        <span className="text-[11.5px]" style={{ color: C.inkSoft }}>{new Date(ev.timestamp).toLocaleString("fr-FR")}</span>
                      </div>
                      <p className="text-[13px] font-medium mt-1" style={{ color: C.ink }}>{ev.description}</p>
                      <p className="text-[12px]" style={{ color: C.inkSoft }}>{ev.location}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => setEditingEventId(ev.id)} className="p-1.5 hover:bg-gray-100 rounded-md transition-colors" style={{ color: C.inkSoft }}><Edit3 className="w-3 h-3" /></button>
                      <button onClick={() => handleEventAction(() => api.del(`/admin/events/${ev.id}`))} className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded-md transition-colors disabled:opacity-50" style={{ color: C.inkSoft }} disabled={loading}><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ShipmentsView() {
  const api = useAdminApi();
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<"all" | ShipmentType>("all");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get("/admin/shipments").then(r => setShipments(r.shipments || [])).catch(err => setError(err.error || "Erreur de chargement")).finally(()=>setLoading(false));
  }, [api]);
  
  useEffect(() => { load(); }, [load]);

  const handleCreate = async (d: any) => {
    setError(null); setSuccess(null);
    setLoading(true);
    try { 
      await api.post("/admin/shipments", d); 
      setSuccess("Envoi créé avec succès.");
      setShowForm(false); 
      load(); 
    } catch (err: any) { 
      setError(err.error || "Erreur de création"); 
      setLoading(false); 
    }
  };

  const handleUpdated = () => {
    setSuccess("Mise à jour réussie.");
    load();
  };

  const filtered = shipments.filter(s => filter === "all" || s.type === filter);

  return (
    <div className="space-y-4">
      <Feedback error={error} success={success} />
      <SectionCard title="Suivi des envois" action={
        <div className="flex gap-2">
          <GhostBtn icon={RefreshCw} onClick={load}>Actualiser</GhostBtn>
          <PrimaryBtn icon={Plus} onClick={() => setShowForm(!showForm)}>Nouvel envoi</PrimaryBtn>
        </div>
      }>
        <div className="flex gap-2 mb-4 pb-4 border-b" style={{ borderColor: C.line }}>
          {(["all", "parcel", "mineral"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className="px-3 py-1.5 text-[12.5px] font-medium rounded-md transition-colors" style={filter === f ? { background: C.navy, color: "white" } : { background: C.bg, color: C.inkSoft }}>
              {f === "all" ? "Tous" : f === "parcel" ? "Colis collaborateurs" : "Expéditions minières"}
            </button>
          ))}
        </div>
        {showForm && (
          <div className="mb-4 rounded-md overflow-hidden border" style={{ borderColor: C.line }}>
            <ShipmentForm initial={EMPTY_SHIPMENT} onSave={handleCreate} onCancel={() => setShowForm(false)} loading={loading} />
          </div>
        )}
        {loading && !showForm ? <p className="text-sm" style={{ color: C.inkSoft }}>Chargement...</p> : filtered.length === 0 ? <p className="text-sm" style={{ color: C.inkSoft }}>Aucun envoi trouvé.</p> : (
          <div>{filtered.map(s => <ShipmentRow key={s.id} shipment={s} api={api} onDeleted={() => { setSuccess("Envoi supprimé."); load(); }} onUpdated={handleUpdated} onError={setError} />)}</div>
        )}
      </SectionCard>
    </div>
  );
}
