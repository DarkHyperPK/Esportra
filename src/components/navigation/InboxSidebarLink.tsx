import { MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useConversations, useConversationRealtime } from '@/hooks/useMessaging';
import { cn } from '@/lib/utils';

export function InboxSidebarLink({ active, collapsed }: { active: boolean; collapsed: boolean }) {
  const conversations = useConversations();
  useConversationRealtime('', () => {});
  const count = (conversations.data ?? []).reduce((total, conversation) =>
    total + (Number.isFinite(conversation.unreadCount) ? Math.max(0, Math.trunc(conversation.unreadCount)) : 0), 0);
  return <Link to="/inbox" aria-label={count ? `Inbox, ${count} unread messages` : 'Inbox'}
    aria-current={active ? 'page' : undefined} title={collapsed ? `Inbox${count ? ` · ${count} unread messages` : ''}` : undefined}
    className={cn('product-sidebar-item', collapsed && 'product-sidebar-item-collapsed', active && 'is-active')}>
    {active && <span className="product-sidebar-indicator" aria-hidden="true" />}
    <MessageSquare aria-hidden="true" />
    {!collapsed && <span>Inbox</span>}
    {count > 0 && <span className="product-sidebar-unread" aria-hidden="true">{count > 99 ? '99+' : count}</span>}
  </Link>;
}
