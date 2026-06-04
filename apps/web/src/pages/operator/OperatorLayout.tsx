import { Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Megaphone,
  FileText,
  ShieldCheck,
  Boxes,
  LineChart,
  Settings,
  CreditCard,
  KanbanSquare,
  KeyRound,
  Network,
  Plug,
} from 'lucide-react';
import { DashboardLayout, type NavItem } from '@/components/layout/DashboardLayout';

const nav: NavItem[] = [
  { to: '/operator', label: 'Overview', icon: LayoutDashboard },
  { to: '/operator/calendar', label: 'Calendar', icon: Calendar },
  { to: '/operator/tenants', label: 'Tenants', icon: Users },
  { to: '/operator/leads', label: 'Inquiries', icon: KanbanSquare },
  { to: '/operator/invoices', label: 'Invoices', icon: FileText },
  { to: '/operator/compliance', label: 'Compliance', icon: ShieldCheck },
  { to: '/operator/spaces', label: 'Spaces & Equipment', icon: Boxes },
  { to: '/operator/access', label: 'Access Control', icon: KeyRound },
  { to: '/operator/announcements', label: 'Announcements', icon: Megaphone },
  { to: '/operator/analytics', label: 'Analytics', icon: LineChart },
  { to: '/operator/network', label: 'Peer Network', icon: Network },
  { to: '/operator/stripe-connect', label: 'Payments', icon: CreditCard },
  { to: '/operator/integrations', label: 'Integrations', icon: Plug },
  { to: '/operator/settings', label: 'Settings', icon: Settings },
];

export default function OperatorLayout() {
  return (
    <DashboardLayout nav={nav} title="Operator">
      <Outlet />
    </DashboardLayout>
  );
}
