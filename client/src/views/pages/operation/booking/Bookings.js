import React, { useState, useEffect, useMemo } from 'react';
import { useHistory, Link } from 'react-router-dom';
import { Card, Row, Col, Button, Form, Badge, Table, Spinner, Alert, Dropdown, InputGroup } from 'react-bootstrap';
import { bookingAPI } from 'services/api';
import { toast } from 'react-toastify';
import { format, parseISO, isToday, isTomorrow, isPast, isFuture } from 'date-fns';
import HtmlHead from 'components/html-head/HtmlHead';
import BreadcrumbList from 'components/breadcrumb-list/BreadcrumbList';
import CsLineIcons from 'cs-line-icons/CsLineIcons';

const Bookings = () => {
  const history = useHistory();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedBooking, setSelectedBooking] = useState(null);

  // Filters state
  const [filters, setFilters] = useState({
    status: '',
    source: '',
    payment_status: '',
    date_range: '',
    search: '',
  });

  // Pagination state
  const [pagination, setPagination] = useState({
    pageSize: 10,
    pageIndex: 0,
    total: 0,
  });

  // Stats for dashboard
  const [stats, setStats] = useState({
    total: 0,
    confirmed: 0,
    checked_in: 0,
    today_checkins: 0,
    today_checkouts: 0,
  });

  const title = 'Bookings Management';
  const description = 'View and manage all hotel bookings';

  const breadcrumbs = [
    { to: '/operations', text: 'Operations' },
    { to: '/operations/bookings', text: 'All Bookings' },
  ];

  // Calculate statistics
  const calculateStats = (bookingData) => {
    const statsData = {
      total: bookingData.length,
      confirmed: 0,
      checked_in: 0,
      today_checkins: 0,
      today_checkouts: 0,
    };

    const today = new Date();

    bookingData.forEach(booking => {
      if (booking.booking_status === 'confirmed') statsData.confirmed++;
      if (booking.booking_status === 'checked_in') statsData.checked_in++;

      const checkInDate = parseISO(booking.check_in_date);
      const checkOutDate = parseISO(booking.check_out_date);

      if (isToday(checkInDate)) statsData.today_checkins++;
      if (isToday(checkOutDate)) statsData.today_checkouts++;
    });

    setStats(statsData);
  };

  // Fetch bookings with pagination
  const fetchBookings = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
      };

      // Add filters
      if (filters.status) params.status = filters.status;
      if (filters.source) params.source = filters.source;
      if (filters.payment_status) params.payment_status = filters.payment_status;
      if (filters.date_range) params.date_range = filters.date_range;
      if (filters.search) params.search = filters.search;

      const response = await bookingAPI.getAll(params);
      const { data } = response;

      setBookings(data.data || []);
      setPagination(prev => ({
        ...prev,
        total: data.total || data.data?.length || 0,
        pageCount: Math.ceil((data.total || data.data?.length || 0) / pagination.pageSize)
      }));

      // Calculate stats
      if (data.data) {
        calculateStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [filters, pagination.pageIndex, pagination.pageSize, refreshKey]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      source: '',
      payment_status: '',
      date_range: '',
      search: '',
    });
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  };

  const handleQuickAction = async (action, bookingId) => {
    try {
      switch (action) {
        case 'checkin':
          history.push(`/operations/bookings/${bookingId}/check-in`);
          break;
        case 'checkout':
          history.push(`/operations/bookings/${bookingId}/check-out`);
          break;
        case 'cancel':
          if (window.confirm('Are you sure you want to cancel this booking?')) {
            await bookingAPI.cancel(bookingId);
            toast.success('Booking cancelled successfully');
            setRefreshKey(prev => prev + 1);
          }
          break;
        case 'mark_no_show':
          if (window.confirm('Mark this booking as No Show?')) {
            await bookingAPI.update(bookingId, { booking_status: 'no_show' });
            toast.success('Booking marked as No Show');
            setRefreshKey(prev => prev + 1);
          }
          break;
        default:
          break;
      }
    } catch (error) {
      console.error(`Error performing ${action}:`, error);
      toast.error(error.response?.data?.message || `Failed to ${action}`);
    }
  };

  const handleViewDetails = (booking) => {
    history.push(`/operations/bookings/${booking._id}`);
  };

  const handleExport = async () => {
    try {
      const response = await bookingAPI.export(filters);
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `bookings_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Export started');
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Failed to export bookings');
    }
  };

  // Helper functions
  const getStatusBadge = (status) => {
    const badges = {
      confirmed: { bg: 'success', text: 'Confirmed', icon: 'check' },
      checked_in: { bg: 'primary', text: 'Checked In', icon: 'log-in' },
      checked_out: { bg: 'info', text: 'Checked Out', icon: 'log-out' },
      cancelled: { bg: 'danger', text: 'Cancelled', icon: 'x-circle' },
      no_show: { bg: 'warning', text: 'No Show', icon: 'user-x' },
    };
    const badge = badges[status] || { bg: 'secondary', text: status, icon: 'help-circle' };
    return (
      <Badge bg={badge.bg} className="d-flex align-items-center gap-1" style={{ width: 'fit-content' }}>
        <CsLineIcons icon={badge.icon} size="12" />
        {badge.text}
      </Badge>
    );
  };

  const getPaymentBadge = (status) => {
    const badges = {
      pending: { bg: 'warning', text: 'Pending', icon: 'clock' },
      paid: { bg: 'success', text: 'Paid', icon: 'check-circle' },
      refunded: { bg: 'info', text: 'Refunded', icon: 'refresh-cw' },
      partial: { bg: 'primary', text: 'Partial', icon: 'dollar-sign' },
    };
    const badge = badges[status] || { bg: 'secondary', text: status, icon: 'help-circle' };
    return (
      <Badge bg={badge.bg} className="d-flex align-items-center gap-1" style={{ width: 'fit-content' }}>
        <CsLineIcons icon={badge.icon} size="12" />
        {badge.text}
      </Badge>
    );
  };

  const formatDate = (date) => {
    return format(parseISO(date), 'MMM dd, yyyy');
  };

  const formatDateWithDay = (date) => {
    return format(parseISO(date), 'EEE, MMM dd, yyyy');
  };

  const getDateStatus = (date, type = 'checkin') => {
    const dateObj = parseISO(date);
    if (isToday(dateObj)) {
      return <Badge bg="warning">Today</Badge>;
    } else if (isTomorrow(dateObj)) {
      return <Badge bg="info">Tomorrow</Badge>;
    } else if (isPast(dateObj)) {
      return <Badge bg="secondary">Past</Badge>;
    }
    return null;
  };

  // Calculate total pages
  const totalPages = Math.ceil(pagination.total / pagination.pageSize);

  if (loading && bookings.length === 0) {
    return (
      <>
        <HtmlHead title={title} description={description} />
        <Row>
          <Col>
            <div className="page-title-container mb-4">
              <h1 className="mb-0 pb-0 display-4">{title}</h1>
              <BreadcrumbList items={breadcrumbs} />
            </div>
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" className="mb-3" />
              <p>Loading bookings...</p>
            </div>
          </Col>
        </Row>
      </>
    );
  }

  return (
    <>
      <HtmlHead title={title} description={description} />
      <div className="page-title-container mb-4">
        <Row className="align-items-center">
          <Col xs="12" md="7">
            <h1 className="mb-0 pb-0 display-4">{title}</h1>
            <BreadcrumbList items={breadcrumbs} />
          </Col>
          <Col xs="12" md="5" className="text-end">
            <div className="d-flex gap-2 justify-content-end">
              <Button variant="outline-primary" onClick={handleExport}>
                <CsLineIcons icon="download" className="me-2" />
                Export
              </Button>
              <Button variant="primary" as={Link} to="/operations/new-booking">
                <CsLineIcons icon="plus" className="me-2" />
                New Booking
              </Button>
            </div>
          </Col>
        </Row>
      </div>

      {/* Stats Dashboard */}
      <Row className="mb-4">
        <Col xl={2} lg={4} md={6} className="mb-3">
          <Card className="h-100">
            <Card.Body className="d-flex align-items-center">
              <div className="bg-gradient-primary sh-5 sw-5 rounded-xl d-flex justify-content-center align-items-center me-3">
                <CsLineIcons icon="calendar" className="text-white" />
              </div>
              <div>
                <div className="text-muted text-small">Total Bookings</div>
                <div className="text-primary h4 mb-0">{stats.total}</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xl={2} lg={4} md={6} className="mb-3">
          <Card className="h-100">
            <Card.Body className="d-flex align-items-center">
              <div className="bg-gradient-success sh-5 sw-5 rounded-xl d-flex justify-content-center align-items-center me-3">
                <CsLineIcons icon="check" className="text-white" />
              </div>
              <div>
                <div className="text-muted text-small">Confirmed</div>
                <div className="text-success h4 mb-0">{stats.confirmed}</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xl={2} lg={4} md={6} className="mb-3">
          <Card className="h-100">
            <Card.Body className="d-flex align-items-center">
              <div className="bg-gradient-primary sh-5 sw-5 rounded-xl d-flex justify-content-center align-items-center me-3">
                <CsLineIcons icon="log-in" className="text-white" />
              </div>
              <div>
                <div className="text-muted text-small">Checked In</div>
                <div className="text-primary h4 mb-0">{stats.checked_in}</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xl={2} lg={4} md={6} className="mb-3">
          <Card className="h-100">
            <Card.Body className="d-flex align-items-center">
              <div className="bg-gradient-warning sh-5 sw-5 rounded-xl d-flex justify-content-center align-items-center me-3">
                <CsLineIcons icon="arrow-right" className="text-white" />
              </div>
              <div>
                <div className="text-muted text-small">Today Check-ins</div>
                <div className="text-warning h4 mb-0">{stats.today_checkins}</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xl={2} lg={4} md={6} className="mb-3">
          <Card className="h-100">
            <Card.Body className="d-flex align-items-center">
              <div className="bg-gradient-info sh-5 sw-5 rounded-xl d-flex justify-content-center align-items-center me-3">
                <CsLineIcons icon="arrow-left" className="text-white" />
              </div>
              <div>
                <div className="text-muted text-small">Today Check-outs</div>
                <div className="text-info h4 mb-0">{stats.today_checkouts}</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xl={2} lg={4} md={6} className="mb-3">
          <Card className="h-100">
            <Card.Body className="d-flex align-items-center">
              <div className="bg-gradient-secondary sh-5 sw-5 rounded-xl d-flex justify-content-center align-items-center me-3">
                <CsLineIcons icon="file-text" className="text-white" />
              </div>
              <div>
                <div className="text-muted text-small">Active</div>
                <div className="text-secondary h4 mb-0">{stats.confirmed + stats.checked_in}</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Filters Card */}
      <Card className="mb-4">
        <Card.Header>
          <h5 className="mb-0">Filters</h5>
        </Card.Header>
        <Card.Body>
          <Row className="g-3">
            <Col md={3}>
              <Form.Group>
                <Form.Label>Booking Status</Form.Label>
                <Form.Select name="status" value={filters.status} onChange={handleFilterChange}>
                  <option value="">All Status</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="checked_in">Checked In</option>
                  <option value="checked_out">Checked Out</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="no_show">No Show</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Payment Status</Form.Label>
                <Form.Select name="payment_status" value={filters.payment_status} onChange={handleFilterChange}>
                  <option value="">All Payments</option>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="partial">Partial</option>
                  <option value="refunded">Refunded</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Booking Source</Form.Label>
                <Form.Select name="source" value={filters.source} onChange={handleFilterChange}>
                  <option value="">All Sources</option>
                  <option value="direct">Direct</option>
                  <option value="booking.com">Booking.com</option>
                  <option value="makemytrip">MakeMyTrip</option>
                  <option value="walk_in">Walk-in</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Date Range</Form.Label>
                <Form.Select name="date_range" value={filters.date_range} onChange={handleFilterChange}>
                  <option value="">All Dates</option>
                  <option value="today">Today</option>
                  <option value="tomorrow">Tomorrow</option>
                  <option value="this_week">This Week</option>
                  <option value="next_week">Next Week</option>
                  <option value="this_month">This Month</option>
                  <option value="next_month">Next Month</option>
                  <option value="past">Past Bookings</option>
                  <option value="upcoming">Upcoming</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={12}>
              <Form.Group>
                <Form.Label>Search</Form.Label>
                <InputGroup>
                  <InputGroup.Text>
                    <CsLineIcons icon="search" />
                  </InputGroup.Text>
                  <Form.Control
                    type="text"
                    name="search"
                    value={filters.search}
                    onChange={handleFilterChange}
                    placeholder="Search by guest name, email, phone, or booking reference..."
                  />
                </InputGroup>
              </Form.Group>
            </Col>
            <Col xs="12">
              <div className="d-flex gap-2">
                <Button variant="outline-secondary" size="sm" onClick={clearFilters}>
                  <CsLineIcons icon="rotate-ccw" className="me-1" />
                  Clear Filters
                </Button>
                <div className="ms-auto">
                  <small className="text-muted">
                    Showing {Math.min(pagination.total, 1)}-{Math.min(pagination.total, pagination.pageSize)} of {pagination.total} bookings
                  </small>
                </div>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Bookings Table Card */}
      <Card>
        <Card.Body>
          {bookings.length === 0 ? (
            <Alert variant="info" className="text-center">
              <CsLineIcons icon="inbox" size={48} className="mb-3" />
              <h5>No bookings found</h5>
              <p className="mb-3">Try adjusting your filters or create a new booking</p>
              <Button variant="primary" as={Link} to="/operations/new-booking">
                Create New Booking
              </Button>
            </Alert>
          ) : (
            <>
              <div className="table-responsive">
                <Table hover className="mb-0">
                  <thead>
                    <tr>
                      <th className="text-muted text-small text-uppercase">Reference</th>
                      <th className="text-muted text-small text-uppercase">Guest</th>
                      <th className="text-muted text-small text-uppercase">Room(s)</th>
                      <th className="text-muted text-small text-uppercase">Check-In</th>
                      <th className="text-muted text-small text-uppercase">Check-Out</th>
                      <th className="text-muted text-small text-uppercase">Amount</th>
                      <th className="text-muted text-small text-uppercase">Status</th>
                      <th className="text-muted text-small text-uppercase">Payment</th>
                      <th className="text-muted text-small text-uppercase text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((booking) => (
                      <tr key={booking._id} className="hover-border-primary">
                        <td>
                          <div className="font-weight-bold">{booking.booking_reference}</div>
                          <small className="text-muted d-block">
                            {format(parseISO(booking.created_at), 'MMM dd, yyyy')}
                          </small>
                        </td>
                        <td>
                          <div className="font-weight-bold">{booking.customer_name}</div>
                          <div className="text-muted text-small">{booking.customer_email}</div>
                          <div className="text-muted text-small">{booking.customer_phone}</div>
                        </td>
                        <td>
                          {booking.is_group_booking ? (
                            <div>
                              <Badge bg="info" className="me-1">Group</Badge>
                              <span>{booking.room_details?.length || 1} rooms</span>
                              <div className="text-small text-muted">
                                {booking.room_details?.map(r => r.room_number).join(', ')}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="font-weight-bold">{booking.room_details?.room_number || 'N/A'}</div>
                              {booking.room_details?.category_name && (
                                <div className="text-muted text-small">{booking.room_details.category_name}</div>
                              )}
                            </div>
                          )}
                        </td>
                        <td>
                          <div>{formatDateWithDay(booking.check_in_date)}</div>
                          <div>{getDateStatus(booking.check_in_date, 'checkin')}</div>
                        </td>
                        <td>
                          <div>{formatDateWithDay(booking.check_out_date)}</div>
                          <div>{getDateStatus(booking.check_out_date, 'checkout')}</div>
                        </td>
                        <td>
                          <div className="text-primary font-weight-bold">
                            {process.env.REACT_APP_CURRENCY} {booking.total_amount?.toFixed(2) || '0.00'}
                          </div>
                          <div className="text-muted text-small">
                            {booking.guests_count} guest{booking.guests_count !== 1 ? 's' : ''}
                          </div>
                        </td>
                        <td>{getStatusBadge(booking.booking_status)}</td>
                        <td>{getPaymentBadge(booking.payment_status)}</td>
                        <td className="text-end">
                          <div className="d-flex gap-1 justify-content-end">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => handleViewDetails(booking)}
                              title="View Details"
                            >
                              <CsLineIcons icon="eye" />
                            </Button>

                            <Dropdown className="d-inline-block">
                              <Dropdown.Toggle variant="outline-secondary" size="sm" id={`actions-${booking._id}`}>
                                <CsLineIcons icon="more-vertical" />
                              </Dropdown.Toggle>
                              <Dropdown.Menu align="end">
                                <Dropdown.Item as={Link} to={`/operations/bookings/${booking._id}`}>
                                  <CsLineIcons icon="file-text" className="me-2" />
                                  View Details
                                </Dropdown.Item>

                                {booking.booking_status === 'confirmed' && (
                                  <>
                                    <Dropdown.Item as={Link} to={`/operations/bookings/${booking._id}/check-in`}>
                                      <CsLineIcons icon="log-in" className="me-2" />
                                      Check In
                                    </Dropdown.Item>
                                    <Dropdown.Divider />
                                    <Dropdown.Item onClick={() => handleQuickAction('cancel', booking._id)} className="text-danger">
                                      <CsLineIcons icon="x-circle" className="me-2" />
                                      Cancel Booking
                                    </Dropdown.Item>
                                    <Dropdown.Item onClick={() => handleQuickAction('mark_no_show', booking._id)} className="text-warning">
                                      <CsLineIcons icon="user-x" className="me-2" />
                                      Mark as No Show
                                    </Dropdown.Item>
                                  </>
                                )}

                                {booking.booking_status === 'checked_in' && (
                                  <Dropdown.Item as={Link} to={`/operations/bookings/${booking._id}/check-out`}>
                                    <CsLineIcons icon="log-out" className="me-2" />
                                    Check Out
                                  </Dropdown.Item>
                                )}

                                <Dropdown.Divider />
                                <Dropdown.Item as={Link} to={`/operations/bookings/${booking._id}/invoice`}>
                                  <CsLineIcons icon="file-text" className="me-2" />
                                  Generate Invoice
                                </Dropdown.Item>
                                <Dropdown.Item as={Link} to={`/operations/bookings/${booking._id}/edit`}>
                                  <CsLineIcons icon="edit" className="me-2" />
                                  Edit Booking
                                </Dropdown.Item>
                              </Dropdown.Menu>
                            </Dropdown>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination.total > pagination.pageSize && (
                <div className="d-flex justify-content-between align-items-center mt-4">
                  <div className="text-muted">
                    Showing {(pagination.pageIndex * pagination.pageSize) + 1} to{' '}
                    {Math.min((pagination.pageIndex + 1) * pagination.pageSize, pagination.total)} of {pagination.total} bookings
                  </div>
                  <div className="d-flex gap-2 align-items-center">
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => setPagination(prev => ({ ...prev, pageIndex: Math.max(0, prev.pageIndex - 1) }))}
                      disabled={pagination.pageIndex === 0}
                    >
                      <CsLineIcons icon="chevron-left" />
                    </Button>

                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i;
                      } else if (pagination.pageIndex < 2) {
                        pageNum = i;
                      } else if (pagination.pageIndex > totalPages - 3) {
                        pageNum = totalPages - 5 + i;
                      } else {
                        pageNum = pagination.pageIndex - 2 + i;
                      }

                      return (
                        <Button
                          key={pageNum}
                          variant={pagination.pageIndex === pageNum ? 'primary' : 'outline-primary'}
                          size="sm"
                          onClick={() => setPagination(prev => ({ ...prev, pageIndex: pageNum }))}
                          style={{ minWidth: '36px' }}
                        >
                          {pageNum + 1}
                        </Button>
                      );
                    })}

                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => setPagination(prev => ({ ...prev, pageIndex: Math.min(totalPages - 1, prev.pageIndex + 1) }))}
                      disabled={pagination.pageIndex >= totalPages - 1}
                    >
                      <CsLineIcons icon="chevron-right" />
                    </Button>

                    <Form.Select
                      size="sm"
                      style={{ width: 'auto' }}
                      value={pagination.pageSize}
                      onChange={(e) => setPagination(prev => ({ ...prev, pageSize: Number(e.target.value), pageIndex: 0 }))}
                    >
                      <option value={10}>10 per page</option>
                      <option value={25}>25 per page</option>
                      <option value={50}>50 per page</option>
                      <option value={100}>100 per page</option>
                    </Form.Select>
                  </div>
                </div>
              )}
            </>
          )}
        </Card.Body>
      </Card>
    </>
  );
};

export default Bookings;