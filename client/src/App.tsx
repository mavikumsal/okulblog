import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import Panel from "./pages/Panel";
import TestRunner from "./pages/TestRunner";
import QA from "./pages/QA";
import ContentHub from "./pages/ContentHub";
import ContentDetail from "./pages/ContentDetail";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/panel" component={Panel} />
      <Route path="/test/:id" component={TestRunner} />
      <Route path="/soru-cevap" component={QA} />
      <Route path="/icerik/:type/:id" component={ContentDetail} />
      <Route path="/icerik/:type" component={ContentHub} />
      <Route path="/panel/:section" component={Panel} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
