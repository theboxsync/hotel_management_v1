import React from 'react';
import { Row, Col, Nav, Dropdown } from 'react-bootstrap';
import { useSelector } from 'react-redux';
import { LAYOUT } from 'constants.js';
import CsLineIcons from 'cs-line-icons/CsLineIcons';
import useCustomLayout from 'hooks/useCustomLayout';
import { useWindowSize } from 'hooks/useWindowSize';
import { NavLink } from 'react-router-dom';
import usePermission from 'hooks/usePermission';

/* ─────────────────────────────────────────────────────────────────────────────
   NavSection — only renders if the user has ANY permission in `module`.
   Children are individual Nav.Link items which can also be gated.
───────────────────────────────────────────────────────────────────────────── */
const NavSection = ({ module, icon, label, to, children }) => {
  const { canAny } = usePermission();
  if (!canAny(module)) return null;

  return (
    <div className="mb-2">
      <Nav.Link as={NavLink} to={to} className="px-0">
        <CsLineIcons icon={icon} className="me-2 sw-3" size="17" />
        <span className="align-middle">{label}</span>
      </Nav.Link>
      <div>{children}</div>
    </div>
  );
};

/* Single sub-link gated by a specific action */
const NavItem = ({ module, action, to, label }) => {
  const { can } = usePermission();
  if (!can(module, action)) return null;

  return (
    <Nav.Link as={NavLink} to={to} className="px-0 pt-1">
      <i className="me-2 sw-3 d-inline-block" />
      <span className="align-middle">{label}</span>
    </Nav.Link>
  );
};

/* Sub-link that only requires the module to have ANY access (e.g. list/view pages) */
const NavItemAny = ({ module, to, label }) => {
  const { canAny } = usePermission();
  if (!canAny(module)) return null;

  return (
    <Nav.Link as={NavLink} to={to} className="px-0 pt-1">
      <i className="me-2 sw-3 d-inline-block" />
      <span className="align-middle">{label}</span>
    </Nav.Link>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   Desktop sidebar nav
───────────────────────────────────────────────────────────────────────────── */
const NavContent = () => (
  <Nav className="flex-column">

    {/* Bookings — shown if user can read bookings */}
    <NavSection module="manage_bookings" icon="handbag" label="Bookings" to="/operations/bookings">
      <NavItemAny module="manage_bookings" to="/operations/bookings" label="All Bookings" />
      <NavItem module="manage_bookings" action="create" to="/operations/new-booking" label="New Booking" />
      <NavItemAny module="manage_bookings" to="/operations/check-in-out" label="Check-In/Out" />
    </NavSection>

    {/* Room Categories */}
    <NavSection module="manage_rooms" icon="list" label="Room Categories" to="/operations/room-categories">
      <NavItemAny module="manage_rooms" to="/operations/room-categories/manage" label="Manage Room Categories" />
      <NavItem module="manage_rooms" action="create" to="/operations/room-categories/add" label="Add Room Category" />
    </NavSection>

    {/* Rooms */}
    <NavSection module="manage_rooms" icon="list" label="Rooms" to="/operations/rooms">
      <NavItemAny module="manage_rooms" to="/operations/rooms/manage" label="Manage Rooms" />
      <NavItem module="manage_rooms" action="create" to="/operations/rooms/add" label="Add Room" />
    </NavSection>

    {/* Inventory */}
    <NavSection module="manage_inventory" icon="boxes" label="Inventory" to="/operations/inventory/requested">
      <NavItemAny module="manage_inventory" to="/operations/inventory/requested" label="Requested Inventory" />
      <NavItemAny module="manage_inventory" to="/operations/inventory/history" label="Inventory History" />
      <NavItem module="manage_inventory" action="create" to="/operations/inventory/add" label="Add Inventory" />
      <NavItem module="manage_inventory" action="request" to="/operations/inventory/add-request" label="Add Request Inventory" />
    </NavSection>

    {/* Staff Panel */}
    <NavSection module="manage_staff" icon="users" label="Staff Panel" to="/operations/staff-panel">
      <NavItemAny module="manage_staff" to="/operations/staff-panel/manage" label="Manage Staff Panel" />
      <NavItem module="manage_staff" action="create" to="/operations/staff-panel/add" label="Add Staff" />
    </NavSection>

  </Nav>
);

/* ─────────────────────────────────────────────────────────────────────────────
   Mobile navbar — dropdown per section, gated the same way
───────────────────────────────────────────────────────────────────────────── */
const MobileNavSection = ({ module, icon, label, items }) => {
  const { canAny, can } = usePermission();
  if (!canAny(module)) return null;

  // Filter items by their required action (if specified)
  const visibleItems = items.filter(item =>
    item.action ? can(module, item.action) : canAny(module)
  );
  if (!visibleItems.length) return null;

  return (
    <Dropdown container="body" className="position-static">
      <Dropdown.Toggle variant="outline-primary" size="sm" className="d-flex align-items-center gap-1">
        <CsLineIcons icon={icon} size="16" />
        {label}
      </Dropdown.Toggle>
      <Dropdown.Menu style={{ minWidth: 150, maxHeight: 300, overflowY: 'auto', marginTop: 5 }}>
        {visibleItems.map(item => (
          <Dropdown.Item as={NavLink} key={item.to} to={item.to}>
            {item.label}
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
};

const MobileNavbar = () => (
  <div className="d-flex gap-2 overflow-auto pb-2">
    <MobileNavSection
      module="manage_bookings"
      icon="handbag"
      label="Bookings"
      items={[
        { label: 'All Bookings', to: '/operations/bookings' },
        { label: 'New Booking', to: '/operations/new-booking', action: 'create' },
        { label: 'Check-In/Out', to: '/operations/check-in-out' },
      ]}
    />
    <MobileNavSection
      module="manage_rooms"
      icon="list"
      label="Room Categories"
      items={[
        { label: 'Manage Room Categories', to: '/operations/room-categories/manage' },
        { label: 'Add Room Category', to: '/operations/room-categories/add', action: 'create' },
      ]}
    />
    <MobileNavSection
      module="manage_rooms"
      icon="list"
      label="Rooms"
      items={[
        { label: 'Manage Rooms', to: '/operations/rooms/manage' },
        { label: 'Add Room', to: '/operations/rooms/add', action: 'create' },
      ]}
    />
    <MobileNavSection
      module="manage_inventory"
      icon="boxes"
      label="Inventory"
      items={[
        { label: 'Requested Inventory', to: '/operations/inventory/requested' },
        { label: 'Inventory History', to: '/operations/inventory/history' },
        { label: 'Add Inventory', to: '/operations/inventory/add', action: 'create' },
        { label: 'Add Request Inventory', to: '/operations/inventory/add-request', action: 'create' },
      ]}
    />
    <MobileNavSection
      module="manage_staff"
      icon="users"
      label="Staff Panel"
      items={[
        { label: 'Manage Staff Panel', to: '/operations/staff-panel/manage' },
        { label: 'Add Staff', to: '/operations/staff-panel/add', action: 'create' },
      ]}
    />
  </div>
);

/* ─────────────────────────────────────────────────────────────────────────────
   HOC
───────────────────────────────────────────────────────────────────────────── */
const withOperationsLayout = (WrappedComponent) => {
  return (props) => {
    useCustomLayout({ layout: LAYOUT.Boxed });
    const { width } = useWindowSize();
    const { themeValues } = useSelector((state) => state.settings);
    const lgBreakpoint = parseInt(themeValues.lg.replace('px', ''), 10);

    return (
      <div className="position-relative">
        {width && width < lgBreakpoint && (
          <div className="position-absolute top-0 start-0 end-0 d-lg-none">
            <MobileNavbar />
          </div>
        )}
        <Row>
          {width && width >= lgBreakpoint ? (
            <Col xs="auto" className="d-none d-lg-flex">
              <div className="nav flex-column sw-25 mt-2">
                <NavContent />
              </div>
            </Col>
          ) : (
            <div className="pt-7" />
          )}
          <Col>
            <WrappedComponent {...props} />
          </Col>
        </Row>
      </div>
    );
  };
};

export default withOperationsLayout;