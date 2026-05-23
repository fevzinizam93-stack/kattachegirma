import { createContext, useContext, useState, lazy, Suspense } from "react";
import { useUTMTracker } from "./hooks/useUTMTracker";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { CartProvider } from "./contexts/CartContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import MobileBottomNav from "./components/MobileBottomNav";
import { ShopAssistant } from "./components/ShopAssistant";
// All pages are lazy-loaded for code splitting — only the current page's JS is downloaded
const Home = lazy(() => import("./pages/Home"));
const Catalog = lazy(() => import("./pages/Catalog"));
const CategoryPage = lazy(() => import("./pages/CategoryPage"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const SearchResults = lazy(() => import("./pages/SearchResults"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminAnalytics = lazy(() => import("./pages/AdminAnalytics"));
const AdminReviews = lazy(() => import("./pages/AdminReviews"));
const About = lazy(() => import("./pages/About"));
const Bestsellers = lazy(() => import("./pages/Bestsellers"));
const SellerRegister = lazy(() => import("./pages/SellerRegister"));
const SellerDashboard = lazy(() => import("./pages/SellerDashboard"));
const SellerStorefront = lazy(() => import("./pages/SellerStorefront"));
const SellersList = lazy(() => import("./pages/SellersList"));
const Profile = lazy(() => import("./pages/Profile"));
const PremiumCatalog = lazy(() => import("./pages/PremiumCatalog"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const Sales = lazy(() => import("./pages/Sales"));
const Favorites = lazy(() => import("./pages/Favorites"));
const SellerMessages = lazy(() => import("./pages/SellerMessages"));
const AuthModal = lazy(() => import("./components/AuthModal"));
const Videos = lazy(() => import("./pages/Videos"));

// Lightweight spinner shown while a page chunk is loading
function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// Global auth modal context so any page can open it
interface AuthModalContextType {
  openLogin: (redirectPath?: string) => void;
  openRegister: (redirectPath?: string) => void;
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
      {/* UZ SEO URL aliases — same components, different URL prefix */}
      <Route path="/kategoriya/:slug">
        {(params) => <CategoryPage slug={params.slug} />}
      </Route>
      <Route path="/product/:slug">
        {(params) => <ProductDetail slug={params.slug} />}
      </Route>
      <Route path="/mahsulot/:slug">
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
      <Route path="/favorites" component={Favorites} />
      <Route path="/sellers" component={SellersList} />
      <Route path="/seller">{() => { window.location.replace("/seller/register"); return null; }}</Route>
      <Route path="/seller/register" component={SellerRegister} />
      <Route path="/seller/dashboard" component={SellerDashboard} />
      <Route path="/seller/messages" component={SellerMessages} />
      <Route path="/seller/:id">
        {() => <SellerStorefront />}
      </Route>
      <Route path="/premium" component={PremiumCatalog} />
      <Route path="/profile" component={Profile} />
      <Route path="/login" component={LoginPage} />
      <Route path="/sales" component={Sales} />
      <Route path="/videos" component={Videos} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "register">("login");
  const [authRedirect, setAuthRedirect] = useState<string | undefined>();

  // Track UTM params on first visit
  useUTMTracker();

  const openLogin = (redirectPath?: string) => { setAuthTab("login"); setAuthRedirect(redirectPath); setAuthOpen(true); };
  const openRegister = (redirectPath?: string) => { setAuthTab("register"); setAuthRedirect(redirectPath); setAuthOpen(true); };
  // Wrappers without args for onClick handlers
  const openLoginClick = () => openLogin();
  const openRegisterClick = () => openRegister();

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <CartProvider>
          <AuthModalContext.Provider value={{ openLogin, openRegister }}>
            <TooltipProvider>
              <Toaster />
              <div className="flex flex-col min-h-screen" translate="no">
                <Navbar onOpenAuth={openLogin} />
                <main className="flex-1 pb-14 md:pb-0">
                  <Suspense fallback={<PageLoader />}>
                    <Router />
                  </Suspense>
                </main>
                <div className="hidden md:block"><Footer /></div>
                <MobileBottomNav />
              </div>
              <Suspense fallback={null}>
                <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} defaultTab={authTab} redirectPath={authRedirect} />
                <ShopAssistant />
              </Suspense>
            </TooltipProvider>
          </AuthModalContext.Provider>
        </CartProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
