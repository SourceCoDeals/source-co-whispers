import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Trackers from "./pages/Trackers";
import TrackerDetail from "./pages/TrackerDetail";
import NewTracker from "./pages/NewTracker";
import BuyerDetail from "./pages/BuyerDetail";
import DealDetail from "./pages/DealDetail";
import NewDeal from "./pages/NewDeal";
import DealMatching from "./pages/DealMatching";
import IntroductionTracker from "./pages/IntroductionTracker";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/trackers" element={<Trackers />} />
          <Route path="/trackers/new" element={<NewTracker />} />
          <Route path="/trackers/:id" element={<TrackerDetail />} />
          <Route path="/buyers/:id" element={<BuyerDetail />} />
          <Route path="/trackers/:trackerId/deals/new" element={<NewDeal />} />
          <Route path="/deals/:id" element={<DealDetail />} />
          <Route path="/deals/:id/matching" element={<DealMatching />} />
          <Route path="/deals/:id/introductions" element={<IntroductionTracker />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
