import React from 'react';
import { Row, Col, Nav, Dropdown } from 'react-bootstrap';
import { useSelector } from 'react-redux';
import { LAYOUT } from 'constants.js';
import CsLineIcons from 'cs-line-icons/CsLineIcons';
import useCustomLayout from 'hooks/useCustomLayout';
import 'react-datepicker/dist/react-datepicker.css';
import { useWindowSize } from 'hooks/useWindowSize';
import { NavLink } from 'react-router-dom';

const NavContent = () => {
  return (
    <Nav className="flex-column">
      <div className="mb-2">
        <Nav.Link as={NavLink} to="/operations/bookings" className="px-0">
          <CsLineIcons icon="handbag" className="me-2 sw-3" size="17" />
          <span className="align-middle">Bookings</span>
        </Nav.Link>
        <div>
          <Nav.Link as={NavLink} to="/operations/bookings" className="px-0 pt-1">
            <i className="me-2 sw-3 d-inline-block" />
            <span className="align-middle">All Bookings</span>
          </Nav.Link>
          <Nav.Link as={NavLink} to="/operations/new-booking" className="px-0 pt-1">
            <i className="me-2 sw-3 d-inline-block" />
            <span className="align-middle">New Booking</span>
          </Nav.Link>
          <Nav.Link as={NavLink} to="/operations/check-in-out" className="px-0 pt-1">
            <i className="me-2 sw-3 d-inline-block" />
            <span className="align-middle">Check-In/Out</span>
          </Nav.Link>
        </div>
      </div>

      <div className="mb-2">
        <Nav.Link as={NavLink} to="/operations/room-categories" className="px-0">
          <CsLineIcons icon="list" className="me-2 sw-3" size="17" />
          <span className="align-middle">Room Categories</span>
        </Nav.Link>
        <div>
          <Nav.Link as={NavLink} to="/operations/room-categories/manage" className="px-0 pt-1">
            <i className="me-2 sw-3 d-inline-block" />
            <span className="align-middle">Manage Room Categories</span>
          </Nav.Link>
          <Nav.Link as={NavLink} to="/operations/room-categories/add" className="px-0 pt-1">
            <i className="me-2 sw-3 d-inline-block" />
            <span className="align-middle">Add Room Category</span>
          </Nav.Link>
        </div>
      </div>

      <div className="mb-2">
        <Nav.Link as={NavLink} to="/operations/rooms" className="px-0">
          <CsLineIcons icon="list" className="me-2 sw-3" size="17" />
          <span className="align-middle">Rooms</span>
        </Nav.Link>
        <div>
          <Nav.Link as={NavLink} to="/operations/rooms/manage" className="px-0 pt-1">
            <i className="me-2 sw-3 d-inline-block" />
            <span className="align-middle">Manage Rooms</span>
          </Nav.Link>
          <Nav.Link as={NavLink} to="/operations/rooms/add" className="px-0 pt-1">
            <i className="me-2 sw-3 d-inline-block" />
            <span className="align-middle">Add Room</span>
          </Nav.Link>
        </div>
      </div>
    </Nav>
  );
};

const mobileNavItems = [
  {
    label: 'Bookings',
    icon: 'handbag',
    items: [
      { label: 'Bookings', to: '/operations/bookings' },
      { label: 'New Booking', to: '/operations/new-booking' },
      { label: 'Check-In/Out', to: '/operations/check-in-out' },
    ],
  },
  {
    label: 'Room Categories',
    icon: 'main-course',
    items: [
      { label: 'Manage Room Categories', to: '/operations/room-categories/manage' },
      { label: 'Add Room Category', to: '/operations/room-categories/add' },
    ],
  },
  {
    label: 'Rooms',
    icon: 'main-course',
    items: [
      { label: 'Manage Rooms', to: '/operations/rooms/manage' },
      { label: 'Add Room', to: '/operations/rooms/add' },
    ],
  }
];

const MobileNavbar = () => {
  return (
    <div className="d-flex gap-2 overflow-auto pb-2">
      {mobileNavItems.map((nav) => (
        <Dropdown key={nav.label} container="body" className="position-static">
          <Dropdown.Toggle variant="outline-primary" size="sm" className="d-flex align-items-center gap-1">
            <CsLineIcons icon={nav.icon} size="16" />
            {nav.label}
          </Dropdown.Toggle>

          <Dropdown.Menu
            style={{
              position: 'absolute',
              minWidth: '150px',
              maxHeight: '300px',
              overflowY: 'auto',
              marginTop: '5px',
            }}
          >
            {nav.items.map((item) => (
              <Dropdown.Item as={NavLink} key={item.to} to={item.to}>
                {item.label}
              </Dropdown.Item>
            ))}
          </Dropdown.Menu>
        </Dropdown>
      ))}
    </div>
  );
};

// This is now just a layout wrapper - NO routing logic
const Operations = () => {
  useCustomLayout({ layout: LAYOUT.Boxed });
  const { width } = useWindowSize();

  const { themeValues } = useSelector((state) => state.settings);
  const lgBreakpoint = parseInt(themeValues.lg.replace('px', ''), 10);

  return (
    <div className="position-relative">
      {/* Mobile Navbar */}
      {width && width < lgBreakpoint && (
        <div className="position-absolute top-0 start-0 end-0 d-lg-none">
          <MobileNavbar />
        </div>
      )}

      <Row>
        {/* Desktop Sidebar */}
        {width && width >= lgBreakpoint ? (
          <Col xs="auto" className="d-none d-lg-flex">
            <div className="nav flex-column sw-25 mt-2">
              <NavContent />
            </div>
          </Col>
        ) : (
          <div className="pt-7" />
        )}

        {/* Main Content - Just shows navigation, actual pages handled by routes.js */}
        <Col>
          <div className="text-center mt-5">
            <p>Select an option from the navigation menu</p>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default Operations;
