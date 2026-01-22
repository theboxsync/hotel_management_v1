/* eslint-disable */
import { lazy } from 'react';
import { USER_ROLE } from 'constants.js';
import { DEFAULT_PATHS } from 'config.js';
import Operations from 'views/pages/operation/Operations';

const qsr = {
  dashboard: lazy(() => import('views/pages/Dashboard')),
  operation: lazy(() => import('views/pages/operation/Operations')),
  kot: lazy(() => import('views/pages/kot/ViewKots')),
};

const operation = {
  bookings: lazy(() => import('views/pages/operation/booking/Bookings')),
  newBooking: lazy(() => import('views/pages/operation/booking/Newbooking')),
  checkInOut: lazy(() => import('views/pages/operation/booking/Checkinout')),

  RoomCategories: lazy(() => import('views/pages/operation/Room/Roomcategories')),
  Rooms: lazy(() => import('views/pages/operation/Room/Rooms')),
};

const appRoot = DEFAULT_PATHS.APP.endsWith('/') ? DEFAULT_PATHS.APP.slice(1, DEFAULT_PATHS.APP.length) : DEFAULT_PATHS.APP;

const allRoutes = {
  mainRoutesItems: [
    {
      path: DEFAULT_PATHS.APP,
      exact: true,
      redirect: true,
      to: `${appRoot}/dashboard`,
    },
    {
      path: `${appRoot}/dashboard`,
      label: 'Dashboard',
      icon: 'home',
      component: qsr.dashboard,
    },
    {
      path: `${appRoot}/operations`,
      label: 'Operations',
      icon: 'list',
      component: qsr.operation,
    },
    {
      path: `${appRoot}/kot`,
      label: 'KOT',
      icon: 'cook-hat',
      component: qsr.kot,
    },
  ],
  sidebarItems: [
    { path: '#connections', label: 'menu.connections', icon: 'diagram-1', hideInRoute: true },
    { path: '#bookmarks', label: 'menu.bookmarks', icon: 'bookmark', hideInRoute: true },
    { path: '#requests', label: 'menu.requests', icon: 'diagram-2', hideInRoute: true },
    {
      path: '#account',
      label: 'menu.account',
      icon: 'user',
      hideInRoute: true,
      subs: [
        { path: '/settings', label: 'menu.settings', icon: 'gear', hideInRoute: true },
        { path: '/password', label: 'menu.password', icon: 'lock-off', hideInRoute: true },
        { path: '/devices', label: 'menu.devices', icon: 'mobile', hideInRoute: true },
      ],
    },
    {
      path: '#notifications',
      label: 'menu.notifications',
      icon: 'notification',
      hideInRoute: true,
      subs: [
        { path: '/email', label: 'menu.email', icon: 'email', hideInRoute: true },
        { path: '/sms', label: 'menu.sms', icon: 'message', hideInRoute: true },
      ],
    },
    {
      path: '#downloads',
      label: 'menu.downloads',
      icon: 'download',
      hideInRoute: true,
      subs: [
        { path: '/documents', label: 'menu.documents', icon: 'file-text', hideInRoute: true },
        { path: '/images', label: 'menu.images', icon: 'file-image', hideInRoute: true },
        { path: '/videos', label: 'menu.videos', icon: 'file-video', hideInRoute: true },
      ],
    },
  ],
};
export default allRoutes;
