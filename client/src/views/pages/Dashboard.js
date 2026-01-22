import React, { useState } from 'react';
import { NavLink, Switch, Route, useHistory, useLocation } from 'react-router-dom';
import { Row, Col, Card, Button, Dropdown, Badge } from 'react-bootstrap';
import { useAuth } from 'contexts/AuthContext';
import CsLineIcons from 'cs-line-icons/CsLineIcons';
import HtmlHead from 'components/html-head/HtmlHead';
import BreadcrumbList from 'components/breadcrumb-list/BreadcrumbList';

// Import all dashboard pages
import DashboardHome from './Dashboardhome';
import RoomCategories from './operation/Room/Roomcategories';
import Rooms from './operation/Room/Rooms';
import Bookings from './operation/booking/Bookings';
import NewBooking from './operation/booking/Newbooking';
import CheckInOut from './operation/booking/Checkinout';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const history = useHistory();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const title = 'Hotel Dashboard';
  const description = 'Hotel Management System Dashboard';

  const handleLogout = () => {
    logout();
    history.push('/login');
  };

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const getBreadcrumbs = () => {
    const path = location.pathname;
    const crumbs = [{ to: '/dashboard', text: 'Dashboard' }];

    if (path.includes('/dashboard/room-categories')) {
      crumbs.push({ to: '/dashboard/room-categories', text: 'Room Categories' });
    } else if (path.includes('/dashboard/rooms')) {
      crumbs.push({ to: '/dashboard/rooms', text: 'Manage Rooms' });
    } else if (path.includes('/dashboard/bookings')) {
      if (path.includes('/dashboard/bookings/new')) {
        crumbs.push({ to: '/dashboard/bookings', text: 'Bookings' });
        crumbs.push({ to: '/dashboard/bookings/new', text: 'New Booking' });
      } else {
        crumbs.push({ to: '/dashboard/bookings', text: 'All Bookings' });
      }
    } else if (path.includes('/dashboard/check-in-out')) {
      crumbs.push({ to: '/dashboard/check-in-out', text: 'Check-In/Out' });
    }

    return crumbs;
  };

  return (
    <>
      <HtmlHead title={title} description={description} />

      <Row className="g-0">
        {/* Sidebar - Desktop */}
        <Col xxl="2" xl="3" className="d-none d-xl-block">
          <div className="position-fixed h-100 start-0" style={{ width: '280px', zIndex: 1000, background: 'var(--bs-light)' }}>
            <div className="d-flex flex-column h-100">
              {/* Sidebar Navigation */}
              <div className="flex-grow-1 px-3 py-4">

                <div className="mb-4">
                  <h6 className="text-small text-muted text-uppercase mb-2">ROOMS</h6>
                  <NavLink to="/dashboard/room-categories" className="nav-link mb-2" activeClassName="active" onClick={() => setMobileMenuOpen(false)}>
                    <CsLineIcons icon="tag" className="me-2" size="17" />
                    Room Categories
                  </NavLink>
                  <NavLink to="/dashboard/rooms" className="nav-link mb-2" activeClassName="active" onClick={() => setMobileMenuOpen(false)}>
                    <CsLineIcons icon="bed" className="me-2" size="17" />
                    Manage Rooms
                  </NavLink>
                </div>

                <div className="mb-4">
                  <h6 className="text-small text-muted text-uppercase mb-2">BOOKINGS</h6>
                  <NavLink to="/dashboard/bookings" exact className="nav-link mb-2" activeClassName="active" onClick={() => setMobileMenuOpen(false)}>
                    <CsLineIcons icon="calendar" className="me-2" size="17" />
                    All Bookings
                  </NavLink>
                  <NavLink to="/dashboard/bookings/new" className="nav-link mb-2" activeClassName="active" onClick={() => setMobileMenuOpen(false)}>
                    <CsLineIcons icon="plus" className="me-2" size="17" />
                    New Booking
                  </NavLink>
                  <NavLink to="/dashboard/check-in-out" className="nav-link mb-2" activeClassName="active" onClick={() => setMobileMenuOpen(false)}>
                    <CsLineIcons icon="key" className="me-2" size="17" />
                    Check-In/Out
                  </NavLink>
                </div>
              </div>

              {/* Sidebar Footer */}
              <div className="border-top px-3 py-3">
                <div className="d-flex align-items-center mb-3">
                  <div className="bg-gradient-primary sh-4 sw-4 rounded-circle d-flex justify-content-center align-items-center me-2">
                    <span className="text-white">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                  </div>
                  <div className="flex-grow-1">
                    <p className="mb-0 text-small">{user?.name}</p>
                    <small className="text-muted text-small">{user?.role}</small>
                  </div>
                  <Button variant="outline-danger" size="sm" onClick={handleLogout} className="btn-icon btn-icon-only">
                    <CsLineIcons icon="logout" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Col>

        {/* Main Content */}
        <Col xxl="10" xl="9" className="offset-xxl-2 offset-xl-3">
          {/* Mobile Sidebar Overlay */}
          {mobileMenuOpen && (
            <div className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50" style={{ zIndex: 9998 }} onClick={() => setMobileMenuOpen(false)} />
          )}

          {/* Mobile Sidebar */}
          <div
            className={`position-fixed top-0 start-0 h-100 bg-light shadow-lg ${mobileMenuOpen ? 'd-block' : 'd-none'}`}
            style={{ width: '280px', zIndex: 9999, transition: 'transform 0.3s ease' }}
          >
            <div className="d-flex flex-column h-100">
              <div className="px-4 py-3 border-bottom">
                <div className="d-flex align-items-center">
                  <div className="bg-gradient-primary sh-5 sw-5 rounded-xl d-flex justify-content-center align-items-center me-3">
                    <CsLineIcons icon="building" className="text-white" />
                  </div> 
                  <div>
                    <h5 className="mb-0">{user?.hotel_name || 'Hotel'}</h5>
                    <small className="text-muted">Management System</small>
                  </div>
                </div>
              </div>

              <div className="flex-grow-1 px-3 py-4 overflow-auto">
                <div className="mb-4">
                  <h6 className="text-small text-muted text-uppercase mb-2">MAIN</h6>
                  <NavLink to="/dashboard" exact className="nav-link mb-2" activeClassName="active" onClick={() => setMobileMenuOpen(false)}>
                    <CsLineIcons icon="home" className="me-2" size="17" />
                    Dashboard
                  </NavLink>
                </div>

                <div className="mb-4">
                  <h6 className="text-small text-muted text-uppercase mb-2">ROOMS</h6>
                  <NavLink to="/dashboard/room-categories" className="nav-link mb-2" activeClassName="active" onClick={() => setMobileMenuOpen(false)}>
                    <CsLineIcons icon="tag" className="me-2" size="17" />
                    Room Categories
                  </NavLink>
                  <NavLink to="/dashboard/rooms" className="nav-link mb-2" activeClassName="active" onClick={() => setMobileMenuOpen(false)}>
                    <CsLineIcons icon="bed" className="me-2" size="17" />
                    Manage Rooms
                  </NavLink>
                </div>

                <div className="mb-4">
                  <h6 className="text-small text-muted text-uppercase mb-2">BOOKINGS</h6>
                  <NavLink to="/dashboard/bookings" exact className="nav-link mb-2" activeClassName="active" onClick={() => setMobileMenuOpen(false)}>
                    <CsLineIcons icon="calendar" className="me-2" size="17" />
                    All Bookings
                  </NavLink>
                  <NavLink to="/dashboard/bookings/new" className="nav-link mb-2" activeClassName="active" onClick={() => setMobileMenuOpen(false)}>
                    <CsLineIcons icon="plus" className="me-2" size="17" />
                    New Booking
                  </NavLink>
                  <NavLink to="/dashboard/check-in-out" className="nav-link mb-2" activeClassName="active" onClick={() => setMobileMenuOpen(false)}>
                    <CsLineIcons icon="key" className="me-2" size="17" />
                    Check-In/Out
                  </NavLink>
                </div>
              </div>

              <div className="border-top px-3 py-3">
                <div className="d-flex align-items-center">
                  <div className="bg-gradient-primary sh-4 sw-4 rounded-circle d-flex justify-content-center align-items-center me-2">
                    <span className="text-white">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                  </div>
                  <div className="flex-grow-1">
                    <p className="mb-0 text-small">{user?.name}</p>
                    <small className="text-muted text-small">{user?.role}</small>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="content-area">
            <Switch>
              <Route exact path="/dashboard" component={DashboardHome} />
              <Route path="/dashboard/room-categories" component={RoomCategories} />
              <Route path="/dashboard/rooms" component={Rooms} />
              <Route exact path="/dashboard/bookings" component={Bookings} />
              <Route path="/dashboard/bookings/new" component={NewBooking} />
              <Route path="/dashboard/check-in-out" component={CheckInOut} />
            </Switch>
          </div>
        </Col>
      </Row>
    </>
  );
};

export default Dashboard;
