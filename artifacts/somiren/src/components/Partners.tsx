import { motion } from "framer-motion";
import { useState } from "react";

type Partner = {
  name: string;
  domain: string;
};

const row1: Partner[] = [
  { name: "Samsung", domain: "samsung.com" },
  { name: "Hyundai", domain: "hyundai.com" },
  { name: "POSCO", domain: "posco.com" },
  { name: "Mitsubishi Corp.", domain: "mitsubishicorp.com" },
  { name: "JFE Steel", domain: "jfe-steel.co.jp" },
  { name: "ITOCHU", domain: "itochu.co.jp" },
  { name: "Marubeni", domain: "marubeni.com" },
  { name: "Sumitomo Corp.", domain: "sumitomocorp.com" },
  { name: "Bank of China", domain: "bankofchina.com" },
  { name: "ICBC", domain: "icbc.com.cn" },
  { name: "China Construction Bank", domain: "ccb.com" },
  { name: "KfW", domain: "kfw.de" },
];

const row2: Partner[] = [
  { name: "Standard Bank", domain: "standardbank.com" },
  { name: "ABSA", domain: "absa.co.za" },
  { name: "Nedbank", domain: "nedbank.co.za" },
  { name: "Investec", domain: "investec.com" },
  { name: "FirstRand", domain: "firstrand.co.za" },
  { name: "Rand Merchant Bank", domain: "rmb.co.za" },
  { name: "AMP", domain: "amp.com.au" },
  { name: "Société Générale", domain: "societegenerale.com" },
  { name: "BNP Paribas", domain: "bnpparibas.com" },
  { name: "HSBC", domain: "hsbc.com" },
  { name: "ING", domain: "ing.com" },
  { name: "UniCredit", domain: "unicredit.it" },
  { name: "Crédit Agricole", domain: "credit-agricole.com" },
];

function PartnerCard({ partner }: { partner: Partner }) {
  const [errored, setErrored] = useState(false);
  return (
    <div className="flex items-center justify-center w-40 md:w-52 h-20 md:h-24 mx-3 bg-white rounded-md shadow-sm hover:shadow-md transition-shadow shrink-0 px-4">
      {!errored ? (
        <div className="flex items-center gap-3 w-full justify-center">
          <img
            src={`https://icon.horse/icon/${partner.domain}`}
            alt={partner.name}
            loading="lazy"
            onError={() => setErrored(true)}
            className="w-10 h-10 md:w-12 md:h-12 object-contain rounded-sm"
          />
          <span className="text-sm md:text-[15px] font-semibold text-black/80 truncate">
            {partner.name}
          </span>
        </div>
      ) : (
        <span className="text-sm md:text-base font-bold text-black/80 text-center leading-tight">
          {partner.name}
        </span>
      )}
    </div>
  );
}

export default function Partners() {
  return (
    <section id="partenaires" className="py-20 md:py-24 bg-[#F5F1EA] overflow-hidden border-t border-b border-black/10">
      <div className="container mx-auto px-4 md:px-8 mb-12">
        <div className="text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-block text-3xl md:text-4xl font-bold text-black uppercase tracking-[0.1em]"
          >
            NOS PARTENAIRES
            <div className="h-0.5 w-1/2 bg-primary mx-auto mt-4"></div>
          </motion.h2>
          <p className="text-sm md:text-base text-black/60 mt-4 max-w-2xl mx-auto">
            Un réseau international de leaders industriels et financiers qui accompagnent notre développement.
          </p>
        </div>
      </div>

      <div className="relative w-full flex flex-col gap-6 group">
        {/* Row 1 — scrolls left */}
        <div className="flex overflow-hidden relative">
          <div className="flex animate-scroll-left min-w-max group-hover:[animation-play-state:paused]">
            {[...row1, ...row1].map((partner, i) => (
              <PartnerCard key={`r1-${i}`} partner={partner} />
            ))}
          </div>
        </div>

        {/* Row 2 — scrolls right */}
        <div className="flex overflow-hidden relative">
          <div
            className="flex animate-scroll-right min-w-max group-hover:[animation-play-state:paused]"
            style={{ animationDuration: "55s" }}
          >
            {[...row2, ...row2].map((partner, i) => (
              <PartnerCard key={`r2-${i}`} partner={partner} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
