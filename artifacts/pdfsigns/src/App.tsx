import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { Navbar } from "@/components/layout/Navbar";
import Home from "@/pages/Home";
import PdfEditor from "@/pages/PdfEditor";
import ESign from "@/pages/ESign";
import PassportPhoto from "@/pages/PassportPhoto";
import PdfMergeSplit from "@/pages/PdfMergeSplit";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/pdf-editor" component={PdfEditor} />
          <Route path="/e-sign" component={ESign} />
          <Route path="/passport-photo" component={PassportPhoto} />
          <Route path="/pdf-merge-split" component={PdfMergeSplit} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
