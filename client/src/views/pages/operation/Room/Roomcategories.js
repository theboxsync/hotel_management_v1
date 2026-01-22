import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Form, Badge, Modal, Spinner, Alert } from 'react-bootstrap';
import { roomCategoryAPI } from 'services/api';
import { toast } from 'react-toastify';
import HtmlHead from 'components/html-head/HtmlHead';
import BreadcrumbList from 'components/breadcrumb-list/BreadcrumbList';
import CsLineIcons from 'cs-line-icons/CsLineIcons';

const RoomCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    category_name: '',
    base_price: '',
    max_occupancy: '',
    amenities: '',
    description: '',
  });

  const title = 'Room Categories';
  const description = 'Manage room categories and pricing';

  const breadcrumbs = [
    { to: '/dashboard', text: 'Dashboard' },
    { to: '/dashboard/room-categories', text: 'Room Categories' },
  ];

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await roomCategoryAPI.getAll();
      setCategories(response.data.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to fetch room categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setFormData({
      category_name: '',
      base_price: '',
      max_occupancy: '',
      amenities: '',
      description: '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const data = {
      ...formData,
      base_price: parseFloat(formData.base_price),
      max_occupancy: parseInt(formData.max_occupancy, 10),
      amenities: formData.amenities
        .split(',')
        .map((a) => a.trim())
        .filter((a) => a),
    };

    try {
      if (editingCategory) {
        await roomCategoryAPI.update(editingCategory._id, data);
        toast.success('Category updated successfully');
      } else {
        await roomCategoryAPI.create(data);
        toast.success('Category created successfully');
      }

      fetchCategories();
      closeModal();
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      category_name: category.category_name,
      base_price: category.base_price,
      max_occupancy: category.max_occupancy,
      amenities: Array.isArray(category.amenities) ? category.amenities.join(', ') : '',
      description: category.description || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category?')) {
      return;
    }

    try {
      await roomCategoryAPI.delete(id);
      toast.success('Category deleted successfully');
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error(error.response?.data?.message || 'Failed to delete category');
    }
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
                <Button variant="primary" onClick={() => setShowModal(true)}>
                  <CsLineIcons icon="plus" className="me-2" />
                  Add Category
                </Button>
              </Col>
            </Row>
          </div>

          {categories.length === 0 ? (
            <Alert variant="info" className="text-center">
              <CsLineIcons icon="inbox" className="me-2" />
              No room categories found. Create your first category!
            </Alert>
          ) : (
            <Row className="g-4">
              {categories.map((category) => (
                <Col key={category._id} md={6} lg={4}>
                  <Card className="h-100 hover-border-primary">
                    <Card.Header className="d-flex justify-content-between align-items-center">
                      <h6 className="mb-0">{category.category_name}</h6>
                      <Badge bg="primary" className="d-flex align-items-center">
                        <CsLineIcons icon="dollar-sign" className="me-1" size="12" />{process.env.REACT_APP_CURRENCY} {category.base_price}/night
                      </Badge>
                    </Card.Header>
                    <Card.Body>
                      <div className="mb-3">
                        <Row className="g-2">
                          <Col xs={6}>
                            <div className="border rounded p-2 text-center">
                              <small className="text-muted d-block">Max Guests</small>
                              <div className="font-weight-bold">{category.max_occupancy}</div>
                            </div>
                          </Col>
                          <Col xs={6}>
                            <div className="border rounded p-2 text-center">
                              <small className="text-muted d-block">Total Rooms</small>
                              <div className="font-weight-bold">{category.total_rooms || 0}</div>
                            </div>
                          </Col>
                          <Col xs={6}>
                            <div className="border rounded p-2 text-center">
                              <small className="text-muted d-block">Available</small>
                              <div className="font-weight-bold text-success">{category.available_rooms || 0}</div>
                            </div>
                          </Col>
                          <Col xs={6}>
                            <div className="border rounded p-2 text-center">
                              <small className="text-muted d-block">Occupied</small>
                              <div className="font-weight-bold text-primary">{category.occupied_rooms || 0}</div>
                            </div>
                          </Col>
                        </Row>
                      </div>

                      {category.amenities && category.amenities.length > 0 && (
                        <div className="mb-3">
                          <small className="text-muted d-block mb-1">Amenities</small>
                          <div className="d-flex flex-wrap gap-1">
                            {category.amenities.map((amenity, index) => (
                              <Badge key={index} bg="light" text="dark" className="me-1 mb-1">
                                {amenity}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {category.description && (
                        <div className="mb-3">
                          <small className="text-muted d-block mb-1">Description</small>
                          <p className="mb-0 text-small">{category.description}</p>
                        </div>
                      )}

                      <div className="d-flex gap-2">
                        <Button variant="outline-primary" size="sm" className="flex-grow-1" onClick={() => handleEdit(category)}>
                          <CsLineIcons icon="edit" className="me-1" />
                          Edit
                        </Button>
                        <Button variant="outline-danger" size="sm" className="flex-grow-1" onClick={() => handleDelete(category._id)}>
                          <CsLineIcons icon="trash" className="me-1" />
                          Delete
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Col>
      </Row>

      {/* Add/Edit Modal */}
      <Modal show={showModal} onHide={closeModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <CsLineIcons icon={editingCategory ? 'edit' : 'plus'} className="me-2" />
            {editingCategory ? 'Edit Category' : 'Add New Category'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row className="g-3">
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Category Name</Form.Label>
                  <Form.Control
                    type="text"
                    name="category_name"
                    value={formData.category_name}
                    onChange={handleChange}
                    required
                    placeholder="e.g., Deluxe Room"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Base Price (per night)</Form.Label>
                  <Form.Control
                    type="number"
                    name="base_price"
                    value={formData.base_price}
                    onChange={handleChange}
                    required
                    min="0"
                    step="0.01"
                    placeholder="150"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Max Occupancy</Form.Label>
                  <Form.Control type="number" name="max_occupancy" value={formData.max_occupancy} onChange={handleChange} required min="1" placeholder="2" />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Amenities (comma-separated)</Form.Label>
                  <Form.Control type="text" name="amenities" value={formData.amenities} onChange={handleChange} placeholder="WiFi, AC, TV, Mini Bar" />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Describe this room category..."
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {editingCategory ? 'Update' : 'Create'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
};

export default RoomCategories;
