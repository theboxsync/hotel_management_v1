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

/* ─── Style tokens (all use existing theme CSS vars) ──────────────────────── */
const S = {
  sectionLabel: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--muted)',
    marginBottom: 4,
    display: 'block',
  },

  /* Column header strip */
  colHeader: (color) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 18px',
    borderBottom: `3px solid ${color}`,
    background: `${color}12`,
  }),

  colHeaderTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontWeight: 700,
    fontSize: 15,
  },

  countPill: (color) => ({
    background: color,
    color: '#fff',
    borderRadius: 20,
    padding: '2px 10px',
    fontSize: 12,
    fontWeight: 700,
    minWidth: 28,
    textAlign: 'center',
  }),

  /* Individual booking card */
  bookingCard: {
    borderRadius: 14,
    border: '1.5px solid var(--separator)',
    background: 'var(--foreground)',
    marginBottom: 10,
    overflow: 'hidden',
    transition: 'box-shadow .18s, border-color .18s',
  },

  bookingCardInner: {
    padding: '12px 14px',
  },

  guestName: {
    fontWeight: 700,
    fontSize: 14,
    marginBottom: 1,
    lineHeight: 1.2,
  },

  refBadge: {
    fontSize: 10,
    color: 'var(--muted)',
    fontFamily: 'monospace',
    letterSpacing: '0.04em',
  },

  infoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    fontSize: 12,
    color: 'var(--muted)',
    marginBottom: 3,
  },

  paymentStrip: (status) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '7px 10px',
    borderRadius: 8,
    marginTop: 8,
    background:
      status === 'paid' ? 'rgba(40,167,69,.08)' :
        status === 'partial' ? 'rgba(255,193,7,.08)' :
          'rgba(108,117,125,.08)',
    border: `1px solid ${status === 'paid' ? 'rgba(40,167,69,.2)' :
      status === 'partial' ? 'rgba(255,193,7,.3)' :
        'rgba(108,117,125,.2)'
      }`,
  }),

  paymentDot: (status) => ({
    width: 7,
    height: 7,
    borderRadius: '50%',
    background:
      status === 'paid' ? '#28a745' :
        status === 'partial' ? '#ffc107' :
          '#6c757d',
    display: 'inline-block',
    marginRight: 5,
  }),

  actionBar: {
    display: 'flex',
    gap: 6,
    padding: '8px 14px',
    borderTop: '1px solid var(--separator)',
    background: 'rgba(var(--primary-rgb),.02)',
  },

  emptyState: {
    textAlign: 'center',
    padding: '48px 24px',
    color: 'var(--muted)',
  },

  /* Modal */
  modalInfoGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: 12,
    padding: '12px 14px',
    background: 'var(--background)',
    borderRadius: 10,
    marginBottom: 16,
  },

  billingLine: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '7px 0',
    borderBottom: '1px solid var(--separator)',
    fontSize: 13,
  },

  billingTotal: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    borderRadius: 10,
    background: 'rgba(var(--primary-rgb),.07)',
    border: '1.5px solid rgba(var(--primary-rgb),.2)',
    marginTop: 10,
  },
};

/* ─── Accent colours per column ──────────────────────────────────────────── */
const CHECKIN_COLOR = 'var(--primary)';
const CHECKOUT_COLOR = '#e8793a';
const ACTIVE_COLOR = '#17a2b8';

/* ─── Tiny helpers ────────────────────────────────────────────────────────── */
const paymentStatusLabel = (s) =>
  s === 'paid' ? 'Paid' : s === 'partial' ? 'Partial' : 'Unpaid';

/* ─── BookingCard sub-component ───────────────────────────────────────────── */
const BookingCard = ({ booking, accentColor, onCheckIn, onCheckOut, onManagePayments, statusBadge, actionButton }) => {
  const cur = process.env.REACT_APP_CURRENCY;

  return (
    <div style={S.bookingCard}>
      <div style={S.bookingCardInner}>
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div>
            <div style={S.guestName}>{booking.customer_name}</div>
            <div style={S.refBadge}>{booking.booking_reference}</div>
          </div>
          {statusBadge}
        </div>

        {/* Info rows */}
        <div>
          {booking.room_details?.room_number && (
            <div style={S.infoRow}>
              <CsLineIcons icon="bed" size="11" />
              Room {booking.room_details.room_number}
            </div>
          )}
          {booking.guests_count && (
            <div style={S.infoRow}>
              <CsLineIcons icon="user" size="11" />
              {booking.guests_count} guest{booking.guests_count > 1 ? 's' : ''}
            </div>
          )}
          {booking.customer_phone && (
            <div style={S.infoRow}>
              <CsLineIcons icon="phone" size="11" />
              {booking.customer_phone}
            </div>
          )}
          {booking.total_amount && (
            <div style={S.infoRow}>
              <CsLineIcons icon="tag" size="11" />
              {cur} {booking.total_amount}
            </div>
          )}
          {booking.check_out_date && (
            <div style={S.infoRow}>
              <CsLineIcons icon="calendar" size="11" />
              Check-out: {format(new Date(booking.check_out_date), 'MMM dd, yyyy')}
            </div>
          )}
          {booking.stay_duration_days && (
            <div style={S.infoRow}>
              <CsLineIcons icon="clock" size="11" />
              {booking.stay_duration_days} day{booking.stay_duration_days > 1 ? 's' : ''} stay
            </div>
          )}
        </div>

        {/* Payment strip */}
        <div style={S.paymentStrip(booking.payment_status)}>
          <div style={{ display: 'flex', alignItems: 'center', fontSize: 12, fontWeight: 600 }}>
            <span style={S.paymentDot(booking.payment_status)} />
            {paymentStatusLabel(booking.payment_status)}
          </div>
          {booking.pending_amount > 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, color: '#dc3545' }}>
              Due: {cur} {booking.pending_amount}
            </span>
          )}
        </div>
      </div>

      {/* Action bar */}
      <div style={S.actionBar}>
        <Button
          variant="outline-secondary"
          size="sm"
          className="flex-fill d-inline-flex align-items-center justify-content-center gap-1"
          style={{ borderRadius: 8, fontSize: 11, fontWeight: 600 }}
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
const BookingColumn = ({ title, icon, color, count, children, emptyIcon, emptyText }) => (
  <Card className="h-100" style={{ borderRadius: 16, overflow: 'hidden', border: '1.5px solid var(--separator)' }}>
    <div style={S.colHeader(color)}>
      <div style={{ ...S.colHeaderTitle, color }}>
        <CsLineIcons icon={icon} size="16" />
        {title}
      </div>
      <div style={S.countPill(color)}>{count}</div>
    </div>
    <div style={{ padding: 14, overflowY: 'auto', maxHeight: 'calc(100vh - 260px)', minHeight: 320 }}>
      {count === 0 ? (
        <div style={S.emptyState}>
          <CsLineIcons icon={emptyIcon} size="36" style={{ marginBottom: 12, opacity: 0.35 }} />
          <div style={{ fontSize: 13, fontWeight: 600 }}>{emptyText}</div>
        </div>
      ) : children}
    </div>
  </Card>
);

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
        <Badge bg={statusBg(selectedBooking?.payment_status)} style={{ fontSize: 10 }}>
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
      <>
        <HtmlHead title={title} description={description} />
        <Row><Col>
          <div className="page-title-container mb-4">
            <h1 className="mb-0 pb-0 display-4">{title}</h1>
            <BreadcrumbList items={breadcrumbs} />
          </div>
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" className="mb-3" />
            <p className="text-muted">Loading check-in / out data…</p>
          </div>
        </Col></Row>
      </>
    );
  }

  /* ── Summary bar totals ── */
  const totalActive = checkedInGuests.length;
  const pendingCI = todayCheckIns.filter(b => !b.is_checked_in).length;
  const pendingCO = todayCheckOuts.filter(b => !b.is_checked_out).length;

  return (
    <>
      <HtmlHead title={title} description={description} />
      <Row>
        <Col>
          {/* ── Page header ── */}
          <div className="page-title-container mb-3">
            <Row className="align-items-center">
              <Col>
                <h1 className="mb-0 pb-0 display-4">{title}</h1>
                <BreadcrumbList items={breadcrumbs} />
              </Col>
              <Col xs="auto">
                <Button variant="outline-secondary" size="sm" onClick={fetchData} style={{ borderRadius: 8 }} className="d-inline-flex align-items-center gap-2">
                  <CsLineIcons icon="sync" size="13" />
                  Refresh
                </Button>
              </Col>
            </Row>
          </div>

          {/* ── Summary strip ── */}
          <Row className="g-3 mb-4">
            {[
              { label: 'Pending Check-Ins', value: pendingCI, color: CHECKIN_COLOR, icon: 'log-in' },
              { label: 'Pending Check-Outs', value: pendingCO, color: CHECKOUT_COLOR, icon: 'log-out' },
              { label: 'Guests In-House', value: totalActive, color: ACTIVE_COLOR, icon: 'users' },
            ].map(({ label, value, color, icon }) => (
              <Col xs={4} key={label}>
                <div style={{
                  borderRadius: 14,
                  padding: '14px 16px',
                  border: `1.5px solid ${color}30`,
                  background: `${color}0d`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: `${color}20`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color,
                    flexShrink: 0,
                  }}>
                    <CsLineIcons icon={icon} size="18" />
                  </div>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1, color }}>{value}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginTop: 2 }}>{label}</div>
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
                color={CHECKIN_COLOR}
                count={todayCheckIns.length}
                emptyIcon="calendar"
                emptyText="No check-ins expected today"
              >
                {todayCheckIns.map(booking => (
                  <BookingCard
                    key={booking._id}
                    booking={booking}
                    accentColor={CHECKIN_COLOR}
                    onManagePayments={handleManagePayments}
                    statusBadge={
                      booking.is_checked_in
                        ? <span style={{ fontSize: 11, fontWeight: 700, color: '#28a745', background: 'rgba(40,167,69,.1)', borderRadius: 6, padding: '3px 8px' }}>✓ In</span>
                        : <span style={{ fontSize: 11, fontWeight: 700, color: '#856404', background: 'rgba(255,193,7,.15)', borderRadius: 6, padding: '3px 8px' }}>Pending</span>
                    }
                    actionButton={
                      !booking.is_checked_in && (
                        <Button
                          variant="primary"
                          size="sm"
                          className="flex-fill d-inline-flex align-items-center justify-content-center gap-1"
                          style={{ borderRadius: 8, fontSize: 11, fontWeight: 700 }}
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
                color={CHECKOUT_COLOR}
                count={todayCheckOuts.length}
                emptyIcon="calendar"
                emptyText="No check-outs expected today"
              >
                {todayCheckOuts.map(booking => (
                  <BookingCard
                    key={booking._id}
                    booking={booking}
                    accentColor={CHECKOUT_COLOR}
                    onManagePayments={handleManagePayments}
                    statusBadge={
                      booking.is_checked_out
                        ? <span style={{ fontSize: 11, fontWeight: 700, color: '#28a745', background: 'rgba(40,167,69,.1)', borderRadius: 6, padding: '3px 8px' }}>✓ Out</span>
                        : <span style={{ fontSize: 11, fontWeight: 700, color: '#856404', background: 'rgba(255,193,7,.15)', borderRadius: 6, padding: '3px 8px' }}>Pending</span>
                    }
                    actionButton={
                      !booking.is_checked_out && booking.booking_status === 'checked_in' && (
                        <Button
                          size="sm"
                          className="flex-fill d-inline-flex align-items-center justify-content-center gap-1"
                          style={{ borderRadius: 8, fontSize: 11, fontWeight: 700, background: CHECKOUT_COLOR, border: 'none', color: '#fff' }}
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
                color={ACTIVE_COLOR}
                count={checkedInGuests.length}
                emptyIcon="inbox"
                emptyText="No guests currently checked in"
              >
                {checkedInGuests.map(booking => (
                  <BookingCard
                    key={booking._id}
                    booking={booking}
                    accentColor={ACTIVE_COLOR}
                    onManagePayments={handleManagePayments}
                    statusBadge={
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#0d7a8a', background: 'rgba(23,162,184,.12)', borderRadius: 6, padding: '3px 8px' }}>
                        {booking.stay_duration_days}d
                      </span>
                    }
                    actionButton={
                      <Button
                        size="sm"
                        className="flex-fill d-inline-flex align-items-center justify-content-center gap-1"
                        style={{ borderRadius: 8, fontSize: 11, fontWeight: 700, background: 'transparent', border: `1.5px solid ${ACTIVE_COLOR}`, color: ACTIVE_COLOR }}
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

      {/* ════ Check-In Modal ════ */}
      <Modal show={showModal && modalType === 'checkin'} onHide={() => setShowModal(false)} centered size="md">
        <Modal.Header closeButton style={{ borderBottom: `3px solid ${CHECKIN_COLOR}` }}>
          <Modal.Title className="d-flex align-items-center gap-2" style={{ fontSize: 16 }}>
            <CsLineIcons icon="log-in" size="18" />
            Guest Check-In
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCheckIn}>
          <Modal.Body className="p-4">
            {selectedBooking && (
              <>
                {/* Guest info block */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: `rgba(var(--primary-rgb),.12)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CsLineIcons icon="user" size="20" className="text-primary" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{selectedBooking.customer_name}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--muted)' }}>{selectedBooking.booking_reference}</div>
                  </div>
                </div>

                <div style={S.modalInfoGrid}>
                  {infoItems.map((item) => (
                    <div key={item.label}>
                      <span style={S.sectionLabel}>{item.label}</span>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{item.value}</div>
                    </div>
                  ))}
                </div>

                <Alert variant="success" className="py-2 px-3 mb-3" style={{ fontSize: 12, borderRadius: 10 }}>
                  <CsLineIcons icon="info-circle" size="13" className="me-1" />
                  Use the <strong>Payments</strong> button on the booking card to record payments.
                </Alert>

                <Row className="g-3">
                  <Col md={6}>
                    <Form.Label style={S.sectionLabel}>Extra Charges ({cur})</Form.Label>
                    <Form.Control
                      type="number"
                      value={checkInData.extra_charges}
                      onChange={e => setCheckInData({ ...checkInData, extra_charges: e.target.value })}
                      min="0" step="0.01"
                      style={{ borderRadius: 10 }}
                    />
                  </Col>
                  {checkInData.extra_charges > 0 && (
                    <Col md={6}>
                      <Form.Label style={S.sectionLabel}>Description</Form.Label>
                      <Form.Control
                        type="text"
                        value={checkInData.extra_charges_description}
                        onChange={e => setCheckInData({ ...checkInData, extra_charges_description: e.target.value })}
                        placeholder="e.g., Welcome drinks"
                        style={{ borderRadius: 10 }}
                      />
                    </Col>
                  )}
                  <Col xs={12}>
                    <Form.Label style={S.sectionLabel}>Notes</Form.Label>
                    <Form.Control
                      as="textarea" rows={2}
                      value={checkInData.notes}
                      onChange={e => setCheckInData({ ...checkInData, notes: e.target.value })}
                      placeholder="Any special notes…"
                      style={{ borderRadius: 10 }}
                    />
                  </Col>
                </Row>
              </>
            )}
          </Modal.Body>
          <Modal.Footer style={{ borderTop: '1px solid var(--separator)', padding: '12px 20px' }}>
            <Button variant="outline-secondary" onClick={() => setShowModal(false)} style={{ borderRadius: 10 }}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" style={{ borderRadius: 10, fontWeight: 700, minWidth: 150 }}>
              <CsLineIcons icon="log-in" size="14" className="me-2" />
              Confirm Check-In
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* ════ Check-Out Modal ════ */}
      <Modal show={showModal && modalType === 'checkout'} onHide={() => setShowModal(false)} centered size="md">
        <Modal.Header closeButton style={{ borderBottom: `3px solid ${CHECKOUT_COLOR}` }}>
          <Modal.Title className="d-flex align-items-center gap-2" style={{ fontSize: 16 }}>
            <CsLineIcons icon="log-out" size="18" />
            Guest Check-Out
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCheckOut}>
          <Modal.Body className="p-4">
            {selectedBooking && (
              <>
                {/* Guest info block */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: `${CHECKOUT_COLOR}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CsLineIcons icon="user" size="20" style={{ color: CHECKOUT_COLOR }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{selectedBooking.customer_name}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--muted)' }}>{selectedBooking.booking_reference}</div>
                  </div>
                </div>

                {/* Billing breakdown */}
                <div style={{ borderRadius: 10, border: '1px solid var(--separator)', overflow: 'hidden', marginBottom: 14 }}>
                  <div style={{ padding: '8px 14px', background: 'var(--background)', borderBottom: '1px solid var(--separator)' }}>
                    <span style={S.sectionLabel}>Billing Breakdown</span>
                  </div>
                  <div style={{ padding: '4px 14px 8px' }}>
                    <div style={S.billingLine}>
                      <span style={{ color: 'var(--muted)' }}>Room charges</span>
                      <span style={{ fontWeight: 700 }}>{cur} {selectedBooking.total_amount}</span>
                    </div>
                    {selectedBooking.extra_charges > 0 && (
                      <div style={S.billingLine}>
                        <span style={{ color: 'var(--muted)' }}>Existing extras</span>
                        <span style={{ fontWeight: 700 }}>{cur} {selectedBooking.extra_charges}</span>
                      </div>
                    )}
                    {selectedBooking.paid_amount > 0 && (
                      <div style={{ ...S.billingLine, color: '#28a745' }}>
                        <span>Paid amount</span>
                        <span style={{ fontWeight: 700 }}>− {cur} {selectedBooking.paid_amount}</span>
                      </div>
                    )}
                    {selectedBooking.pending_amount > 0 && (
                      <div style={{ ...S.billingLine, color: '#dc3545', borderBottom: 'none' }}>
                        <span>Pending</span>
                        <span style={{ fontWeight: 700 }}>{cur} {selectedBooking.pending_amount}</span>
                      </div>
                    )}
                  </div>
                </div>

                {selectedBooking.pending_amount > 0 && (
                  <Alert variant="warning" className="py-2 px-3 mb-3" style={{ fontSize: 12, borderRadius: 10 }}>
                    <CsLineIcons icon="alert-circle" size="13" className="me-1" />
                    <strong>Pending payment!</strong> Collect via the Payments button before check-out.
                  </Alert>
                )}

                <Row className="g-3">
                  <Col md={6}>
                    <Form.Label style={S.sectionLabel}>Additional Charges ({cur})</Form.Label>
                    <Form.Control
                      type="number"
                      value={checkOutData.extra_charges}
                      onChange={e => setCheckOutData({ ...checkOutData, extra_charges: e.target.value })}
                      min="0" step="0.01"
                      style={{ borderRadius: 10 }}
                    />
                  </Col>
                  {checkOutData.extra_charges > 0 && (
                    <Col md={6}>
                      <Form.Label style={S.sectionLabel}>Description</Form.Label>
                      <Form.Control
                        type="text"
                        value={checkOutData.extra_charges_description}
                        onChange={e => setCheckOutData({ ...checkOutData, extra_charges_description: e.target.value })}
                        placeholder="e.g., Minibar charges"
                        style={{ borderRadius: 10 }}
                      />
                    </Col>
                  )}
                </Row>

                {/* Final bill */}
                <div style={S.billingTotal}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>Final Bill</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>incl. all charges</div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 20, color: 'var(--primary)' }}>
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
          <Modal.Footer style={{ borderTop: '1px solid var(--separator)', padding: '12px 20px' }}>
            <Button variant="outline-secondary" onClick={() => setShowModal(false)} style={{ borderRadius: 10 }}>
              Cancel
            </Button>
            <Button type="submit" style={{ borderRadius: 10, fontWeight: 700, minWidth: 155, background: CHECKOUT_COLOR, border: 'none' }}>
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
    </>
  );
};

export default CheckInOut;