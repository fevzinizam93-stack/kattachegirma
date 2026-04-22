import { createContext, useContext, useState, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { CartProvider } from "./contexts/CartContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Catalog from "./pages/Catalog";
import CategoryPage from "./pages/CategoryPage";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import SearchResults from "./pages/SearchResults";
import MobileBottomNav from "./components/MobileBottomNav";
// Heavy pages loaded lazily — only when user navigates to them
const Admin = lazy(() => import("./pages/Admin"));
const AdminAnalytics = lazy(() => import("./pages/AdminAnalytics"));
const AdminReviews = lazy(() => import("./pages/AdminReviews"));
const About = lazy(() => import("./pages/About"));
const Bestsellers = lazy(() => import("./pages/Bestsellers"));
const SellerPanel = lazy(() => import("./pages/SellerPanel"));
const Profile = lazy(() => import("./pages/Profile"));
const AuthModal = lazy(() => import("./components/AuthModal"));

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
                  <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
                    <Router />
                  </Suspense>
                </main>
                <div className="hidden md:block"><Footer /></div>
                <MobileBottomNav />
              </div>
              <Suspense fallback={null}>
                <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} defaultTab={authTab} />
              </Suspense>
            </TooltipProvider>
          </AuthModalContext.Provider>
        </CartProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
