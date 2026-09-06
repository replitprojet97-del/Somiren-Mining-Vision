import { useEffect } from "react";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from 'wouter';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import ProjetsPage from "@/pages/Projets";
import ContactPage from "@/pages/Contact";
import TrackingPage from "@/pages/Tracking";
import AdminPage from "@/pages/Admin";
import { useProtection } from "@/hooks/useProtection";

import WorkspaceLayout from "@/pages/workspace/WorkspaceLayout";
import CollaboratorLogin from "@/pages/workspace/CollaboratorLogin";
import { WorkspaceAuthProvider, useWorkspaceAuth } from "@/contexts/WorkspaceAuthContext";

const queryClient = new QueryClient();

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function ScrollManager() {
  const [location] = useLocation();

  useEffect(() => {
    const target = sessionStorage.getItem('somiren:scrollTarget');
    if (target && location === '/') {
      sessionStorage.removeItem('somiren:scrollTarget');
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

function HomeRedirect() {
  // Always show Home for both signed in and signed out
  // The header updates automatically
  return <Home />;
}

function ProtectedWorkspace() {
  const { profile, isLoading } = useWorkspaceAuth();
  if (isLoading) return <div className="min-h-[100dvh] bg-background" />;
  return profile ? <WorkspaceLayout /> : <Redirect to="/sign-in" />;
}

function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/sign-in" component={CollaboratorLogin} />
      <Route path="/espace-collaborateur/*?" component={ProtectedWorkspace} />
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
    <WouterRouter base={basePath}>
      <ScrollManager />
      <WorkspaceAuthProvider>
        <AppRoutes />
      </WorkspaceAuthProvider>
    </WouterRouter>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppInner />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
