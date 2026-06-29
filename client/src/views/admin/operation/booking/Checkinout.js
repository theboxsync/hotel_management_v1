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

/* ─── Accent colours per column ──────────────────────────────────────────── */
const CHECKIN_COLOR = 'var(--primary)';
const CHECKOUT_COLOR = '#e8793a';
const ACTIVE_COLOR = '#17a2b8';

/* ─── Tiny helpers ────────────────────────────────────────────────────────── */
const paymentStatusLabel = (s) =>
  s === 'paid' ? 'Paid' : s === 'partial' ? 'Partial' : 'Unpaid';

/* ─── BookingCard sub-component ───────────────────────────────────────────── */
const BookingCard = ({ booking, onCheckIn, onCheckOut, onManagePayments, statusBadge, actionButton }) => {
  const cur = process.env.REACT_APP_CURRENCY;

  return (
    <div className="kanban-booking-card shadow-sm">
      <div className="kanban-booking-card-inner">
        {/* Header row */}
        <div className="d-flex justify-content-between align-items-start mb-2">
          <div>
            <div className="kanban-guest-name text-dark">{booking.customer_name}</div>
            <div className="kanban-ref-badge">{booking.booking_reference}</div>
          </div>
          {statusBadge}
        </div>

        {/* Info rows */}
        <div className="mb-2">
          {booking.room_details?.room_number && (
            <div className="kanban-info-row">
              <CsLineIcons icon="bed" size="11" />
              Room {booking.room_details.room_number}
            </div>
          )}
          {booking.guests_count && (
            <div className="kanban-info-row">
              <CsLineIcons icon="user" size="11" />
              {booking.guests_count} guest{booking.guests_count > 1 ? 's' : ''}
            </div>
          )}
          {booking.customer_phone && (
            <div className="kanban-info-row">
              <CsLineIcons icon="phone" size="11" />
              {booking.customer_phone}
            </div>
          )}
          {booking.total_amount && (
            <div className="kanban-info-row">
              <CsLineIcons icon="tag" size="11" />
              {cur} {booking.total_amount}
            </div>
          )}
          {booking.check_out_date && (
            <div className="kanban-info-row">
              <CsLineIcons icon="calendar" size="11" />
              Check-out: {format(new Date(booking.check_out_date), 'MMM dd, yyyy')}
            </div>
          )}
          {booking.stay_duration_days && (
            <div className="kanban-info-row">
              <CsLineIcons icon="clock" size="11" />
              {booking.stay_duration_days} day{booking.stay_duration_days > 1 ? 's' : ''} stay
            </div>
          )}
        </div>

        {/* Payment strip */}
        <div className={`kanban-payment-strip ${booking.payment_status}`}>
          <div className="d-flex align-items-center">
            <span className="kanban-payment-dot" />
            {paymentStatusLabel(booking.payment_status)}
          </div>
          {booking.pending_amount > 0 && (
            <span className="text-danger small fw-bold">
              Due: {cur} {booking.pending_amount}
            </span>
          )}
        </div>
      </div>

      {/* Action bar */}
      <div className="kanban-action-bar">
        <Button
          variant="outline-secondary"
          size="sm"
          className="flex-fill btn-capsule btn-capsule-sm py-1 d-inline-flex align-items-center justify-content-center gap-1"
          onClick={() => onManagePayments(booking)}
        >
          <CsLineIcons icon="credit-card" size="11" />
          Payments
        </Button>
        {actionButton}
      </div>
    </div>
  );
};

/* ─── Column wrapper ──────────────────────────────────────────────────────── */
const BookingColumn = ({ title, icon, count, children, emptyIcon, emptyText }) => {
  const isCheckin = title.toLowerCase().includes('in');
  const isCheckout = title.toLowerCase().includes('out');
  const colClass = isCheckin ? 'col-checkin' : isCheckout ? 'col-checkout' : 'col-active';
  const pillClass = isCheckin ? 'pill-checkin' : isCheckout ? 'pill-checkout' : 'pill-active';

  return (
    <Card className="h-100 workstation-card border-0 shadow-sm" style={{ overflow: 'hidden' }}>
      <div className={`kanban-col-header ${colClass}`}>
        <div className="kanban-col-header-title">
          <CsLineIcons icon={icon} size="16" />
          {title}
        </div>
        <div className={`kanban-count-pill ${pillClass}`}>{count}</div>
      </div>
      <div className="p-3" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 260px)', minHeight: 320 }}>
        {count === 0 ? (
          <div className="kanban-empty-state">
            <CsLineIcons icon={emptyIcon} size="36" className="mb-2 opacity-50" />
            <div className="small fw-bold">{emptyText}</div>
          </div>
        ) : children}
      </div>
    </Card>
  );
};

/* ════════════════════════════════════════════════════════════════════════════ */
const CheckInOut = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const bookingIdFromUrl = queryParams.get('booking');
  const actionFromUrl = queryParams.get('action');
  const cur = process.env.REACT_APP_CURRENCY;

  const [todayCheckIns, setTodayCheckIns] = useState([]);
  const [todayCheckOuts, setTodayCheckOuts] = useState([]);
  const [checkedInGuests, setCheckedInGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');

  const [showPaymentTracker, setShowPaymentTracker] = useState(false);
  const [paymentBookingId, setPaymentBookingId] = useState(null);
  const [paymentBookingRef, setPaymentBookingRef] = useState('');

  const [checkInData, setCheckInData] = useState({
    extra_charges: 0, extra_charges_description: '', notes: '',
  });
  const [checkOutData, setCheckOutData] = useState({
    extra_charges: 0, extra_charges_description: '',
  });

  const title = 'Check-In / Check-Out';
  const description = 'Manage guest check-in and check-out processes';
  const breadcrumbs = [
    { to: '/operations', text: 'Operations' },
    { to: '/operations/check-in-out', text: 'Check-In/Out' },
  ];

  const statusBg = (s) =>
    s === 'paid' ? 'success' : s === 'partial' ? 'warning' : 'secondary';

  const infoItems = [
    { label: "Room", value: selectedBooking?.room_number || "N/A" },
    { label: "Guests", value: selectedBooking?.guests_count },
    {
      label: "Payment",
      value: (
        <Badge bg={statusBg(selectedBooking?.payment_status)} className="booking-badge-sm">
          {selectedBooking?.payment_status}
        </Badge>
      ),
    },
  ];

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ciRes, coRes, activeRes] = await Promise.all([
        bookingAPI.getTodayCheckIns(),
        bookingAPI.getTodayCheckOuts(),
        bookingAPI.getCheckedIn(),
      ]);
      setTodayCheckIns(ciRes.data.data || []);
      setTodayCheckOuts(coRes.data.data || []);
      setCheckedInGuests(activeRes.data.data || []);
    } catch {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleDirectAction = async (bookingId, action) => {
    try {
      const res = await bookingAPI.getOne(bookingId);
      setSelectedBooking(res.data.data.booking);
      setModalType(action === 'checkin' ? 'checkin' : 'checkout');
      setShowModal(true);
    } catch {
      toast.error('Failed to fetch booking');
    }
  };

  useEffect(() => {
    fetchData();
    if (bookingIdFromUrl && actionFromUrl) handleDirectAction(bookingIdFromUrl, actionFromUrl);
  }, []);

  const openCheckIn = (booking) => {
    setSelectedBooking(booking);
    setModalType('checkin');
    setCheckInData({ extra_charges: 0, extra_charges_description: '', notes: '' });
    setShowModal(true);
  };

  const openCheckOut = (booking) => {
    setSelectedBooking(booking);
    setModalType('checkout');
    setCheckOutData({ extra_charges: 0, extra_charges_description: '' });
    setShowModal(true);
  };

  const handleManagePayments = (booking) => {
    setPaymentBookingId(booking._id);
    setPaymentBookingRef(booking.booking_reference);
    setShowPaymentTracker(true);
  };

  const handleCheckIn = async (e) => {
    e.preventDefault();
    try {
      await bookingAPI.checkIn(selectedBooking._id, {
        ...checkInData,
        extra_charges: parseFloat(checkInData.extra_charges) || 0,
      });
      toast.success('Guest checked in successfully!');
      fetchData();
      setShowModal(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Check-in failed');
    }
  };

  const handleCheckOut = async (e) => {
    e.preventDefault();
    try {
      const res = await bookingAPI.checkOut(selectedBooking._id, {
        ...checkOutData,
        extra_charges: parseFloat(checkOutData.extra_charges) || 0,
      });
      toast.success('Guest checked out successfully!');
      const { billing } = res.data.data;
      toast.info(`Total Bill: ${cur} ${billing.grand_total}`, { autoClose: 5000 });
      fetchData();
      setShowModal(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Check-out failed');
    }
  };

  /* ── Loading screen ── */
  if (loading && !todayCheckIns.length && !todayCheckOuts.length) {
    return (
      <div className="workstation-container pb-5">
        <div className="container-fluid ps-lg-4 pe-lg-5">
          <HtmlHead title={title} description={description} />
          <Row><Col>
            <div className="page-title-container mb-4 mt-2 mt-lg-0">
              <h1 className="mb-0 pb-0 display-4 fw-bold" style={{ color: '#23b3f4' }}>{title}</h1>
              <BreadcrumbList items={breadcrumbs} />
            </div>
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" className="mb-3" />
              <p className="text-muted">Loading check-in / out data…</p>
            </div>
          </Col></Row>
        </div>
      </div>
    );
  }

  /* ── Summary bar totals ── */
  const totalActive = checkedInGuests.length;
  const pendingCI = todayCheckIns.filter(b => !b.is_checked_in).length;
  const pendingCO = todayCheckOuts.filter(b => !b.is_checked_out).length;

  return (
    <div className="workstation-container pb-5">
      <div className="container-fluid ps-lg-4 pe-lg-5">
        <HtmlHead title={title} description={description} />
        <Row>
          <Col>
            {/* ── Page header ── */}
            <div className="page-title-container mb-4 mt-2 mt-lg-0">
              <Row className="align-items-center">
                <Col>
                  <h1 className="mb-0 pb-0 display-4 fw-bold" style={{ color: '#23b3f4' }}>{title}</h1>
                  <BreadcrumbList items={breadcrumbs} />
                </Col>
                <Col xs="auto">
                  <Button variant="outline-secondary" className="btn-capsule btn-capsule-sm d-inline-flex align-items-center gap-2" onClick={fetchData}>
                    <CsLineIcons icon="sync" size="13" />
                    Refresh
                  </Button>
                </Col>
              </Row>
            </div>

            {/* ── Summary strip ── */}
            <Row className="g-3 mb-4">
              {[
                { label: 'Pending Check-Ins', value: pendingCI, bgClass: 'bg-primary bg-opacity-10 text-primary', borderClass: 'col-checkin', icon: 'log-in' },
                { label: 'Pending Check-Outs', value: pendingCO, bgClass: 'bg-warning bg-opacity-10 text-warning', borderClass: 'col-checkout', icon: 'log-out' },
                { label: 'Guests In-House', value: totalActive, bgClass: 'bg-info bg-opacity-10 text-info', borderClass: 'col-active', icon: 'users' },
              ].map(({ label, value, bgClass, borderClass, icon }) => (
                <Col xs={4} key={label}>
                  <div className={`kanban-col-header ${borderClass} rounded-lg p-3 d-flex align-items-center gap-3 border shadow-sm bg-foreground`}>
                    <div className={`${bgClass} rounded-lg p-2 d-flex align-items-center justify-content-center`} style={{ width: 40, height: 40, flexShrink: 0 }}>
                      <CsLineIcons icon={icon} size="18" />
                    </div>
                    <div>
                      <div className="fs-3 fw-bold lh-1">{value}</div>
                      <div className="text-muted mt-1 small fw-bold">{label}</div>
                    </div>
                  </div>
                </Col>
              ))}
            </Row>

            {/* ── Three columns ── */}
            <Row className="g-3">
              {/* Check-Ins */}
              <Col xs={12} lg={4}>
                <BookingColumn
                  title="Today's Check-Ins"
                  icon="log-in"
                  count={todayCheckIns.length}
                  emptyIcon="calendar"
                  emptyText="No check-ins expected today"
                >
                  {todayCheckIns.map(booking => (
                    <BookingCard
                      key={booking._id}
                      booking={booking}
                      onManagePayments={handleManagePayments}
                      statusBadge={
                        booking.is_checked_in
                          ? <span className="badge bg-success bg-opacity-10 text-success py-1 px-2 rounded booking-badge-sm">✓ In</span>
                          : <span className="badge bg-warning bg-opacity-10 text-warning py-1 px-2 rounded booking-badge-sm">Pending</span>
                      }
                      actionButton={
                        !booking.is_checked_in && (
                          <Button
                            variant="primary"
                            size="sm"
                            className="flex-fill btn-capsule btn-capsule-sm py-1 d-inline-flex align-items-center justify-content-center gap-1"
                            onClick={() => openCheckIn(booking)}
                          >
                            <CsLineIcons icon="log-in" size="11" />
                            Check-In
                          </Button>
                        )
                      }
                    />
                  ))}
                </BookingColumn>
              </Col>

              {/* Check-Outs */}
              <Col xs={12} lg={4}>
                <BookingColumn
                  title="Today's Check-Outs"
                  icon="log-out"
                  count={todayCheckOuts.length}
                  emptyIcon="calendar"
                  emptyText="No check-outs expected today"
                >
                  {todayCheckOuts.map(booking => (
                    <BookingCard
                      key={booking._id}
                      booking={booking}
                      onManagePayments={handleManagePayments}
                      statusBadge={
                        booking.is_checked_out
                          ? <span className="badge bg-success bg-opacity-10 text-success py-1 px-2 rounded booking-badge-sm">✓ Out</span>
                          : <span className="badge bg-warning bg-opacity-10 text-warning py-1 px-2 rounded booking-badge-sm">Pending</span>
                      }
                      actionButton={
                        !booking.is_checked_out && booking.booking_status === 'checked_in' && (
                          <Button
                            size="sm"
                            className="flex-fill btn-capsule btn-capsule-sm py-1 d-inline-flex align-items-center justify-content-center gap-1 text-white"
                            style={{ background: CHECKOUT_COLOR, border: 'none' }}
                            onClick={() => openCheckOut(booking)}
                          >
                            <CsLineIcons icon="log-out" size="11" />
                            Check-Out
                          </Button>
                        )
                      }
                    />
                  ))}
                </BookingColumn>
              </Col>

              {/* In-House */}
              <Col xs={12} lg={4}>
                <BookingColumn
                  title="Currently In-House"
                  icon="users"
                  count={checkedInGuests.length}
                  emptyIcon="inbox"
                  emptyText="No guests currently checked in"
                >
                  {checkedInGuests.map(booking => (
                    <BookingCard
                      key={booking._id}
                      booking={booking}
                      onManagePayments={handleManagePayments}
                      statusBadge={
                        <span className="badge bg-info bg-opacity-10 text-info py-1 px-2 rounded booking-badge-sm">
                          {booking.stay_duration_days}d
                        </span>
                      }
                      actionButton={
                        <Button
                          size="sm"
                          className="flex-fill btn-capsule btn-capsule-sm py-1 d-inline-flex align-items-center justify-content-center gap-1"
                          variant="outline-info"
                          onClick={() => openCheckOut(booking)}
                        >
                          <CsLineIcons icon="log-out" size="11" />
                          Early Check-Out
                        </Button>
                      }
                    />
                  ))}
                </BookingColumn>
              </Col>
            </Row>
          </Col>
        </Row>
      </div>

      {/* ════ Check-In Modal ════ */}
      <Modal show={showModal && modalType === 'checkin'} onHide={() => setShowModal(false)} centered size="md">
        <Modal.Header closeButton className="pb-0 border-0" style={{ borderBottom: `3px solid ${CHECKIN_COLOR}` }}>
          <Modal.Title className="d-flex align-items-center gap-2 h5 mb-0">
            <CsLineIcons icon="log-in" size="18" />
            Guest Check-In
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCheckIn}>
          <Modal.Body className="p-4">
            {selectedBooking && (
              <>
                {/* Guest info block */}
                <div className="d-flex align-items-center gap-3 mb-3">
                  <div className="bg-primary bg-opacity-10 text-primary p-2 rounded-lg d-flex align-items-center justify-content-center" style={{ width: 44, height: 44, flexShrink: 0 }}>
                    <CsLineIcons icon="user" size="20" className="text-primary" />
                  </div>
                  <div>
                    <div className="fw-bold fs-5">{selectedBooking.customer_name}</div>
                    <div className="booking-reference-text text-muted">{selectedBooking.booking_reference}</div>
                  </div>
                </div>

                <div className="kanban-modal-info-grid">
                  {infoItems.map((item) => (
                    <div key={item.label}>
                      <span className="kanban-section-label">{item.label}</span>
                      <div className="fw-bold fs-6">{item.value}</div>
                    </div>
                  ))}
                </div>

                <Alert variant="success" className="py-2 px-3 mb-3 border-0 rounded-lg small">
                  <CsLineIcons icon="info-circle" size="13" className="me-1" />
                  Use the <strong>Payments</strong> button on the booking card to record payments.
                </Alert>

                <Row className="g-3">
                  <Col md={6}>
                    <Form.Label className="kanban-section-label">Extra Charges ({cur})</Form.Label>
                    <Form.Control
                      type="number"
                      value={checkInData.extra_charges}
                      onChange={e => setCheckInData({ ...checkInData, extra_charges: e.target.value })}
                      min="0" step="0.01"
                      className="modern-input"
                    />
                  </Col>
                  {checkInData.extra_charges > 0 && (
                    <Col md={6}>
                      <Form.Label className="kanban-section-label">Description</Form.Label>
                      <Form.Control
                        type="text"
                        value={checkInData.extra_charges_description}
                        onChange={e => setCheckInData({ ...checkInData, extra_charges_description: e.target.value })}
                        placeholder="e.g., Welcome drinks"
                        className="modern-input"
                      />
                    </Col>
                  )}
                  <Col xs={12}>
                    <Form.Label className="kanban-section-label">Notes</Form.Label>
                    <Form.Control
                      as="textarea" rows={2}
                      value={checkInData.notes}
                      onChange={e => setCheckInData({ ...checkInData, notes: e.target.value })}
                      placeholder="Any special notes…"
                      className="modern-input"
                    />
                  </Col>
                </Row>
              </>
            )}
          </Modal.Body>
          <Modal.Footer className="border-0 pt-0">
            <Button variant="outline-secondary" onClick={() => setShowModal(false)} className="btn-capsule btn-capsule-sm">
              Cancel
            </Button>
            <Button variant="primary" type="submit" className="btn-capsule btn-capsule-sm fw-bold px-4">
              <CsLineIcons icon="log-in" size="14" className="me-2" />
              Confirm Check-In
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* ════ Check-Out Modal ════ */}
      <Modal show={showModal && modalType === 'checkout'} onHide={() => setShowModal(false)} centered size="md">
        <Modal.Header closeButton className="pb-0 border-0" style={{ borderBottom: `3px solid ${CHECKOUT_COLOR}` }}>
          <Modal.Title className="d-flex align-items-center gap-2 h5 mb-0">
            <CsLineIcons icon="log-out" size="18" />
            Guest Check-Out
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCheckOut}>
          <Modal.Body className="p-4">
            {selectedBooking && (
              <>
                {/* Guest info block */}
                <div className="d-flex align-items-center gap-3 mb-3">
                  <div className="bg-warning bg-opacity-10 text-warning p-2 rounded-lg d-flex align-items-center justify-content-center" style={{ width: 44, height: 44, flexShrink: 0 }}>
                    <CsLineIcons icon="user" size="20" style={{ color: CHECKOUT_COLOR }} />
                  </div>
                  <div>
                    <div className="fw-bold fs-5">{selectedBooking.customer_name}</div>
                    <div className="booking-reference-text text-muted">{selectedBooking.booking_reference}</div>
                  </div>
                </div>

                {/* Billing breakdown */}
                <div className="border rounded-lg overflow-hidden mb-3">
                  <div className="p-3 bg-light border-bottom">
                    <span className="kanban-section-label mb-0">Billing Breakdown</span>
                  </div>
                  <div className="p-3 bg-foreground">
                    <div className="kanban-billing-line">
                      <span className="text-muted">Room charges</span>
                      <span className="fw-bold">{cur} {selectedBooking.total_amount}</span>
                    </div>
                    {selectedBooking.extra_charges > 0 && (
                      <div className="kanban-billing-line">
                        <span className="text-muted">Existing extras</span>
                        <span className="fw-bold">{cur} {selectedBooking.extra_charges}</span>
                      </div>
                    )}
                    {selectedBooking.paid_amount > 0 && (
                      <div className="kanban-billing-line text-success border-bottom-0 pb-0">
                        <span>Paid amount</span>
                        <span className="fw-bold">− {cur} {selectedBooking.paid_amount}</span>
                      </div>
                    )}
                    {selectedBooking.pending_amount > 0 && (
                      <div className="kanban-billing-line text-danger border-bottom-0 pb-0 pt-2">
                        <span>Pending</span>
                        <span className="fw-bold">{cur} {selectedBooking.pending_amount}</span>
                      </div>
                    )}
                  </div>
                </div>

                {selectedBooking.pending_amount > 0 && (
                  <Alert variant="warning" className="py-2 px-3 mb-3 border-0 rounded-lg small">
                    <CsLineIcons icon="alert-circle" size="13" className="me-1" />
                    <strong>Pending payment!</strong> Collect via the Payments button before check-out.
                  </Alert>
                )}

                <Row className="g-3 mb-3">
                  <Col md={6}>
                    <Form.Label className="kanban-section-label">Additional Charges ({cur})</Form.Label>
                    <Form.Control
                      type="number"
                      value={checkOutData.extra_charges}
                      onChange={e => setCheckOutData({ ...checkOutData, extra_charges: e.target.value })}
                      min="0" step="0.01"
                      className="modern-input"
                    />
                  </Col>
                  {checkOutData.extra_charges > 0 && (
                    <Col md={6}>
                      <Form.Label className="kanban-section-label">Description</Form.Label>
                      <Form.Control
                        type="text"
                        value={checkOutData.extra_charges_description}
                        onChange={e => setCheckOutData({ ...checkOutData, extra_charges_description: e.target.value })}
                        placeholder="e.g., Minibar charges"
                        className="modern-input"
                      />
                    </Col>
                  )}
                </Row>

                {/* Final bill */}
                <div className="kanban-billing-total">
                  <div>
                    <div className="fw-bold fs-6">Final Bill</div>
                    <div className="text-muted small">incl. all charges</div>
                  </div>
                  <div className="fw-extrabold fs-4 text-primary">
                    {cur} {(
                      parseFloat(selectedBooking.total_amount || 0) +
                      parseFloat(selectedBooking.extra_charges || 0) +
                      parseFloat(checkOutData.extra_charges || 0)
                    ).toFixed(2)}
                  </div>
                </div>
              </>
            )}
          </Modal.Body>
          <Modal.Footer className="border-0 pt-0">
            <Button variant="outline-secondary" onClick={() => setShowModal(false)} className="btn-capsule btn-capsule-sm">
              Cancel
            </Button>
            <Button type="submit" className="btn-capsule btn-capsule-sm fw-bold px-4 text-white" style={{ background: CHECKOUT_COLOR, border: 'none' }}>
              <CsLineIcons icon="log-out" size="14" className="me-2" />
              Confirm Check-Out
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Payment Tracker */}
      <PaymentTracker
        show={showPaymentTracker}
        onHide={() => setShowPaymentTracker(false)}
        bookingId={paymentBookingId}
        bookingReference={paymentBookingRef}
        onPaymentAdded={() => fetchData()}
      />
    </div>
  );
};

export default CheckInOut;