/* eslint-disable */
import { lazy } from 'react';
import { DEFAULT_PATHS } from 'config.js';
import withOperationsLayout from 'views/admin/operation/withOperationsLayout';
import RequestedInventory from 'views/admin/operation/inventory/RequestedInventory';

const navItems = {
  dashboard: lazy(() => import('views/admin/Dashboard')),
  staff: lazy(() => import('views/admin/staff/Staff')),
};

const operation = {
  bookings: withOperationsLayout(lazy(() => import('views/admin/operation/booking/Bookings'))),
  bookingDetails: withOperationsLayout(lazy(() => import('views/admin/operation/booking/BookingDetails'))),
  editBooking: withOperationsLayout(lazy(() => import('views/admin/operation/booking/EditBooking'))),
  newBooking: withOperationsLayout(lazy(() => import('views/admin/operation/booking/Newbooking'))),
  checkInOut: withOperationsLayout(lazy(() => import('views/admin/operation/booking/Checkinout'))),
  RoomCategories: withOperationsLayout(lazy(() => import('views/admin/operation/Room/Roomcategories'))),
  AddEditRoomCategory: withOperationsLayout(lazy(() => import('views/admin/operation/Room/AddEditRoomCategory'))),
  Rooms: withOperationsLayout(lazy(() => import('views/admin/operation/Room/Rooms'))),
  AddEditRoom: withOperationsLayout(lazy(() => import('views/admin/operation/Room/AddEditRoom'))),
  RequestedInventory: withOperationsLayout(lazy(() => import('views/admin/operation/inventory/RequestedInventory'))),
  InventoryHistory: withOperationsLayout(lazy(() => import('views/admin/operation/inventory/InventoryHistory'))),
  AddInventory: withOperationsLayout(lazy(() => import('views/admin/operation/inventory/AddInventory'))),
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
      component: navItems.dashboard,
    },
    {
      path: `${appRoot}/operations`,
      label: 'Operations',
      icon: 'list',
      redirect: true,
      to: `${appRoot}/operations/bookings`,
      subs: [
        {
          path: '/bookings/edit/:id',
          label: 'Edit Booking',
          hideSub: true,
          component: operation.editBooking,
        },
        {
          path: '/bookings/:id',
          label: 'Booking Details',
          hideSub: true,
          component: operation.bookingDetails,
        },
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
          path: '/room-categories/manage',
          label: 'Room Categories',
          hideSub: true,
          component: operation.RoomCategories,
        },
        {
          path: '/room-categories',
          label: 'Room Categories',
          hideSub: true,
          redirect: true,
          to: '/operations/room-categories/manage',
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
          path: '/rooms/manage',
          label: 'Manage Rooms',
          hideSub: true,
          component: operation.Rooms,
        },
        {
          path: '/rooms',
          label: 'Rooms',
          hideSub: true,
          redirect: true,
          to: '/operations/rooms/manage',
        },
        {
          path: '/inventory/requested',
          label: 'Requested Inventory',
          hideSub: true,
          component: operation.RequestedInventory,
        },
        {
          path: '/inventory/history',
          label: 'Inventory History',
          hideSub: true,
          component: operation.InventoryHistory,
        },
        {
          path: '/inventory/add',
          label: 'Add Inventory',
          hideSub: true,
          component: operation.AddInventory,
        },
        {
          path: '/inventory',
          label: 'Inventory',
          hideSub: true,
          redirect: true,
          to: '/operations/inventory/requested',
        },
      ],
    },
    {
      path: `${appRoot}/staff`,
      label: 'Staff',
      icon: 'user',
      component: navItems.staff,
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
