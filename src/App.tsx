import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Trackers from "./pages/Trackers";
import TrackerDetail from "./pages/TrackerDetail";
import NewTracker from "./pages/NewTracker";
import BuyerDetail from "./pages/BuyerDetail";
import PlatformDetail from "./pages/PlatformDetail";
import PEFirmDetail from "./pages/PEFirmDetail";
import DealDetail from "./pages/DealDetail";
import NewDeal from "./pages/NewDeal";
import DealMatching from "./pages/DealMatching";
import IntroductionTracker from "./pages/IntroductionTracker";
import AllDeals from "./pages/AllDeals";
import AllBuyers from "./pages/AllBuyers";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/trackers" element={<ProtectedRoute><Trackers /></ProtectedRoute>} />
            <Route path="/trackers/new" element={<ProtectedRoute><NewTracker /></ProtectedRoute>} />
            <Route path="/trackers/:id" element={<ProtectedRoute><TrackerDetail /></ProtectedRoute>} />
            <Route path="/buyers" element={<ProtectedRoute><AllBuyers /></ProtectedRoute>} />
            <Route path="/buyers/:id" element={<ProtectedRoute><BuyerDetail /></ProtectedRoute>} />
            <Route path="/platforms/:id" element={<ProtectedRoute><PlatformDetail /></ProtectedRoute>} />
            <Route path="/pe-firms/:id" element={<ProtectedRoute><PEFirmDetail /></ProtectedRoute>} />
            <Route path="/deals" element={<ProtectedRoute><AllDeals /></ProtectedRoute>} />
            <Route path="/trackers/:trackerId/deals/new" element={<ProtectedRoute><NewDeal /></ProtectedRoute>} />
            <Route path="/deals/:id" element={<ProtectedRoute><DealDetail /></ProtectedRoute>} />
            <Route path="/deals/:id/matching" element={<ProtectedRoute><DealMatching /></ProtectedRoute>} />
            <Route path="/deals/:id/introductions" element={<ProtectedRoute><IntroductionTracker /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
