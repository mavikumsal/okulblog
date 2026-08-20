import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import { lazy, Suspense } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
const Home = lazy(() => import("./pages/Home"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Panel = lazy(() => import("./pages/Panel"));
const TestRunner = lazy(() => import("./pages/TestRunner"));
const QA = lazy(() => import("./pages/QA"));
const ContentHub = lazy(() => import("./pages/ContentHub"));
const ContentDetail = lazy(() => import("./pages/ContentDetail"));
const OutcomeDetail = lazy(() => import("./pages/OutcomeDetail"));
const LatestPreview = lazy(() => import("./pages/LatestPreview"));
const FAQ = lazy(() => import("./pages/FAQ"));
const About = lazy(() => import("./pages/About"));
const Privacy = lazy(() => import("./pages/Privacy"));
function PageFallback() {
  return <div className="grid min-h-[40vh] place-items-center bg-[#fbfaf4] px-6 text-sm text-[#668278]">Sayfa yükleniyor...</div>;
}

function Router() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Switch>
      <Route path="/" component={Home} />
      <Route path="/onizleme/guncel" component={LatestPreview} />
      <Route path="/panel" component={Panel} />
      <Route path="/test/:id" component={TestRunner} />
      <Route path="/soru-cevap" component={QA} />
      <Route path="/destek/sss" component={FAQ} />
      <Route path="/hakkimizda" component={About} />
      <Route path="/gizlilik" component={Privacy} />
      <Route path="/kazanim/:id" component={OutcomeDetail} />
      <Route path="/icerik/:type/:id" component={ContentDetail} />
      <Route path="/icerik/:type" component={ContentHub} />
      <Route path="/panel/:section" component={Panel} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
      </Switch>
    </Suspense>
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
