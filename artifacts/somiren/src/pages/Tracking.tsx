import { useState } from "react";
import { Search, Package, Truck, CheckCircle, Clock, AlertTriangle, MapPin, Weight, Calendar, FileText, Phone, ChevronRight, ArrowLeft, Boxes } from "lucide-react";
import { Link } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getApiBase } from "@/lib/api";
import { useLang } from "@/contexts/LanguageContext";

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

const STATUS_ICONS: Record<ShipmentStatus, any> = {
  pending:          Clock,
  collected:        Package,
  in_transit:       Truck,
  customs:          FileText,
  out_for_delivery: Truck,
  delivered:        CheckCircle,
  exception:        AlertTriangle,
};

const STATUS_COLORS: Record<ShipmentStatus, { color: string; bg: string }> = {
  pending:          { color: "text-gray-400",   bg: "bg-gray-400" },
  collected:        { color: "text-blue-400",   bg: "bg-blue-400" },
  in_transit:       { color: "text-yellow-400", bg: "bg-yellow-400" },
  customs:          { color: "text-orange-400", bg: "bg-orange-400" },
  out_for_delivery: { color: "text-primary",    bg: "bg-primary" },
  delivered:        { color: "text-green-400",  bg: "bg-green-400" },
  exception:        { color: "text-red-400",    bg: "bg-red-400" },
};

function formatDate(iso: string, lang: string) {
  return new Date(iso).toLocaleString(lang === "en" ? "en-GB" : "fr-FR", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatDateShort(iso: string, lang: string) {
  return new Date(iso).toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

const STEPS: ShipmentStatus[] = ["pending", "collected", "in_transit", "customs", "out_for_delivery", "delivered"];

function ProgressBar({ current, statuses, exceptionMsg }: {
  current: ShipmentStatus;
  statuses: Record<string, string>;
  exceptionMsg: string;
}) {
  if (current === "exception") {
    return (
      <div className="flex items-center gap-2 text-red-400 text-sm font-semibold mb-6">
        <AlertTriangle className="w-4 h-4" />
        {exceptionMsg}
      </div>
    );
  }
  const currentIdx = STEPS.indexOf(current);
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        {STEPS.map((step, i) => {
          const Icon = STATUS_ICONS[step];
          const colors = STATUS_COLORS[step];
          const done = i <= currentIdx;
          return (
            <div key={step} className="flex flex-col items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                done ? `${colors.bg} border-transparent` : "border-white/20 bg-transparent"
              }`}>
                <Icon className={`w-4 h-4 ${done ? "text-black" : "text-white/30"}`} />
              </div>
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
            {statuses[step]}
          </span>
        ))}
      </div>
    </div>
  );
}

function TrackingResult({ shipment, events }: { shipment: Shipment; events: TrackingEvent[] }) {
  const { t, lang } = useLang();
  const tr = t.tracking;
  const colors = STATUS_COLORS[shipment.status];
  const StatusIcon = STATUS_ICONS[shipment.status];
  const TypeIcon = shipment.type === "mineral" ? Boxes : Package;
  const typeLabel = shipment.type === "mineral" ? tr.typeMineral : tr.typeParcel;
  const statusLabel = tr.statuses[shipment.status];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header card */}
      <div className="border border-white/10 bg-white/5 backdrop-blur-sm p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TypeIcon className="w-4 h-4 text-primary" />
              <span className="text-xs text-primary uppercase tracking-widest font-semibold">{typeLabel}</span>
            </div>
            <h2 className="text-2xl font-bold tracking-widest text-white">{shipment.trackingCode}</h2>
            {shipment.referenceNumber && (
              <p className="text-sm text-white/40 mt-1">{tr.refInternal} {shipment.referenceNumber}</p>
            )}
            <p className="text-xs text-white/30 mt-1">{tr.registeredOn} {formatDateShort(shipment.createdAt, lang)}</p>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 border ${colors.color} border-current bg-current/10 self-start`}>
            <StatusIcon className={`w-4 h-4 ${colors.color}`} />
            <span className={`text-sm font-bold tracking-wide ${colors.color}`}>{statusLabel}</span>
          </div>
        </div>

        <ProgressBar current={shipment.status} statuses={tr.statuses} exceptionMsg={tr.exceptionMsg} />

        {/* Route */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-black/30 p-4 border border-white/5">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white/40 uppercase tracking-widest mb-1">{tr.sender}</p>
            <p className="font-semibold text-white truncate">{shipment.senderName}</p>
            <p className="text-sm text-white/60 truncate">{shipment.senderCity}, {shipment.senderCountry}</p>
          </div>
          <div className="flex sm:flex-col items-center gap-2 sm:gap-1 sm:px-4 self-center">
            <div className="flex-1 sm:flex-none sm:w-16 h-px bg-primary/60" />
            <ChevronRight className="w-4 h-4 text-primary rotate-90 sm:rotate-0 flex-shrink-0" />
            <div className="flex-1 sm:flex-none sm:w-16 h-px bg-primary/60" />
          </div>
          <div className="flex-1 min-w-0 sm:text-right">
            <p className="text-xs text-white/40 uppercase tracking-widest mb-1">{tr.recipient}</p>
            <p className="font-semibold text-white truncate">{shipment.recipientName}</p>
            <p className="text-sm text-white/60 truncate">{shipment.recipientCity}, {shipment.recipientCountry}</p>
          </div>
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-white/10 bg-white/5 p-5">
          <h3 className="text-xs uppercase tracking-widest text-primary mb-4 font-semibold">{tr.detailsTitle}</h3>
          <dl className="space-y-3">
            <div className="flex items-start gap-3">
              <FileText className="w-4 h-4 text-white/40 mt-0.5 flex-shrink-0" />
              <div>
                <dt className="text-xs text-white/40">{tr.descLabel}</dt>
                <dd className="text-sm text-white">{shipment.description}</dd>
              </div>
            </div>
            {shipment.weight && (
              <div className="flex items-start gap-3">
                <Weight className="w-4 h-4 text-white/40 mt-0.5 flex-shrink-0" />
                <div>
                  <dt className="text-xs text-white/40">{tr.weightLabel}</dt>
                  <dd className="text-sm text-white">{shipment.weight}</dd>
                </div>
              </div>
            )}
            {shipment.dimensions && (
              <div className="flex items-start gap-3">
                <Package className="w-4 h-4 text-white/40 mt-0.5 flex-shrink-0" />
                <div>
                  <dt className="text-xs text-white/40">{tr.dimensionsLabel}</dt>
                  <dd className="text-sm text-white">{shipment.dimensions}</dd>
                </div>
              </div>
            )}
            {shipment.estimatedDelivery && (
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-white/40 mt-0.5 flex-shrink-0" />
                <div>
                  <dt className="text-xs text-white/40">{tr.deliveryLabel}</dt>
                  <dd className="text-sm text-white font-semibold">{shipment.estimatedDelivery}</dd>
                </div>
              </div>
            )}
          </dl>
        </div>

        <div className="border border-white/10 bg-white/5 p-5">
          <h3 className="text-xs uppercase tracking-widest text-primary mb-4 font-semibold">{tr.supportTitle}</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Package className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{tr.supportName}</p>
                <p className="text-xs text-white/50">{tr.supportSub}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm text-white/60">
              <Phone className="w-4 h-4 text-primary flex-shrink-0" />
              <span>{tr.supportEmail}</span>
            </div>
            <div className="mt-4 p-3 bg-primary/5 border border-primary/20 text-xs text-white/50 leading-relaxed">
              {tr.supportNote}
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="border border-white/10 bg-white/5 p-6">
        <h3 className="text-xs uppercase tracking-widest text-primary mb-6 font-semibold">{tr.historyTitle}</h3>
        <div className="space-y-0">
          {[...events].reverse().map((event, i) => {
            const evColors = STATUS_COLORS[event.status];
            const EvIcon = STATUS_ICONS[event.status];
            const isLast = i === events.length - 1;
            return (
              <div key={event.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    i === 0 ? evColors.bg : "bg-white/10"
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
                      {formatDate(event.timestamp, lang)}
                    </time>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3 text-primary/60" />
                    <span className="text-xs text-white/40">{event.location}</span>
                  </div>
                  <span className={`inline-block mt-1 text-xs px-2 py-0.5 ${evColors.color} bg-current/10 font-medium`}>
                    {tr.statuses[event.status]}
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
  const { t } = useLang();
  const tr = t.tracking;

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
      const res = await fetch(`${getApiBase()}/tracking/${encodeURIComponent(trimmed)}`);
      if (res.status === 404) {
        setError(tr.errorNotFound);
      } else if (!res.ok) {
        setError(tr.errorGeneral);
      } else {
        const data = await res.json();
        setResult(data);
      }
    } catch {
      setError(tr.errorNetwork);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <Header />
      <div className="pt-28 pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-3 mb-8">
            <Link href="/" className="flex items-center gap-1 text-white/40 hover:text-primary transition-colors text-sm">
              <ArrowLeft className="w-4 h-4" />
              {tr.breadcrumbBack}
            </Link>
            <span className="text-white/20">/</span>
            <span className="text-sm text-white/60">{tr.breadcrumbCurrent}</span>
          </div>

          <div className="mb-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-1 h-8 bg-primary" />
              <div>
                <p className="text-xs text-primary uppercase tracking-widest font-semibold">{tr.eyebrow}</p>
                <h1 className="text-3xl md:text-4xl font-bold tracking-wider text-white">{tr.title}</h1>
              </div>
            </div>
            <p className="text-white/50 text-sm ml-4">{tr.subtitle}</p>
          </div>

          {/* Search form */}
          <form onSubmit={handleSearch} className="mb-10">
            <div className="flex gap-0 border border-white/20 focus-within:border-primary/60 transition-colors">
              <div className="flex items-center pl-3 pr-2 flex-shrink-0">
                <Search className="w-5 h-5 text-white/40" />
              </div>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder={tr.placeholder}
                className="flex-1 min-w-0 bg-transparent py-4 text-white placeholder-white/20 outline-none text-base font-mono"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !code.trim()}
                className="bg-primary text-black px-4 sm:px-8 py-4 font-bold uppercase tracking-widest text-sm hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
              >
                {loading ? tr.searching : tr.searchBtn}
              </button>
            </div>
            <p className="text-xs text-white/30 mt-2 ml-1">{tr.hint}</p>
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
                  <h3 className="font-semibold text-white mb-1">{tr.cardParcel.title}</h3>
                  <p className="text-xs text-white/50">{tr.cardParcel.desc}</p>
                </div>
              </div>
              <div className="border border-white/10 p-5 flex gap-4 items-start">
                <Boxes className="w-8 h-8 text-primary flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-white mb-1">{tr.cardMineral.title}</h3>
                  <p className="text-xs text-white/50">{tr.cardMineral.desc}</p>
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
