import React, { useState, useEffect } from 'react';
import { useHistory, NavLink } from 'react-router-dom';
import { Card, Row, Col, Button, Form, Badge, Table, Modal, Spinner, Alert, Dropdown } from 'react-bootstrap';
import { bookingAPI } from 'services/api';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import HtmlHead from 'components/html-head/HtmlHead';
import BreadcrumbList from 'components/breadcrumb-list/BreadcrumbList';
import CsLineIcons from 'cs-line-icons/CsLineIcons';
// import TablePagination from './components/TablePagination';
// import ControlsPageSize from './components/ControlsPageSize';
// import ControlsSearch from './components/ControlsSearch';

const Bookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    source: '',
    search: '',
  });
  const [pageSize, setPageSize] = useState(10);
  const [pageIndex, setPageIndex] = useState(0);
  const [globalFilter, setGlobalFilter] = useState('');
  const history = useHistory();

  const title = 'Bookings';
  const description = 'Manage hotel bookings';

  const breadcrumbs = [
    { to: '/operations', text: 'Operations' },
    { to: '/operations/bookings', text: 'All Bookings' },
  ];

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.source) params.source = filters.source;
      if (filters.search) params.search = filters.search;

      const response = await bookingAPI.getAll(params);
      setBookings(response.data.data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [filters]);

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
    });
    setPageIndex(0);
  };

  const handleViewDetails = async (booking) => {
    try {
      const response = await bookingAPI.getOne(booking._id);
      setSelectedBooking(response.data.data);
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Error fetching booking details:', error);
      toast.error('Failed to fetch booking details');
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) {
      return;
    }

    try {
      await bookingAPI.cancel(bookingId);
      toast.success('Booking cancelled successfully');
      fetchBookings();
      setShowDetailsModal(false);
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast.error(error.response?.data?.message || 'Failed to cancel booking');
    }
  };

  const handleCheckIn = (bookingId) => {
    history.push(`/operations/check-in-out?booking=${bookingId}&action=checkin`);
  };

  const handleCheckOut = (bookingId) => {
    history.push(`/operations/check-in-out?booking=${bookingId}&action=checkout`);
  };

  const getStatusBadge = (status) => {
    const badgeProps = {
      confirmed: { bg: 'success', text: 'Confirmed' },
      checked_in: { bg: 'primary', text: 'Checked In' },
      checked_out: { bg: 'info', text: 'Checked Out' },
      cancelled: { bg: 'danger', text: 'Cancelled' },
      no_show: { bg: 'warning', text: 'No Show' },
    };
    const { bg = 'secondary', text = status } = badgeProps[status] || {};
    return <Badge bg={bg}>{text}</Badge>;
  };

  const getPaymentBadge = (status) => {
    const badgeProps = {
      pending: { bg: 'warning', text: 'Pending' },
      paid: { bg: 'success', text: 'Paid' },
      refunded: { bg: 'info', text: 'Refunded' },
      partial: { bg: 'primary', text: 'Partial' },
    };
    const { bg = 'secondary', text = status } = badgeProps[status] || {};
    return <Badge bg={bg}>{text}</Badge>;
  };

  const formatDate = (date) => {
    return format(new Date(date), 'MMM dd, yyyy');
  };

  const formatDateTime = (date) => {
    return format(new Date(date), 'MMM dd, yyyy hh:mm a');
  };

  // Calculate pagination
  const filteredBookings = bookings.filter((booking) => {
    if (globalFilter) {
      const searchTerm = globalFilter.toLowerCase();
      return (
        booking.customer_name?.toLowerCase().includes(searchTerm) ||
        booking.customer_email?.toLowerCase().includes(searchTerm) ||
        booking.booking_reference?.toLowerCase().includes(searchTerm)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filteredBookings.length / pageSize);
  const paginatedBookings = filteredBookings.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

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
      <Row>
        <Col>
          <div className="page-title-container mb-4">
            <Row className="align-items-center">
              <Col xs="12" md="7">
                <h1 className="mb-0 pb-0 display-4">{title}</h1>
                <BreadcrumbList items={breadcrumbs} />
              </Col>
              <Col xs="12" md="5" className="text-end">
                <Button variant="primary" as={NavLink} to="/operations/new-booking">
                  <CsLineIcons icon="plus" className="me-2" />
                  New Booking
                </Button>
              </Col>
            </Row>
          </div>

          <Card className="mb-4">
            <Card.Body>
              {/* Filters */}
              <Row className="mb-4">
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Status</Form.Label>
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
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Source</Form.Label>
                    <Form.Select name="source" value={filters.source} onChange={handleFilterChange}>
                      <option value="">All Sources</option>
                      <option value="direct">Direct</option>
                      <option value="booking.com">Booking.com</option>
                      <option value="makemytrip">MakeMyTrip</option>
                      <option value="walk_in">Walk-in</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Search</Form.Label>
                    <Form.Control type="text" name="search" value={filters.search} onChange={handleFilterChange} placeholder="Name, email, or reference..." />
                  </Form.Group>
                </Col>
                <Col xs="12" className="mt-3">
                  <Button variant="outline-secondary" size="sm" onClick={() => setFilters({ status: '', source: '', search: '' })}>
                    <CsLineIcons icon="rotate-ccw" className="me-1" />
                    Clear Filters
                  </Button>
                </Col>
              </Row>

              {/* Bookings Table */}
              {bookings.length === 0 ? (
                <Alert variant="info" className="text-center">
                  <CsLineIcons icon="inbox" className="me-2" />
                  No bookings found.
                </Alert>
              ) : (
                <div className="table-responsive">
                  <Table striped hover className="react-table">
                    <thead>
                      <tr>
                        <th className="text-muted text-small text-uppercase">Reference</th>
                        <th className="text-muted text-small text-uppercase">Guest Name</th>
                        <th className="text-muted text-small text-uppercase">Room</th>
                        <th className="text-muted text-small text-uppercase">Check-In</th>
                        <th className="text-muted text-small text-uppercase">Check-Out</th>
                        <th className="text-muted text-small text-uppercase">Amount</th>
                        <th className="text-muted text-small text-uppercase">Status</th>
                        <th className="text-muted text-small text-uppercase">Payment</th>
                        <th className="text-muted text-small text-uppercase text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedBookings.map((booking) => (
                        <tr key={booking._id} className="hover-border-primary cursor-pointer">
                          <td>
                            <div className="font-weight-bold">{booking.booking_reference}</div>
                          </td>
                          <td>
                            <div>{booking.customer_name}</div>
                            <small className="text-muted">{booking.customer_email}</small>
                          </td>
                          <td>
                            {booking.rooms?.length ? (
                              <>
                                <div className="fw-bold">
                                  {booking.rooms.map(r => r.room_number).join(', ')}
                                </div>
                                <div className="text-muted text-small">
                                  {booking.rooms.map(r => r.category_name).join(', ')}
                                </div>
                                <Badge bg="info" className="mt-1">
                                  {booking.rooms.length} Rooms
                                </Badge>
                              </>
                            ) : (
                              'N/A'
                            )}
                          </td>
                          <td>{formatDate(booking.check_in_date)}</td>
                          <td>{formatDate(booking.check_out_date)}</td>
                          <td className="text-primary font-weight-bold">{process.env.REACT_APP_CURRENCY} {booking.total_amount}</td>
                          <td>{getStatusBadge(booking.booking_status)}</td>
                          <td>{getPaymentBadge(booking.payment_status)}</td>
                          <td className="text-center">
                            <Dropdown className="d-inline-block">
                              <Dropdown.Toggle variant="outline-primary" size="sm" className="btn-icon btn-icon-only" id={`actions-${booking._id}`}>
                                <CsLineIcons icon="more-horizontal" />
                              </Dropdown.Toggle>
                              <Dropdown.Menu>
                                <Dropdown.Item onClick={() => handleViewDetails(booking)}>
                                  <CsLineIcons icon="eye" className="me-2" />
                                  View Details
                                </Dropdown.Item>
                                {booking.booking_status === 'confirmed' && (
                                  <Dropdown.Item onClick={() => handleCheckIn(booking._id)}>
                                    <CsLineIcons icon="log-in" className="me-2" />
                                    Check-In
                                  </Dropdown.Item>
                                )}
                                {booking.booking_status === 'checked_in' && (
                                  <Dropdown.Item onClick={() => handleCheckOut(booking._id)}>
                                    <CsLineIcons icon="log-out" className="me-2" />
                                    Check-Out
                                  </Dropdown.Item>
                                )}
                                {booking.booking_status === 'confirmed' && (
                                  <Dropdown.Item onClick={() => handleCancelBooking(booking._id)} className="text-danger">
                                    <CsLineIcons icon="x-circle" className="me-2" />
                                    Cancel Booking
                                  </Dropdown.Item>
                                )}
                              </Dropdown.Menu>
                            </Dropdown>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>

                  {/* Pagination */}
                  <div className="d-flex justify-content-between align-items-center mt-3">
                    <div className="text-muted">
                      Showing {pageIndex * pageSize + 1} to {Math.min((pageIndex + 1) * pageSize, filteredBookings.length)} of {filteredBookings.length}{' '}
                      bookings
                    </div>
                    <div className="d-flex gap-2">
                      <Button variant="outline-primary" size="sm" onClick={() => setPageIndex(Math.max(0, pageIndex - 1))} disabled={pageIndex === 0}>
                        <CsLineIcons icon="chevron-left" />
                      </Button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i;
                        } else if (pageIndex < 2) {
                          pageNum = i;
                        } else if (pageIndex > totalPages - 3) {
                          pageNum = totalPages - 5 + i;
                        } else {
                          pageNum = pageIndex - 2 + i;
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={pageIndex === pageNum ? 'primary' : 'outline-primary'}
                            size="sm"
                            onClick={() => setPageIndex(pageNum)}
                            style={{ minWidth: '36px' }}
                          >
                            {pageNum + 1}
                          </Button>
                        );
                      })}
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => setPageIndex(Math.min(totalPages - 1, pageIndex + 1))}
                        disabled={pageIndex >= totalPages - 1}
                      >
                        <CsLineIcons icon="chevron-right" />
                      </Button>
                    </div>
                    <Form.Select size="sm" style={{ width: 'auto' }} value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
                      <option value={10}>10 per page</option>
                      <option value={25}>25 per page</option>
                      <option value={50}>50 per page</option>
                      <option value={100}>100 per page</option>
                    </Form.Select>
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Booking Details Modal */}
      <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)} centered size="lg" scrollable>
        <Modal.Header closeButton>
          <Modal.Title>
            <div className="d-flex align-items-center">
              <CsLineIcons icon="file-text" className="me-2" />
              Booking Details
            </div>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedBooking && (
            <>
              {/* Header Info */}
              <Card className="mb-4">
                <Card.Body>
                  <Row className="g-3">
                    <Col md={6}>
                      <div className="mb-2">
                        <small className="text-muted">Booking Reference</small>
                        <div className="font-weight-bold text-primary">{selectedBooking.booking.booking_reference}</div>
                      </div>
                    </Col>
                    <Col md={6} className="text-md-end">
                      <div className="mb-2">
                        <small className="text-muted">Booking Status</small>
                        <div className="d-inline-block ms-2">{getStatusBadge(selectedBooking.booking.booking_status)}</div>
                      </div>
                      <div>
                        <small className="text-muted">Payment Status</small>
                        <div className="d-inline-block ms-2">{getPaymentBadge(selectedBooking.booking.payment_status)}</div>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* Guest Information */}
              <Card className="mb-4">
                <Card.Header>
                  <h6 className="mb-0">Guest Information</h6>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={4}>
                      <div className="mb-3">
                        <small className="text-muted d-block">Name</small>
                        <div>{selectedBooking.booking.customer_name}</div>
                      </div>
                    </Col>
                    <Col md={4}>
                      <div className="mb-3">
                        <small className="text-muted d-block">Email</small>
                        <div>{selectedBooking.booking.customer_email}</div>
                      </div>
                    </Col>
                    <Col md={4}>
                      <div className="mb-3">
                        <small className="text-muted d-block">Phone</small>
                        <div>{selectedBooking.booking.customer_phone}</div>
                      </div>
                    </Col>
                    <Col md={4}>
                      <div className="mb-3">
                        <small className="text-muted d-block">Guests</small>
                        <div>{selectedBooking.booking.guests_count}</div>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* Room Information */}
              <Card className="mb-4">
                <Card.Header>
                  <h6 className="mb-0">Room Information</h6>
                </Card.Header>
                <Card.Body>
                  <Table bordered size="sm" className="mb-0">
                    <thead>
                      <tr>
                        <th>Room #</th>
                        <th>Category</th>
                        <th>Floor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedBooking.rooms.map((room, index) => (
                        <tr key={index}>
                          <td className="fw-bold">{room.room_number}</td>
                          <td>{room.category_name}</td>
                          <td>{room.floor}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>

              {/* Booking Dates */}
              <Card className="mb-4">
                <Card.Header>
                  <h6 className="mb-0">Booking Dates</h6>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <div className="mb-3">
                        <small className="text-muted d-block">Check-In Date</small>
                        <div>{formatDate(selectedBooking.booking.check_in_date)}</div>
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="mb-3">
                        <small className="text-muted d-block">Check-Out Date</small>
                        <div>{formatDate(selectedBooking.booking.check_out_date)}</div>
                      </div>
                    </Col>
                    {selectedBooking.booking.actual_check_in && (
                      <Col md={6}>
                        <div className="mb-3">
                          <small className="text-muted d-block">Actual Check-In</small>
                          <div>{formatDateTime(selectedBooking.booking.actual_check_in)}</div>
                        </div>
                      </Col>
                    )}
                    {selectedBooking.booking.actual_check_out && (
                      <Col md={6}>
                        <div className="mb-3">
                          <small className="text-muted d-block">Actual Check-Out</small>
                          <div>{formatDateTime(selectedBooking.booking.actual_check_out)}</div>
                        </div>
                      </Col>
                    )}
                  </Row>
                </Card.Body>
              </Card>

              {/* Billing Summary */}
              <Card className="mb-4">
                <Card.Header>
                  <h6 className="mb-0">Billing Summary</h6>
                </Card.Header>
                <Card.Body>
                  <div className="border rounded">
                    <div className="p-3 border-bottom">
                      <Row>
                        <Col>
                          <small className="text-muted">
                            Room Charges ({selectedBooking.booking_summary?.nights} nights × {selectedBooking.booking.total_rooms} rooms)
                          </small>
                        </Col>
                        <Col xs="auto" className="fw-bold">
                          {process.env.REACT_APP_CURRENCY} {selectedBooking.booking.total_amount}
                        </Col>
                      </Row>
                    </div>

                    {selectedBooking.booking.discount_amount > 0 && (
                      <div className="p-3 border-bottom">
                        <Row>
                          <Col>
                            <small className="text-muted">Discount</small>
                          </Col>
                          <Col xs="auto" className="text-danger fw-bold">
                            -{process.env.REACT_APP_CURRENCY} {selectedBooking.booking.discount_amount}
                          </Col>
                        </Row>
                      </div>
                    )}

                    {selectedBooking.booking.extra_charges > 0 && (
                      <div className="p-3 border-bottom">
                        <Row>
                          <Col>
                            <small className="text-muted">Extra Charges</small>
                          </Col>
                          <Col xs="auto" className="text-primary fw-bold">
                            +{process.env.REACT_APP_CURRENCY} {selectedBooking.booking.extra_charges}
                          </Col>
                        </Row>
                      </div>
                    )}

                    <div className="p-3 bg-light">
                      <Row>
                        <Col>
                          <h6 className="mb-0">Grand Total</h6>
                        </Col>
                        <Col xs="auto">
                          <h6 className="mb-0 text-primary">
                            {process.env.REACT_APP_CURRENCY}{' '}
                            {selectedBooking.booking.total_amount + selectedBooking.booking.extra_charges}
                          </h6>
                        </Col>
                      </Row>
                    </div>
                  </div>
                </Card.Body>
              </Card>

              {/* Special Requests */}
              {selectedBooking.booking.special_requests && (
                <Card className="mb-4">
                  <Card.Header>
                    <h6 className="mb-0">Special Requests</h6>
                  </Card.Header>
                  <Card.Body>
                    <p className="mb-0">{selectedBooking.booking.special_requests}</p>
                  </Card.Body>
                </Card>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>
            Close
          </Button>
          {selectedBooking?.booking.booking_status === 'confirmed' && (
            <>
              <Button variant="primary" onClick={() => handleCheckIn(selectedBooking.booking._id)}>
                <CsLineIcons icon="log-in" className="me-2" />
                Check-In
              </Button>
              <Button variant="danger" onClick={() => handleCancelBooking(selectedBooking.booking._id)}>
                <CsLineIcons icon="x-circle" className="me-2" />
                Cancel Booking
              </Button>
            </>
          )}
          {selectedBooking?.booking.booking_status === 'checked_in' && (
            <Button variant="primary" onClick={() => handleCheckOut(selectedBooking.booking._id)}>
              <CsLineIcons icon="log-out" className="me-2" />
              Check-Out
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default Bookings;