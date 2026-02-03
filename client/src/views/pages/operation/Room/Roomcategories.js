import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Badge, Spinner, Alert, Modal, Carousel } from 'react-bootstrap';
import { useHistory } from 'react-router-dom';
import { roomCategoryAPI } from 'services/api';
import { toast } from 'react-toastify';
import HtmlHead from 'components/html-head/HtmlHead';
import BreadcrumbList from 'components/breadcrumb-list/BreadcrumbList';
import CsLineIcons from 'cs-line-icons/CsLineIcons';
import CarouselGallery from 'components/carousel/CarouselGallery';

const API_URL = process.env.REACT_APP_API || 'http://localhost:5000/api';

const RoomCategories = () => {
  const history = useHistory();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const title = 'Room Categories';
  const description = 'Manage room categories and pricing';

  const breadcrumbs = [
    { to: '/operations', text: 'Operations' },
    { to: '/operations/room-categories', text: 'Room Categories' },
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

  const handleViewRooms = (id) => {
    history.push(`/operations/rooms?category_id=${id}`);
  };

  const handleViewDetails = (category) => {
    setSelectedCategory(category);
    setShowDetailsModal(true);
  };

  const handleEdit = (id) => {
    history.push(`/operations/room-categories/edit/${id}`);
  };

  const handleAdd = () => {
    history.push('/operations/room-categories/add');
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

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedCategory(null);
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    return `${API_URL.replace('/api', '')}${imagePath}`;
  };

  // Prepare gallery items for GlideGallery
  const getGalleryItems = (category) => {
    if (!category || !category.images || category.images.length === 0) {
      return [{
        large: 'https://via.placeholder.com/800x600?text=No+Image',
        thumb: 'https://via.placeholder.com/200x150?text=No+Image',
      }];
    }

    return category.images.map(image => {
      const imageUrl = getImageUrl(image);
      return {
        large: imageUrl,
        thumb: imageUrl, // Using same image for thumb, you can create thumbnails if needed
      };
    });
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
                    {category.images && category.images.length > 0 ? (
                      <div
                        style={{ height: '200px', overflow: 'hidden', position: 'relative', cursor: 'pointer' }}
                        onClick={() => handleViewDetails(category)}
                      >
                        <Card.Img
                          variant="top"
                          src={getImageUrl(category.images[0])}
                          style={{ height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/400x200?text=No+Image';
                          }}
                        />
                        {category.images.length > 1 && (
                          <Badge
                            bg="dark"
                            className="position-absolute bottom-0 end-0 m-2"
                          >
                            <CsLineIcons icon="image" size="12" className="me-1" />
                            {category.images.length} photos
                          </Badge>
                        )}
                        <div
                          className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
                          style={{
                            background: 'rgba(0,0,0,0)',
                            transition: 'background 0.3s',
                            opacity: 0
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(0,0,0,0.5)';
                            e.currentTarget.style.opacity = 1;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(0,0,0,0)';
                            e.currentTarget.style.opacity = 0;
                          }}
                        >
                          <Badge bg="light" text="dark" className="p-2">
                            <CsLineIcons icon="eye" className="me-1" />
                            Click to view details
                          </Badge>
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          height: '200px',
                          backgroundColor: '#f0f0f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                        onClick={() => handleViewDetails(category)}
                      >
                        <CsLineIcons icon="image" size="40" className="text-muted" />
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
                              <div className="fw-bold">{category.max_occupancy}</div>
                            </div>
                          </Col>
                          <Col xs={6}>
                            <div className="border rounded p-2 text-center">
                              <small className="text-muted d-block">Total Rooms</small>
                              <div className="fw-bold">{category.total_rooms || 0}</div>
                            </div>
                          </Col>
                          <Col xs={6}>
                            <div className="border rounded p-2 text-center">
                              <small className="text-muted d-block">Available</small>
                              <div className="fw-bold text-success">{category.available_rooms || 0}</div>
                            </div>
                          </Col>
                          <Col xs={6}>
                            <div className="border rounded p-2 text-center">
                              <small className="text-muted d-block">Occupied</small>
                              <div className="fw-bold text-primary">{category.occupied_rooms || 0}</div>
                            </div>
                          </Col>
                        </Row>
                      </div>

                      {category.amenities && category.amenities.length > 0 && (
                        <div className="mb-3">
                          <small className="text-muted d-block mb-1">Amenities</small>
                          <div className="d-flex flex-wrap gap-1">
                            {category.amenities.slice(0, 4).map((amenity, index) => (
                              <Badge key={index} bg="light" text="dark" className="me-1 mb-1">
                                {amenity}
                              </Badge>
                            ))}
                            {category.amenities.length > 4 && (
                              <Badge bg="light" text="dark" className="me-1 mb-1">
                                +{category.amenities.length - 4} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {category.description && (
                        <div className="mb-3">
                          <small className="text-muted d-block mb-1">Description</small>
                          <p className="mb-0 text-small text-muted">
                            {category.description.length > 100
                              ? `${category.description.substring(0, 100)}...`
                              : category.description
                            }
                          </p>
                        </div>
                      )}

                      <div className="d-flex gap-2 mt-3">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="flex-grow-1"
                          onClick={() => handleViewRooms(category._id)}
                          title="View rooms in this category"
                        >
                          <CsLineIcons icon="home" className="me-1" />
                          Rooms
                        </Button>
                        <Button
                          variant="outline-info"
                          size="sm"
                          className="flex-grow-1"
                          onClick={() => handleViewDetails(category)}
                          title="View full category details"
                        >
                          <CsLineIcons icon="eye" className="me-1" />
                          Details
                        </Button>
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          className="flex-grow-1"
                          onClick={() => handleEdit(category._id)}
                          title="Edit category"
                        >
                          <CsLineIcons icon="edit" className="me-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleDelete(category._id)}
                          title="Delete category"
                        >
                          <CsLineIcons icon="bin" />
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

      {/* Category Details Modal */}
      <Modal
        show={showDetailsModal}
        onHide={closeDetailsModal}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <CsLineIcons icon="eye" className="me-2" />
            Category Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedCategory && (
            <>
              {/* Image Carousel */}
              {selectedCategory.images && selectedCategory.images.length > 0 && (
                <div className="mb-4">
                  {getGalleryItems(selectedCategory) && (
                    <CarouselGallery
                      galleyItems={getGalleryItems(selectedCategory)}
                    />
                  )}
                </div>
              )}

              {/* Category Information */}
              <div className="mb-4">
                <Row className="align-items-center mb-3">
                  <Col>
                    <h4 className="mb-0">{selectedCategory.category_name}</h4>
                  </Col>
                  <Col xs="auto">
                    <Badge bg="primary" className="p-2 fs-6">
                      <CsLineIcons icon="dollar-sign" className="me-1" />
                      {process.env.REACT_APP_CURRENCY} {selectedCategory.base_price}/night
                    </Badge>
                  </Col>
                </Row>

                {/* Statistics */}
                <Row className="g-3 mb-4">
                  <Col xs={6} md={3}>
                    <Card className="text-center border-primary">
                      <Card.Body className="p-3">
                        <CsLineIcons icon="user" size="20" className="text-primary mb-2" />
                        <div className="text-muted small">Max Guests</div>
                        <div className="fw-bold fs-5">{selectedCategory.max_occupancy}</div>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col xs={6} md={3}>
                    <Card className="text-center border-info">
                      <Card.Body className="p-3">
                        <CsLineIcons icon="home" size="20" className="text-info mb-2" />
                        <div className="text-muted small">Total Rooms</div>
                        <div className="fw-bold fs-5">{selectedCategory.total_rooms || 0}</div>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col xs={6} md={3}>
                    <Card className="text-center border-success">
                      <Card.Body className="p-3">
                        <CsLineIcons icon="check-circle" size="20" className="text-success mb-2" />
                        <div className="text-muted small">Available</div>
                        <div className="fw-bold fs-5 text-success">{selectedCategory.available_rooms || 0}</div>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col xs={6} md={3}>
                    <Card className="text-center border-primary">
                      <Card.Body className="p-3">
                        <CsLineIcons icon="key" size="20" className="text-primary mb-2" />
                        <div className="text-muted small">Occupied</div>
                        <div className="fw-bold fs-5 text-primary">{selectedCategory.occupied_rooms || 0}</div>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>

                {/* Description */}
                {selectedCategory.description && (
                  <div className="mb-4">
                    <h5 className="mb-2">
                      <CsLineIcons icon="file-text" className="me-2" />
                      Description
                    </h5>
                    <p className="text-muted mb-0">{selectedCategory.description}</p>
                  </div>
                )}

                {/* Amenities */}
                {selectedCategory.amenities && selectedCategory.amenities.length > 0 && (
                  <div className="mb-4">
                    <h5 className="mb-3">
                      <CsLineIcons icon="star" className="me-2" />
                      Amenities
                    </h5>
                    <Row className="g-2">
                      {selectedCategory.amenities.map((amenity, index) => (
                        <Col xs={6} md={4} key={index}>
                          <div className="d-flex align-items-center p-2 border rounded">
                            <CsLineIcons icon="check" className="text-success me-2" size="16" />
                            <span>{amenity}</span>
                          </div>
                        </Col>
                      ))}
                    </Row>
                  </div>
                )}
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="outline-primary"
            onClick={() => {
              closeDetailsModal();
              handleViewRooms(selectedCategory._id);
            }}
          >
            <CsLineIcons icon="home" className="me-2" />
            View Rooms
          </Button>
          <Button
            variant="outline-secondary"
            onClick={() => {
              closeDetailsModal();
              handleEdit(selectedCategory._id);
            }}
          >
            <CsLineIcons icon="edit" className="me-2" />
            Edit Category
          </Button>
          <Button variant="secondary" onClick={closeDetailsModal}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default RoomCategories;