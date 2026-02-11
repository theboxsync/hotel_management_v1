import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Row, Col, Card, Button, Badge, Table, Spinner } from 'react-bootstrap';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import CsLineIcons from 'cs-line-icons/CsLineIcons';
import HtmlHead from 'components/html-head/HtmlHead';
import BreadcrumbList from 'components/breadcrumb-list/BreadcrumbList';
import { bookingAPI, roomAPI } from 'services/api';
import ChartHorizontal from './ChartBar';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalRooms: 0,
    availableRooms: 0,
    occupiedRooms: 0,
    todayCheckIns: 0,
    todayCheckOuts: 0,
    currentGuests: 0,
  });
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roomStatusData, setRoomStatusData] = useState([]);

  const title = 'Dashboard';
  const description = 'Hotel Management Dashboard Overview';

  const breadcrumbs = [{ to: '/dashboard', text: 'Dashboard' }];

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [roomsRes, checkInsRes, checkOutsRes, checkedInRes, bookingsRes] = await Promise.all([
        roomAPI.getAll(),
        bookingAPI.getTodayCheckIns(),
        bookingAPI.getTodayCheckOuts(),
        bookingAPI.getCheckedIn(),
        bookingAPI.getAll({ limit: 10 }),
      ]);

      const rooms = roomsRes.data.data || [];
      setStats({
        totalRooms: rooms.length,
        availableRooms: rooms.filter((r) => r.status === 'available').length,
        occupiedRooms: rooms.filter((r) => r.status === 'occupied').length,
        todayCheckIns: checkInsRes.data.count || 0,
        todayCheckOuts: checkOutsRes.data.count || 0,
        currentGuests: checkedInRes.data.count || 0,
      });

      setRecentBookings(bookingsRes.data.data || []);

      // Prepare room status data for chart
      const roomTypes = rooms.reduce((acc, room) => {
        const type = room.category_name || 'Unknown';
        if (!acc[type]) {
          acc[type] = { available: 0, occupied: 0, total: 0 };
        }
        acc[type].total++;
        if (room.status === 'available') acc[type].available++;
        if (room.status === 'occupied') acc[type].occupied++;
        return acc;
      }, {});

      const chartData = Object.entries(roomTypes).map(([type, data]) => ({
        _id: type,
        value: (data.occupied / data.total) * 100, // occupancy percentage
        available: data.available,
        occupied: data.occupied,
        total: data.total,
      }));

      setRoomStatusData(chartData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const formatDate = (date) => {
    return format(new Date(date), 'MMM dd, yyyy');
  };

  const getStatusBadge = (status) => {
    const badgeProps = {
      confirmed: { bg: 'success', text: 'Confirmed' },
      checked_in: { bg: 'primary', text: 'Checked In' },
      checked_out: { bg: 'info', text: 'Checked Out' },
      cancelled: { bg: 'danger', text: 'Cancelled' },
    };
    const { bg = 'secondary', text = status } = badgeProps[status] || {};
    return <Badge bg={bg}>{text}</Badge>;
  };

  const prepareRoomStatusChartData = () => {
    if (roomStatusData.length === 0) {
      return { labels: [], values: [], min: 0, max: 100 };
    }

    const labels = roomStatusData.map((item) => item._id);
    const values = roomStatusData.map((item) => item.value);
    const max = Math.max(...values, 100);
    const min = 0;

    return { labels, values, min, max };
  };

  if (loading) {
    return (
      <>
        <HtmlHead title={title} description={description} />
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
          <Spinner animation="border" variant="primary" />
        </div>
      </>
    );
  }

  return (
    <>
      <HtmlHead title={title} description={description} />

      {/* Title and Date */}
      <div className="page-title-container">
        <Row>
          <Col md="7">
            <h1 className="mb-0 pb-0 display-4">{title}</h1>
            <BreadcrumbList items={breadcrumbs} />
          </Col>
          <Col md="5" className="d-flex justify-content-end align-items-center">
            <div className="text-muted">
              <CsLineIcons icon="calendar" className="me-2" />
              {format(new Date(), 'EEEE, MMMM dd, yyyy')}
            </div>
          </Col>
        </Row>
      </div>

      {/* Stats Grid */}
      <div className="mb-5">
        <Row className="g-2">
          {/* Total Rooms Card */}
          <Col sm="6" md="4" lg="2">
            <Card className="sh-11 hover-scale-up cursor-pointer">
              <Card.Body className="h-100 py-3 align-items-center">
                <Row className="g-0 h-100 align-items-center">
                  <Col xs="auto" className="pe-3">
                    <div className="bg-gradient-light sh-5 sw-5 rounded-xl d-flex justify-content-center align-items-center">
                      <CsLineIcons icon="building" className="text-white" />
                    </div>
                  </Col>
                  <Col>
                    <Row className="gx-2 d-flex align-content-center">
                      <Col xs="12" className="col-12 d-flex">
                        <div className="d-flex align-items-center lh-1-25" style={{ fontSize: '14px' }}>
                          Total Rooms
                        </div>
                      </Col>
                      <Col xl="auto" className="col-12">
                        <div className="cta-2 text-primary" style={{ fontSize: '14px' }}>
                          {stats.totalRooms}
                        </div>
                      </Col>
                    </Row>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>

          {/* Available Rooms Card */}
          <Col sm="6" md="4" lg="2">
            <Card className="sh-11 hover-scale-up cursor-pointer">
              <Card.Body className="h-100 py-3 align-items-center">
                <Row className="g-0 h-100 align-items-center">
                  <Col xs="auto" className="pe-3">
                    <div className="bg-gradient-light sh-5 sw-5 rounded-xl d-flex justify-content-center align-items-center">
                      <CsLineIcons icon="check-circle" className="text-white" />
                    </div>
                  </Col>
                  <Col>
                    <Row className="gx-2 d-flex align-content-center">
                      <Col xs="12" className="col-12 d-flex">
                        <div className="d-flex align-items-center lh-1-25" style={{ fontSize: '14px' }}>
                          Available
                        </div>
                      </Col>
                      <Col xl="auto" className="col-12">
                        <div className="cta-2 text-success" style={{ fontSize: '14px' }}>
                          {stats.availableRooms}
                        </div>
                      </Col>
                    </Row>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>

          {/* Occupied Rooms Card */}
          <Col sm="6" md="4" lg="2">
            <Card className="sh-11 hover-scale-up cursor-pointer">
              <Card.Body className="h-100 py-3 align-items-center">
                <Row className="g-0 h-100 align-items-center">
                  <Col xs="auto" className="pe-3">
                    <div className="bg-gradient-light sh-5 sw-5 rounded-xl d-flex justify-content-center align-items-center">
                      <CsLineIcons icon="key" className="text-white" />
                    </div>
                  </Col>
                  <Col>
                    <Row className="gx-2 d-flex align-content-center">
                      <Col xs="12" className="col-12 d-flex">
                        <div className="d-flex align-items-center lh-1-25" style={{ fontSize: '14px' }}>
                          Occupied
                        </div>
                      </Col>
                      <Col xl="auto" className="col-12">
                        <div className="cta-2 text-primary" style={{ fontSize: '14px' }}>
                          {stats.occupiedRooms}
                        </div>
                      </Col>
                    </Row>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>

          {/* Current Guests Card */}
          <Col sm="6" md="4" lg="2">
            <Card className="sh-11 hover-scale-up cursor-pointer">
              <Card.Body className="h-100 py-3 align-items-center">
                <Row className="g-0 h-100 align-items-center">
                  <Col xs="auto" className="pe-3">
                    <div className="bg-gradient-light sh-5 sw-5 rounded-xl d-flex justify-content-center align-items-center">
                      <CsLineIcons icon="user" className="text-white" />
                    </div>
                  </Col>
                  <Col>
                    <Row className="gx-2 d-flex align-content-center">
                      <Col xs="12" className="col-12 d-flex">
                        <div className="d-flex align-items-center lh-1-25" style={{ fontSize: '14px' }}>
                          Current Guests
                        </div>
                      </Col>
                      <Col xl="auto" className="col-12">
                        <div className="cta-2 text-warning" style={{ fontSize: '14px' }}>
                          {stats.currentGuests}
                        </div>
                      </Col>
                    </Row>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>

          {/* Today's Check-Ins Card */}
          <Col sm="6" md="4" lg="2">
            <Card className="sh-11 hover-scale-up cursor-pointer" as={NavLink} to="/dashboard/check-in-out">
              <Card.Body className="h-100 py-3 align-items-center">
                <Row className="g-0 h-100 align-items-center">
                  <Col xs="auto" className="pe-3">
                    <div className="bg-gradient-light sh-5 sw-5 rounded-xl d-flex justify-content-center align-items-center">
                      <CsLineIcons icon="login" className="text-white" />
                    </div>
                  </Col>
                  <Col>
                    <Row className="gx-2 d-flex align-content-center">
                      <Col xs="12" className="col-12 d-flex">
                        <div className="d-flex align-items-center lh-1-25" style={{ fontSize: '14px' }}>
                          Today's Check-Ins
                        </div>
                      </Col>
                      <Col xl="auto" className="col-12">
                        <div className="cta-2 text-info" style={{ fontSize: '14px' }}>
                          {stats.todayCheckIns}
                        </div>
                      </Col>
                    </Row>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>

          {/* Today's Check-Outs Card */}
          <Col sm="6" md="4" lg="2">
            <Card className="sh-11 hover-scale-up cursor-pointer" as={NavLink} to="/dashboard/check-in-out">
              <Card.Body className="h-100 py-3 align-items-center">
                <Row className="g-0 h-100 align-items-center">
                  <Col xs="auto" className="pe-3">
                    <div className="bg-gradient-light sh-5 sw-5 rounded-xl d-flex justify-content-center align-items-center">
                      <CsLineIcons icon="logout" className="text-white" />
                    </div>
                  </Col>
                  <Col>
                    <Row className="gx-2 d-flex align-content-center">
                      <Col xs="12" className="col-12 d-flex">
                        <div className="d-flex align-items-center lh-1-25" style={{ fontSize: '14px' }}>
                          Today's Check-Outs
                        </div>
                      </Col>
                      <Col xl="auto" className="col-12">
                        <div className="cta-2 text-danger" style={{ fontSize: '14px' }}>
                          {stats.todayCheckOuts}
                        </div>
                      </Col>
                    </Row>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </div>

      <Row>
        <Col lg="6">
          {/* Quick Actions */}
          <h2 className="small-title">Quick Actions</h2>
          <div className="mb-5">
            <Row className="g-2">
              <Col sm="6">
                <Card className="sh-11 hover-scale-up cursor-pointer" as={NavLink} to="/dashboard/bookings/new">
                  <Card.Body className="h-100 py-3">
                    <div className="d-flex flex-column justify-content-between h-100">
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="text-muted" style={{ fontSize: '14px' }}>
                          New Booking
                        </div>
                        <CsLineIcons icon="plus" className="text-primary" size="17" />
                      </div>
                      <div className="cta-3 text-primary mt-2" style={{ fontSize: '12px' }}>
                        Create new reservation
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              <Col sm="6">
                <Card className="sh-11 hover-scale-up cursor-pointer" as={NavLink} to="/dashboard/check-in-out">
                  <Card.Body className="h-100 py-3">
                    <div className="d-flex flex-column justify-content-between h-100">
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="text-muted" style={{ fontSize: '14px' }}>
                          Check-In/Out
                        </div>
                        <CsLineIcons icon="key" className="text-primary" size="17" />
                      </div>
                      <div className="cta-3 text-primary mt-2" style={{ fontSize: '12px' }}>
                        Manage guest arrivals
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              <Col sm="6">
                <Card className="sh-11 hover-scale-up cursor-pointer" as={NavLink} to="/dashboard/rooms">
                  <Card.Body className="h-100 py-3">
                    <div className="d-flex flex-column justify-content-between h-100">
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="text-muted" style={{ fontSize: '14px' }}>
                          Manage Rooms
                        </div>
                        <CsLineIcons icon="home" className="text-primary" size="17" />
                      </div>
                      <div className="cta-3 text-primary mt-2" style={{ fontSize: '12px' }}>
                        View and update status
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              <Col sm="6">
                <Card className="sh-11 hover-scale-up cursor-pointer" as={NavLink} to="/dashboard/bookings">
                  <Card.Body className="h-100 py-3">
                    <div className="d-flex flex-column justify-content-between h-100">
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="text-muted" style={{ fontSize: '14px' }}>
                          All Bookings
                        </div>
                        <CsLineIcons icon="calendar" className="text-primary" size="17" />
                      </div>
                      <div className="cta-3 text-primary mt-2" style={{ fontSize: '12px' }}>
                        View all reservations
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </div>

          {/* Room Status Chart */}
          <h2 className="small-title">Room Status Overview</h2>
          <Card className="mb-5 sh-40">
            <Card.Body>
              {roomStatusData.length > 0 ? (
                <ChartHorizontal weeklyRevenue={prepareRoomStatusChartData()} />
              ) : (
                <div className="d-flex justify-content-center align-items-center h-100">
                  <span className="text-muted">No room data available</span>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg="6">
          {/* Recent Bookings */}
          <div className="d-flex justify-content-between mb-2">
            <h2 className="small-title">Recent Bookings</h2>
            <Button variant="background-alternate" size="xs" className="btn-icon btn-icon-end p-0 text-small" as={NavLink} to="/dashboard/bookings">
              <span className="align-bottom" style={{ fontSize: '14px' }}>
                View All
              </span>
              <CsLineIcons icon="chevron-right" className="align-middle" size="12" />
            </Button>
          </div>

          {recentBookings.length > 0 ? (
            <Card className="mb-5">
              <Card.Body className="p-0">
                <div className="table-responsive">
                  <Table hover className="mb-0">
                    <thead>
                      <tr>
                        <th className="text-muted text-small text-uppercase border-top-0 pt-3 pb-2">Reference</th>
                        <th className="text-muted text-small text-uppercase border-top-0 pt-3 pb-2">Guest</th>
                        <th className="text-muted text-small text-uppercase border-top-0 pt-3 pb-2">Room</th>
                        <th className="text-muted text-small text-uppercase border-top-0 pt-3 pb-2">Check-In</th>
                        <th className="text-muted text-small text-uppercase border-top-0 pt-3 pb-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentBookings.map((booking) => (
                        <tr key={booking._id} className="hover-border-primary cursor-pointer">
                          <td className="pt-2 pb-2 align-middle">
                            <div className="font-weight-bold">{booking.booking_reference}</div>
                          </td>
                          <td className="pt-2 pb-2 align-middle">
                            <div>{booking.customer_name}</div>
                            <small className="text-muted">{booking.customer_email}</small>
                          </td>
                          <td className="pt-2 pb-2 align-middle">{booking.room_details?.room_number || 'N/A'}</td>
                          <td className="pt-2 pb-2 align-middle">{formatDate(booking.check_in_date)}</td>
                          <td className="pt-2 pb-2 align-middle">{getStatusBadge(booking.booking_status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </Card.Body>
            </Card>
          ) : (
            <Card className="mb-5 sh-40">
              <Card.Body className="d-flex justify-content-center align-items-center">
                <span className="text-muted">No recent bookings</span>
              </Card.Body>
            </Card>
          )}

          {/* Room Occupancy Summary */}
          <h2 className="small-title">Room Occupancy Summary</h2>
          <Card>
            <Card.Body>
              {roomStatusData.length > 0 ? (
                <div className="mb-n2">
                  {roomStatusData.map((roomType, idx) => (
                    <Card className="mb-2 sh-10 sh-md-8 hover-scale-up cursor-pointer" key={idx}>
                      <Card.Body className="pt-0 pb-0 h-100">
                        <Row className="g-0 h-100 align-content-center">
                          <Col xs="1" className="d-flex align-items-center">
                            <div className={`badge rounded-pill ${idx < 3 ? 'bg-primary' : 'bg-muted'}`}>{idx + 1}</div>
                          </Col>
                          <Col md="5" className="d-flex align-items-center mb-2 mb-md-0 ps-2">
                            <div>
                              <div className="body-link text-truncate font-weight-bold" style={{ fontSize: '14px' }}>
                                {roomType._id}
                              </div>
                              <div className="text-muted" style={{ fontSize: '12px' }}>
                                {roomType.total} rooms
                              </div>
                            </div>
                          </Col>
                          <Col md="3" className="d-flex align-items-center text-muted mb-1 mb-md-0">
                            <Badge bg="success" className="me-1" style={{ fontSize: '10px' }}>
                              {roomType.available} available
                            </Badge>
                          </Col>
                          <Col md="3" className="d-flex flex-column align-items-end justify-content-center text-muted text-small">
                            <div className="text-primary font-weight-bold" style={{ fontSize: '14px' }}>
                              {roomType.occupied} occupied
                            </div>
                            <div className="text-muted" style={{ fontSize: '12px' }}>
                              {roomType.value.toFixed(1)}% occupancy
                            </div>
                          </Col>
                        </Row>
                      </Card.Body>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted py-3">No room data available</div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  );
};

export default Dashboard;
