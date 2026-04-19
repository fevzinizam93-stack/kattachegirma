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
import Admin from "./pages/Admin";
import About from "./pages/About";
import SellerPanel from "./pages/SellerPanel";
import Profile from "./pages/Profile";
import AuthModal from "./components/AuthModal";
import { createContext, useContext, useState } from "react";

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
      <Route path="/about" component={About} />
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
                <main className="flex-1">
                  <Router />
                </main>
                <Footer />
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
