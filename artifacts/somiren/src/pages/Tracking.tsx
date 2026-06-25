import { useState } from "react";
import { Search, Package, Truck, CheckCircle, Clock, AlertTriangle, MapPin, Weight, Calendar, FileText, Phone, ChevronRight, ArrowLeft, Boxes } from "lucide-react";
import { Link } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const API = import.meta.env.BASE_URL.replace(/\/$/, "").replace(/^\//, "/") + "/../api";

type ShipmentStatus = "pending" | "collected" | "in_transit" | "customs" | "out_for_delivery" | "delivered" | "exception";
type ShipmentType = "parcel" | "mineral";

interface TrackingEvent {
  id: number;
  status: ShipmentStatus;
  location: string;
  description: string;
  timestamp: string;
  isCompleted: boolean;
}

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

const STATUS_CONFIG: Record<ShipmentStatus, { label: string; color: string; bg: string; icon: any }> = {
  pending:           { label: "En attente",          color: "text-gray-400",   bg: "bg-gray-400",   icon: Clock },
  collected:         { label: "Collecté",             color: "text-blue-400",   bg: "bg-blue-400",   icon: Package },
  in_transit:        { label: "En transit",           color: "text-yellow-400", bg: "bg-yellow-400", icon: Truck },
  customs:           { label: "En douane",            color: "text-orange-400", bg: "bg-orange-400", icon: FileText },
  out_for_delivery:  { label: "En cours de livraison",color: "text-primary",    bg: "bg-primary",    icon: Truck },
  delivered:         { label: "Livré",                color: "text-green-400",  bg: "bg-green-400",  icon: CheckCircle },
  exception:         { label: "Exception",            color: "text-red-400",    bg: "bg-red-400",    icon: AlertTriangle },
};

const TYPE_CONFIG: Record<ShipmentType, { label: string; icon: any }> = {
  parcel:  { label: "Colis collaborateur", icon: Package },
  mineral: { label: "Expédition minière",  icon: Boxes },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

const STEPS: ShipmentStatus[] = ["pending", "collected", "in_transit", "customs", "out_for_delivery", "delivered"];

function ProgressBar({ current }: { current: ShipmentStatus }) {
  if (current === "exception") {
    return (
      <div className="flex items-center gap-2 text-red-400 text-sm font-semibold mb-6">
        <AlertTriangle className="w-4 h-4" />
        Une exception a été signalée sur cet envoi. Contactez SOMIREN Logistics.
      </div>
    );
  }
  const currentIdx = STEPS.indexOf(current);
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        {STEPS.map((step, i) => {
          const cfg = STATUS_CONFIG[step];
          const Icon = cfg.icon;
          const done = i <= currentIdx;
          return (
            <div key={step} className="flex flex-col items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                done ? `${cfg.bg} border-transparent` : "border-white/20 bg-transparent"
              }`}>
                <Icon className={`w-4 h-4 ${done ? "text-black" : "text-white/30"}`} />
              </div>
              {i < STEPS.length - 1 && (
                <div className={`hidden md:block absolute`} />
              )}
            </div>
          );
        })}
      </div>
      <div className="relative h-1 bg-white/10 rounded mt-1">
        <div
          className="absolute left-0 top-0 h-1 bg-primary rounded transition-all duration-700"
          style={{ width: `${(currentIdx / (STEPS.length - 1)) * 100}%` }}
        />
      </div>
      <div className="flex justify-between mt-2">
        {STEPS.map((step) => (
          <span key={step} className="text-[9px] text-white/40 text-center flex-1 leading-tight hidden md:block">
            {STATUS_CONFIG[step].label}
          </span>
        ))}
      </div>
    </div>
  );
}

function TrackingResult({ shipment, events }: { shipment: Shipment; events: TrackingEvent[] }) {
  const cfg = STATUS_CONFIG[shipment.status];
  const StatusIcon = cfg.icon;
  const typeCfg = TYPE_CONFIG[shipment.type];
  const TypeIcon = typeCfg.icon;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header card */}
      <div className="border border-white/10 bg-white/5 backdrop-blur-sm p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TypeIcon className="w-4 h-4 text-primary" />
              <span className="text-xs text-primary uppercase tracking-widest font-semibold">{typeCfg.label}</span>
            </div>
            <h2 className="text-2xl font-bold tracking-widest text-white">{shipment.trackingCode}</h2>
            {shipment.referenceNumber && (
              <p className="text-sm text-white/40 mt-1">Réf. interne : {shipment.referenceNumber}</p>
            )}
            <p className="text-xs text-white/30 mt-1">Enregistré le {formatDateShort(shipment.createdAt)}</p>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 border ${cfg.color} border-current bg-current/10 self-start`}>
            <StatusIcon className={`w-4 h-4 ${cfg.color}`} />
            <span className={`text-sm font-bold tracking-wide ${cfg.color}`}>{cfg.label}</span>
          </div>
        </div>

        <ProgressBar current={shipment.status} />

        {/* Route */}
        <div className="flex items-center gap-3 bg-black/30 p-4 border border-white/5">
          <div className="flex-1">
            <p className="text-xs text-white/40 uppercase tracking-widest mb-1">Expéditeur</p>
            <p className="font-semibold text-white">{shipment.senderName}</p>
            <p className="text-sm text-white/60">{shipment.senderCity}, {shipment.senderCountry}</p>
          </div>
          <div className="flex flex-col items-center gap-1 px-4">
            <div className="w-16 h-px bg-primary/60" />
            <ChevronRight className="w-4 h-4 text-primary" />
            <div className="w-16 h-px bg-primary/60" />
          </div>
          <div className="flex-1 text-right">
            <p className="text-xs text-white/40 uppercase tracking-widest mb-1">Destinataire</p>
            <p className="font-semibold text-white">{shipment.recipientName}</p>
            <p className="text-sm text-white/60">{shipment.recipientCity}, {shipment.recipientCountry}</p>
          </div>
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-white/10 bg-white/5 p-5">
          <h3 className="text-xs uppercase tracking-widest text-primary mb-4 font-semibold">Détails de l'envoi</h3>
          <dl className="space-y-3">
            <div className="flex items-start gap-3">
              <FileText className="w-4 h-4 text-white/40 mt-0.5 flex-shrink-0" />
              <div>
                <dt className="text-xs text-white/40">Description</dt>
                <dd className="text-sm text-white">{shipment.description}</dd>
              </div>
            </div>
            {shipment.weight && (
              <div className="flex items-start gap-3">
                <Weight className="w-4 h-4 text-white/40 mt-0.5 flex-shrink-0" />
                <div>
                  <dt className="text-xs text-white/40">Poids</dt>
                  <dd className="text-sm text-white">{shipment.weight}</dd>
                </div>
              </div>
            )}
            {shipment.dimensions && (
              <div className="flex items-start gap-3">
                <Package className="w-4 h-4 text-white/40 mt-0.5 flex-shrink-0" />
                <div>
                  <dt className="text-xs text-white/40">Dimensions</dt>
                  <dd className="text-sm text-white">{shipment.dimensions}</dd>
                </div>
              </div>
            )}
            {shipment.estimatedDelivery && (
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-white/40 mt-0.5 flex-shrink-0" />
                <div>
                  <dt className="text-xs text-white/40">Livraison estimée</dt>
                  <dd className="text-sm text-white font-semibold">{shipment.estimatedDelivery}</dd>
                </div>
              </div>
            )}
          </dl>
        </div>

        <div className="border border-white/10 bg-white/5 p-5">
          <h3 className="text-xs uppercase tracking-widest text-primary mb-4 font-semibold">Contact & assistance</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Package className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">SOMIREN Logistics</p>
                <p className="text-xs text-white/50">Partenaire logistique exclusif de SOMIREN S.A.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm text-white/60">
              <Phone className="w-4 h-4 text-primary flex-shrink-0" />
              <span>logistics@somiren.com</span>
            </div>
            <div className="mt-4 p-3 bg-primary/5 border border-primary/20 text-xs text-white/50 leading-relaxed">
              Ce numéro de suivi est un identifiant interne <strong className="text-primary">SOMIREN Logistics</strong>. Il ne peut être vérifié que sur cette plateforme ou auprès de notre service logistique.
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="border border-white/10 bg-white/5 p-6">
        <h3 className="text-xs uppercase tracking-widest text-primary mb-6 font-semibold">Historique des mouvements</h3>
        <div className="space-y-0">
          {[...events].reverse().map((event, i) => {
            const evCfg = STATUS_CONFIG[event.status];
            const EvIcon = evCfg.icon;
            const isLast = i === events.length - 1;
            return (
              <div key={event.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    i === 0 ? `${evCfg.bg}` : "bg-white/10"
                  }`}>
                    <EvIcon className={`w-4 h-4 ${i === 0 ? "text-black" : "text-white/50"}`} />
                  </div>
                  {!isLast && <div className="w-px flex-1 bg-white/10 my-1" />}
                </div>
                <div className={`pb-6 flex-1 ${isLast ? "pb-0" : ""}`}>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1">
                    <p className={`text-sm font-semibold ${i === 0 ? "text-white" : "text-white/60"}`}>
                      {event.description}
                    </p>
                    <time className="text-xs text-white/30 whitespace-nowrap">
                      {formatDate(event.timestamp)}
                    </time>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3 text-primary/60" />
                    <span className="text-xs text-white/40">{event.location}</span>
                  </div>
                  <span className={`inline-block mt-1 text-xs px-2 py-0.5 ${evCfg.color} bg-current/10 font-medium`}>
                    {evCfg.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function TrackingPage() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ shipment: Shipment; events: TrackingEvent[] } | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const apiBase = base ? base.split("/").slice(0, -1).join("/") : "";
      const res = await fetch(`${apiBase}/api/tracking/${encodeURIComponent(trimmed)}`);
      if (res.status === 404) {
        setError("Aucun envoi trouvé pour ce code de suivi. Vérifiez l'orthographe ou contactez SOMIREN Logistics.");
      } else if (!res.ok) {
        setError("Erreur lors de la recherche. Veuillez réessayer.");
      } else {
        const data = await res.json();
        setResult(data);
      }
    } catch {
      setError("Connexion impossible. Veuillez vérifier votre connexion et réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <div className="pt-28 pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Brand bar */}
          <div className="flex items-center gap-3 mb-8">
            <Link href="/" className="flex items-center gap-1 text-white/40 hover:text-primary transition-colors text-sm">
              <ArrowLeft className="w-4 h-4" />
              Retour
            </Link>
            <span className="text-white/20">/</span>
            <span className="text-sm text-white/60">Suivi de colis</span>
          </div>

          <div className="mb-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-1 h-8 bg-primary" />
              <div>
                <p className="text-xs text-primary uppercase tracking-widest font-semibold">SOMIREN Logistics</p>
                <h1 className="text-3xl md:text-4xl font-bold tracking-wider text-white">SUIVI D'ENVOI</h1>
              </div>
            </div>
            <p className="text-white/50 text-sm ml-4">
              Suivez vos colis collaborateurs et expéditions minières en temps réel.
            </p>
          </div>

          {/* Search form */}
          <form onSubmit={handleSearch} className="mb-10">
            <div className="flex gap-0 border border-white/20 focus-within:border-primary/60 transition-colors">
              <div className="flex items-center pl-4 pr-3">
                <Search className="w-5 h-5 text-white/40" />
              </div>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Ex : SMR-2026-847291"
                className="flex-1 bg-transparent py-4 text-white placeholder-white/20 outline-none text-lg tracking-widest font-mono"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !code.trim()}
                className="bg-primary text-black px-8 py-4 font-bold uppercase tracking-widest text-sm hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? "..." : "SUIVRE"}
              </button>
            </div>
            <p className="text-xs text-white/30 mt-2 ml-1">
              Entrez votre numéro de suivi SOMIREN Logistics (format : SMR-AAAA-XXXXXX)
            </p>
          </form>

          {error && (
            <div className="flex items-start gap-3 p-4 border border-red-500/30 bg-red-500/10 mb-8">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {result && <TrackingResult shipment={result.shipment} events={result.events} />}

          {!result && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-60">
              <div className="border border-white/10 p-5 flex gap-4 items-start">
                <Package className="w-8 h-8 text-primary flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-white mb-1">Colis collaborateurs</h3>
                  <p className="text-xs text-white/50">Matériel de travail, équipements, documents envoyés à vos collaborateurs à l'international.</p>
                </div>
              </div>
              <div className="border border-white/10 p-5 flex gap-4 items-start">
                <Boxes className="w-8 h-8 text-primary flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-white mb-1">Expéditions minières</h3>
                  <p className="text-xs text-white/50">Suivi des expéditions de minerais, concentrés et équipements industriels SOMIREN.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
