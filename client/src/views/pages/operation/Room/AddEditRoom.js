import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Form, Spinner, Image, Badge, Alert, ButtonGroup } from 'react-bootstrap';
import { useHistory, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import HtmlHead from 'components/html-head/HtmlHead';
import BreadcrumbList from 'components/breadcrumb-list/BreadcrumbList';
import CsLineIcons from 'cs-line-icons/CsLineIcons';
import axios from 'axios';
import { roomCategoryAPI, roomAPI } from 'services/api';

const API_URL = process.env.REACT_APP_API || 'http://localhost:5000/api';

const AddEditRoom = () => {
    const history = useHistory();
    const { id } = useParams();
    const isEditMode = !!id;

    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [categories, setCategories] = useState([]);
    const [creationMode, setCreationMode] = useState('single'); // 'single' or 'bulk'

    // Single room form data
    const [formData, setFormData] = useState({
        room_number: '',
        category_id: '',
        floor: '',
        current_price: '',
        status: 'available',
        notes: '',
        images: [],
    });

    // Bulk room form data
    const [bulkFormData, setBulkFormData] = useState({
        category_id: '',
        start_room_number: '',
        end_room_number: '',
        floor: '',
    });

    const [selectedFiles, setSelectedFiles] = useState([]);
    const [previewUrls, setPreviewUrls] = useState([]);

    const title = isEditMode ? 'Edit Room' : 'Add Room';
    const description = isEditMode ? 'Update room details' : 'Create new room(s)';

    const breadcrumbs = [
        { to: '/operations', text: 'Operations' },
        { to: '/operations/rooms', text: 'Manage Rooms' },
        { to: '', text: isEditMode ? 'Edit' : 'Add' },
    ];

    const statusOptions = [
        { value: 'available', label: 'Available', variant: 'success', icon: 'check-circle' },
        { value: 'occupied', label: 'Occupied', variant: 'primary', icon: 'key' },
        { value: 'maintenance', label: 'Maintenance', variant: 'warning', icon: 'tool' },
        { value: 'out_of_order', label: 'Out of Order', variant: 'danger', icon: 'x-circle' },
    ];

    const fetchCategories = async () => {
        try {
            const response = await roomCategoryAPI.getAll();
            setCategories(response.data.data || []);
        } catch (error) {
            console.error('Error fetching categories:', error);
            toast.error('Failed to fetch room categories');
        }
    };

    const fetchRoom = async () => {
        setLoading(true);
        try {
            const response = await roomAPI.getOne(id);
            const room = response.data.data;

            setFormData({
                room_number: room.room_number,
                category_id: room.category_id,
                floor: room.floor || '',
                current_price: room.current_price || '',
                status: room.status,
                notes: room.notes || '',
                images: room.images || [],
            });
        } catch (error) {
            console.error('Error fetching room:', error);
            toast.error('Failed to fetch room details');
            history.push('/operations/rooms');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
        if (isEditMode) {
            fetchRoom();
        }
    }, [id]);

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

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);

        if (files.length > 10) {
            toast.error('Maximum 10 images allowed');
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

    const handleSingleSubmit = async (e) => {
        e.preventDefault();
        setUploading(true);

        try {
            const formDataToSend = new FormData();

            formDataToSend.append('room_number', formData.room_number);
            formDataToSend.append('category_id', formData.category_id);
            formDataToSend.append('floor', formData.floor);
            formDataToSend.append('status', formData.status);
            formDataToSend.append('notes', formData.notes || '');

            if (formData.current_price) {
                formDataToSend.append('current_price', formData.current_price);
            }

            if (formData.images.length > 0) {
                formDataToSend.append('existing_images', JSON.stringify(formData.images));
            }

            selectedFiles.forEach(file => {
                formDataToSend.append('images', file);
            });

            const token = localStorage.getItem('token');

            if (isEditMode) {
                await axios.put(
                    `${API_URL}/rooms/${id}`,
                    formDataToSend,
                    {
                        headers: {
                            'Content-Type': 'multipart/form-data',
                            'Authorization': `Bearer ${token}`
                        }
                    }
                );
                toast.success('Room updated successfully');
            } else {
                await axios.post(
                    `${API_URL}/rooms`,
                    formDataToSend,
                    {
                        headers: {
                            'Content-Type': 'multipart/form-data',
                            'Authorization': `Bearer ${token}`
                        }
                    }
                );
                toast.success('Room created successfully');
            }

            history.push('/operations/rooms');
        } catch (error) {
            console.error('Error saving room:', error);
            toast.error(error.response?.data?.message || 'Operation failed');
        } finally {
            setUploading(false);
        }
    };

    const handleBulkSubmit = async (e) => {
        e.preventDefault();
        setUploading(true);

        try {
            const data = {
                category_id: bulkFormData.category_id,
                start_room_number: parseInt(bulkFormData.start_room_number, 10),
                end_room_number: parseInt(bulkFormData.end_room_number, 10),
                floor: parseInt(bulkFormData.floor, 10),
            };

            const response = await roomAPI.bulkCreate(data);
            toast.success(response.data.message || 'Rooms created successfully');
            history.push('/operations/rooms');
        } catch (error) {
            console.error('Error bulk creating rooms:', error);
            toast.error(error.response?.data?.message || 'Bulk creation failed');
        } finally {
            setUploading(false);
        }
    };

    const handleCancel = () => {
        previewUrls.forEach(url => URL.revokeObjectURL(url));
        history.push('/operations/rooms');
    };

    const getSelectedCategory = () => {
        const categoryId = creationMode === 'single' ? formData.category_id : bulkFormData.category_id;
        return categories.find(cat => cat._id === categoryId);
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
                                    Back to Rooms
                                </Button>
                            </Col>
                        </Row>
                    </div>

                    <Row>
                        <Col className="mx-auto">
                            <Card>
                                <Card.Body>
                                    {/* Creation Mode Toggle (Only for Add mode) */}
                                    {!isEditMode && (
                                        <div className="mb-4">
                                            <Form.Label className="d-block mb-2">Creation Mode</Form.Label>
                                            <ButtonGroup>
                                                <Button
                                                    variant={creationMode === 'single' ? 'primary' : 'outline-primary'}
                                                    onClick={() => setCreationMode('single')}
                                                >
                                                    {/* <CsLineIcons icon="plus" className="me-2" /> */}
                                                    Single Room
                                                </Button>
                                                <Button
                                                    variant={creationMode === 'bulk' ? 'primary' : 'outline-primary'}
                                                    onClick={() => setCreationMode('bulk')}
                                                >
                                                    {/* <CsLineIcons icon="layers" className="me-2" /> */}
                                                    Multiple Rooms
                                                </Button>
                                            </ButtonGroup>
                                            <Form.Text className="d-block mt-2 text-muted">
                                                {creationMode === 'single'
                                                    ? 'Create a single room with custom details and images'
                                                    : 'Create multiple rooms at once with sequential room numbers'
                                                }
                                            </Form.Text>
                                        </div>
                                    )}

                                    {/* Single Room Form */}
                                    {(isEditMode || creationMode === 'single') && (
                                        <Form onSubmit={handleSingleSubmit}>
                                            <Row className="g-4">
                                                {/* Room Details */}
                                                <Col md={12}>
                                                    <h5 className="mb-2 fs-5">Room Details</h5>
                                                </Col>

                                                <Col md={12}>
                                                    <Form.Group>
                                                        <Form.Label>Category *</Form.Label>
                                                        <Form.Select
                                                            name="category_id"
                                                            value={formData.category_id}
                                                            onChange={handleChange}
                                                            required
                                                        >
                                                            <option value="">Select Category</option>
                                                            {categories.map((category) => (
                                                                <option key={category._id} value={category._id}>
                                                                    {category.category_name} - {process.env.REACT_APP_CURRENCY}{category.base_price}/night
                                                                </option>
                                                            ))}
                                                        </Form.Select>
                                                    </Form.Group>
                                                </Col>

                                                <Col md={6}>
                                                    <Form.Group>
                                                        <Form.Label>Room Number *</Form.Label>
                                                        <Form.Control
                                                            type="text"
                                                            name="room_number"
                                                            value={formData.room_number}
                                                            onChange={handleChange}
                                                            required
                                                            placeholder="e.g., 101, A-201"
                                                        />
                                                    </Form.Group>
                                                </Col>

                                                <Col md={6}>
                                                    <Form.Group>
                                                        <Form.Label>Floor *</Form.Label>
                                                        <Form.Control
                                                            type="number"
                                                            name="floor"
                                                            value={formData.floor}
                                                            onChange={handleChange}
                                                            required
                                                            min="0"
                                                            placeholder="e.g., 1, 2, 3"
                                                        />
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
                                                            placeholder="Leave empty to use category price"
                                                        />
                                                        <Form.Text className="text-muted">
                                                            Optional: Override the category's base price for this specific room
                                                        </Form.Text>
                                                    </Form.Group>
                                                </Col>

                                                <Col md={6}>
                                                    <Form.Group>
                                                        <Form.Label>Status</Form.Label>
                                                        <Form.Select
                                                            name="status"
                                                            value={formData.status}
                                                            onChange={handleChange}
                                                        >
                                                            {statusOptions.map((option) => (
                                                                <option key={option.value} value={option.value}>
                                                                    {option.label}
                                                                </option>
                                                            ))}
                                                        </Form.Select>
                                                    </Form.Group>
                                                </Col>

                                                <Col md={12}>
                                                    <Form.Group>
                                                        <Form.Label>Notes</Form.Label>
                                                        <Form.Control
                                                            as="textarea"
                                                            rows={3}
                                                            name="notes"
                                                            value={formData.notes}
                                                            onChange={handleChange}
                                                            placeholder="Any special notes about this room..."
                                                        />
                                                    </Form.Group>
                                                </Col>

                                                {/* Room Images */}
                                                <Col md={12}>
                                                    <h5 className="mb-3">Room Images</h5>
                                                    <Form.Group>
                                                        <Form.Label>Upload Images (Max 10)</Form.Label>
                                                        <Form.Control
                                                            type="file"
                                                            multiple
                                                            accept="image/*"
                                                            onChange={handleFileChange}
                                                            disabled={uploading}
                                                        />
                                                        <Form.Text className="text-muted">
                                                            Upload up to 10 images. Max 5MB per image.
                                                        </Form.Text>
                                                    </Form.Group>

                                                    {/* Image Previews */}
                                                    {(formData.images.length > 0 || previewUrls.length > 0) && (
                                                        <div className="mt-3">
                                                            <Form.Label>Preview:</Form.Label>
                                                            <Row className="g-3">
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
                                                                            <Badge bg="success" className="position-absolute bottom-0 start-0 m-2">
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
                                                                    {isEditMode ? 'Update Room' : 'Create Room'}
                                                                </>
                                                            )}
                                                        </Button>
                                                    </div>
                                                </Col>
                                            </Row>
                                        </Form>
                                    )}

                                    {/* Bulk Room Form */}
                                    {!isEditMode && creationMode === 'bulk' && (
                                        <Form onSubmit={handleBulkSubmit}>
                                            <Row className="g-4">
                                                <Col md={12}>
                                                    <h5 className="mb-3">Bulk Room Creation</h5>
                                                    <Alert variant="info">
                                                        <CsLineIcons icon="info" className="me-2" />
                                                        Create multiple rooms at once with sequential room numbers. All rooms will use the same category and floor.
                                                    </Alert>
                                                </Col>

                                                <Col md={12}>
                                                    <Form.Group>
                                                        <Form.Label>Category *</Form.Label>
                                                        <Form.Select
                                                            name="category_id"
                                                            value={bulkFormData.category_id}
                                                            onChange={handleBulkChange}
                                                            required
                                                        >
                                                            <option value="">Select Category</option>
                                                            {categories.map((category) => (
                                                                <option key={category._id} value={category._id}>
                                                                    {category.category_name} - {process.env.REACT_APP_CURRENCY}{category.base_price}/night
                                                                </option>
                                                            ))}
                                                        </Form.Select>
                                                    </Form.Group>
                                                </Col>

                                                <Col md={6}>
                                                    <Form.Group>
                                                        <Form.Label>Start Room Number *</Form.Label>
                                                        <Form.Control
                                                            type="number"
                                                            name="start_room_number"
                                                            value={bulkFormData.start_room_number}
                                                            onChange={handleBulkChange}
                                                            required
                                                            min="1"
                                                            placeholder="101"
                                                        />
                                                    </Form.Group>
                                                </Col>

                                                <Col md={6}>
                                                    <Form.Group>
                                                        <Form.Label>End Room Number *</Form.Label>
                                                        <Form.Control
                                                            type="number"
                                                            name="end_room_number"
                                                            value={bulkFormData.end_room_number}
                                                            onChange={handleBulkChange}
                                                            required
                                                            min="1"
                                                            placeholder="110"
                                                        />
                                                    </Form.Group>
                                                </Col>

                                                <Col md={12}>
                                                    <Form.Group>
                                                        <Form.Label>Floor *</Form.Label>
                                                        <Form.Control
                                                            type="number"
                                                            name="floor"
                                                            value={bulkFormData.floor}
                                                            onChange={handleBulkChange}
                                                            required
                                                            min="0"
                                                            placeholder="1"
                                                        />
                                                    </Form.Group>
                                                </Col>

                                                {/* Preview */}
                                                {bulkFormData.start_room_number && bulkFormData.end_room_number && bulkFormData.category_id && (
                                                    <Col md={12}>
                                                        <Alert variant="success">
                                                            <div className="mb-2">
                                                                <strong>
                                                                    <CsLineIcons icon="check-circle" className="me-2" />
                                                                    Preview:
                                                                </strong>
                                                            </div>
                                                            <div>
                                                                • <strong>Rooms to create:</strong>{' '}
                                                                {Number(bulkFormData.end_room_number) - Number(bulkFormData.start_room_number) + 1} rooms
                                                            </div>
                                                            <div>
                                                                • <strong>Room numbers:</strong> {bulkFormData.start_room_number} to {bulkFormData.end_room_number}
                                                            </div>
                                                            <div>
                                                                • <strong>Floor:</strong> {bulkFormData.floor}
                                                            </div>
                                                            {getSelectedCategory() && (
                                                                <>
                                                                    <div>
                                                                        • <strong>Category:</strong> {getSelectedCategory().category_name}
                                                                    </div>
                                                                    <div>
                                                                        • <strong>Price per room:</strong> {process.env.REACT_APP_CURRENCY}{getSelectedCategory().base_price}/night
                                                                    </div>
                                                                </>
                                                            )}
                                                        </Alert>
                                                    </Col>
                                                )}

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
                                                                    Creating Rooms...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <CsLineIcons icon="layers" className="me-2" />
                                                                    Create Rooms
                                                                </>
                                                            )}
                                                        </Button>
                                                    </div>
                                                </Col>
                                            </Row>
                                        </Form>
                                    )}
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                </Col>
            </Row>
        </>
    );
};

export default AddEditRoom;