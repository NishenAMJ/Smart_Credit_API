import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, CheckCheck, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  getAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  type AdminNotification,
} from '../../lib/admin-notifications-api';
import './Notifications.css';

const filters = ['all', 'unread', 'read'] as const;

export default function Notifications() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<(typeof filters)[number]>('all');
  const [items, setItems] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError('');
    try {
      const result = await getAdminNotifications(filter);
      if (signal?.aborted) return;
      setItems(result.notifications);
      setUnreadCount(result.unreadCount);
    } catch (loadError) {
      if (!signal?.aborted) {
        setItems([]);
        setError(loadError instanceof Error ? loadError.message : 'Failed to load notifications.');
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    const controller = new AbortController();
    setItems([]);
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const emptyText = useMemo(
    () => (filter === 'all' ? 'No admin notifications yet.' : `No ${filter} notifications.`),
    [filter],
  );

  async function openNotification(item: AdminNotification) {
    if (!item.isRead) {
      const updated = await markAdminNotificationRead(item.id);
      setItems((current) =>
        filter === 'unread'
          ? current.filter((entry) => entry.id !== item.id)
          : current.map((entry) => (entry.id === item.id ? updated : entry)),
      );
      setUnreadCount((current) => Math.max(0, current - 1));
    }
    if (item.actionTarget?.startsWith('/admin/')) navigate(item.actionTarget);
  }

  async function markAll() {
    await markAllAdminNotificationsRead();
    await load();
  }

  return (
    <section className="admin-notifications">
      <header className="admin-notifications__header">
        <div>
          <h1>Notifications</h1>
          <p>{unreadCount} unread platform events</p>
        </div>
        <div className="admin-notifications__commands">
          <button type="button" title="Refresh notifications" onClick={() => void load()}>
            <RefreshCw size={18} />
          </button>
          <button type="button" className="admin-notifications__mark" onClick={() => void markAll()} disabled={unreadCount === 0}>
            <CheckCheck size={17} /> Mark all read
          </button>
        </div>
      </header>

      <div className="admin-notifications__tabs" role="tablist">
        {filters.map((value) => (
          <button key={value} type="button" role="tab" aria-selected={filter === value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>
            {value[0].toUpperCase() + value.slice(1)}
          </button>
        ))}
      </div>

      {error ? <p className="admin-notifications__error">{error}</p> : null}
      <div className="admin-notifications__list">
        {loading ? <p className="admin-notifications__empty">Loading notifications...</p> : null}
        {!loading && items.length === 0 ? <p className="admin-notifications__empty">{emptyText}</p> : null}
        {items.map((item) => (
          <button key={item.id} type="button" className={`admin-notification ${item.isRead ? '' : 'unread'}`} onClick={() => void openNotification(item)}>
            <span className={`admin-notification__icon ${item.severity}`}><Bell size={18} /></span>
            <span className="admin-notification__copy">
              <span className="admin-notification__top"><strong>{item.title}</strong><time>{new Date(item.createdAt).toLocaleString()}</time></span>
              <span>{item.message}</span>
              <small>{item.category.replace(/_/g, ' ')}</small>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
