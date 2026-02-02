import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Form, Badge, Spinner, Image } from 'react-bootstrap';
import { useHistory, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import HtmlHead from 'components/html-head/HtmlHead';
import BreadcrumbList from 'components/breadcrumb-list/BreadcrumbList';
import CsLineIcons from 'cs-line-icons/CsLineIcons';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API || 'http://localhost:5000/api';

const AddEditRoomCategory = () => {
    const history = useHistory();
    const { id } = useParams(); // Get category ID from URL if editing
    const isEditMode = !!id;

    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [formData, setFormData] = useState({
        category_name: '',
        base_price: '',
        max_occupancy: '',
        amenities: '',
        description: '',
        images: [],
    });
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [previewUrls, setPreviewUrls] = useState([]);

    const title = isEditMode ? 'Edit Room Category' : 'Add Room Category';
    const description = isEditMode ? 'Update room category details' : 'Create a new room category';

    const breadcrumbs = [
        { to: '/operations', text: 'Operations' },
        { to: '/operations/room-categories', text: 'Room Categories' },
        { to: '', text: isEditMode ? 'Edit' : 'Add' },
    ];

    const fetchCategory = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/rooms/category/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const { category } = response.data.data;
            setFormData({
                category_name: category.category_name,
                base_price: category.base_price,
                max_occupancy: category.max_occupancy,
                amenities: Array.isArray(category.amenities) ? category.amenities.join(', ') : '',
                description: category.description || '',
                images: category.images || [],
            });
        } catch (error) {
            console.error('Error fetching category:', error);
            toast.error('Failed to fetch category details');
            history.push('/operations/room-categories');
        } finally {
            setLoading(false);
        }
    };

    // Fetch category data if editing
    useEffect(() => {
        if (isEditMode) {
            fetchCategory();
        }
    }, [id]);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);

        if (files.length > 5) {
            toast.error('Maximum 5 images allowed');
            return;
        }

        const maxSize = 5 * 1024 * 1024; // 5MB
        const invalidFiles = files.filter(file => file.size > maxSize);

        if (invalidFiles.length > 0) {
            toast.error('Some files exceed 5MB limit');
            return;
        }

        setSelectedFiles(files);
        const urls = files.map(file => URL.createObjectURL(file));
        setPreviewUrls(urls);
    };

    const removeImage = (index, isExisting = false) => {
        if (isExisting) {
            const newImages = [...formData.images];
            newImages.splice(index, 1);
            setFormData({ ...formData, images: newImages });
        } else {
            const newFiles = [...selectedFiles];
            const newPreviews = [...previewUrls];
            URL.revokeObjectURL(newPreviews[index]);
            newFiles.splice(index, 1);
            newPreviews.splice(index, 1);
            setSelectedFiles(newFiles);
            setPreviewUrls(newPreviews);
        }
    };

    const getImageUrl = (imagePath) => {
        if (!imagePath) return null;
        if (imagePath.startsWith('http')) return imagePath;
        return `${API_URL.replace('/api', '')}${imagePath}`;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setUploading(true);

        try {
            const formDataToSend = new FormData();

            formDataToSend.append('category_name', formData.category_name);
            formDataToSend.append('base_price', formData.base_price);
            formDataToSend.append('max_occupancy', formData.max_occupancy);
            formDataToSend.append('description', formData.description || '');

            const amenitiesArray = formData.amenities
                .split(',')
                .map((a) => a.trim())
                .filter((a) => a);
            amenitiesArray.forEach(amenity => {
                formDataToSend.append('amenities[]', amenity);
            });

            if (formData.images.length > 0) {
                formDataToSend.append('existing_images', JSON.stringify(formData.images));
            }

            selectedFiles.forEach(file => {
                formDataToSend.append('images', file);
            });

            const token = localStorage.getItem('token');

            if (isEditMode) {
                await axios.put(
                    `${API_URL}/rooms/category/${id}`,
                    formDataToSend,
                    {
                        headers: {
                            'Content-Type': 'multipart/form-data',
                            'Authorization': `Bearer ${token}`
                        }
                    }
                );
                toast.success('Category updated successfully');
            } else {
                await axios.post(
                    `${API_URL}/rooms/category`,
                    formDataToSend,
                    {
                        headers: {
                            'Content-Type': 'multipart/form-data',
                            'Authorization': `Bearer ${token}`
                        }
                    }
                );
                toast.success('Category created successfully');
            }

            history.push('/operations/room-categories');
        } catch (error) {
            console.error('Error saving category:', error);
            toast.error(error.response?.data?.message || 'Operation failed');
        } finally {
            setUploading(false);
        }
    };

    const handleCancel = () => {
        previewUrls.forEach(url => URL.revokeObjectURL(url));
        history.push('/operations/room-categories');
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
                                <Button variant="outline-secondary" onClick={handleCancel}>
                                    <CsLineIcons icon="arrow-left" className="me-2" />
                                    Back to List
                                </Button>
                            </Col>
                        </Row>
                    </div>

                    <Row>
                        <Col className="mx-auto">
                            <Card>
                                <Card.Body>
                                    <Form onSubmit={handleSubmit}>
                                        <Row className="g-4">
                                            {/* Category Details */}
                                            <Col md={12}>
                                                <h5 className="mb-2 fw-semibold">Category Details</h5>
                                            </Col>

                                            <Col md={12}>
                                                <Form.Group>
                                                    <Form.Label>Category Name *</Form.Label>
                                                    <Form.Control
                                                        type="text"
                                                        name="category_name"
                                                        value={formData.category_name}
                                                        onChange={handleChange}
                                                        required
                                                        placeholder="e.g., Deluxe Room, Suite, Standard Room"
                                                    />
                                                </Form.Group>
                                            </Col>

                                            <Col md={6}>
                                                <Form.Group>
                                                    <Form.Label>Base Price (per night) *</Form.Label>
                                                    <Form.Control
                                                        type="number"
                                                        name="base_price"
                                                        value={formData.base_price}
                                                        onChange={handleChange}
                                                        required
                                                        min="0"
                                                        step="0.01"
                                                        placeholder="150.00"
                                                    />
                                                    <Form.Text className="text-muted">
                                                        Price in {process.env.REACT_APP_CURRENCY || '$'}
                                                    </Form.Text>
                                                </Form.Group>
                                            </Col>

                                            <Col md={6}>
                                                <Form.Group>
                                                    <Form.Label>Max Occupancy *</Form.Label>
                                                    <Form.Control
                                                        type="number"
                                                        name="max_occupancy"
                                                        value={formData.max_occupancy}
                                                        onChange={handleChange}
                                                        required
                                                        min="1"
                                                        placeholder="2"
                                                    />
                                                    <Form.Text className="text-muted">
                                                        Maximum number of guests
                                                    </Form.Text>
                                                </Form.Group>
                                            </Col>

                                            <Col md={12}>
                                                <Form.Group>
                                                    <Form.Label>Amenities</Form.Label>
                                                    <Form.Control
                                                        type="text"
                                                        name="amenities"
                                                        value={formData.amenities}
                                                        onChange={handleChange}
                                                        placeholder="WiFi, AC, TV, Mini Bar, Room Service"
                                                    />
                                                    <Form.Text className="text-muted">
                                                        Separate multiple amenities with commas
                                                    </Form.Text>
                                                </Form.Group>
                                            </Col>

                                            <Col md={12}>
                                                <Form.Group>
                                                    <Form.Label>Description</Form.Label>
                                                    <Form.Control
                                                        as="textarea"
                                                        rows={4}
                                                        name="description"
                                                        value={formData.description}
                                                        onChange={handleChange}
                                                        placeholder="Describe this room category, its features, and what makes it special..."
                                                    />
                                                </Form.Group>
                                            </Col>

                                            {/* Image Upload Section */}
                                            <Col md={12}>
                                                <h5 className="mb-3 fw-semibold">Category Images</h5>
                                                <Form.Group>
                                                    <Form.Label>Upload Images (Max 5)</Form.Label>
                                                    <Form.Control
                                                        type="file"
                                                        multiple
                                                        accept="image/*"
                                                        onChange={handleFileChange}
                                                        disabled={uploading}
                                                    />
                                                    <Form.Text className="text-muted">
                                                        Upload up to 5 images. Max 5MB per image. Supported formats: JPG, PNG, GIF, WebP
                                                    </Form.Text>
                                                </Form.Group>

                                                {/* Image Previews */}
                                                {(formData.images.length > 0 || previewUrls.length > 0) && (
                                                    <div className="mt-3">
                                                        <Form.Label>Preview:</Form.Label>
                                                        <Row className="g-3">
                                                            {/* Existing images */}
                                                            {formData.images.map((image, index) => (
                                                                <Col xs={6} sm={4} md={3} key={`existing-${index}`}>
                                                                    <div className="position-relative">
                                                                        <Image
                                                                            src={getImageUrl(image)}
                                                                            thumbnail
                                                                            style={{ width: '100%', height: '150px', objectFit: 'cover' }}
                                                                        />
                                                                        <Button
                                                                            variant="danger"
                                                                            size="sm"
                                                                            className="position-absolute top-0 end-0 m-1"
                                                                            onClick={() => removeImage(index, true)}
                                                                        >
                                                                            <CsLineIcons icon="bin" size="15" />
                                                                        </Button>
                                                                    </div>
                                                                </Col>
                                                            ))}
                                                            {/* New uploads */}
                                                            {previewUrls.map((url, index) => (
                                                                <Col xs={6} sm={4} md={3} key={`new-${index}`}>
                                                                    <div className="position-relative">
                                                                        <Image
                                                                            src={url}
                                                                            thumbnail
                                                                            style={{ width: '100%', height: '150px', objectFit: 'cover' }}
                                                                        />
                                                                        <Button
                                                                            variant="danger"
                                                                            size="sm"
                                                                            className="position-absolute top-0 end-0 m-1"
                                                                            onClick={() => removeImage(index, false)}
                                                                        >
                                                                            <CsLineIcons icon="bin" size="15" />
                                                                        </Button>
                                                                        <Badge
                                                                            bg="success"
                                                                            className="position-absolute bottom-0 start-0 m-2"
                                                                        >
                                                                            New
                                                                        </Badge>
                                                                    </div>
                                                                </Col>
                                                            ))}
                                                        </Row>
                                                    </div>
                                                )}
                                            </Col>
                                            {/* Action Buttons */}
                                            <Col md={12}>
                                                <div className="d-flex gap-2 justify-content-end mt-3">
                                                    <Button
                                                        variant="outline-secondary"
                                                        onClick={handleCancel}
                                                        disabled={uploading}
                                                    >
                                                        Cancel
                                                    </Button>
                                                    <Button
                                                        variant="primary"
                                                        type="submit"
                                                        disabled={uploading}
                                                    >
                                                        {uploading ? (
                                                            <>
                                                                <Spinner
                                                                    as="span"
                                                                    animation="border"
                                                                    size="sm"
                                                                    role="status"
                                                                    aria-hidden="true"
                                                                    className="me-2"
                                                                />
                                                                {isEditMode ? 'Updating...' : 'Creating...'}
                                                            </>
                                                        ) : (
                                                            <>
                                                                <CsLineIcons icon="save" className="me-2" />
                                                                {isEditMode ? 'Update Category' : 'Create Category'}
                                                            </>
                                                        )}
                                                    </Button>
                                                </div>
                                            </Col>
                                        </Row>
                                    </Form>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                </Col>
            </Row>
        </>
    );
};

export default AddEditRoomCategory;