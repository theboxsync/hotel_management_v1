import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Row, Col, Button, Form, Badge, Spinner, Alert, Dropdown, Collapse } from 'react-bootstrap';
import { useHistory } from 'react-router-dom';
import { roomAPI, roomCategoryAPI } from 'services/api';
import { toast } from 'react-toastify';
import { useTable, useGlobalFilter, useSortBy } from 'react-table';
import HtmlHead from 'components/html-head/HtmlHead';
import BreadcrumbList from 'components/breadcrumb-list/BreadcrumbList';
import CsLineIcons from 'cs-line-icons/CsLineIcons';
import ControlsSearch from 'components/table/ControlsSearch';
import ControlsPageSize from 'components/table/ControlsPageSize';
import Table from 'components/table/Table';
import TablePagination from 'components/table/TablePagination';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Rooms = () => {
  const history = useHistory();
  const [rooms, setRooms] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category_id: '',
    status: '',
    floor: '',
    minPrice: '',
    maxPrice: '',
  });

  const title = 'Manage Rooms';
  const description = 'Manage hotel rooms and their status';

  const breadcrumbs = [
    { to: '/dashboard', text: 'Dashboard' },
    { to: '/operations/rooms', text: 'Manage Rooms' },
  ];

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.category_id) count++;
    if (filters.status) count++;
    if (filters.floor) count++;
    if (filters.minPrice) count++;
    if (filters.maxPrice) count++;
    if (searchTerm) count++;
    return count;
  };

  const fetchCategories = async () => {
    try {
      const response = await roomCategoryAPI.getAll();
      setCategories(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchRooms = async () => {
    setLoading(true);
    try {
      // Build filter params for API
      const params = {};
      if (filters.category_id) params.category_id = filters.category_id;
      if (filters.status) params.status = filters.status;
      if (filters.floor) params.floor = filters.floor;

      const response = await roomAPI.getAll(params);

      if (response.data && response.data.data) {
        // Add display fields to each room
        const roomsWithDisplay = response.data.data.map(room => ({
          ...room,
          category_name: room.category_details?.category_name || 'N/A',
          price_display: `${process.env.REACT_APP_CURRENCY} ${room.current_price}`,
          floor_display: `Floor ${room.floor}`,
        }));

        setRooms(roomsWithDisplay);
      }
    } catch (error) {
      console.error('Error fetching rooms:', error);
      toast.error('Failed to fetch rooms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchRooms();
  }, []); // Initial load only

  // Apply client-side filtering whenever rooms, filters, or searchTerm change
  useEffect(() => {
    let filtered = [...rooms];

    // Apply category filter
    if (filters.category_id) {
      filtered = filtered.filter(room => room.category_id === filters.category_id);
    }

    // Apply status filter
    if (filters.status) {
      filtered = filtered.filter(room => room.status === filters.status);
    }

    // Apply floor filter
    if (filters.floor) {
      filtered = filtered.filter(room => room.floor === parseInt(filters.floor, 10));
    }

    // Apply price range filters
    if (filters.minPrice) {
      filtered = filtered.filter(room => room.current_price >= parseFloat(filters.minPrice));
    }
    if (filters.maxPrice) {
      filtered = filtered.filter(room => room.current_price <= parseFloat(filters.maxPrice));
    }

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(room =>
        room.room_number?.toLowerCase().includes(term) ||
        room.category_name?.toLowerCase().includes(term) ||
        room.floor?.toString().includes(term)
      );
    }

    setFilteredRooms(filtered);
    setPageIndex(0); // Reset to first page when filters change
  }, [rooms, filters, searchTerm]);

  const handlePageChange = (newPageIndex) => {
    setPageIndex(newPageIndex);
  };

  const handlePageSizeChange = (newPageSize) => {
    setPageSize(newPageSize);
    setPageIndex(0);
  };

  const handleSearch = useCallback((value) => {
    setSearchTerm(value);
  }, []);

  const handleFilterChange = (filterName, value) => {
    setFilters((prev) => ({
      ...prev,
      [filterName]: value,
    }));
  };

  const handleClearFilters = () => {
    setFilters({
      category_id: '',
      status: '',
      floor: '',
      minPrice: '',
      maxPrice: '',
    });
    setSearchTerm('');
  };

  const handleAdd = () => {
    history.push('/operations/rooms/add');
  };

  const handleEdit = (id) => {
    history.push(`/operations/rooms/edit/${id}`);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this room?')) {
      return;
    }

    try {
      await roomAPI.delete(id);
      toast.success('Room deleted successfully');
      fetchRooms(); // Refresh the list
    } catch (error) {
      console.error('Error deleting room:', error);
      toast.error(error.response?.data?.message || 'Failed to delete room');
    }
  };

  const handleStatusChange = async (roomId, newStatus) => {
    try {
      await roomAPI.updateStatus(roomId, newStatus);
      toast.success('Room status updated');
      fetchRooms(); // Refresh the list
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const getStatusBadge = (status) => {
    const badgeProps = {
      available: { bg: 'success', icon: 'check-circle', text: 'Available' },
      occupied: { bg: 'primary', icon: 'key', text: 'Occupied' },
      maintenance: { bg: 'warning', icon: 'tool', text: 'Maintenance' },
      out_of_order: { bg: 'danger', icon: 'x-circle', text: 'Out of Order' },
    };
    const { bg = 'secondary', icon = 'question', text = status } = badgeProps[status] || {};
    return (
      <Badge bg={bg} className="d-inline-flex align-items-center gap-1">
        <CsLineIcons icon={icon} size="12" />
        {text}
      </Badge>
    );
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    return `${API_URL.replace('/api', '')}${imagePath}`;
  };

  // Paginate filtered rooms
  const paginatedRooms = useMemo(() => {
    const start = pageIndex * pageSize;
    const end = start + pageSize;
    return filteredRooms.slice(start, end);
  }, [filteredRooms, pageIndex, pageSize]);

  const columns = React.useMemo(
    () => [
      {
        Header: 'Room Number',
        accessor: 'room_number',
        Cell: ({ value }) => <div className="fw-bold">{value}</div>,
      },
      {
        Header: 'Category',
        accessor: 'category_name',
      },
      {
        Header: 'Floor',
        accessor: 'floor_display',
      },
      {
        Header: 'Price',
        accessor: 'price_display',
        Cell: ({ value }) => <span className="fw-bold">{value}</span>,
      },
      {
        Header: 'Status',
        accessor: 'status',
        Cell: ({ row }) => (
          <Dropdown className="d-inline-block">
            <Dropdown.Toggle
              variant="link"
              className="p-0 border-0 shadow-none text-decoration-none"
              id={`status-${row.original._id}`}
            >
              {getStatusBadge(row.original.status)}
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item onClick={() => handleStatusChange(row.original._id, 'available')}>
                <CsLineIcons icon="check-circle" className="me-2" />
                Available
              </Dropdown.Item>
              <Dropdown.Item onClick={() => handleStatusChange(row.original._id, 'occupied')}>
                <CsLineIcons icon="key" className="me-2" />
                Occupied
              </Dropdown.Item>
              <Dropdown.Item onClick={() => handleStatusChange(row.original._id, 'maintenance')}>
                <CsLineIcons icon="tool" className="me-2" />
                Maintenance
              </Dropdown.Item>
              <Dropdown.Item onClick={() => handleStatusChange(row.original._id, 'out_of_order')}>
                <CsLineIcons icon="x-circle" className="me-2" />
                Out of Order
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        ),
      },
      {
        Header: 'Actions',
        Cell: ({ row }) => (
          <div className="d-flex gap-2">
            <Button
              variant="outline-primary"
              size="sm"
              className="btn-icon btn-icon-only"
              onClick={() => handleEdit(row.original._id)}
              title="Edit"
            >
              <CsLineIcons icon="edit" />
            </Button>
            <Button
              variant="outline-danger"
              size="sm"
              className="btn-icon btn-icon-only"
              onClick={() => handleDelete(row.original._id)}
              title="Delete"
            >
              <CsLineIcons icon="bin" />
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  const tableInstance = useTable(
    {
      columns,
      data: paginatedRooms,
      manualPagination: true,
      manualSortBy: false,
      autoResetPage: false,
      autoResetSortBy: false,
      initialState: {
        sortBy: [
          {
            id: 'room_number',
            desc: false,
          },
        ],
      },
    },
    useGlobalFilter,
    useSortBy
  );

  const totalPages = Math.ceil(filteredRooms.length / pageSize);

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
                <Button variant="primary" onClick={handleAdd}>
                  <CsLineIcons icon="plus" className="me-2" />
                  Add Rooms
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
                    Showing {filteredRooms.length > 0 ? pageIndex * pageSize + 1 : 0} to {Math.min((pageIndex + 1) * pageSize, filteredRooms.length)} of {filteredRooms.length} entries
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
                      <Form.Label className="small text-muted fw-bold">Category</Form.Label>
                      <Form.Select
                        size="sm"
                        value={filters.category_id}
                        onChange={(e) => handleFilterChange('category_id', e.target.value)}
                      >
                        <option value="">All Categories</option>
                        {categories.map((cat) => (
                          <option key={cat._id} value={cat._id}>
                            {cat.category_name}
                          </option>
                        ))}
                      </Form.Select>
                    </Col>

                    <Col md={3} className="mb-3">
                      <Form.Label className="small text-muted fw-bold">Status</Form.Label>
                      <Form.Select
                        size="sm"
                        value={filters.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                      >
                        <option value="">All Status</option>
                        <option value="available">Available</option>
                        <option value="occupied">Occupied</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="out_of_order">Out of Order</option>
                      </Form.Select>
                    </Col>

                    <Col md={2} className="mb-3">
                      <Form.Label className="small text-muted fw-bold">Floor</Form.Label>
                      <Form.Control
                        type="number"
                        size="sm"
                        value={filters.floor}
                        onChange={(e) => handleFilterChange('floor', e.target.value)}
                        placeholder="Floor"
                      />
                    </Col>

                    <Col md={4} className="mb-3">
                      <Form.Label className="small text-muted fw-bold">Price Range</Form.Label>
                      <Row>
                        <Col md={6}>
                          <Form.Control
                            type="number"
                            size="sm"
                            placeholder="Min"
                            value={filters.minPrice}
                            onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                          />
                        </Col>
                        <Col md={6}>
                          <Form.Control
                            type="number"
                            size="sm"
                            placeholder="Max"
                            value={filters.minPrice ? filters.maxPrice : ''}
                            onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                            disabled={!filters.minPrice}
                          />
                        </Col>
                      </Row>
                    </Col>
                  </Row>
                </div>
              </Card.Body>
            </Card>
          </Collapse>

          {loading ? (
            <Row className="justify-content-center my-5">
              <Col xs={12} className="text-center">
                <Spinner animation="border" variant="primary" className="mb-3" />
                <p>Loading rooms...</p>
              </Col>
            </Row>
          ) : filteredRooms.length === 0 ? (
            <Alert variant="info" className="mb-4">
              <CsLineIcons icon="inbox" className="me-2" />
              {searchTerm || getActiveFilterCount() > 0
                ? 'No results found. Try adjusting your search or filters.'
                : rooms.length === 0
                  ? 'No rooms found. Create your first room!'
                  : 'No rooms match the current filters.'}
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
    </>
  );
};

export default Rooms;