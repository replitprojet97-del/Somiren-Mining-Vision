import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import StatsBar from "@/components/StatsBar";
import About from "@/components/About";
import Activities from "@/components/Activities";
import Sites from "@/components/Sites";
import Investors from "@/components/Investors";
import Partners from "@/components/Partners";
import Team from "@/components/Team";
import Footer from "@/components/Footer";
import { useEffect, useState } from "react";

export default function Home() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <div className="text-primary font-bold tracking-widest">SOMIREN S.A.</div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-background text-foreground flex flex-col"
    >
      <Helmet>
        <title>Somiren S.A. — Excellence minière au cœur du Niger</title>
        <meta name="description" content="Somiren S.A., entreprise minière responsable au Niger. Exploitation d'or, uranium, nickel et phosphates. Innovation, performance, engagement durable." />
        <link rel="canonical" href="https://somiren.com/" />
        <meta property="og:url" content="https://somiren.com/" />
        <meta property="og:title" content="Somiren S.A. — Excellence minière au cœur du Niger" />
      </Helmet>
      <Header />
      <main className="flex-1">
        <Hero />
        <StatsBar />
        <About />
        <Activities />
        <Sites />
        <Investors />
        <Partners />
        <Team />
      </main>
      <Footer />
    </motion.div>
  );
}
