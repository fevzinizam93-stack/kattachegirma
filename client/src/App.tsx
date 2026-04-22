import { Toaster } from "@/components/ui/sonner";
import { createContext, useContext, useState, lazy, Suspense } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { CartProvider } from "./contexts/CartContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import MobileBottomNav from "./components/MobileBottomNav";
const AuthModal = lazy(() => import("./components/AuthModal"));

// Lazy-loaded pages — each page becomes its own JS chunk
const Home = lazy(() => import("./pages/Home"));
const Catalog = lazy(() => import("./pages/Catalog"));
const CategoryPage = lazy(() => import("./pages/CategoryPage"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const SearchResults = lazy(() => import("./pages/SearchResults"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminAnalytics = lazy(() => import("./pages/AdminAnalytics"));
const AdminReviews = lazy(() => import("./pages/AdminReviews"));
const About = lazy(() => import("./pages/About"));
const Bestsellers = lazy(() => import("./pages/Bestsellers"));
const SellerPanel = lazy(() => import("./pages/SellerPanel"));
const Profile = lazy(() => import("./pages/Profile"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Minimal page skeleton shown while lazy chunks load
function PageSkeleton() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-gray-400">Загрузка...</span>
      </div>
    </div>
  );
}

// Global auth modal context so any page can open it
interface AuthModalContextType {
  openLogin: () => void;
  openRegister: () => void;
}

export const AuthModalContext = createContext<AuthModalContextType>({
  openLogin: () => {},
  openRegister: () => {},
});

export function useAuthModal() {
  return useContext(AuthModalContext);
}

function Router() {
  const [location] = useLocation();

  // Parse search query from URL
  const searchParams = new URLSearchParams(location.includes("?") ? location.split("?")[1] : "");
  const searchQuery = searchParams.get("q") ?? "";

  return (
    <Suspense fallback={<PageSkeleton />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/catalog" component={Catalog} />
        <Route path="/category/:slug">
          {(params) => <CategoryPage slug={params.slug} />}
        </Route>
        <Route path="/product/:slug">
          {(params) => <ProductDetail slug={params.slug} />}
        </Route>
        <Route path="/cart" component={Cart} />
        <Route path="/checkout" component={Checkout} />
        <Route path="/search">
          {() => <SearchResults query={searchQuery} />}
        </Route>
        <Route path="/admin" component={Admin} />
        <Route path="/admin/analytics" component={AdminAnalytics} />
        <Route path="/admin/reviews" component={AdminReviews} />
        <Route path="/about" component={About} />
        <Route path="/bestsellers" component={Bestsellers} />
        <Route path="/seller" component={SellerPanel} />
        <Route path="/profile" component={Profile} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "register">("login");

  const openLogin = () => { setAuthTab("login"); setAuthOpen(true); };
  const openRegister = () => { setAuthTab("register"); setAuthOpen(true); };

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <CartProvider>
          <AuthModalContext.Provider value={{ openLogin, openRegister }}>
            <TooltipProvider>
              <Toaster />
              <div className="flex flex-col min-h-screen">
                <Navbar onOpenAuth={openLogin} />
                <main className="flex-1 pb-14 md:pb-0">
                  <Router />
                </main>
                <div className="hidden md:block"><Footer /></div>
                <MobileBottomNav />
              </div>
              <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} defaultTab={authTab} />
            </TooltipProvider>
          </AuthModalContext.Provider>
        </CartProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
