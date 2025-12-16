import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  Building2, 
  LayoutDashboard, 
  FileText, 
  Users, 
  LogOut, 
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AppLayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Buyer Universes", href: "/trackers", icon: Building2 },
  { name: "All Deals", href: "/deals", icon: FileText },
  { name: "All Buyers", href: "/buyers", icon: Users },
];

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      });
    } else {
      navigate("/auth");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-sidebar border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-teal flex items-center justify-center">
            <Building2 className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <span className="text-lg font-display font-bold text-sidebar-foreground">SourceCo</span>
        </Link>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-sidebar-foreground hover:bg-sidebar-accent rounded-lg"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <aside className={cn(
        "lg:hidden fixed top-14 left-0 bottom-0 z-40 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-200",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <nav className="flex flex-col h-full p-4">
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href || 
                (item.href !== "/" && location.pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-primary"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}
          </div>
          <div className="mt-auto pt-4 border-t border-sidebar-border">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent w-full"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </nav>
      </aside>

      {/* Desktop sidebar */}
      <aside className={cn(
        "hidden lg:flex fixed top-0 left-0 bottom-0 z-40 flex-col bg-sidebar border-r border-sidebar-border transition-all duration-200",
        sidebarOpen ? "w-64" : "w-20"
      )}>
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg gradient-teal flex items-center justify-center flex-shrink-0">
              <Building2 className="w-6 h-6 text-sidebar-primary-foreground" />
            </div>
            {sidebarOpen && (
              <span className="text-xl font-display font-bold text-sidebar-foreground">SourceCo</span>
            )}
          </Link>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 text-sidebar-foreground hover:bg-sidebar-accent rounded-lg"
          >
            {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href || 
                (item.href !== "/" && location.pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-primary"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    !sidebarOpen && "justify-center"
                  )}
                  title={!sidebarOpen ? item.name : undefined}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {sidebarOpen && item.name}
                </Link>
              );
            })}
          </div>

          {/* Quick Action */}
          {sidebarOpen && (
            <div className="mt-6">
              <Button
                variant="outline"
                className="w-full justify-start gap-2 border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent"
                onClick={() => navigate("/trackers/new")}
              >
                <Plus className="w-4 h-4" />
                New Buyer Universe
              </Button>
            </div>
          )}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-sidebar-border">
          <button
            onClick={handleLogout}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent w-full transition-colors",
              !sidebarOpen && "justify-center"
            )}
            title={!sidebarOpen ? "Sign Out" : undefined}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && "Sign Out"}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className={cn(
        "min-h-screen pt-14 lg:pt-0 transition-all duration-200",
        sidebarOpen ? "lg:pl-64" : "lg:pl-20"
      )}>
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
