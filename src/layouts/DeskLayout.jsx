// src/layouts/DeskLayout.jsx
// The front desk (receptionist) portal: the menu shows only the modules an admin gave this person.
import { useAuth } from '../context/AuthContext';
import PortalLayout from './PortalLayout';
import { DESK_PAGES } from '../pages/desk/deskPages';
import { tl } from '../i18n';

export default function DeskLayout() {
  const { user } = useAuth();
  const mine = new Set(user?.modules || []);
  const nav = [
    { path: '/desk', label: tl('Today'), icon: 'today', end: true },
    ...DESK_PAGES.filter((p) => mine.has(p.module)),
    { path: '/desk/notifications', label: tl('Notifications'), icon: 'notifications' },
    { path: '/desk/account', label: tl('Profile & security'), icon: 'manage_accounts' },
  ];
  return <PortalLayout nav={nav} base="/desk" title={tl('Front Desk')} icon="support_agent" />;
}
