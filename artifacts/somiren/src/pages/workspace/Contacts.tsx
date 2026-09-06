import { Users, Mail, Phone, MapPin, Search } from "lucide-react";
import { C } from "@/lib/theme";
import { EmptyState } from "./components/UI";
import { useContacts } from "@/hooks/use-workspace";

export default function Contacts() {
  const { data: contacts, isLoading } = useContacts();

  if (isLoading) return <div className="p-8 flex justify-center">Chargement...</div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-xl font-semibold" style={{ color: C.ink }}>Contacts & Annuaire</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Rechercher un contact..."
              className="pl-9 pr-4 py-2 text-sm rounded-md w-full md:w-64"
              style={{ border: `1px solid ${C.line}`, background: "white" }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {!contacts?.length ? (
          <div className="col-span-full py-12 bg-white rounded-lg" style={{ border: `1px solid ${C.line}` }}>
            <EmptyState icon={Users} text="Aucun contact trouvé." />
          </div>
        ) : (
          contacts.map((c: any) => (
            <div key={c.id} className="bg-white rounded-lg p-5 flex flex-col hover:shadow-md transition-shadow" style={{ border: `1px solid ${C.line}` }}>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600 text-lg shrink-0">
                  {c.fullName.charAt(0)}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-[15px] truncate" style={{ color: C.ink }}>{c.fullName}</h3>
                  <p className="text-sm truncate" style={{ color: C.inkSoft }}>{c.role || c.department || "Collaborateur"}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm mt-auto" style={{ color: C.inkSoft }}>
                {c.email && (
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="shrink-0" />
                    <a href={`mailto:${c.email}`} className="truncate hover:underline" style={{ color: C.copper }}>{c.email}</a>
                  </div>
                )}
                {c.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="shrink-0" />
                    <span className="truncate">{c.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="shrink-0" />
                  <span className="truncate">{c.location || "Siège"}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
