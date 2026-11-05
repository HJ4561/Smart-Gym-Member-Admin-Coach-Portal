// Feature switches (build-time). Locker credit is off for now — "coming soon" — with nothing removed:
// set VITE_LOCKER_CREDIT=on (and LOCKER_CREDIT_ENABLED=True on the backend) to bring it back.
export const LOCKER_CREDIT_ENABLED = import.meta.env.VITE_LOCKER_CREDIT === 'on';
