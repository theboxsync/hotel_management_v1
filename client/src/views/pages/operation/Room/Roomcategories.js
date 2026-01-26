import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Form, Badge, Modal, Spinner, Alert, Image } from 'react-bootstrap';
import { roomCategoryAPI } from 'services/api';
import { toast } from 'react-toastify';
import HtmlHead from 'components/html-head/HtmlHead';
import BreadcrumbList from 'components/breadcrumb-list/BreadcrumbList';
import CsLineIcons from 'cs-line-icons/CsLineIcons';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API  || 'http://localhost:5000/api';

const RoomCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    category_name: '',
    base_price: '',
    max_occupancy: '',
    amenities: '',
    description: '',
    images: [], // Existing saved images
  });

  const [selectedFiles, setSelectedFiles] = useState([]); // New files to upload
  const [previewUrls, setPreviewUrls] = useState([]); // Preview URLs for new files

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

  // Handle file selection
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);

    if (files.length > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }

    // Validate file sizes
    const maxSize = 5 * 1024 * 1024; // 5MB
    const invalidFiles = files.filter((file) => file.size > maxSize);

    if (invalidFiles.length > 0) {
      toast.error('Some files exceed 5MB limit');
      return;
    }

    setSelectedFiles(files);

    // Create preview URLs
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviewUrls(urls);
  };

  // Remove image (existing or new)
  const removeImage = (index, isExisting = false) => {
    if (isExisting) {
      // Remove from existing images
      const newImages = [...formData.images];
      newImages.splice(index, 1);
      setFormData({ ...formData, images: newImages });
    } else {
      // Remove from new uploads
      const newFiles = [...selectedFiles];
      const newPreviews = [...previewUrls];

      // Revoke URL to free memory
      URL.revokeObjectURL(newPreviews[index]);

      newFiles.splice(index, 1);
      newPreviews.splice(index, 1);

      setSelectedFiles(newFiles);
      setPreviewUrls(newPreviews);
    }
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
      images: [],
    });
    setSelectedFiles([]);

    // Clean up preview URLs
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    setPreviewUrls([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);

    try {
      // Create FormData for multipart/form-data
      const formDataToSend = new FormData();

      // Add text fields
      formDataToSend.append('category_name', formData.category_name);
      formDataToSend.append('base_price', formData.base_price);
      formDataToSend.append('max_occupancy', formData.max_occupancy);
      formDataToSend.append('description', formData.description || '');

      // Add amenities as array
      const amenitiesArray = formData.amenities
        .split(',')
        .map((a) => a.trim())
        .filter((a) => a);
      amenitiesArray.forEach((amenity) => {
        formDataToSend.append('amenities[]', amenity);
      });

      // Add existing images (for update)
      if (formData.images.length > 0) {
        formDataToSend.append('existing_images', JSON.stringify(formData.images));
      }

      // Add new image files
      selectedFiles.forEach((file) => {
        formDataToSend.append('images', file);
      });

      const token = localStorage.getItem('token');

      if (editingCategory) {
        await axios.put(`${API_URL}/rooms/category/${editingCategory._id}`, formDataToSend, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`,
          },
        });
        toast.success('Category updated successfully');
      } else {
        await axios.post(`${API_URL}/rooms/category`, formDataToSend, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`,
          },
        });
        toast.success('Category created successfully');
      }

      fetchCategories();
      closeModal();
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error(error.response?.data?.message || 'Operation failed');
    } finally {
      setUploading(false);
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
      images: category.images || [],
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

  // Helper to get full image URL
  const getImageUrl = (imagePath) => {
    console.log("Image Path : ", imagePath)
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
                    {/* Category Image */}
                    {category.images && category.images.length > 0 && (
                      <div style={{ height: '200px', overflow: 'hidden' }}>
                        <Card.Img
                          variant="top"
                          src={getImageUrl(category.images[0])}
                          style={{ height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/400x200?text=No+Image';
                          }}
                        />
                      </div>
                    )}

                    <Card.Header className="d-flex justify-content-between align-items-center">
                      <h6 className="mb-0">{category.category_name}</h6>
                      <Badge bg="primary" className="d-flex align-items-center">
                        <CsLineIcons icon="dollar-sign" className="me-1" size="12" />
                        {process.env.REACT_APP_CURRENCY} {category.base_price}/night
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
      <Modal show={showModal} onHide={closeModal} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <CsLineIcons icon={editingCategory ? 'edit' : 'plus'} className="me-2" />
            {editingCategory ? 'Edit Category' : 'Add New Category'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row className="g-3">
              {/* Image Upload Section */}
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Category Images (Max 5)</Form.Label>
                  <Form.Control type="file" multiple accept="image/*" onChange={handleFileChange} disabled={uploading} />
                  <Form.Text className="text-muted">Upload up to 5 images. Max 5MB per image. Supported: JPG, PNG, GIF, WebP</Form.Text>
                </Form.Group>

                {/* Image Previews */}
                {(formData.images.length > 0 || previewUrls.length > 0) && (
                  <div className="mt-3">
                    <small className="text-muted d-block mb-2">Images:</small>
                    <Row className="g-2">
                      {/* Existing images */}
                      {formData.images.map((image, index) => (
                        <Col xs={4} sm={3} key={`existing-${index}`}>
                          <div className="position-relative">
                            <Image src={getImageUrl(image)} thumbnail style={{ width: '100%', height: '100px', objectFit: 'cover' }} />
                            <Button
                              variant="danger"
                              size="sm"
                              className="position-absolute top-0 end-0 m-1"
                              style={{ padding: '2px 6px' }}
                              onClick={() => removeImage(index, true)}
                            >
                              ×
                            </Button>
                          </div>
                        </Col>
                      ))}
                      {/* New uploads preview */}
                      {previewUrls.map((url, index) => (
                        <Col xs={4} sm={3} key={`new-${index}`}>
                          <div className="position-relative">
                            <Image src={url} thumbnail style={{ width: '100%', height: '100px', objectFit: 'cover' }} />
                            <Button
                              variant="danger"
                              size="sm"
                              className="position-absolute top-0 end-0 m-1"
                              style={{ padding: '2px 6px' }}
                              onClick={() => removeImage(index, false)}
                            >
                              ×
                            </Button>
                            <Badge bg="success" className="position-absolute bottom-0 start-0 m-1" style={{ fontSize: '10px' }}>
                              New
                            </Badge>
                          </div>
                        </Col>
                      ))}
                    </Row>
                  </div>
                )}
              </Col>

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
            <Button variant="secondary" onClick={closeModal} disabled={uploading}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={uploading}>
              {uploading ? (
                <>
                  <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                  Uploading...
                </>
              ) : editingCategory ? (
                'Update'
              ) : (
                'Create'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
};

export default RoomCategories;
