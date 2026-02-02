import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Badge, Spinner, Alert } from 'react-bootstrap';
import { useHistory } from 'react-router-dom';
import { roomCategoryAPI } from 'services/api';
import { toast } from 'react-toastify';
import HtmlHead from 'components/html-head/HtmlHead';
import BreadcrumbList from 'components/breadcrumb-list/BreadcrumbList';
import CsLineIcons from 'cs-line-icons/CsLineIcons';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const RoomCategories = () => {
  const history = useHistory();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const handleView = (id) => {
    history.push(`/operations/rooms?category_id=${id}`);
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
                      <div style={{ height: '200px', overflow: 'hidden', position: 'relative' }}>
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
                        <Button variant="outline-primary" size="sm" className="flex-grow-1" onClick={() => handleView(category._id)}>
                          <CsLineIcons icon="eye" className="me-1" />
                          View
                        </Button>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="flex-grow-1"
                          onClick={() => handleEdit(category._id)}
                        >
                          <CsLineIcons icon="edit" className="me-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          className="flex-grow-1"
                          onClick={() => handleDelete(category._id)}
                        >
                          <CsLineIcons icon="bin" className="me-1" />
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
    </>
  );
};

export default RoomCategories;