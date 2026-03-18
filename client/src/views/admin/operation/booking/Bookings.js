import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useHistory, NavLink } from 'react-router-dom';
import { Card, Row, Col, Button, Form, Badge, Spinner, Alert, Dropdown, Modal, Collapse } from 'react-bootstrap';
import { bookingAPI } from 'services/api';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import HtmlHead from 'components/html-head/HtmlHead';
import BreadcrumbList from 'components/breadcrumb-list/BreadcrumbList';
import CsLineIcons from 'cs-line-icons/CsLineIcons';
import { useTable, useGlobalFilter, useSortBy } from 'react-table';

import ControlsSearch from 'components/table/ControlsSearch';
import ControlsPageSize from 'components/table/ControlsPageSize';
import Table from 'components/table/Table';
import TablePagination from 'components/table/TablePagination';

/* ─────────────────────────────────────────────────────────────────────────────
   Portal dropdown menu — renders into document.body so it is never clipped
   by an overflow:auto ancestor.
───────────────────────────────────────────────────────────────────────────── */
const PortalMenu = ({ show, toggleRef, children, onClose }) => {
  const menuRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0, minWidth: 0 });

  /* Reposition every time the menu opens */
  useEffect(() => {
    if (!show || !toggleRef.current) return;

    const rect = toggleRef.current.getBoundingClientRect();
    const menuH = menuRef.current?.offsetHeight || 180;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow >= menuH
      ? rect.bottom + window.scrollY + 4
      : rect.top + window.scrollY - menuH - 4;

    setPos({
      top,
      left: rect.right + window.scrollX - 180, // right-align to button
      minWidth: 180,
    });
  }, [show, toggleRef]);

  /* Close on outside click */
  useEffect(() => {
    if (!show || !toggleRef.current) return undefined;
    const handler = (e) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target) &&
        toggleRef.current && !toggleRef.current.contains(e.target)
      ) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [show, onClose, toggleRef]);

  if (!show) return null;

  return ReactDOM.createPortal(
    <div
      ref={menuRef}
      className="dropdown-menu show shadow"
      style={{
        position: 'absolute',
        top: pos.top,
        left: pos.left,
        minWidth: pos.minWidth,
        zIndex: 9999,
        borderRadius: 10,
        padding: '4px 0',
        border: '1px solid var(--separator)',
        background: 'var(--foreground)',
      }}
    >
      {children}
    </div>,
    document.body
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   ActionMenu — toggle button + portal menu combined
───────────────────────────────────────────────────────────────────────────── */
const ActionMenu = ({ children }) => {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef(null);

  return (
    <>
      <button
        ref={toggleRef}
        type="button"
        className="btn btn-outline-primary btn-sm btn-icon btn-icon-only"
        onClick={() => setOpen(v => !v)}
        style={{ borderRadius: 8 }}
      >
        <CsLineIcons icon="more-horizontal" />
      </button>

      <PortalMenu show={open} toggleRef={toggleRef} onClose={() => setOpen(false)}>
        {React.Children.map(children, child =>
          child
            ? React.cloneElement(child, {
              onClick: (...args) => {
                setOpen(false);
                child.props.onClick?.(...args);
              },
            })
            : null
        )}
      </PortalMenu>
    </>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   Shared menu item style
───────────────────────────────────────────────────────────────────────────── */
const MenuItem = ({ icon, children, onClick, danger }) => (
  <button
    type="button"
    className="dropdown-item d-flex align-items-center gap-2"
    style={{ fontSize: 13, padding: '7px 14px', color: danger ? 'var(--danger)' : undefined }}
    onClick={onClick}
  >
    <CsLineIcons icon={icon} size="14" />
    {children}
  </button>
);

const MenuDivider = () => <div className="dropdown-divider my-1" />;

/* ═══════════════════════════════════════════════════════════════════════════ */

const Bookings = () => {
  const history = useHistory();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ status: '', source: '', dateFrom: '', dateTo: '' });

  const [cancelModal, setCancelModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const fetchRef = useRef(false);

  const title = 'Bookings';
  const description = 'Manage hotel bookings';
  const breadcrumbs = [
    { to: '/operations', text: 'Operations' },
    { to: '/operations/bookings', text: 'All Bookings' },
  ];

  const getActiveFilterCount = () =>
    [filters.status, filters.source, filters.dateFrom, filters.dateTo, searchTerm].filter(Boolean).length;

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: pageIndex + 1, limit: pageSize };
      if (filters.status) params.status = filters.status;
      if (filters.source) params.source = filters.source;
      if (filters.dateFrom) params.check_in_from = filters.dateFrom;
      if (filters.dateTo) params.check_out_to = filters.dateTo;
      if (searchTerm) params.search = searchTerm;

      const response = await bookingAPI.getAll(params);
      if (response.data?.data) {
        setBookings(response.data.data.map(b => ({
          ...b,
          formatted_check_in: format(new Date(b.check_in_date), 'MMM dd, yyyy'),
          formatted_check_out: format(new Date(b.check_out_date), 'MMM dd, yyyy'),
        })));
        if (response.data.pagination) {
          setTotalRecords(response.data.pagination.total || 0);
          setTotalPages(response.data.pagination.totalPages || 0);
        }
      }
    } catch {
      toast.error('Failed to fetch bookings');
    } finally {
      setLoading(false);
      fetchRef.current = false;
    }
  }, [pageIndex, pageSize, filters, searchTerm]);

  useEffect(() => {
    if (!fetchRef.current) { fetchRef.current = true; fetchBookings(); }
  }, [fetchBookings]);

  const handlePageChange = (i) => setPageIndex(i);
  const handlePageSizeChange = (s) => { setPageSize(s); setPageIndex(0); };
  const handleSearch = useCallback((v) => { setSearchTerm(v); setPageIndex(0); }, []);
  const handleFilterChange = (k, v) => { setFilters(p => ({ ...p, [k]: v })); setPageIndex(0); };
  const handleClearFilters = () => { setFilters({ status: '', source: '', dateFrom: '', dateTo: '' }); setSearchTerm(''); setPageIndex(0); };

  const handleViewDetails = (id) => history.push(`/operations/bookings/${id}`);
  const handleEditBooking = (id) => history.push(`/operations/bookings/edit/${id}`);
  const handleCheckIn = (id) => history.push(`/operations/check-in-out?booking=${id}&action=checkin`);
  const handleCheckOut = (id) => history.push(`/operations/check-in-out?booking=${id}&action=checkout`);

  const handleCancelBooking = async () => {
    if (!selectedBooking) return;
    setCancelling(true);
    try {
      await bookingAPI.cancel(selectedBooking._id);
      toast.success('Booking cancelled successfully');
      setCancelModal(false);
      setSelectedBooking(null);
      fetchRef.current = true;
      fetchBookings();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to cancel booking');
    } finally {
      setCancelling(false);
    }
  };

  const statusConfig = {
    confirmed: { bg: 'success', text: 'Confirmed' },
    checked_in: { bg: 'primary', text: 'Checked In' },
    checked_out: { bg: 'info', text: 'Checked Out' },
    cancelled: { bg: 'danger', text: 'Cancelled' },
    no_show: { bg: 'warning', text: 'No Show' },
  };
  const paymentConfig = {
    pending: { bg: 'warning', text: 'Pending' },
    paid: { bg: 'success', text: 'Paid' },
    refunded: { bg: 'info', text: 'Refunded' },
    partial: { bg: 'primary', text: 'Partial' },
  };

  const getStatusBadge = (s) => { const c = statusConfig[s] || { bg: 'secondary', text: s }; return <Badge bg={c.bg}>{c.text}</Badge>; };
  const getPaymentBadge = (s) => { const c = paymentConfig[s] || { bg: 'secondary', text: s }; return <Badge bg={c.bg}>{c.text}</Badge>; };

  const columns = React.useMemo(() => [
    {
      Header: 'Reference',
      accessor: 'booking_reference',
      Cell: ({ row }) => (
        <div>
          <div className="fw-bold text-primary" style={{ fontFamily: 'monospace', fontSize: 13 }}>{row.original.booking_reference}</div>
          <small className="text-muted text-capitalize">{row.original.booking_source}</small>
        </div>
      ),
    },
    {
      Header: 'Guest',
      accessor: 'customer_name',
      Cell: ({ row }) => (
        <div>
          <div className="fw-semibold">{row.original.customer_name}</div>
          <small className="text-muted">{row.original.customer_email}</small>
        </div>
      ),
    },
    {
      Header: 'Room(s)',
      accessor: 'rooms',
      Cell: ({ row }) => row.original.rooms?.length ? (
        <div>
          <div className="fw-bold">{row.original.rooms.map(r => r.room_number).join(', ')}</div>
          <small className="text-muted">
            {row.original.rooms.map(r => r.category_name).filter((v, i, a) => a.indexOf(v) === i).join(', ')}
          </small>
          {row.original.total_rooms > 1 && (
            <div><Badge bg="info" className="mt-1" style={{ fontSize: 10 }}>{row.original.total_rooms} Rooms</Badge></div>
          )}
        </div>
      ) : 'N/A',
    },
    { Header: 'Check-In', accessor: 'formatted_check_in' },
    { Header: 'Check-Out', accessor: 'formatted_check_out' },
    {
      Header: 'Amount',
      accessor: 'total_amount',
      Cell: ({ value }) => (
        <span className="fw-bold text-primary">{process.env.REACT_APP_CURRENCY} {value}</span>
      ),
    },
    {
      Header: 'Status',
      accessor: 'booking_status',
      Cell: ({ value }) => getStatusBadge(value),
    },
    {
      Header: 'Payment',
      accessor: 'payment_status',
      Cell: ({ value }) => getPaymentBadge(value),
    },
    {
      Header: 'Actions',
      Cell: ({ row }) => {
        const b = row.original;
        return (
          <ActionMenu>
            <MenuItem icon="eye" onClick={() => handleViewDetails(b._id)}>View Details</MenuItem>

            {['confirmed', 'checked_in'].includes(b.booking_status) && (
              <MenuItem icon="edit" onClick={() => handleEditBooking(b._id)}>Edit Booking</MenuItem>
            )}

            {b.booking_status === 'confirmed' && (
              <MenuItem icon="log-in" onClick={() => handleCheckIn(b._id)}>Check-In</MenuItem>
            )}

            {b.booking_status === 'checked_in' && (
              <MenuItem icon="log-out" onClick={() => handleCheckOut(b._id)}>Check-Out</MenuItem>
            )}

            {b.booking_status === 'confirmed' && (
              <>
                <MenuDivider />
                <MenuItem
                  icon="x-circle"
                  danger
                  onClick={() => { setSelectedBooking(b); setCancelModal(true); }}
                >
                  Cancel Booking
                </MenuItem>
              </>
            )}
          </ActionMenu>
        );
      },
    },
  ], []);

  const tableInstance = useTable(
    {
      columns,
      data: bookings,
      manualPagination: true,
      manualSortBy: true,
      manualGlobalFilter: true,
      pageCount: totalPages,
      autoResetPage: false,
      autoResetSortBy: false,
      autoResetGlobalFilter: false,
      initialState: { sortBy: [{ id: 'check_in_date', desc: false }] },
    },
    useGlobalFilter,
    useSortBy
  );

  const paginationProps = {
    canPreviousPage: pageIndex > 0,
    canNextPage: pageIndex < totalPages - 1,
    pageCount: totalPages,
    pageIndex,
    gotoPage: handlePageChange,
    nextPage: () => handlePageChange(pageIndex + 1),
    previousPage: () => handlePageChange(pageIndex - 1),
  };

  return (
    <>
      <HtmlHead title={title} description={description} />
      <Row>
        <Col>
          <div className="page-title-container">
            <Row className="align-items-center">
              <Col xs="12" md="7">
                <h1 className="mb-0 pb-0 display-4">{title}</h1>
                <BreadcrumbList items={breadcrumbs} />
              </Col>
              <Col xs="12" md="5" className="text-end">
                <Button variant="primary" as={NavLink} to="/operations/new-booking" style={{ borderRadius: 10 }}>
                  <CsLineIcons icon="plus" className="me-2" />
                  New Booking
                </Button>
              </Col>
            </Row>
          </div>

          {/* ── Controls row ── */}
          <Row className="mb-3 align-items-center">
            <Col sm="12" md="5" lg="3" xxl="2">
              <div className="d-flex gap-2">
                <div className="d-inline-block float-md-start me-1 mb-1 mb-md-0 search-input-container w-100 shadow bg-foreground">
                  <ControlsSearch onSearch={handleSearch} />
                </div>
                <Button
                  variant={showFilters ? 'secondary' : 'outline-secondary'}
                  size="sm"
                  className="btn-icon btn-icon-only position-relative"
                  style={{ borderRadius: 8, flexShrink: 0 }}
                  onClick={() => setShowFilters(v => !v)}
                >
                  <CsLineIcons icon={showFilters ? 'close' : 'filter'} />
                  {getActiveFilterCount() > 0 && (
                    <Badge bg="primary" className="position-absolute top-0 start-100 translate-middle" style={{ fontSize: 9 }}>
                      {getActiveFilterCount()}
                    </Badge>
                  )}
                </Button>
              </div>
            </Col>
            <Col sm="12" md="7" lg="9" xxl="10" className="text-end">
              <span className="me-3 text-muted" style={{ fontSize: 13 }}>
                {loading ? 'Loading…' : `Showing ${bookings.length > 0 ? pageIndex * pageSize + 1 : 0}–${Math.min((pageIndex + 1) * pageSize, totalRecords)} of ${totalRecords}`}
              </span>
              <ControlsPageSize pageSize={pageSize} onPageSizeChange={handlePageSizeChange} />
            </Col>
          </Row>

          {/* ── Filter panel ── */}
          <Collapse in={showFilters}>
            <Card className="mb-3" style={{ borderRadius: 14 }}>
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="mb-0 fw-bold">Filters</h6>
                  {getActiveFilterCount() > 0 && (
                    <Button variant="outline-danger" size="sm" onClick={handleClearFilters} style={{ borderRadius: 8, fontSize: 12 }}>
                      <CsLineIcons icon="close" size="12" className="me-1" />
                      Clear all
                    </Button>
                  )}
                </div>
                <Row className="g-3">
                  <Col md={3}>
                    <Form.Label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>Status</Form.Label>
                    <Form.Select size="sm" value={filters.status} onChange={e => handleFilterChange('status', e.target.value)} style={{ borderRadius: 8 }}>
                      <option value="">All Statuses</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="checked_in">Checked In</option>
                      <option value="checked_out">Checked Out</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="no_show">No Show</option>
                    </Form.Select>
                  </Col>
                  <Col md={3}>
                    <Form.Label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>Source</Form.Label>
                    <Form.Select size="sm" value={filters.source} onChange={e => handleFilterChange('source', e.target.value)} style={{ borderRadius: 8 }}>
                      <option value="">All Sources</option>
                      <option value="direct">Direct</option>
                      <option value="booking.com">Booking.com</option>
                      <option value="makemytrip">MakeMyTrip</option>
                      <option value="walk_in">Walk-in</option>
                    </Form.Select>
                  </Col>
                  <Col md={3}>
                    <Form.Label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>Check-In From</Form.Label>
                    <Form.Control type="date" size="sm" value={filters.dateFrom} onChange={e => handleFilterChange('dateFrom', e.target.value)} style={{ borderRadius: 8 }} />
                  </Col>
                  <Col md={3}>
                    <Form.Label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>Check-Out To</Form.Label>
                    <Form.Control type="date" size="sm" value={filters.dateTo} onChange={e => handleFilterChange('dateTo', e.target.value)} style={{ borderRadius: 8 }} />
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Collapse>

          {/* ── Table ── */}
          {loading && bookings.length === 0 ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" className="mb-3" />
              <p className="text-muted">Loading bookings…</p>
            </div>
          ) : bookings.length === 0 ? (
            <Alert variant="info" style={{ borderRadius: 12 }}>
              <CsLineIcons icon="inbox" className="me-2" />
              {searchTerm || getActiveFilterCount() > 0
                ? 'No results found. Try adjusting your search or filters.'
                : 'No bookings found.'}
            </Alert>
          ) : (
            <>
              {/* overflow:visible so the portal isn't needed for the wrapper,
                  but we keep the horizontal scroll only on the table itself */}
              <Row>
                <Col xs="12" style={{ overflowX: 'auto', overflowY: 'visible' }}>
                  <Table className="react-table rows" tableInstance={tableInstance} />
                </Col>
                <Col xs="12">
                  <TablePagination paginationProps={paginationProps} />
                </Col>
              </Row>
            </>
          )}
        </Col>
      </Row>

      {/* ── Cancel modal ── */}
      <Modal
        show={cancelModal}
        onHide={() => { setCancelModal(false); setSelectedBooking(null); }}
        centered
      >
        <Modal.Header closeButton style={{ borderBottom: '3px solid var(--danger)' }}>
          <Modal.Title style={{ fontSize: 16 }}>
            <CsLineIcons icon="x-circle" className="me-2 text-danger" />
            Cancel Booking
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <p className="text-muted mb-3">Are you sure you want to cancel this booking? This action cannot be undone.</p>
          {selectedBooking && (
            <div style={{ borderRadius: 10, border: '1px solid var(--separator)', overflow: 'hidden' }}>
              {[
                ['Reference', selectedBooking.booking_reference],
                ['Guest', selectedBooking.customer_name],
                ['Check-In', format(new Date(selectedBooking.check_in_date), 'MMM dd, yyyy')],
              ].map(([label, val], i, arr) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 14px', borderBottom: i < arr.length - 1 ? '1px solid var(--separator)' : 'none', fontSize: 13 }}>
                  <span style={{ color: 'var(--muted)', fontWeight: 600 }}>{label}</span>
                  <span style={{ fontWeight: 700, fontFamily: label === 'Reference' ? 'monospace' : undefined }}>{val}</span>
                </div>
              ))}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer style={{ padding: '12px 20px' }}>
          <Button variant="outline-secondary" onClick={() => { setCancelModal(false); setSelectedBooking(null); }} disabled={cancelling} style={{ borderRadius: 10 }}>
            Keep Booking
          </Button>
          <Button variant="danger" onClick={handleCancelBooking} disabled={cancelling} style={{ borderRadius: 10, fontWeight: 700 }}>
            {cancelling
              ? <><Spinner as="span" animation="border" size="sm" className="me-2" />Cancelling…</>
              : 'Yes, Cancel Booking'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default Bookings;