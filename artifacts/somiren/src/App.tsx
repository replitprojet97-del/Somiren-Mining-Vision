import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import ProjetsPage from "@/pages/Projets";
import ContactPage from "@/pages/Contact";
import TrackingPage from "@/pages/Tracking";
import AdminPage from "@/pages/Admin";
import { useEffect } from "react";
import { useProtection } from "@/hooks/useProtection";

const queryClient = new QueryClient();

function ScrollManager() {
  const [location] = useLocation();

  useEffect(() => {
    const target = sessionStorage.getItem('somiren:scrollTarget');
    if (target && location === '/') {
      sessionStorage.removeItem('somiren:scrollTarget');
      // Wait for the section to be mounted
      let tries = 0;
      const tryScroll = () => {
        const el = document.querySelector(target);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        } else if (tries < 20) {
          tries += 1;
          setTimeout(tryScroll, 50);
        }
      };
      setTimeout(tryScroll, 50);
      return;
    }

    const hash = window.location.hash;
    if (hash) {
      setTimeout(() => {
        const element = document.querySelector(hash);
        if (element) element.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      window.scrollTo(0, 0);
    }
  }, [location]);

  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/projets" component={ProjetsPage} />
      <Route path="/contact" component={ContactPage} />
      <Route path="/tracking" component={TrackingPage} />
      <Route path="/admin" component={AdminPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppInner() {
  useProtection();
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <ScrollManager />
      <Router />
    </WouterRouter>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppInner />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
