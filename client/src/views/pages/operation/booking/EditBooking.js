import React, { useState, useEffect } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { Card, Row, Col, Button, Form, Spinner, Alert, Badge } from 'react-bootstrap';
import { bookingAPI } from 'services/api';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import HtmlHead from 'components/html-head/HtmlHead';
import BreadcrumbList from 'components/breadcrumb-list/BreadcrumbList';
import CsLineIcons from 'cs-line-icons/CsLineIcons';

const EditBooking = () => {
    const { id } = useParams();
    const history = useHistory();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [booking, setBooking] = useState(null);
    const [formData, setFormData] = useState({
        customer_name: '',
        customer_email: '',
        customer_phone: '',
        check_in_date: '',
        check_out_date: '',
        booking_status: '',
        guests_count: 1,
        special_requests: '',
    });

    const title = 'Edit Booking';
    const description = 'Edit booking information';

    const breadcrumbs = [
        { to: '/operations', text: 'Operations' },
        { to: '/operations/bookings', text: 'Bookings' },
        { to: `/operations/bookings/${id}`, text: 'Details' },
        { to: '', text: 'Edit' },
    ];


    const fetchBooking = async () => {
        setLoading(true);
        try {
            const response = await bookingAPI.getOne(id);
            const bookingData = response.data.data.booking;

            setBooking(response.data.data);
            setFormData({
                customer_name: bookingData.customer_name || '',
                customer_email: bookingData.customer_email || '',
                customer_phone: bookingData.customer_phone || '',
                check_in_date: format(new Date(bookingData.check_in_date), 'yyyy-MM-dd'),
                check_out_date: format(new Date(bookingData.check_out_date), 'yyyy-MM-dd'),
                booking_status: bookingData.booking_status || '',
                guests_count: bookingData.guests_count || 1,
                special_requests: bookingData.special_requests || '',
            });
        } catch (error) {
            console.error('Error fetching booking:', error);
            toast.error('Failed to fetch booking details');
            history.push('/operations/bookings');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBooking();
    }, [id]);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.customer_name || !formData.customer_email || !formData.customer_phone) {
            toast.error('Please fill in all required fields');
            return;
        }

        setSubmitting(true);
        try {
            await bookingAPI.update(id, formData);
            toast.success('Booking updated successfully');
            history.push(`/operations/bookings/${id}`);
        } catch (error) {
            console.error('Error updating booking:', error);
            toast.error(error.response?.data?.message || 'Failed to update booking');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = () => {
        history.push(`/operations/bookings/${id}`);
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

    if (!booking) {
        return (
            <>
                <HtmlHead title={title} description={description} />
                <Alert variant="danger">Booking not found</Alert>
            </>
        );
    }

    // Check if booking can be edited
    if (!['confirmed', 'checked_in'].includes(booking.booking.booking_status)) {
        return (
            <>
                <HtmlHead title={title} description={description} />
                <Alert variant="warning">
                    <CsLineIcons icon="alert-circle" className="me-2" />
                    This booking cannot be edited because its status is "{booking.booking.booking_status}".
                    <div className="mt-3">
                        <Button variant="outline-secondary" onClick={() => history.push('/operations/bookings')}>
                            Back to Bookings
                        </Button>
                    </div>
                </Alert>
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
                                    Cancel
                                </Button>
                            </Col>
                        </Row>
                    </div>

                    <Row>
                        <Col xl={8} lg={10} className="mx-auto">
                            {/* Booking Info Card */}
                            <Card className="mb-4 border-primary">
                                <Card.Header className="bg-primary text-white">
                                    <h6 className="mb-0">
                                        <CsLineIcons icon="file-text" className="me-2" />
                                        Booking Reference: {booking.booking.booking_reference}
                                    </h6>
                                </Card.Header>
                                <Card.Body>
                                    <Row>
                                        <Col md={4}>
                                            <div className="mb-2">
                                                <small className="text-muted d-block">Rooms</small>
                                                <div className="fw-bold">
                                                    {booking.rooms.map(r => r.room_number).join(', ')}
                                                </div>
                                            </div>
                                        </Col>
                                        <Col md={4}>
                                            <div className="mb-2">
                                                <small className="text-muted d-block">Total Amount</small>
                                                <div className="fw-bold text-primary">
                                                    {process.env.REACT_APP_CURRENCY} {booking.booking.total_amount}
                                                </div>
                                            </div>
                                        </Col>
                                        <Col md={4}>
                                            <div className="mb-2">
                                                <small className="text-muted d-block">Payment Status</small>
                                                <Badge
                                                    bg={
                                                        booking.booking.payment_status === 'paid' ? 'success' :
                                                            booking.booking.payment_status === 'partial' ? 'warning' :
                                                                'secondary'
                                                    }
                                                    className="p-2"
                                                >
                                                    {booking.booking.payment_status.toUpperCase()}
                                                </Badge>
                                            </div>
                                        </Col>
                                    </Row>
                                    <Alert variant="info" className="mb-0 mt-3">
                                        <CsLineIcons icon="info" className="me-2" />
                                        <small>
                                            To manage payments, go to booking details and use the "Manage Payments" button.
                                        </small>
                                    </Alert>
                                </Card.Body>
                            </Card>

                            {/* Edit Form */}
                            <Form onSubmit={handleSubmit}>
                                {/* Guest Information */}
                                <Card className="mb-4">
                                    <Card.Header>
                                        <h5 className="mb-0">
                                            <CsLineIcons icon="user" className="me-2" />
                                            Guest Information
                                        </h5>
                                    </Card.Header>
                                    <Card.Body>
                                        <Row className="g-3">
                                            <Col md={12}>
                                                <Form.Group>
                                                    <Form.Label>
                                                        Full Name <span className="text-danger">*</span>
                                                    </Form.Label>
                                                    <Form.Control
                                                        type="text"
                                                        name="customer_name"
                                                        value={formData.customer_name}
                                                        onChange={handleChange}
                                                        required
                                                        placeholder="John Doe"
                                                    />
                                                </Form.Group>
                                            </Col>
                                            <Col md={6}>
                                                <Form.Group>
                                                    <Form.Label>
                                                        Email Address <span className="text-danger">*</span>
                                                    </Form.Label>
                                                    <Form.Control
                                                        type="email"
                                                        name="customer_email"
                                                        value={formData.customer_email}
                                                        onChange={handleChange}
                                                        required
                                                        placeholder="john@example.com"
                                                    />
                                                </Form.Group>
                                            </Col>
                                            <Col md={6}>
                                                <Form.Group>
                                                    <Form.Label>
                                                        Phone Number <span className="text-danger">*</span>
                                                    </Form.Label>
                                                    <Form.Control
                                                        type="tel"
                                                        name="customer_phone"
                                                        value={formData.customer_phone}
                                                        onChange={handleChange}
                                                        required
                                                        placeholder="+1234567890"
                                                    />
                                                </Form.Group>
                                            </Col>
                                            <Col md={6}>
                                                <Form.Group>
                                                    <Form.Label>Number of Guests</Form.Label>
                                                    <Form.Control
                                                        type="number"
                                                        name="guests_count"
                                                        value={formData.guests_count}
                                                        onChange={handleChange}
                                                        min="1"
                                                    />
                                                    <Form.Text className="text-muted">
                                                        Max capacity: {booking.rooms.reduce((sum, room) => sum + (room.max_occupancy || 2), 0)} guests
                                                    </Form.Text>
                                                </Form.Group>
                                            </Col>
                                        </Row>
                                    </Card.Body>
                                </Card>

                                {/* Booking Dates */}
                                <Card className="mb-4">
                                    <Card.Header>
                                        <h5 className="mb-0">
                                            <CsLineIcons icon="calendar" className="me-2" />
                                            Booking Dates
                                        </h5>
                                    </Card.Header>
                                    <Card.Body>
                                        <Row className="g-3">
                                            <Col md={6}>
                                                <Form.Group>
                                                    <Form.Label>Check-In Date</Form.Label>
                                                    <Form.Control
                                                        type="date"
                                                        name="check_in_date"
                                                        value={formData.check_in_date}
                                                        onChange={handleChange}
                                                        min={formData.booking_status === 'checked_in' ? formData.check_in_date : new Date().toISOString().split('T')[0]}
                                                    />
                                                </Form.Group>
                                            </Col>
                                            <Col md={6}>
                                                <Form.Group>
                                                    <Form.Label>Check-Out Date</Form.Label>
                                                    <Form.Control
                                                        type="date"
                                                        name="check_out_date"
                                                        value={formData.check_out_date}
                                                        onChange={handleChange}
                                                        min={formData.check_in_date || new Date().toISOString().split('T')[0]}
                                                    />
                                                </Form.Group>
                                            </Col>
                                            <Col md={12}>
                                                <Alert variant="info" className="mb-0">
                                                    <CsLineIcons icon="info" className="me-2" />
                                                    <small>
                                                        Changing dates will recalculate the total amount and check room availability.
                                                        Rooms must be available for the new dates.
                                                    </small>
                                                </Alert>
                                            </Col>
                                        </Row>
                                    </Card.Body>
                                </Card>

                                {/* Special Requests */}
                                <Card className="mb-4">
                                    <Card.Header>
                                        <h6 className="mb-0">
                                            <CsLineIcons icon="message-square" className="me-2" />
                                            Special Requests
                                        </h6>
                                    </Card.Header>
                                    <Card.Body>
                                        <Form.Group>
                                            <Form.Control
                                                as="textarea"
                                                rows={4}
                                                name="special_requests"
                                                value={formData.special_requests}
                                                onChange={handleChange}
                                                placeholder="Any special requirements or requests..."
                                            />
                                        </Form.Group>
                                    </Card.Body>
                                </Card>

                                {/* Room Details (Read-only) */}
                                <Card className="mb-4 bg-light">
                                    <Card.Header>
                                        <h6 className="mb-0">
                                            <CsLineIcons icon="bed" className="me-2" />
                                            Room Details (Cannot be changed)
                                        </h6>
                                    </Card.Header>
                                    <Card.Body>
                                        {booking.rooms.map((room, index) => (
                                            <div key={index} className={`d-flex justify-content-between align-items-center ${index < booking.rooms.length - 1 ? 'mb-2 pb-2 border-bottom' : ''}`}>
                                                <div>
                                                    <div className="fw-bold">Room {room.room_number}</div>
                                                    <small className="text-muted">{room.category_name} • Floor {room.floor}</small>
                                                </div>
                                                <Badge bg="info">
                                                    {process.env.REACT_APP_CURRENCY} {room.current_price || 'N/A'}
                                                </Badge>
                                            </div>
                                        ))}
                                        <Alert variant="warning" className="mb-0 mt-3">
                                            <small>
                                                <CsLineIcons icon="alert-circle" className="me-2" />
                                                To change rooms, please cancel this booking and create a new one.
                                            </small>
                                        </Alert>
                                    </Card.Body>
                                </Card>

                                {/* Action Buttons */}
                                <Card>
                                    <Card.Body>
                                        <div className="d-flex gap-2 justify-content-end">
                                            <Button variant="outline-secondary" onClick={handleCancel}>
                                                <CsLineIcons icon="x" className="me-2" />
                                                Cancel
                                            </Button>
                                            <Button variant="primary" type="submit" disabled={submitting}>
                                                {submitting ? (
                                                    <>
                                                        <Spinner as="span" animation="border" size="sm" className="me-2" />
                                                        Saving...
                                                    </>
                                                ) : (
                                                    <>
                                                        <CsLineIcons icon="save" className="me-2" />
                                                        Save Changes
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Form>
                        </Col>
                    </Row>
                </Col>
            </Row>
        </>
    );
};

export default EditBooking;