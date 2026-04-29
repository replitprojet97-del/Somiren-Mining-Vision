import { motion } from "framer-motion";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Hero() {
  return (
    <section id="home" className="relative min-h-[90vh] flex items-center pt-24 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img
          src="/src/assets/hero.png"
          alt="Mining Operations"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent"></div>
      </div>

      <div className="container relative z-10 mx-auto px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="max-w-3xl"
        >
          <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-4 font-serif">
            <span className="block text-white">EXCELLENCE MINIÈRE</span>
            <span className="block text-primary">AU CŒUR DU NIGER</span>
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-10 font-light">
            Innovation. Performance. Engagement durable.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button className="bg-primary text-black hover:bg-primary/90 hover:scale-105 transition-all rounded-none px-8 py-6 text-sm font-bold uppercase tracking-wider gap-2">
              DÉCOUVRIR SOMIREN <ArrowRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" className="border-white/20 text-white hover:bg-primary hover:text-black hover:border-primary transition-all rounded-none px-8 py-6 text-sm font-bold uppercase tracking-wider gap-2">
              NOUS CONTACTER <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
