import { Outlet } from 'react-router-dom';
import { LayoutDashboard, Building2, Users, Wallet, BookOpen, DollarSign, Globe, AlertTriangle } from 'lucide-react';
import { DashboardLayout, type NavItem } from '@/components/layout/DashboardLayout';

const nav: NavItem[] = [
  { to: '/admin', label: 'Platform Overview', icon: LayoutDashboard },
  { to: '/admin/revenue', label: 'Revenue', icon: DollarSign },
  { to: '/admin/kitchens', label: 'Kitchens', icon: Building2 },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/grants', label: 'Grants', icon: Wallet },
  { to: '/admin/content', label: 'Learning Content', icon: BookOpen },
  { to: '/admin/white-label', label: 'White-label', icon: Globe },
  { to: '/admin/errors', label: 'Error Log', icon: AlertTriangle },
];

export default function AdminLayout() {
  return (
    <DashboardLayout nav={nav} title="Admin">
      <Outlet />
    </DashboardLayout>
  );
}
