import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useHistory, NavLink } from 'react-router-dom';
import { Card, Row, Col, Button, Form, Badge, Spinner, Alert, Dropdown, Modal, Collapse } from 'react-bootstrap';
import { bookingAPI } from 'services/api';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import HtmlHead from 'components/html-head/HtmlHead';
import BreadcrumbList from 'components/breadcrumb-list/BreadcrumbList';
import CsLineIcons from 'cs-line-icons/CsLineIcons';
import { useTable, useGlobalFilter, useSortBy } from 'react-table';

import ControlsSearch from './components/ControlsSearch';
import ControlsPageSize from './components/ControlsPageSize';
import Table from './components/Table';
import TablePagination from './components/TablePagination';

const Bookings = () => {
  const history = useHistory();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    source: '',
    dateFrom: '',
    dateTo: '',
  });

  // Modal states
  const [cancelModal, setCancelModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  // Use ref to prevent infinite loops
  const fetchRef = useRef(false);

  const title = 'Bookings';
  const description = 'Manage hotel bookings';

  const breadcrumbs = [
    { to: '/operations', text: 'Operations' },
    { to: '/operations/bookings', text: 'All Bookings' },
  ];

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.status) count++;
    if (filters.source) count++;
    if (filters.dateFrom) count++;
    if (filters.dateTo) count++;
    if (searchTerm) count++;
    return count;
  };

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: pageIndex + 1,
        limit: pageSize,
      };

      if (filters.status) params.status = filters.status;
      if (filters.source) params.source = filters.source;
      if (filters.dateFrom) params.check_in_from = filters.dateFrom;
      if (filters.dateTo) params.check_out_to = filters.dateTo;
      if (searchTerm) params.search = searchTerm;

      const response = await bookingAPI.getAll(params);

      if (response.data && response.data.data) {
        const bookingsData = response.data.data.map(booking => ({
          ...booking,
          formatted_check_in: format(new Date(booking.check_in_date), 'MMM dd, yyyy'),
          formatted_check_out: format(new Date(booking.check_out_date), 'MMM dd, yyyy'),
        }));

        setBookings(bookingsData);

        if (response.data.pagination) {
          setTotalRecords(response.data.pagination.total || 0);
          setTotalPages(response.data.pagination.totalPages || 0);
        }
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to fetch bookings');
    } finally {
      setLoading(false);
      fetchRef.current = false;
    }
  }, [pageIndex, pageSize, filters, searchTerm]);

  useEffect(() => {
    if (!fetchRef.current) {
      fetchRef.current = true;
      fetchBookings();
    }
  }, [fetchBookings]);

  const handlePageChange = (newPageIndex) => {
    setPageIndex(newPageIndex);
  };

  const handlePageSizeChange = (newPageSize) => {
    setPageSize(newPageSize);
    setPageIndex(0);
  };

  const handleSearch = useCallback((value) => {
    setSearchTerm(value);
    setPageIndex(0);
  }, []);

  const handleFilterChange = (filterName, value) => {
    setFilters((prev) => ({
      ...prev,
      [filterName]: value,
    }));
    setPageIndex(0);
  };

  const handleClearFilters = () => {
    setFilters({
      status: '',
      source: '',
      dateFrom: '',
      dateTo: '',
    });
    setSearchTerm('');
    setPageIndex(0);
  };

  const handleViewDetails = (bookingId) => {
    history.push(`/operations/bookings/${bookingId}`);
  };

  const handleEditBooking = (bookingId) => {
    history.push(`/operations/bookings/edit/${bookingId}`);
  };

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
      console.error('Error cancelling booking:', error);
      toast.error(error.response?.data?.message || 'Failed to cancel booking');
    } finally {
      setCancelling(false);
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

  const columns = React.useMemo(
    () => [
      {
        Header: 'Reference',
        accessor: 'booking_reference',
        Cell: ({ row }) => (
          <div>
            <div className="fw-bold text-primary">{row.original.booking_reference}</div>
            <small className="text-muted text-capitalize">{row.original.booking_source}</small>
          </div>
        ),
      },
      {
        Header: 'Guest Name',
        accessor: 'customer_name',
        Cell: ({ row }) => (
          <div>
            <div>{row.original.customer_name}</div>
            <small className="text-muted">{row.original.customer_email}</small>
          </div>
        ),
      },
      {
        Header: 'Room(s)',
        accessor: 'rooms',
        Cell: ({ row }) => (
          <>
            {row.original.rooms?.length ? (
              <>
                <div className="fw-bold">
                  {row.original.rooms.map(r => r.room_number).join(', ')}
                </div>
                <small className="text-muted">
                  {row.original.rooms.map(r => r.category_name).filter((v, i, a) => a.indexOf(v) === i).join(', ')}
                </small>
                {row.original.total_rooms > 1 && (
                  <div>
                    <Badge bg="info" className="mt-1">
                      {row.original.total_rooms} Room{row.original.total_rooms > 1 ? 's' : ''}
                    </Badge>
                  </div>
                )}
              </>
            ) : (
              'N/A'
            )}
          </>
        ),
      },
      {
        Header: 'Check-In',
        accessor: 'formatted_check_in',
      },
      {
        Header: 'Check-Out',
        accessor: 'formatted_check_out',
      },
      {
        Header: 'Amount',
        accessor: 'total_amount',
        Cell: ({ value }) => (
          <span className="text-primary fw-bold">
            {process.env.REACT_APP_CURRENCY} {value}
          </span>
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
        Cell: ({ row }) => (
          <Dropdown className="d-inline-block">
            <Dropdown.Toggle
              variant="outline-primary"
              size="sm"
              className="btn-icon btn-icon-only"
              id={`actions-${row.original._id}`}
            >
              <CsLineIcons icon="more-horizontal" />
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item onClick={() => handleViewDetails(row.original._id)}>
                <CsLineIcons icon="eye" className="me-2" />
                View Details
              </Dropdown.Item>
              {['confirmed', 'checked_in'].includes(row.original.booking_status) && (
                <Dropdown.Item onClick={() => handleEditBooking(row.original._id)}>
                  <CsLineIcons icon="edit" className="me-2" />
                  Edit Booking
                </Dropdown.Item>
              )}
              {row.original.booking_status === 'confirmed' && (
                <Dropdown.Item onClick={() => handleCheckIn(row.original._id)}>
                  <CsLineIcons icon="log-in" className="me-2" />
                  Check-In
                </Dropdown.Item>
              )}
              {row.original.booking_status === 'checked_in' && (
                <Dropdown.Item onClick={() => handleCheckOut(row.original._id)}>
                  <CsLineIcons icon="log-out" className="me-2" />
                  Check-Out
                </Dropdown.Item>
              )}
              {row.original.booking_status === 'confirmed' && (
                <>
                  <Dropdown.Divider />
                  <Dropdown.Item
                    onClick={() => {
                      setSelectedBooking(row.original);
                      setCancelModal(true);
                    }}
                    className="text-danger"
                  >
                    <CsLineIcons icon="x-circle" className="me-2" />
                    Cancel Booking
                  </Dropdown.Item>
                </>
              )}
            </Dropdown.Menu>
          </Dropdown>
        ),
      },
    ],
    []
  );

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
      initialState: {
        sortBy: [
          {
            id: 'check_in_date',
            desc: false,
          },
        ],
      },
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
                <Button variant="primary" as={NavLink} to="/operations/new-booking">
                  <CsLineIcons icon="plus" className="me-2" />
                  New Booking
                </Button>
              </Col>
            </Row>
          </div>

          {/* Search and controls - Always visible */}
          <Row className="mb-3">
            <Col sm="12" md="5" lg="3" xxl="2">
              <div className="d-flex gap-2">
                <div className="d-inline-block float-md-start me-1 mb-1 mb-md-0 search-input-container w-100 shadow bg-foreground">
                  <ControlsSearch onSearch={handleSearch} />
                </div>
                <Button
                  variant={`${showFilters ? 'secondary' : 'outline-secondary'}`}
                  size="sm"
                  className="btn-icon btn-icon-only position-relative"
                  onClick={() => setShowFilters(!showFilters)}
                  title="Filters"
                >
                  <CsLineIcons icon={`${showFilters ? 'close' : 'filter'}`} />
                  {getActiveFilterCount() > 0 && (
                    <Badge bg="primary" className="position-absolute top-0 start-100 translate-middle">
                      {getActiveFilterCount()}
                    </Badge>
                  )}
                </Button>
              </div>
            </Col>
            <Col sm="12" md="7" lg="9" xxl="10" className="text-end">
              <div className="d-inline-block me-2 text-muted">
                {loading ? (
                  'Loading...'
                ) : (
                  <>
                    Showing {bookings.length > 0 ? pageIndex * pageSize + 1 : 0} to {Math.min((pageIndex + 1) * pageSize, totalRecords)} of {totalRecords} entries
                  </>
                )}
              </div>
              <div className="d-inline-block">
                <ControlsPageSize pageSize={pageSize} onPageSizeChange={handlePageSizeChange} />
              </div>
            </Col>
          </Row>

          {/* Filter Section */}
          <Collapse in={showFilters}>
            <Card className="mb-3">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center">
                  <h5>Filters</h5>
                  {getActiveFilterCount() > 0 && (
                    <Button variant="outline-danger" size="sm" onClick={handleClearFilters}>
                      <CsLineIcons icon="close" className="me-1" />
                      Clear
                    </Button>
                  )}
                </div>

                <div className="mt-2">
                  <Row>
                    <Col md={3} className="mb-3">
                      <Form.Label className="small text-muted fw-bold">Status</Form.Label>
                      <Form.Select
                        size="sm"
                        value={filters.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                      >
                        <option value="">All Status</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="checked_in">Checked In</option>
                        <option value="checked_out">Checked Out</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="no_show">No Show</option>
                      </Form.Select>
                    </Col>

                    <Col md={3} className="mb-3">
                      <Form.Label className="small text-muted fw-bold">Source</Form.Label>
                      <Form.Select
                        size="sm"
                        value={filters.source}
                        onChange={(e) => handleFilterChange('source', e.target.value)}
                      >
                        <option value="">All Sources</option>
                        <option value="direct">Direct</option>
                        <option value="booking.com">Booking.com</option>
                        <option value="makemytrip">MakeMyTrip</option>
                        <option value="walk_in">Walk-in</option>
                      </Form.Select>
                    </Col>

                    {/* Check-in Date Range */}
                    <Col md={6} className="mb-3">
                      <Form.Label className="small text-muted fw-bold">Check-in Date Range</Form.Label>
                      <Row>
                        <Col md={6}>
                          <Form.Label className="small text-muted">From</Form.Label>
                          <Form.Control
                            type="date"
                            size="sm"
                            value={filters.dateFrom}
                            onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                          />
                        </Col>
                        <Col md={6}>
                          <Form.Label className="small text-muted">To</Form.Label>
                          <Form.Control
                            type="date"
                            size="sm"
                            value={filters.dateTo}
                            onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                          />
                        </Col>
                      </Row>
                    </Col>
                  </Row>
                </div>
              </Card.Body>
            </Card>
          </Collapse>

          {loading && bookings.length === 0 ? (
            <Row className="justify-content-center my-5">
              <Col xs={12} className="text-center">
                <Spinner animation="border" variant="primary" className="mb-3" />
                <p>Loading bookings...</p>
              </Col>
            </Row>
          ) : bookings.length === 0 ? (
            <Alert variant="info" className="mb-4">
              <CsLineIcons icon="inbox" className="me-2" />
              {searchTerm || getActiveFilterCount() > 0 ? 'No results found. Try adjusting your search or filters.' : 'No bookings found.'}
            </Alert>
          ) : (
            <>
              <Row>
                <Col xs="12" style={{ overflow: 'auto' }}>
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

      {/* Cancel Confirmation Modal */}
      <Modal
        show={cancelModal}
        onHide={() => {
          setCancelModal(false);
          setSelectedBooking(null);
        }}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Cancel Booking</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to cancel this booking?</p>
          {selectedBooking && (
            <div className="bg-light p-3 rounded">
              <div><strong>Reference:</strong> {selectedBooking.booking_reference}</div>
              <div><strong>Guest:</strong> {selectedBooking.customer_name}</div>
              <div><strong>Check-in:</strong> {format(new Date(selectedBooking.check_in_date), 'MMM dd, yyyy')}</div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setCancelModal(false);
              setSelectedBooking(null);
            }}
            disabled={cancelling}
          >
            No, Keep it
          </Button>
          <Button variant="danger" onClick={handleCancelBooking} disabled={cancelling}>
            {cancelling ? (
              <>
                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                Cancelling...
              </>
            ) : (
              'Yes, Cancel Booking'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default Bookings;