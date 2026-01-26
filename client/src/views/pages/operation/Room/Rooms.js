import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Form, Badge, Modal, Spinner, Alert, Table, Dropdown } from 'react-bootstrap';
import { roomAPI, roomCategoryAPI } from 'services/api';
import { toast } from 'react-toastify';
import HtmlHead from 'components/html-head/HtmlHead';
import BreadcrumbList from 'components/breadcrumb-list/BreadcrumbList';
import CsLineIcons from 'cs-line-icons/CsLineIcons';

const Rooms = () => {
  const [rooms, setRooms] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [filters, setFilters] = useState({
    category_id: '',
    status: '',
    floor: '',
  });

  const [formData, setFormData] = useState({
    category_id: '',
    room_number: '',
    floor: '',
    current_price: '',
    status: 'available',
  });

  const [bulkFormData, setBulkFormData] = useState({
    category_id: '',
    start_room_number: '',
    end_room_number: '',
    floor: '',
  });

  const title = 'Manage Rooms';
  const description = 'Manage hotel rooms and their status';

  const breadcrumbs = [
    { to: '/dashboard', text: 'Dashboard' },
    { to: '/dashboard/rooms', text: 'Manage Rooms' },
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

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleBulkChange = (e) => {
    setBulkFormData({
      ...bulkFormData,
      [e.target.name]: e.target.value,
    });
  };

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
    });
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingRoom(null);
    setFormData({
      category_id: '',
      room_number: '',
      floor: '',
      current_price: '',
      status: 'available',
    });
  };

  const closeBulkModal = () => {
    setShowBulkModal(false);
    setBulkFormData({
      category_id: '',
      start_room_number: '',
      end_room_number: '',
      floor: '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const data = {
      ...formData,
      floor: parseInt(formData.floor, 10),
      current_price: formData.current_price ? parseFloat(formData.current_price) : undefined,
    };

    try {
      if (editingRoom) {
        await roomAPI.update(editingRoom._id, data);
        toast.success('Room updated successfully');
      } else {
        await roomAPI.create(data);
        toast.success('Room created successfully');
      }

      fetchRooms();
      closeModal();
    } catch (error) {
      console.error('Error saving room:', error);
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();

    const data = {
      ...bulkFormData,
      floor: parseInt(bulkFormData.floor, 10),
    };

    try {
      const response = await roomAPI.bulkCreate(data);
      toast.success(response.data.message);
      fetchRooms();
      closeBulkModal();
    } catch (error) {
      console.error('Error bulk creating rooms:', error);
      toast.error(error.response?.data?.message || 'Bulk creation failed');
    }
  };

  const handleEdit = (room) => {
    setEditingRoom(room);
    setFormData({
      category_id: room.category_id,
      room_number: room.room_number,
      floor: room.floor,
      current_price: room.current_price,
      status: room.status,
    });
    setShowModal(true);
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
                <Dropdown className="d-inline-block me-2">
                  <Dropdown.Toggle variant="outline-primary" size="sm">
                    <CsLineIcons icon="plus" className="me-2" />
                    Add Rooms
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item onClick={() => setShowModal(true)}>
                      <CsLineIcons icon="plus" className="me-2" />
                      Single Room
                    </Dropdown.Item>
                    <Dropdown.Item onClick={() => setShowBulkModal(true)}>
                      <CsLineIcons icon="layers" className="me-2" />
                      Multiple Rooms
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </Col>
            </Row>
          </div>

          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">Filters</h5>
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
                    <Form.Control type="number" name="floor" value={filters.floor} onChange={handleFilterChange} placeholder="Filter by floor" />
                  </Form.Group>
                </Col>
                <Col xs="12">
                  <Button variant="outline-secondary" size="sm" onClick={() => setFilters({ category_id: '', status: '', floor: '' })}>
                    <CsLineIcons icon="rotate-ccw" className="me-1" />
                    Clear Filters
                  </Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>

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
              <Card.Body className="p-0">
                <div className="table-responsive p-3">
                  <Table hover className="mb-0">
                    <thead>
                      <tr>
                        <th className="text-muted text-small text-uppercase border-top-0 pt-3 pb-2">Room Number</th>
                        <th className="text-muted text-small text-uppercase border-top-0 pt-3 pb-2">Category</th>
                        <th className="text-muted text-small text-uppercase border-top-0 pt-3 pb-2">Floor</th>
                        <th className="text-muted text-small text-uppercase border-top-0 pt-3 pb-2">Price</th>
                        <th className="text-muted text-small text-uppercase border-top-0 pt-3 pb-2">Status</th>
                        <th className="text-muted text-small text-uppercase border-top-0 pt-3 pb-2 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rooms.map((room) => (
                        <tr key={room._id}>
                          <td className="pt-2 pb-2 align-middle">
                            <div className="font-weight-bold">{room.room_number}</div>
                          </td>
                          <td className="pt-2 pb-2 align-middle">{room.category_details?.category_name || 'N/A'}</td>
                          <td className="pt-2 pb-2 align-middle">{room.floor}</td>
                          <td className="pt-2 pb-2 align-middle font-weight-bold">{process.env.REACT_APP_CURRENCY} {room.current_price}</td>
                          <td className="pt-2 pb-2 align-middle">
                            <Dropdown className="d-inline-block">
                              <Dropdown.Toggle variant="link" className="p-0 border-0 bg-transparent shadow-none" id={`status-${room._id}`}>
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
                              <Button variant="outline-primary" size="sm" className="btn-icon btn-icon-only" onClick={() => handleEdit(room)} title="Edit">
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

      {/* Single Room Modal */}
      <Modal show={showModal} onHide={closeModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <CsLineIcons icon={editingRoom ? 'edit' : 'plus'} className="me-2" />
            {editingRoom ? 'Edit Room' : 'Add New Room'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row className="g-3">
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Category</Form.Label>
                  <Form.Select name="category_id" value={formData.category_id} onChange={handleChange} required>
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat._id} value={cat._id}>
                        {cat.category_name} ({process.env.REACT_APP_CURRENCY} {cat.base_price}/night)
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Room Number</Form.Label>
                  <Form.Control type="text" name="room_number" value={formData.room_number} onChange={handleChange} required placeholder="101" />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Floor</Form.Label>
                  <Form.Control type="number" name="floor" value={formData.floor} onChange={handleChange} required min="0" placeholder="1" />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Custom Price (per night)</Form.Label>
                  <Form.Control
                    type="number"
                    name="current_price"
                    value={formData.current_price}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    placeholder="Leave empty for category price"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Status</Form.Label>
                  <Form.Select name="status" value={formData.status} onChange={handleChange}>
                    <option value="available">Available</option>
                    <option value="occupied">Occupied</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="out_of_order">Out of Order</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {editingRoom ? 'Update' : 'Create'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Bulk Create Modal */}
      <Modal show={showBulkModal} onHide={closeBulkModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <CsLineIcons icon="layers" className="me-2" />
            Bulk Create Rooms
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleBulkSubmit}>
          <Modal.Body>
            <Row className="g-3">
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Category</Form.Label>
                  <Form.Select name="category_id" value={bulkFormData.category_id} onChange={handleBulkChange} required>
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat._id} value={cat._id}>
                        {cat.category_name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Start Room Number</Form.Label>
                  <Form.Control
                    type="number"
                    name="start_room_number"
                    value={bulkFormData.start_room_number}
                    onChange={handleBulkChange}
                    required
                    placeholder="101"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>End Room Number</Form.Label>
                  <Form.Control
                    type="number"
                    name="end_room_number"
                    value={bulkFormData.end_room_number}
                    onChange={handleBulkChange}
                    required
                    placeholder="110"
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Floor</Form.Label>
                  <Form.Control type="number" name="floor" value={bulkFormData.floor} onChange={handleBulkChange} required min="0" placeholder="1" />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Alert variant="info">
                  <CsLineIcons icon="info" className="me-2" />
                  This will create rooms with numbers from {bulkFormData.start_room_number} to {bulkFormData.end_room_number} on floor {bulkFormData.floor}.
                </Alert>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeBulkModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Create Rooms
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
};

export default Rooms;
