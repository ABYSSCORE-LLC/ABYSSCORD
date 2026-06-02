import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { useStore } from "./store/useStore";
import { useGetMe } from "@workspace/api-client-react";
import { setAuthTokenGetter } from "@workspace/api-client-react/custom-fetch";
import { initSocket, disconnectSocket } from "./lib/socket";

// Pages
import Login from "@/pages/login";
import Register from "@/pages/register";
import CreateServerPage from "@/pages/create-server";
import MainLayout from "@/components/layout/main-layout";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Configure API client to use Zustand token
setAuthTokenGetter(() => useStore.getState().token);

function AuthWrapper({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const token = useStore((state) => state.token);
  const setCurrentUser = useStore((state) => state.setCurrentUser);
  const logout = useStore((state) => state.logout);

  const { data: user, error, isFetched } = useGetMe({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query: { enabled: !!token } as any,
  });

  useEffect(() => {
    if (user) {
      setCurrentUser(user);
      initSocket(token!, queryClient);
    }
  }, [user, token, setCurrentUser]);

  useEffect(() => {
    if (error) {
      logout();
      setLocation("/login");
    }
  }, [error, logout, setLocation]);

  useEffect(() => {
    if (!token) {
      disconnectSocket();
    }
  }, [token]);

  if (token && !isFetched) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-sm font-medium text-muted-foreground">Loading DisClone...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const token = useStore((state) => state.token);

  useEffect(() => {
    if (!token) {
      setLocation("/login");
    }
  }, [token, setLocation]);

  if (!token) return null;
  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />

      {/* Protected routes wrapped in MainLayout */}
      <Route path="/app/servers/new">
        <ProtectedRoute>
          <CreateServerPage />
        </ProtectedRoute>
      </Route>
      <Route path="/app/:rest*">
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      </Route>
      <Route path="/">
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={200}>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthWrapper>
            <Router />
          </AuthWrapper>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
