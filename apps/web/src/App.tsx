import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Spinner } from '@/components/ui/misc';

// Public + auth load eagerly — they are the entry points and stay light.
import Landing from '@/pages/public/Landing';
import About from '@/pages/public/About';
import FindAKitchen from '@/pages/public/FindAKitchen';
import KitchenProfile from '@/pages/public/KitchenProfile';
import Storefront from '@/pages/public/Storefront';
import Privacy from '@/pages/public/Privacy';
import NotFound from '@/pages/public/NotFound';
import Login from '@/pages/auth/Login';
import Signup from '@/pages/auth/Signup';
import ForgotPassword from '@/pages/auth/ForgotPassword';

// Features is lazy so its recharts-backed mini-screens stay out of the eager
// landing bundle, while the rest of the marketing pages load immediately.
const Features = lazy(() => import('@/pages/public/Features'));

// Dashboards are lazy-loaded so the marketing entry (and the heavy charting
// libraries they pull in) never ship in the initial bundle.
const OperatorLayout = lazy(() => import('@/pages/operator/OperatorLayout'));
const OperatorOverview = lazy(() => import('@/pages/operator/Overview'));
const OperatorCalendar = lazy(() => import('@/pages/operator/Calendar'));
const OperatorTenants = lazy(() => import('@/pages/operator/Tenants'));
const TenantDetail = lazy(() => import('@/pages/operator/TenantDetail'));
const OperatorLeads = lazy(() => import('@/pages/operator/Leads'));
const OperatorInvoices = lazy(() => import('@/pages/operator/Invoices'));
const OperatorCompliance = lazy(() => import('@/pages/operator/Compliance'));
const OperatorSpaces = lazy(() => import('@/pages/operator/Spaces'));
const OperatorAnnouncements = lazy(() => import('@/pages/operator/Announcements'));
const OperatorAnalytics = lazy(() => import('@/pages/operator/Analytics'));
const OperatorAccess = lazy(() => import('@/pages/operator/AccessControl'));
const OperatorNetwork = lazy(() => import('@/pages/operator/PeerNetwork'));
const OperatorSettings = lazy(() => import('@/pages/operator/Settings'));
const OperatorStripe = lazy(() => import('@/pages/operator/StripeConnect'));
const OperatorIntegrations = lazy(() => import('@/pages/operator/Integrations'));
const OperatorOnboarding = lazy(() => import('@/pages/operator/Onboarding'));

const TenantLayout = lazy(() => import('@/pages/tenant/TenantLayout'));
const TenantHome = lazy(() => import('@/pages/tenant/Home'));
const TenantBook = lazy(() => import('@/pages/tenant/Book'));
const TenantBookings = lazy(() => import('@/pages/tenant/Bookings'));
const TenantDocuments = lazy(() => import('@/pages/tenant/Documents'));
const TenantRecipes = lazy(() => import('@/pages/tenant/Recipes'));
const TenantProducts = lazy(() => import('@/pages/tenant/Products'));
const TenantStorefrontEditor = lazy(() => import('@/pages/tenant/StorefrontEditor'));
const TenantMarketing = lazy(() => import('@/pages/tenant/Marketing'));
const TenantGrants = lazy(() => import('@/pages/tenant/Grants'));
const TenantLearning = lazy(() => import('@/pages/tenant/Learning'));
const TenantMentors = lazy(() => import('@/pages/tenant/Mentors'));
const TenantCommunity = lazy(() => import('@/pages/tenant/Community'));
const TenantTools = lazy(() => import('@/pages/tenant/Tools'));
const TenantSettings = lazy(() => import('@/pages/tenant/Settings'));
const TenantStripe = lazy(() => import('@/pages/tenant/StripeConnect'));
const TenantOnboarding = lazy(() => import('@/pages/tenant/Onboarding'));

const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'));
const AdminOverview = lazy(() => import('@/pages/admin/Overview'));
const AdminRevenue = lazy(() => import('@/pages/admin/Revenue'));
const AdminKitchens = lazy(() => import('@/pages/admin/Kitchens'));
const AdminUsers = lazy(() => import('@/pages/admin/Users'));
const AdminGrants = lazy(() => import('@/pages/admin/Grants'));
const AdminContent = lazy(() => import('@/pages/admin/Content'));
const AdminWhiteLabel = lazy(() => import('@/pages/admin/WhiteLabel'));
const AdminErrors = lazy(() => import('@/pages/admin/Errors'));

function RouteFallback() {
  return (
    <div className="grid min-h-screen place-items-center">
      <Spinner className="h-8 w-8" />
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/about" element={<About />} />
        <Route path="/features" element={<Features />} />
        <Route path="/find-a-kitchen" element={<FindAKitchen />} />
        <Route path="/kitchen/:slug" element={<KitchenProfile />} />
        <Route path="/shop/:slug" element={<Storefront />} />
      <Route path="/privacy" element={<Privacy />} />

        {/* Auth */}
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/signup" element={<Signup />} />
        <Route path="/auth/forgot-password" element={<ForgotPassword />} />

        {/* Operator */}
        <Route
          path="/operator"
          element={
            <ProtectedRoute role="operator">
              <OperatorLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<OperatorOverview />} />
          <Route path="overview" element={<Navigate to="/operator" replace />} />
          <Route path="calendar" element={<OperatorCalendar />} />
          <Route path="tenants" element={<OperatorTenants />} />
          <Route path="tenants/:id" element={<TenantDetail />} />
          <Route path="leads" element={<OperatorLeads />} />
          <Route path="invoices" element={<OperatorInvoices />} />
          <Route path="compliance" element={<OperatorCompliance />} />
          <Route path="spaces" element={<OperatorSpaces />} />
          <Route path="equipment" element={<OperatorSpaces />} />
          <Route path="access" element={<OperatorAccess />} />
          <Route path="announcements" element={<OperatorAnnouncements />} />
          <Route path="analytics" element={<OperatorAnalytics />} />
          <Route path="network" element={<OperatorNetwork />} />
          <Route path="settings" element={<OperatorSettings />} />
          <Route path="stripe-connect" element={<OperatorStripe />} />
          <Route path="integrations" element={<OperatorIntegrations />} />
          <Route path="onboarding" element={<OperatorOnboarding />} />
        </Route>

        {/* Tenant */}
        <Route
          path="/tenant"
          element={
            <ProtectedRoute role="tenant">
              <TenantLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<TenantHome />} />
          <Route path="home" element={<Navigate to="/tenant" replace />} />
          <Route path="book" element={<TenantBook />} />
          <Route path="bookings" element={<TenantBookings />} />
          <Route path="documents" element={<TenantDocuments />} />
          <Route path="recipes" element={<TenantRecipes />} />
          <Route path="recipes/:id" element={<TenantRecipes />} />
          <Route path="products" element={<TenantProducts />} />
          <Route path="storefront" element={<TenantStorefrontEditor />} />
          <Route path="storefront/editor" element={<TenantStorefrontEditor />} />
          <Route path="marketing" element={<TenantMarketing />} />
          <Route path="grants" element={<TenantGrants />} />
          <Route path="learning" element={<TenantLearning />} />
          <Route path="mentors" element={<TenantMentors />} />
          <Route path="community" element={<TenantCommunity />} />
          <Route path="tools" element={<TenantTools />} />
          <Route path="tools/:tool" element={<TenantTools />} />
          <Route path="settings" element={<TenantSettings />} />
          <Route path="stripe-connect" element={<TenantStripe />} />
          <Route path="onboarding" element={<TenantOnboarding />} />
        </Route>

        {/* Admin */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute role="admin">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminOverview />} />
          <Route path="revenue" element={<AdminRevenue />} />
          <Route path="kitchens" element={<AdminKitchens />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="grants" element={<AdminGrants />} />
          <Route path="content" element={<AdminContent />} />
          <Route path="white-label" element={<AdminWhiteLabel />} />
          <Route path="errors" element={<AdminErrors />} />
          <Route path="analytics" element={<AdminOverview />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
