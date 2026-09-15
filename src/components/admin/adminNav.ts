import {
  AlertTriangle,
  BarChart3,
  Bell,
  CalendarClock,
  Code,
  Database,
  FileText,
  Flag,
  Gamepad2,
  LayoutDashboard,
  Lock,
  LucideIcon,
  MapPin,
  Megaphone,
  Monitor,
  Scale,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldPlus,
  SlidersHorizontal,
  ToggleRight,
  Trophy,
  UserSearch,
  Users,
  UsersRound,
} from 'lucide-react';

export type AdminNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  permission?: string;
  superOnly?: boolean;
};

export type AdminNavGroup = {
  label: string;
  items: AdminNavItem[];
};

export const adminNavGroups: AdminNavGroup[] = [
  {
    label: 'Dashboard',
    items: [
      { label: 'Command Centre', href: '/admin/dashboard', icon: LayoutDashboard, permission: 'dashboard:view' },
    ],
  },
  {
    label: 'Users & Access',
    items: [
      { label: 'All Users', href: '/admin/users', icon: Users, permission: 'users:view' },
      { label: 'Verifications', href: '/admin/users/verifications', icon: ShieldCheck, permission: 'verification:view' },
      { label: 'Licenses', href: '/admin/users/licenses', icon: Scale, permission: 'licenses:view' },
      { label: 'Sessions', href: '/admin/users/sessions', icon: Monitor, permission: 'security:view_sessions' },
    ],
  },
  {
    label: 'Content',
    items: [
      { label: 'Tournaments', href: '/admin/content/tournaments', icon: Trophy, permission: 'tournaments:view' },
      { label: 'Teams', href: '/admin/content/teams', icon: UsersRound, permission: 'teams:view' },
      { label: 'Venues', href: '/admin/content/venues', icon: MapPin, permission: 'venues:view' },
      { label: 'Games', href: '/admin/content/games', icon: Gamepad2, permission: 'games:manage' },
      { label: 'Moderation', href: '/admin/content/moderation', icon: Shield, permission: 'moderation:view' },
    ],
  },
  {
    label: 'Partners',
    items: [
      { label: 'Sponsors', href: '/admin/partners/sponsors', icon: Flag, permission: 'sponsors:view' },
      { label: 'Developer API', href: '/admin/tools/developer-api', icon: Code, permission: 'developer_keys:manage' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Disputes', href: '/admin/operations/disputes', icon: AlertTriangle, permission: 'disputes:view' },
      { label: 'Alerts', href: '/admin/operations/alerts', icon: Bell, permission: 'alerts:view' },
      { label: 'Reports', href: '/admin/operations/reports', icon: CalendarClock, permission: 'reports:view' },
      { label: 'Broadcasts', href: '/admin/operations/broadcasts', icon: Megaphone, permission: 'broadcasts:view' },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Feature Flags', href: '/admin/system/feature-flags', icon: ToggleRight, permission: 'feature_flags:view' },
      { label: 'Settings', href: '/admin/system/settings', icon: Settings, permission: 'system:config_view' },
      { label: 'Kill Switches', href: '/admin/system/kill-switches', icon: ShieldAlert, permission: 'system:config_view' },
      { label: 'Anomalies', href: '/admin/system/anomalies', icon: AlertTriangle, permission: 'system:config_view' },
    ],
  },
  {
    label: 'Security',
    items: [
      { label: 'Role Builder', href: '/admin/security/roles', icon: Lock, permission: 'rbac:view' },
      { label: 'Admin Access', href: '/admin/security/admins', icon: ShieldPlus, permission: 'admin_users:view' },
      { label: 'IP Allowlist', href: '/admin/security/ip-allowlist', icon: SlidersHorizontal, permission: 'security:manage_ip_allowlist' },
      { label: 'Audit Logs', href: '/admin/security/audit-logs', icon: FileText, permission: 'audit:view' },
      { label: 'GDPR', href: '/admin/security/gdpr', icon: Database, permission: 'gdpr:view' },
      { label: 'Ghost Mode', href: '/admin/security/ghost', icon: UserSearch, permission: 'users:impersonate', superOnly: true },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { label: 'Overview', href: '/admin/analytics', icon: BarChart3, permission: 'analytics:view' },
    ],
  },
];
