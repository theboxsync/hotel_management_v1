import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Badge, Spinner, Alert, Modal } from 'react-bootstrap';
import { useHistory } from 'react-router-dom';
import { roomCategoryAPI } from 'services/api';
import { toast } from 'react-toastify';
import HtmlHead from 'components/html-head/HtmlHead';
import BreadcrumbList from 'components/breadcrumb-list/BreadcrumbList';
import CsLineIcons from 'cs-line-icons/CsLineIcons';
import CarouselGallery from 'components/carousel/CarouselGallery';
import AmenityDisplay from 'components/amenities/AmenityDisplay';
import { normalizeAmenities } from 'constants/amenities';

const API_URL = process.env.REACT_APP_API || 'http://localhost:5000/api';

const RoomCategories = () => {
  const history = useHistory();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const cur = process.env.REACT_APP_CURRENCY;

  const title = 'Room Categories';
  const breadcrumbs = [{ to: '/operations', text: 'Operations' }, { to: '/operations/room-categories', text: 'Room Categories' }];

  const fetchCategories = async () => {
    setLoading(true);
    try { const r = await roomCategoryAPI.getAll(); setCategories(r.data.data || []); }
    catch { toast.error('Failed to fetch room categories'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleViewRooms = (id) => history.push(`/operations/rooms?category_id=${id}`);
  const handleEdit = (id) => history.push(`/operations/room-categories/edit/${id}`);
  const handleAdd = () => history.push('/operations/room-categories/add');
  const handleViewDetails = (cat) => { setSelectedCategory(cat); setShowDetailsModal(true); };
  const closeDetailsModal = () => { setShowDetailsModal(false); setSelectedCategory(null); };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try { await roomCategoryAPI.delete(id); toast.success('Category deleted'); fetchCategories(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed to delete category'); }
  };

  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${API_URL.replace('/api', '')}${path}`;
  };

  const getGalleryItems = (cat) => {
    if (!cat?.images?.length) return [{ large: 'https://via.placeholder.com/800x600?text=No+Image', thumb: 'https://via.placeholder.com/200x150?text=No+Image' }];
    return cat.images.map(img => { const url = getImageUrl(img); return { large: url, thumb: url }; });
  };

  if (loading) return <><HtmlHead title={title} /><div className="d-flex justify-content-center align-items-center" style={{ minHeight: 400 }}><Spinner animation="border" variant="primary" /></div></>;

  return (
    <div className="workstation-container pb-5">
      <div className="container-fluid ps-lg-4 pe-lg-5">
        <HtmlHead title={title} description="Manage room categories and pricing" />
        
        <div className="page-title-container mb-4 mt-2 mt-lg-0">
          <Row className="align-items-center">
            <Col xs="12" md="7">
              <h1 className="mb-0 pb-0 display-4 fw-bold" style={{ color: '#23b3f4' }}>{title}</h1>
              <BreadcrumbList items={breadcrumbs} />
            </Col>
            <Col xs="12" md="5" className="d-flex justify-content-md-end gap-2 mt-3 mt-md-0">
              <Button onClick={handleAdd} className="btn-capsule btn-capsule-sm d-flex align-items-center gap-2">
                <CsLineIcons icon="plus" size="18" />
                Add Category
              </Button>
            </Col>
          </Row>
        </div>

        {categories.length === 0 ? (
          <Alert variant="info" style={{ borderRadius: 12 }}><CsLineIcons icon="inbox" className="me-2" />No room categories found. Create your first category!</Alert>
        ) : (
          <Row className="g-4">
            {categories.map(cat => {
              const amenities = normalizeAmenities(cat.amenities);
              return (
                <Col key={cat._id} md={6} lg={4}>
                  <Card className="h-100 workstation-card hover-border-primary border-0 shadow-sm overflow-hidden">

                    {/* Image */}
                    {cat.images?.length > 0 ? (
                      <div style={{ height: 200, overflow: 'hidden', position: 'relative', cursor: 'pointer' }} onClick={() => handleViewDetails(cat)}>
                        <Card.Img variant="top" src={getImageUrl(cat.images[0])} style={{ height: '100%', objectFit: 'cover' }} onError={e => { e.target.src = 'https://via.placeholder.com/400x200?text=No+Image'; }} />
                        {cat.images.length > 1 && <Badge bg="dark" className="position-absolute bottom-0 end-0 m-2"><CsLineIcons icon="image" size="12" className="me-1" />{cat.images.length} photos</Badge>}
                      </div>
                    ) : (
                      <div style={{ height: 200, background: 'var(--separator)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => handleViewDetails(cat)}>
                        <CsLineIcons icon="image" size="40" className="text-muted" />
                      </div>
                    )}

                    <Card.Header className="d-flex justify-content-between align-items-center border-0 bg-transparent pt-3 pb-0">
                      <div>
                        <h6 className="mb-0 fw-bold">{cat.category_name}</h6>
                        {cat.is_extra_bed_allowed && <span style={{ fontSize: 10, color: 'var(--primary)', fontWeight: 700 }}>✓ Extra bed allowed</span>}
                      </div>
                      <Badge bg="primary" style={{ fontSize: 12, padding: '5px 10px', borderRadius: 6 }}>{cur}{cat.base_price}/night</Badge>
                    </Card.Header>

                    <Card.Body>
                      {/* Stats grid */}
                      <Row className="g-2 mb-3">
                        {[{ label: 'Max Guests', val: cat.max_occupancy }, { label: 'Total Rooms', val: cat.total_rooms || 0 }, { label: 'Available', val: cat.available_rooms || 0, color: 'text-success' }, { label: 'Occupied', val: cat.occupied_rooms || 0, color: 'text-primary' }].map(({ label, val, color }) => (
                          <Col xs={6} key={label}>
                            <div style={{ borderRadius: 8, border: '1px solid var(--separator)', padding: '8px', textAlign: 'center' }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
                              <div className={`fw-bold ${color || ''}`}>{val}</div>
                            </div>
                          </Col>
                        ))}
                      </Row>

                      {/* Amenities with icons */}
                      {amenities.length > 0 && (
                        <div className="mb-3">
                          <AmenityDisplay amenities={amenities} compact maxVisible={6} />
                        </div>
                      )}

                      {/* Description snippet */}
                      {cat.description && (
                        <div className="mb-3">
                          <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 0 }}>{cat.description.length > 100 ? `${cat.description.substring(0, 100)}…` : cat.description}</p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="d-flex gap-2 mt-3">
                        <Button variant="outline-primary" size="sm" className="flex-grow-1" onClick={() => handleViewRooms(cat._id)}><CsLineIcons icon="home" className="me-1" size="14" />Rooms</Button>
                        <Button variant="outline-primary" size="sm" className="flex-grow-1" onClick={() => handleViewDetails(cat)}><CsLineIcons icon="eye" className="me-1" size="14" />Details</Button>
                        <Button variant="outline-secondary" size="sm" className="flex-grow-1" onClick={() => handleEdit(cat._id)}><CsLineIcons icon="edit" className="me-1" size="14" />Edit</Button>
                        <Button variant="outline-danger" size="sm" className="btn-icon btn-icon-only" onClick={() => handleDelete(cat._id)}><CsLineIcons icon="bin" size="14" /></Button>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}
      </div>

      {/* Details Modal */}
      <Modal show={showDetailsModal} onHide={closeDetailsModal} size="lg" centered>
        <Modal.Header closeButton style={{ borderBottom: '3px solid var(--primary)', padding: '16px 24px' }}>
          <Modal.Title style={{ fontSize: 16 }}><CsLineIcons icon="list" className="me-2" />Category Details</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: 0 }}>
          {selectedCategory && (() => {
            const cat = selectedCategory;
            const amenities = normalizeAmenities(cat.amenities);
            return (
              <>
                {/* Gallery */}
                {cat.images?.length > 0 && (
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--separator)' }}>
                    <CarouselGallery galleyItems={getGalleryItems(cat)} />
                  </div>
                )}

                {/* Stats strip */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderBottom: '1px solid var(--separator)' }}>
                  {[{ label: 'Base Price', value: `${cur}${cat.base_price}/night`, color: 'var(--primary)' }, { label: 'Max Guests', value: cat.max_occupancy }, { label: 'Total Rooms', value: cat.total_rooms || 0 }, { label: 'Available', value: cat.available_rooms || 0, color: '#28a745' }].map(({ label, value, color }, i, arr) => (
                    <div key={label} style={{ padding: '12px 18px', borderRight: i < arr.length - 1 ? '1px solid var(--separator)' : 'none' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 3 }}>{label}</div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: color || 'var(--body)' }}>{value}</div>
                    </div>
                  ))}
                </div>

                {/* Extra bed info */}
                {cat.is_extra_bed_allowed && (
                  <div style={{ padding: '10px 24px', borderBottom: '1px solid var(--separator)', background: 'var(--background)', fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>
                    <CsLineIcons icon="plus" size="12" className="me-1" />Extra bed is allowed for this category
                  </div>
                )}

                {/* Description */}
                {cat.description && (
                  <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--separator)' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>Description</div>
                    <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>{cat.description}</p>
                  </div>
                )}

                {/* Amenities */}
                {amenities.length > 0 && (
                  <div style={{ padding: '16px 24px' }}>
                    <AmenityDisplay amenities={amenities} title={`Amenities — ${amenities.length}`} />
                  </div>
                )}
              </>
            );
          })()}
        </Modal.Body>
        <Modal.Footer style={{ padding: '12px 20px' }}>
          <Button variant="outline-primary" className="btn-capsule btn-capsule-sm" onClick={() => { closeDetailsModal(); handleViewRooms(selectedCategory._id); }}><CsLineIcons icon="home" className="me-2" size="14" />View Rooms</Button>
          <Button variant="outline-secondary" className="btn-capsule btn-capsule-sm" onClick={() => { closeDetailsModal(); handleEdit(selectedCategory._id); }}><CsLineIcons icon="edit" className="me-2" size="14" />Edit Category</Button>
          <Button variant="secondary" className="btn-capsule btn-capsule-sm" onClick={closeDetailsModal}>Close</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};
export default RoomCategories;