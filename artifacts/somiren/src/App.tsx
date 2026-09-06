import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, Show, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from 'wouter';
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
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

const queryClient = new QueryClient();

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  console.error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(40 45% 60%)",
    colorForeground: "hsl(0 0% 100%)",
    colorMutedForeground: "hsl(0 0% 65%)",
    colorDanger: "hsl(0 84.2% 60.2%)",
    colorBackground: "hsl(0 0% 8%)",
    colorInput: "hsl(40 20% 20%)",
    colorInputForeground: "hsl(0 0% 100%)",
    colorNeutral: "hsl(40 20% 20%)",
    fontFamily: "Inter, sans-serif",
    borderRadius: "0rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-[#0A0A0A] border border-[#3d2f1f] rounded-none w-[440px] max-w-full overflow-hidden shadow-[0px_8px_10px_-1px_hsl(0,0%,0%,0.5)]",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-white font-serif tracking-wider",
    headerSubtitle: "text-[#a6a6a6]",
    socialButtonsBlockButtonText: "text-white uppercase tracking-wider font-semibold text-xs",
    formFieldLabel: "text-[#a6a6a6] uppercase tracking-wider text-xs font-semibold",
    footerActionLink: "text-[#c2994d] hover:text-white transition-colors",
    footerActionText: "text-[#a6a6a6]",
    footerAction: "hidden",
    dividerText: "text-[#a6a6a6] bg-[#0A0A0A]",
    identityPreviewEditButton: "text-[#c2994d]",
    formFieldSuccessText: "text-green-500",
    alertText: "text-white",
    formButtonPrimary: "bg-[#c2994d] text-black hover:bg-[#a38040] rounded-none uppercase tracking-wider font-semibold",
    formFieldInput: "bg-[#141414] border-[#3d2f1f] text-white rounded-none focus:border-[#c2994d] focus:ring-[#c2994d]",
    socialButtonsBlockButton: "border-[#3d2f1f] hover:bg-[#141414] rounded-none",
    dividerLine: "bg-[#3d2f1f]",
    alert: "bg-[#141414] border-[#3d2f1f]",
    main: "gap-6",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-20 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />
      <SignIn routing="path" path={`${basePath}/sign-in`} />
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!addListener) return;
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

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
  return (
    <>
      <Show when="signed-in">
        <WorkspaceLayout />
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  if (!clerkPubKey) {
    return (
      <Switch>
        <Route path="/" component={HomeRedirect} />
        <Route path="/projets" component={ProjetsPage} />
        <Route path="/contact" component={ContactPage} />
        <Route path="/tracking" component={TrackingPage} />
        <Route path="/admin" component={AdminPage} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      localization={{
        signIn: {
          start: {
            title: "Accès Confidentiel",
            subtitle: "Espace Collaborateur Somiren S.A.",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <Switch>
          <Route path="/" component={HomeRedirect} />
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/espace-collaborateur/*?" component={ProtectedWorkspace} />
          <Route path="/projets" component={ProjetsPage} />
          <Route path="/contact" component={ContactPage} />
          <Route path="/tracking" component={TrackingPage} />
          <Route path="/admin" component={AdminPage} />
          <Route component={NotFound} />
        </Switch>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function AppInner() {
  useProtection();
  return (
    <WouterRouter base={basePath}>
      <ScrollManager />
      <ClerkProviderWithRoutes />
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
