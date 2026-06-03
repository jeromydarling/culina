import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';

// Public
import Landing from '@/pages/public/Landing';
import About from '@/pages/public/About';
import FindAKitchen from '@/pages/public/FindAKitchen';
import KitchenProfile from '@/pages/public/KitchenProfile';
import Storefront from '@/pages/public/Storefront';
import NotFound from '@/pages/public/NotFound';

// Auth
import Login from '@/pages/auth/Login';
import Signup from '@/pages/auth/Signup';
import ForgotPassword from '@/pages/auth/ForgotPassword';

// Operator
import OperatorLayout from '@/pages/operator/OperatorLayout';
import OperatorOverview from '@/pages/operator/Overview';
import OperatorCalendar from '@/pages/operator/Calendar';
import OperatorTenants from '@/pages/operator/Tenants';
import TenantDetail from '@/pages/operator/TenantDetail';
import OperatorLeads from '@/pages/operator/Leads';
import OperatorInvoices from '@/pages/operator/Invoices';
import OperatorCompliance from '@/pages/operator/Compliance';
import OperatorSpaces from '@/pages/operator/Spaces';
import OperatorAnnouncements from '@/pages/operator/Announcements';
import OperatorAnalytics from '@/pages/operator/Analytics';
import OperatorSettings from '@/pages/operator/Settings';
import OperatorStripe from '@/pages/operator/StripeConnect';

// Tenant
import TenantLayout from '@/pages/tenant/TenantLayout';
import TenantHome from '@/pages/tenant/Home';
import TenantBook from '@/pages/tenant/Book';
import TenantBookings from '@/pages/tenant/Bookings';
import TenantDocuments from '@/pages/tenant/Documents';
import TenantRecipes from '@/pages/tenant/Recipes';
import TenantProducts from '@/pages/tenant/Products';
import TenantStorefrontEditor from '@/pages/tenant/StorefrontEditor';
import TenantGrants from '@/pages/tenant/Grants';
import TenantLearning from '@/pages/tenant/Learning';
import TenantTools from '@/pages/tenant/Tools';
import TenantSettings from '@/pages/tenant/Settings';
import TenantStripe from '@/pages/tenant/StripeConnect';

// Admin
import AdminLayout from '@/pages/admin/AdminLayout';
import AdminOverview from '@/pages/admin/Overview';
import AdminKitchens from '@/pages/admin/Kitchens';
import AdminUsers from '@/pages/admin/Users';
import AdminGrants from '@/pages/admin/Grants';
import AdminContent from '@/pages/admin/Content';

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/about" element={<About />} />
      <Route path="/find-a-kitchen" element={<FindAKitchen />} />
      <Route path="/kitchen/:slug" element={<KitchenProfile />} />
      <Route path="/shop/:slug" element={<Storefront />} />

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
        <Route path="announcements" element={<OperatorAnnouncements />} />
        <Route path="analytics" element={<OperatorAnalytics />} />
        <Route path="settings" element={<OperatorSettings />} />
        <Route path="stripe-connect" element={<OperatorStripe />} />
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
        <Route path="grants" element={<TenantGrants />} />
        <Route path="learning" element={<TenantLearning />} />
        <Route path="tools" element={<TenantTools />} />
        <Route path="tools/:tool" element={<TenantTools />} />
        <Route path="settings" element={<TenantSettings />} />
        <Route path="stripe-connect" element={<TenantStripe />} />
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
        <Route path="kitchens" element={<AdminKitchens />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="grants" element={<AdminGrants />} />
        <Route path="content" element={<AdminContent />} />
        <Route path="analytics" element={<AdminOverview />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
