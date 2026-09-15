export const ADMIN_NOTIFICATIONS_PATH = '/admin/notifications';

// Admins only receive dispute_created, whose data carries a bookingId but no
// disputeId — /admin/disputes/:id needs the dispute id, so land on the queue.
export const adminNotificationLink = () => '/admin/disputes';
