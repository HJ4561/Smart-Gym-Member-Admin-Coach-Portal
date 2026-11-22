// src/pages/desk/deskPages.js — the front desk's pages, one per module an admin can tick for a receptionist.
import { tl } from '../../i18n';

export const DESK_PAGES = [
  { module: 'gate', path: '/desk/gate', label: tl('Entrance'), icon: 'qr_code_scanner' },
  { module: 'registrations', path: '/desk/registrations', label: tl('Website signups'), icon: 'how_to_reg' },
  { module: 'walk_in', path: '/desk/walk-in', label: tl('Add a walk-in'), icon: 'person_add' },
  { module: 'members', path: '/desk/members', label: tl('Members'), icon: 'groups' },
  { module: 'classes', path: '/desk/classes', label: tl('Classes'), icon: 'event' },
  { module: 'inbox', path: '/desk/inbox', label: tl('Website messages'), icon: 'mail' },
];
