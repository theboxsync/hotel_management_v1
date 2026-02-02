/* eslint-disable */
import { lazy } from 'react';
import { DEFAULT_PATHS } from 'config.js';
import withOperationsLayout from 'views/pages/operation/withOperationsLayout';
import AddEditRoomCategory from 'views/pages/operation/Room/AddEditRoomCategory';
import AddEditRoom from 'views/pages/operation/Room/AddEditRoom';

const qsr = {
  dashboard: lazy(() => import('views/pages/Dashboard')),
  operation: lazy(() => import('views/pages/operation/Operations')),
};

const operation = {
  bookings: withOperationsLayout(lazy(() => import('views/pages/operation/booking/Bookings'))),
  newBooking: withOperationsLayout(lazy(() => import('views/pages/operation/booking/Newbooking'))),
  checkInOut: withOperationsLayout(lazy(() => import('views/pages/operation/booking/Checkinout'))),
  RoomCategories: withOperationsLayout(lazy(() => import('views/pages/operation/Room/Roomcategories'))),
  AddEditRoomCategory: withOperationsLayout(lazy(() => import('views/pages/operation/Room/AddEditRoomCategory'))),
  Rooms: withOperationsLayout(lazy(() => import('views/pages/operation/Room/Rooms'))),
  AddEditRoom: withOperationsLayout(lazy(() => import('views/pages/operation/Room/AddEditRoom'))),
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
      subs: [
        {
          path: '/bookings',
          label: 'All Bookings',
          hideSub: true,
          component: operation.bookings,
        },
        {
          path: '/new-booking',
          label: 'New Booking',
          hideSub: true,
          component: operation.newBooking,
        },
        {
          path: '/check-in-out',
          label: 'Check-In/Out',
          hideSub: true,
          component: operation.checkInOut,
        },
        {
          path: '/room-categories/add',
          label: 'Add Room Categories',
          hideSub: true,
          component: operation.AddEditRoomCategory,
        },
        {
          path: '/room-categories/edit/:id',
          label: 'Edit Room Categories',
          hideSub: true,
          component: operation.AddEditRoomCategory,
        },
        {
          path: '/room-categories',
          label: 'Room Categories',
          hideSub: true,
          component: operation.RoomCategories,
        },
        {
          path: '/rooms/add',
          label: 'Add Room',
          hideSub: true,
          component: operation.AddEditRoom,
        },
        {
          path: '/rooms/edit/:id',
          label: 'Edit Room',
          hideSub: true,
          component: operation.AddEditRoom,
        },
        {
          path: '/rooms',
          label: 'Manage Rooms',
          hideSub: true,
          component: operation.Rooms,
        },
      ],
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
