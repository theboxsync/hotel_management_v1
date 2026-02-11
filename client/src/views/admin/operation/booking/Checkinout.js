import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, Row, Col, Button, Form, Badge, Modal, Spinner, Alert } from 'react-bootstrap';
import { bookingAPI } from 'services/api';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import HtmlHead from 'components/html-head/HtmlHead';
import BreadcrumbList from 'components/breadcrumb-list/BreadcrumbList';
import CsLineIcons from 'cs-line-icons/CsLineIcons';
import PaymentTracker from './PaymentTracker';

const CheckInOut = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const bookingIdFromUrl = queryParams.get('booking');
  const actionFromUrl = queryParams.get('action');

  const [todayCheckIns, setTodayCheckIns] = useState([]);
  const [todayCheckOuts, setTodayCheckOuts] = useState([]);
  const [checkedInGuests, setCheckedInGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(''); // 'checkin' or 'checkout'

  // Payment Tracker state
  const [showPaymentTracker, setShowPaymentTracker] = useState(false);
  const [paymentBookingId, setPaymentBookingId] = useState(null);
  const [paymentBookingRef, setPaymentBookingRef] = useState('');

  const [checkInData, setCheckInData] = useState({
    extra_charges: 0,
    extra_charges_description: '',
    notes: '',
  });

  const [checkOutData, setCheckOutData] = useState({
    extra_charges: 0,
    extra_charges_description: '',
  });

  const title = 'Check-In/Check-Out';
  const description = 'Manage guest check-in and check-out processes';

  const breadcrumbs = [
    { to: '/operations', text: 'Operations' },
    { to: '/operations/check-in-out', text: 'Check-In/Out' },
  ];

  const fetchData = async () => {
    setLoading(true);
    try {
      const [checkInsRes, checkOutsRes, checkedInRes] = await Promise.all([
        bookingAPI.getTodayCheckIns(),
        bookingAPI.getTodayCheckOuts(),
        bookingAPI.getCheckedIn(),
      ]);

      setTodayCheckIns(checkInsRes.data.data || []);
      setTodayCheckOuts(checkOutsRes.data.data || []);
      setCheckedInGuests(checkedInRes.data.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleDirectAction = async (bookingId, action) => {
    try {
      const response = await bookingAPI.getOne(bookingId);
      setSelectedBooking(response.data.data.booking);
      setModalType(action === 'checkin' ? 'checkin' : 'checkout');
      setShowModal(true);
    } catch (error) {
      console.error('Error fetching booking:', error);
      toast.error('Failed to fetch booking');
    }
  };

  useEffect(() => {
    fetchData();

    // Handle URL params for direct check-in/out
    if (bookingIdFromUrl && actionFromUrl) {
      handleDirectAction(bookingIdFromUrl, actionFromUrl);
    }
  }, []);

  const handleCheckInClick = (booking) => {
    setSelectedBooking(booking);
    setModalType('checkin');
    setCheckInData({
      extra_charges: 0,
      extra_charges_description: '',
      notes: '',
    });
    setShowModal(true);
  };

  const handleCheckOutClick = (booking) => {
    setSelectedBooking(booking);
    setModalType('checkout');
    setCheckOutData({
      extra_charges: 0,
      extra_charges_description: '',
    });
    setShowModal(true);
  };

  const handleManagePayments = (booking) => {
    setPaymentBookingId(booking._id);
    setPaymentBookingRef(booking.booking_reference);
    setShowPaymentTracker(true);
  };

  const handlePaymentAdded = () => {
    fetchData(); // Refresh the data to show updated payment status
  };

  const handleCheckIn = async (e) => {
    e.preventDefault();

    const data = {
      ...checkInData,
      extra_charges: parseFloat(checkInData.extra_charges) || 0,
    };

    try {
      await bookingAPI.checkIn(selectedBooking._id, data);
      toast.success('Guest checked in successfully!');
      fetchData();
      setShowModal(false);
    } catch (error) {
      console.error('Error checking in:', error);
      toast.error(error.response?.data?.message || 'Check-in failed');
    }
  };

  const handleCheckOut = async (e) => {
    e.preventDefault();

    const data = {
      ...checkOutData,
      extra_charges: parseFloat(checkOutData.extra_charges) || 0,
    };

    try {
      const response = await bookingAPI.checkOut(selectedBooking._id, data);
      toast.success('Guest checked out successfully!');

      // Show billing summary
      const { billing } = response.data.data;
      toast.info(`Total Bill: ${process.env.REACT_APP_CURRENCY} ${billing.grand_total}`, { autoClose: 5000 });

      fetchData();
      setShowModal(false);
    } catch (error) {
      console.error('Error checking out:', error);
      toast.error(error.response?.data?.message || 'Check-out failed');
    }
  };

  const formatDate = (date) => {
    return format(new Date(date), 'MMM dd, yyyy');
  };

  if (loading && todayCheckIns.length === 0 && todayCheckOuts.length === 0) {
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
              <p>Loading check-in/out data...</p>
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
        <Col className="h-100">
          <div className="page-title-container mb-4">
            <h1 className="mb-0 pb-0 display-4">{title}</h1>
            <BreadcrumbList items={breadcrumbs} />
          </div>

          <Row className="g-4">
            {/* Today's Check-Ins */}
            <Col lg={4}>
              <Card className="h-100">
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">
                    <CsLineIcons icon="log-in" className="me-2" />
                    Today's Check-Ins
                  </h5>
                  <Badge bg="primary" pill>
                    {todayCheckIns.length}
                  </Badge>
                </Card.Header>
                <Card.Body className="p-0">
                  {todayCheckIns.length === 0 ? (
                    <div className="text-center py-4">
                      <CsLineIcons icon="calendar" size={48} className="text-muted mb-2" />
                      <p className="text-muted mb-0">No check-ins expected today</p>
                    </div>
                  ) : (
                    <div className="scroll-area-xs">
                      <div className="scrollbar-container ps-0 pe-4" style={{ minHeight: '400px', maxHeight: '100vh', overflowY: 'auto' }}>
                        {todayCheckIns.map((booking) => (
                          <Card key={booking._id} className="mb-3 hover-border-primary">
                            <Card.Body>
                              <div className="d-flex justify-content-between align-items-start mb-2">
                                <div>
                                  <h6 className="mb-1">{booking.customer_name}</h6>
                                  <small className="text-muted d-block">{booking.booking_reference}</small>
                                </div>
                                {booking.is_checked_in ? (
                                  <Badge bg="success">
                                    <CsLineIcons icon="check" className="me-1" size="12" />
                                    Checked In
                                  </Badge>
                                ) : (
                                  <Badge bg="warning">Pending</Badge>
                                )}
                              </div>
                              <div className="mb-2">
                                <small className="text-muted d-block">
                                  <CsLineIcons icon="bed" className="me-1" size="12" />
                                  Room {booking.room_details?.room_number}
                                </small>
                                <small className="text-muted d-block">
                                  <CsLineIcons icon="user" className="me-1" size="12" />
                                  {booking.guests_count} guests
                                </small>
                                <small className="text-muted d-block">
                                  <CsLineIcons icon="phone" className="me-1" size="12" />
                                  {booking.customer_phone}
                                </small>

                                {/* Payment Status */}
                                <div className="mt-2 p-2 bg-light rounded">
                                  <div className="d-flex justify-content-between align-items-center mb-1">
                                    <Badge
                                      bg={
                                        booking.payment_status === 'paid' ? 'success' :
                                          booking.payment_status === 'partial' ? 'warning' :
                                            'secondary'
                                      }
                                      className="text-uppercase"
                                    >
                                      {booking.payment_status}
                                    </Badge>
                                    {booking.pending_amount > 0 && (
                                      <small className="text-danger fw-bold">
                                        Due: {process.env.REACT_APP_CURRENCY} {booking.pending_amount}
                                      </small>
                                    )}
                                  </div>
                                  <Button
                                    variant="outline-primary"
                                    size="sm"
                                    className="w-100 mt-1"
                                    onClick={() => handleManagePayments(booking)}
                                  >
                                    <CsLineIcons icon="credit-card" className="me-1" size="12" />
                                    Manage Payments
                                  </Button>
                                </div>
                              </div>
                              {!booking.is_checked_in && (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  className="w-100 mt-2"
                                  onClick={() => handleCheckInClick(booking)}
                                >
                                  <CsLineIcons icon="log-in" className="me-1" />
                                  Check-In
                                </Button>
                              )}
                            </Card.Body>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>

            {/* Today's Check-Outs */}
            <Col lg={4}>
              <Card className="h-100">
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">
                    <CsLineIcons icon="log-out" className="me-2" />
                    Today's Check-Outs
                  </h5>
                  <Badge bg="primary" pill>
                    {todayCheckOuts.length}
                  </Badge>
                </Card.Header>
                <Card.Body className="p-0">
                  {todayCheckOuts.length === 0 ? (
                    <div className="text-center py-4">
                      <CsLineIcons icon="calendar" size={48} className="text-muted mb-2" />
                      <p className="text-muted mb-0">No check-outs expected today</p>
                    </div>
                  ) : (
                    <div className="scroll-area-xs">
                      <div className="scrollbar-container ps-0 pe-4" style={{ minHeight: '400px', maxHeight: '100vh', overflowY: 'auto' }}>
                        {todayCheckOuts.map((booking) => (
                          <Card key={booking._id} className="mb-3 hover-border-primary">
                            <Card.Body>
                              <div className="d-flex justify-content-between align-items-start mb-2">
                                <div>
                                  <h6 className="mb-1">{booking.customer_name}</h6>
                                  <small className="text-muted d-block">{booking.booking_reference}</small>
                                </div>
                                {booking.is_checked_out ? (
                                  <Badge bg="success">
                                    <CsLineIcons icon="check" className="me-1" size="12" />
                                    Checked Out
                                  </Badge>
                                ) : (
                                  <Badge bg="warning">Pending</Badge>
                                )}
                              </div>
                              <div className="mb-2">
                                <small className="text-muted d-block">
                                  <CsLineIcons icon="bed" className="me-1" size="12" />
                                  Room {booking.room_details?.room_number}
                                </small>
                                <small className="text-muted d-block">
                                  Total: {process.env.REACT_APP_CURRENCY} {booking.total_amount}
                                </small>

                                {/* Payment Status */}
                                <div className="mt-2 p-2 bg-light rounded">
                                  <div className="d-flex justify-content-between align-items-center mb-1">
                                    <Badge
                                      bg={
                                        booking.payment_status === 'paid' ? 'success' :
                                          booking.payment_status === 'partial' ? 'warning' :
                                            'secondary'
                                      }
                                      className="text-uppercase"
                                    >
                                      {booking.payment_status}
                                    </Badge>
                                    {booking.pending_amount > 0 && (
                                      <small className="text-danger fw-bold">
                                        Due: {process.env.REACT_APP_CURRENCY} {booking.pending_amount}
                                      </small>
                                    )}
                                  </div>
                                  <Button
                                    variant="outline-primary"
                                    size="sm"
                                    className="w-100 mt-1"
                                    onClick={() => handleManagePayments(booking)}
                                  >
                                    <CsLineIcons icon="credit-card" className="me-1" size="12" />
                                    Manage Payments
                                  </Button>
                                </div>
                              </div>
                              {!booking.is_checked_out && booking.booking_status === 'checked_in' && (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  className="w-100 mt-2"
                                  onClick={() => handleCheckOutClick(booking)}
                                >
                                  <CsLineIcons icon="log-out" className="me-1" />
                                  Check-Out
                                </Button>
                              )}
                            </Card.Body>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>

            {/* Currently Checked In */}
            <Col lg={4}>
              <Card className="h-100">
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">
                    <CsLineIcons icon="users" className="me-2" />
                    Currently Checked In
                  </h5>
                  <Badge bg="primary" pill>
                    {checkedInGuests.length}
                  </Badge>
                </Card.Header>
                <Card.Body className="p-0">
                  {checkedInGuests.length === 0 ? (
                    <div className="text-center py-4">
                      <CsLineIcons icon="inbox" size={48} className="text-muted mb-2" />
                      <p className="text-muted mb-0">No guests currently checked in</p>
                    </div>
                  ) : (
                    <div className="scroll-area-xs">
                      <div className="scrollbar-container ps-0 pe-4" style={{ minHeight: '400px', maxHeight: '100vh', overflowY: 'auto' }}>
                        {checkedInGuests.map((booking) => (
                          <Card key={booking._id} className="mb-3 hover-border-primary">
                            <Card.Body>
                              <div className="d-flex justify-content-between align-items-start mb-2">
                                <div>
                                  <h6 className="mb-1">{booking.customer_name}</h6>
                                  <small className="text-muted d-block">{booking.booking_reference}</small>
                                </div>
                                <Badge bg="info">
                                  <CsLineIcons icon="calendar" className="me-1" size="12" />
                                  {booking.stay_duration_days} days
                                </Badge>
                              </div>
                              <div className="mb-2">
                                <small className="text-muted d-block">
                                  <CsLineIcons icon="bed" className="me-1" size="12" />
                                  Room {booking.room_details?.room_number}
                                </small>
                                <small className="text-muted d-block">
                                  <CsLineIcons icon="calendar" className="me-1" size="12" />
                                  Check-out: {formatDate(booking.check_out_date)}
                                </small>

                                {/* Payment Status */}
                                <div className="mt-2 p-2 bg-light rounded">
                                  <div className="d-flex justify-content-between align-items-center mb-1">
                                    <Badge
                                      bg={
                                        booking.payment_status === 'paid' ? 'success' :
                                          booking.payment_status === 'partial' ? 'warning' :
                                            'secondary'
                                      }
                                      className="text-uppercase"
                                    >
                                      {booking.payment_status}
                                    </Badge>
                                    {booking.pending_amount > 0 && (
                                      <small className="text-danger fw-bold">
                                        Due: {process.env.REACT_APP_CURRENCY} {booking.pending_amount}
                                      </small>
                                    )}
                                  </div>
                                  <Button
                                    variant="outline-primary"
                                    size="sm"
                                    className="w-100 mt-1"
                                    onClick={() => handleManagePayments(booking)}
                                  >
                                    <CsLineIcons icon="credit-card" className="me-1" size="12" />
                                    Manage Payments
                                  </Button>
                                </div>
                              </div>
                              <Button
                                variant="outline-primary"
                                size="sm"
                                className="w-100 mt-2"
                                onClick={() => handleCheckOutClick(booking)}
                              >
                                <CsLineIcons icon="log-out" className="me-1" />
                                Early Check-Out
                              </Button>
                            </Card.Body>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>

      {/* Check-In Modal */}
      <Modal show={showModal && modalType === 'checkin'} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <CsLineIcons icon="log-in" className="me-2" />
            Guest Check-In
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCheckIn}>
          <Modal.Body>
            {selectedBooking && (
              <>
                <Card className="mb-4">
                  <Card.Body>
                    <div className="d-flex align-items-center mb-3">
                      <div className="bg-gradient-primary sh-5 sw-5 rounded-xl d-flex justify-content-center align-items-center me-3">
                        <CsLineIcons icon="user" className="text-white" />
                      </div>
                      <div>
                        <h6 className="mb-0">{selectedBooking.customer_name}</h6>
                        <small className="text-muted">{selectedBooking.booking_reference}</small>
                      </div>
                    </div>
                    <Row>
                      <Col xs={4}>
                        <small className="text-muted d-block">Room</small>
                        <div className="fw-bold">{selectedBooking.room_number || 'N/A'}</div>
                      </Col>
                      <Col xs={4}>
                        <small className="text-muted d-block">Guests</small>
                        <div className="fw-bold">{selectedBooking.guests_count}</div>
                      </Col>
                      <Col xs={4}>
                        <small className="text-muted d-block">Payment</small>
                        <Badge
                          bg={
                            selectedBooking.payment_status === 'paid' ? 'success' :
                              selectedBooking.payment_status === 'partial' ? 'warning' :
                                'secondary'
                          }
                        >
                          {selectedBooking.payment_status}
                        </Badge>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>

                <Alert variant="success" className="mb-3">
                  <CsLineIcons icon="check-circle" className="me-2" />
                  <small>
                    <strong>Tip:</strong> Click "Manage Payments" button on the booking card to add payments!
                  </small>
                </Alert>

                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Extra Charges ({process.env.REACT_APP_CURRENCY})</Form.Label>
                      <Form.Control
                        type="number"
                        value={checkInData.extra_charges}
                        onChange={(e) => setCheckInData({ ...checkInData, extra_charges: e.target.value })}
                        min="0"
                        step="0.01"
                      />
                    </Form.Group>
                  </Col>
                  {checkInData.extra_charges > 0 && (
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Description</Form.Label>
                        <Form.Control
                          type="text"
                          value={checkInData.extra_charges_description}
                          onChange={(e) => setCheckInData({ ...checkInData, extra_charges_description: e.target.value })}
                          placeholder="e.g., Welcome drinks"
                        />
                      </Form.Group>
                    </Col>
                  )}
                  <Col md={12}>
                    <Form.Group>
                      <Form.Label>Notes</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        value={checkInData.notes}
                        onChange={(e) => setCheckInData({ ...checkInData, notes: e.target.value })}
                        placeholder="Any special notes..."
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              <CsLineIcons icon="check" className="me-2" />
              Confirm Check-In
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Check-Out Modal */}
      <Modal show={showModal && modalType === 'checkout'} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <CsLineIcons icon="log-out" className="me-2" />
            Guest Check-Out
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCheckOut}>
          <Modal.Body>
            {selectedBooking && (
              <>
                <Card className="mb-4">
                  <Card.Body>
                    <div className="d-flex align-items-center mb-3">
                      <div className="bg-gradient-primary sh-5 sw-5 rounded-xl d-flex justify-content-center align-items-center me-3">
                        <CsLineIcons icon="user" className="text-white" />
                      </div>
                      <div>
                        <h6 className="mb-0">{selectedBooking.customer_name}</h6>
                        <small className="text-muted">{selectedBooking.booking_reference}</small>
                      </div>
                    </div>
                    <div className="border rounded p-3 mb-3">
                      <div className="d-flex justify-content-between mb-2">
                        <span>Room Charges:</span>
                        <span className="fw-bold">
                          {process.env.REACT_APP_CURRENCY} {selectedBooking.total_amount}
                        </span>
                      </div>
                      {selectedBooking.extra_charges > 0 && (
                        <div className="d-flex justify-content-between mb-2">
                          <span>Existing Extra Charges:</span>
                          <span className="fw-bold">
                            {process.env.REACT_APP_CURRENCY} {selectedBooking.extra_charges}
                          </span>
                        </div>
                      )}
                      {selectedBooking.paid_amount > 0 && (
                        <div className="d-flex justify-content-between mb-2 text-success">
                          <span>Paid Amount:</span>
                          <span className="fw-bold">
                            {process.env.REACT_APP_CURRENCY} {selectedBooking.paid_amount}
                          </span>
                        </div>
                      )}
                      {selectedBooking.pending_amount > 0 && (
                        <div className="d-flex justify-content-between text-danger">
                          <span>Pending Amount:</span>
                          <span className="fw-bold">
                            {process.env.REACT_APP_CURRENCY} {selectedBooking.pending_amount}
                          </span>
                        </div>
                      )}
                    </div>
                  </Card.Body>
                </Card>

                {selectedBooking.pending_amount > 0 && (
                  <Alert variant="warning" className="mb-3">
                    <CsLineIcons icon="alert-circle" className="me-2" />
                    <small>
                      <strong>Pending Payment!</strong> Click "Manage Payments" on the booking card to collect payment before check-out.
                    </small>
                  </Alert>
                )}

                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Additional Extra Charges ({process.env.REACT_APP_CURRENCY})</Form.Label>
                      <Form.Control
                        type="number"
                        value={checkOutData.extra_charges}
                        onChange={(e) => setCheckOutData({ ...checkOutData, extra_charges: e.target.value })}
                        min="0"
                        step="0.01"
                      />
                    </Form.Group>
                  </Col>
                  {checkOutData.extra_charges > 0 && (
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Description</Form.Label>
                        <Form.Control
                          type="text"
                          value={checkOutData.extra_charges_description}
                          onChange={(e) => setCheckOutData({ ...checkOutData, extra_charges_description: e.target.value })}
                          placeholder="e.g., Minibar charges"
                        />
                      </Form.Group>
                    </Col>
                  )}
                </Row>

                <Card className="mt-4 border-primary">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-center">
                      <h6 className="mb-0">Final Bill:</h6>
                      <h5 className="mb-0 text-primary">
                        {process.env.REACT_APP_CURRENCY}
                        {(
                          parseFloat(selectedBooking.total_amount) +
                          parseFloat(selectedBooking.extra_charges || 0) +
                          parseFloat(checkOutData.extra_charges || 0)
                        ).toFixed(2)}
                      </h5>
                    </div>
                  </Card.Body>
                </Card>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              <CsLineIcons icon="check" className="me-2" />
              Confirm Check-Out
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Payment Tracker Modal */}
      <PaymentTracker
        show={showPaymentTracker}
        onHide={() => setShowPaymentTracker(false)}
        bookingId={paymentBookingId}
        bookingReference={paymentBookingRef}
        onPaymentAdded={handlePaymentAdded}
      />
    </>
  );
};

export default CheckInOut;