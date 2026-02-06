import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Form, Badge, Spinner, Alert, Table, Dropdown } from 'react-bootstrap';
import { useHistory } from 'react-router-dom';
import { roomAPI, roomCategoryAPI } from 'services/api';
import { toast } from 'react-toastify';
import HtmlHead from 'components/html-head/HtmlHead';
import BreadcrumbList from 'components/breadcrumb-list/BreadcrumbList';
import CsLineIcons from 'cs-line-icons/CsLineIcons';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Rooms = () => {
  const history = useHistory();
  const [rooms, setRooms] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category_id: '',
    status: '',
    floor: '',
  });

  const title = 'Manage Rooms';
  const description = 'Manage hotel rooms and their status';

  const breadcrumbs = [
    { to: '/dashboard', text: 'Dashboard' },
    { to: '/operations/rooms', text: 'Manage Rooms' },
  ];

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.category_id) params.category_id = filters.category_id;
      if (filters.status) params.status = filters.status;
      if (filters.floor) params.floor = filters.floor;

      const response = await roomAPI.getAll(params);
      setRooms(response.data.data || []);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      toast.error('Failed to fetch rooms');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await roomCategoryAPI.getAll();
      setCategories(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  useEffect(() => {
    fetchRooms();
    fetchCategories();
  }, [filters]);

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
    });
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
      fetchRooms();
    } catch (error) {
      console.error('Error deleting room:', error);
      toast.error(error.response?.data?.message || 'Failed to delete room');
    }
  };

  const handleStatusChange = async (roomId, newStatus) => {
    try {
      await roomAPI.updateStatus(roomId, newStatus);
      toast.success('Room status updated');
      fetchRooms();
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
      <Badge bg={bg} className="d-flex align-items-center gap-1">
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
      <Row>
        <Col>
          <div className="page-title-container mb-4">
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

          {/* Filters */}
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">
                <CsLineIcons icon="filter" className="me-2" />
                Filters
              </h5>
            </Card.Header>
            <Card.Body>
              <Row className="g-3">
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Category</Form.Label>
                    <Form.Select name="category_id" value={filters.category_id} onChange={handleFilterChange}>
                      <option value="">All Categories</option>
                      {categories.map((cat) => (
                        <option key={cat._id} value={cat._id}>
                          {cat.category_name}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Status</Form.Label>
                    <Form.Select name="status" value={filters.status} onChange={handleFilterChange}>
                      <option value="">All Status</option>
                      <option value="available">Available</option>
                      <option value="occupied">Occupied</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="out_of_order">Out of Order</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Floor</Form.Label>
                    <Form.Control
                      type="number"
                      name="floor"
                      value={filters.floor}
                      onChange={handleFilterChange}
                      placeholder="Filter by floor"
                    />
                  </Form.Group>
                </Col>
                <Col xs="12">
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => setFilters({ category_id: '', status: '', floor: '' })}
                  >
                    <CsLineIcons icon="rotate-ccw" className="me-1" />
                    Clear Filters
                  </Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Rooms Table */}
          {rooms.length === 0 ? (
            <Alert variant="info" className="text-center">
              <CsLineIcons icon="inbox" className="me-2" />
              No rooms found. Create your first room!
            </Alert>
          ) : (
            <Card>
              <Card.Header className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">All Rooms ({rooms.length})</h5>
              </Card.Header>
              <Card.Body className="px-3">
                <div className="table-responsive">
                  <Table hover className="mb-0">
                    <thead>
                      <tr>
                        {/* <th className="text-muted text-small text-uppercase border-top-0 pt-3 pb-2">Image</th> */}
                        <th className="text-muted text-small text-uppercase border-top-0 pt-3 pb-2">Room Number</th>
                        <th className="text-muted text-small text-uppercase border-top-0 pt-3 pb-2">Category</th>
                        <th className="text-muted text-small text-uppercase border-top-0 pt-3 pb-2">Floor</th>
                        <th className="text-muted text-small text-uppercase border-top-0 pt-3 pb-2">Price</th>
                        <th className="text-muted text-small text-uppercase border-top-0 pt-3 pb-2 text-center">Status</th>
                        <th className="text-muted text-small text-uppercase border-top-0 pt-3 pb-2 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rooms.map((room) => (
                        <tr key={room._id}>
                          {/* <td className="pt-2 pb-2 align-middle">
                            {room.images && room.images.length > 0 ? (
                              <img
                                src={getImageUrl(room.images[0])}
                                alt={room.room_number}
                                style={{
                                  width: '60px',
                                  height: '60px',
                                  objectFit: 'cover',
                                  borderRadius: '4px'
                                }}
                                onError={(e) => {
                                  e.target.src = 'https://via.placeholder.com/60x60?text=No+Image';
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: '60px',
                                  height: '60px',
                                  backgroundColor: '#f0f0f0',
                                  borderRadius: '4px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                <CsLineIcons icon="image" size="20" className="text-muted" />
                              </div>
                            )}
                          </td> */}
                          <td className="pt-2 pb-2 align-middle">
                            <div className="fw-bold">{room.room_number}</div>
                          </td>
                          <td className="pt-2 pb-2 align-middle">
                            {room.category_details?.category_name || 'N/A'}
                          </td>
                          <td className="pt-2 pb-2 align-middle">{room.floor}</td>
                          <td className="pt-2 pb-2 align-middle fw-bold">
                            {process.env.REACT_APP_CURRENCY} {room.current_price}
                          </td>
                          <td className="pt-2 pb-2 align-middle text-center">
                            <Dropdown className="d-flex justify-content-center align-items-center">
                              <Dropdown.Toggle
                                variant='link'
                                className="p-2 border bg-transparent shadow-none d-flex align-items-center gap-1"
                                id={`status-${room._id}`}
                              >
                                {getStatusBadge(room.status)}
                              </Dropdown.Toggle>
                              <Dropdown.Menu>
                                <Dropdown.Item onClick={() => handleStatusChange(room._id, 'available')}>
                                  <CsLineIcons icon="check-circle" className="me-2" />
                                  Available
                                </Dropdown.Item>
                                <Dropdown.Item onClick={() => handleStatusChange(room._id, 'occupied')}>
                                  <CsLineIcons icon="key" className="me-2" />
                                  Occupied
                                </Dropdown.Item>
                                <Dropdown.Item onClick={() => handleStatusChange(room._id, 'maintenance')}>
                                  <CsLineIcons icon="tool" className="me-2" />
                                  Maintenance
                                </Dropdown.Item>
                                <Dropdown.Item onClick={() => handleStatusChange(room._id, 'out_of_order')}>
                                  <CsLineIcons icon="x-circle" className="me-2" />
                                  Out of Order
                                </Dropdown.Item>
                              </Dropdown.Menu>
                            </Dropdown>
                          </td>
                          <td className="pt-2 pb-2 align-middle text-center">
                            <div className="d-flex gap-2 justify-content-center">
                              <Button
                                variant="outline-primary"
                                size="sm"
                                className="btn-icon btn-icon-only"
                                onClick={() => handleEdit(room._id)}
                                title="Edit"
                              >
                                <CsLineIcons icon="edit" />
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                className="btn-icon btn-icon-only"
                                onClick={() => handleDelete(room._id)}
                                title="Delete"
                              >
                                <CsLineIcons icon="bin" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>
    </>
  );
};

export default Rooms;