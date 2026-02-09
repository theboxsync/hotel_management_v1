import React, { useState, useEffect } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { Card, Row, Col, Button, Badge, Table, Spinner, Alert } from 'react-bootstrap';
import { bookingAPI } from 'services/api';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import HtmlHead from 'components/html-head/HtmlHead';
import BreadcrumbList from 'components/breadcrumb-list/BreadcrumbList';
import CsLineIcons from 'cs-line-icons/CsLineIcons';
import PaymentTracker from './PaymentTracker';

const BookingDetails = () => {
    const { id } = useParams();
    const history = useHistory();
    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showPaymentTracker, setShowPaymentTracker] = useState(false);

    const title = 'Booking Details';
    const description = 'View booking information';

    const breadcrumbs = [
        { to: '/operations', text: 'Operations' },
        { to: '/operations/bookings', text: 'Bookings' },
        { to: '', text: 'Details' },
    ];


    const fetchBookingDetails = async () => {
        setLoading(true);
        try {
            const response = await bookingAPI.getOne(id);
            setBooking(response.data.data);
        } catch (error) {
            console.error('Error fetching booking details:', error);
            toast.error('Failed to fetch booking details');
            history.push('/operations/bookings');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBookingDetails();
    }, [id]);

    const handleEdit = () => {
        history.push(`/operations/bookings/edit/${id}`);
    };

    const handleCheckIn = () => {
        history.push(`/operations/check-in-out?booking=${id}&action=checkin`);
    };

    const handleCheckOut = () => {
        history.push(`/operations/check-in-out?booking=${id}&action=checkout`);
    };

    const handleCancel = async () => {
        if (!window.confirm('Are you sure you want to cancel this booking?')) {
            return;
        }

        try {
            await bookingAPI.cancel(id);
            toast.success('Booking cancelled successfully');
            fetchBookingDetails();
        } catch (error) {
            console.error('Error cancelling booking:', error);
            toast.error(error.response?.data?.message || 'Failed to cancel booking');
        }
    };

    const handleBack = () => {
        history.push('/operations/bookings');
    };

    const handlePaymentAdded = () => {
        fetchBookingDetails(); // Refresh booking data after payment
    };

    const getStatusBadge = (status) => {
        const badgeProps = {
            confirmed: { bg: 'success', text: 'Confirmed', icon: 'check-circle' },
            checked_in: { bg: 'primary', text: 'Checked In', icon: 'log-in' },
            checked_out: { bg: 'info', text: 'Checked Out', icon: 'log-out' },
            cancelled: { bg: 'danger', text: 'Cancelled', icon: 'x-circle' },
            no_show: { bg: 'warning', text: 'No Show', icon: 'alert-circle' },
        };
        const { bg = 'secondary', text = status, icon = 'info' } = badgeProps[status] || {};
        return (
            <Badge bg={bg} className="p-2">
                <CsLineIcons icon={icon} className="me-1" size="14" />
                {text}
            </Badge>
        );
    };

    const getPaymentBadge = (status) => {
        const badgeProps = {
            pending: { bg: 'warning', text: 'Pending', icon: 'clock' },
            paid: { bg: 'success', text: 'Paid', icon: 'check' },
            refunded: { bg: 'info', text: 'Refunded', icon: 'rotate-ccw' },
            partial: { bg: 'primary', text: 'Partial', icon: 'credit-card' },
        };
        const { bg = 'secondary', text = status, icon = 'credit-card' } = badgeProps[status] || {};
        return (
            <Badge bg={bg} className="p-2">
                <CsLineIcons icon={icon} className="me-1" size="14" />
                {text}
            </Badge>
        );
    };

    const formatDate = (date) => {
        return format(new Date(date), 'MMM dd, yyyy');
    };

    const formatDateTime = (date) => {
        return format(new Date(date), 'MMM dd, yyyy hh:mm a');
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

    const finalAmount = booking.booking.total_amount + (booking.booking.extra_charges || 0);

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
                                <Button variant="outline-secondary" onClick={handleBack} className="me-2">
                                    <CsLineIcons icon="arrow-left" className="me-2" />
                                    Back to Bookings
                                </Button>
                                {['confirmed', 'checked_in'].includes(booking.booking.booking_status) && (
                                    <Button variant="primary" onClick={handleEdit}>
                                        <CsLineIcons icon="edit" className="me-2" />
                                        Edit Booking
                                    </Button>
                                )}
                            </Col>
                        </Row>
                    </div>

                    <Row>
                        <Col xl={8} lg={10} className="mx-auto">
                            {/* Header Info */}
                            <Card className="mb-4">
                                <Card.Body>
                                    <Row className="g-3 align-items-center">
                                        <Col md={6}>
                                            <div className="mb-2">
                                                <small className="text-muted d-block">Booking Reference</small>
                                                <h3 className="mb-0 text-primary">{booking.booking.booking_reference}</h3>
                                            </div>
                                            <div>
                                                <small className="text-muted d-block">Booking Source</small>
                                                <div className="text-capitalize">{booking.booking.booking_source}</div>
                                            </div>
                                        </Col>
                                        <Col md={6} className="text-md-end">
                                            <div className="mb-2">
                                                <small className="text-muted d-block">Booking Status</small>
                                                <div>{getStatusBadge(booking.booking.booking_status)}</div>
                                            </div>
                                            <div>
                                                <small className="text-muted d-block">Payment Status</small>
                                                <div>{getPaymentBadge(booking.booking.payment_status)}</div>
                                            </div>
                                        </Col>
                                    </Row>
                                </Card.Body>
                            </Card>

                            {/* Payment Status Alert */}
                            {booking.booking.pending_amount > 0 && (
                                <Alert variant="warning" className="mb-4">
                                    <div className="d-flex justify-content-between align-items-center">
                                        <div>
                                            <CsLineIcons icon="alert-circle" className="me-2" />
                                            <strong>Pending Payment:</strong> {process.env.REACT_APP_CURRENCY} {booking.booking.pending_amount} remaining
                                        </div>
                                        <Button
                                            variant="warning"
                                            size="sm"
                                            onClick={() => setShowPaymentTracker(true)}
                                        >
                                            <CsLineIcons icon="credit-card" className="me-2" />
                                            Add Payment
                                        </Button>
                                    </div>
                                </Alert>
                            )}

                            {/* Quick Payment Summary */}
                            <Card className="mb-4 border-primary">
                                <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
                                    <h6 className="mb-0">
                                        <CsLineIcons icon="credit-card" className="me-2" />
                                        Payment Summary
                                    </h6>
                                    <Button
                                        variant="light"
                                        size="sm"
                                        onClick={() => setShowPaymentTracker(true)}
                                    >
                                        <CsLineIcons icon="clock" className="me-2" />
                                        View Full History
                                    </Button>
                                </Card.Header>
                                <Card.Body>
                                    <Row className="g-3">
                                        <Col xs={6} md={3}>
                                            <div className="text-center p-2 border rounded">
                                                <small className="text-muted d-block">Total</small>
                                                <div className="fw-bold">{process.env.REACT_APP_CURRENCY} {finalAmount}</div>
                                            </div>
                                        </Col>
                                        <Col xs={6} md={3}>
                                            <div className="text-center p-2 border rounded bg-success-light">
                                                <small className="text-muted d-block">Paid</small>
                                                <div className="fw-bold text-success">
                                                    {process.env.REACT_APP_CURRENCY} {booking.booking.paid_amount || 0}
                                                </div>
                                            </div>
                                        </Col>
                                        <Col xs={6} md={3}>
                                            <div className="text-center p-2 border rounded bg-warning-light">
                                                <small className="text-muted d-block">Pending</small>
                                                <div className="fw-bold text-warning">
                                                    {process.env.REACT_APP_CURRENCY} {booking.booking.pending_amount || 0}
                                                </div>
                                            </div>
                                        </Col>
                                        <Col xs={6} md={3}>
                                            <div className="text-center p-2 border rounded">
                                                <small className="text-muted d-block">Progress</small>
                                                <div className="fw-bold">
                                                    {((booking.booking.paid_amount / finalAmount) * 100).toFixed(0)}%
                                                </div>
                                            </div>
                                        </Col>
                                    </Row>
                                    <div className="mt-3">
                                        <div className="progress" style={{ height: '8px' }}>
                                            <div
                                                className="progress-bar bg-success"
                                                style={{ width: `${(booking.booking.paid_amount / finalAmount) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                </Card.Body>
                            </Card>

                            {/* Guest Information */}
                            <Card className="mb-4">
                                <Card.Header>
                                    <h5 className="mb-0">
                                        <CsLineIcons icon="user" className="me-2" />
                                        Guest Information
                                    </h5>
                                </Card.Header>
                                <Card.Body>
                                    <Row>
                                        <Col md={4}>
                                            <div className="mb-3">
                                                <small className="text-muted d-block">Name</small>
                                                <div className="fw-bold">{booking.booking.customer_name}</div>
                                            </div>
                                        </Col>
                                        <Col md={4}>
                                            <div className="mb-3">
                                                <small className="text-muted d-block">Email</small>
                                                <div>{booking.booking.customer_email}</div>
                                            </div>
                                        </Col>
                                        <Col md={4}>
                                            <div className="mb-3">
                                                <small className="text-muted d-block">Phone</small>
                                                <div>{booking.booking.customer_phone}</div>
                                            </div>
                                        </Col>
                                        <Col md={4}>
                                            <div className="mb-3">
                                                <small className="text-muted d-block">Total Guests</small>
                                                <div className="fw-bold">{booking.booking.guests_count}</div>
                                            </div>
                                        </Col>
                                    </Row>
                                </Card.Body>
                            </Card>

                            {/* Room Information */}
                            <Card className="mb-4">
                                <Card.Header>
                                    <h5 className="mb-0">
                                        <CsLineIcons icon="bed" className="me-2" />
                                        Room Information ({booking.rooms.length} {booking.rooms.length > 1 ? 'Rooms' : 'Room'})
                                    </h5>
                                </Card.Header>
                                <Card.Body>
                                    <Table bordered hover className="mb-0">
                                        <thead>
                                            <tr>
                                                <th>Room #</th>
                                                <th>Category</th>
                                                <th>Floor</th>
                                                {booking.booking.room_breakdown && booking.booking.room_breakdown.length > 0 && (
                                                    <>
                                                        <th className="text-center">Guests</th>
                                                        <th className="text-end">Price/Night</th>
                                                        <th className="text-end">Subtotal</th>
                                                    </>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {booking.rooms.map((room, index) => {
                                                const breakdown = booking.booking.room_breakdown?.find(
                                                    b => b.room_id === room._id || b.room_number === room.room_number
                                                );

                                                return (
                                                    <tr key={index}>
                                                        <td className="fw-bold">{room.room_number}</td>
                                                        <td>{room.category_name}</td>
                                                        <td>{room.floor}</td>
                                                        {breakdown && (
                                                            <>
                                                                <td className="text-center">{breakdown.guests_in_room}</td>
                                                                <td className="text-end">{process.env.REACT_APP_CURRENCY} {breakdown.price_per_night}</td>
                                                                <td className="text-end fw-bold">{process.env.REACT_APP_CURRENCY} {breakdown.subtotal}</td>
                                                            </>
                                                        )}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </Table>
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
                                    <Row>
                                        <Col md={6}>
                                            <div className="mb-3">
                                                <small className="text-muted d-block">Expected Check-In</small>
                                                <div className="fw-bold">{formatDate(booking.booking.check_in_date)}</div>
                                            </div>
                                        </Col>
                                        <Col md={6}>
                                            <div className="mb-3">
                                                <small className="text-muted d-block">Expected Check-Out</small>
                                                <div className="fw-bold">{formatDate(booking.booking.check_out_date)}</div>
                                            </div>
                                        </Col>
                                        {booking.booking.actual_check_in && (
                                            <Col md={6}>
                                                <div className="mb-3">
                                                    <small className="text-muted d-block">Actual Check-In</small>
                                                    <div className="fw-bold text-success">{formatDateTime(booking.booking.actual_check_in)}</div>
                                                </div>
                                            </Col>
                                        )}
                                        {booking.booking.actual_check_out && (
                                            <Col md={6}>
                                                <div className="mb-3">
                                                    <small className="text-muted d-block">Actual Check-Out</small>
                                                    <div className="fw-bold text-info">{formatDateTime(booking.booking.actual_check_out)}</div>
                                                </div>
                                            </Col>
                                        )}
                                        <Col md={4}>
                                            <div className="mb-3">
                                                <small className="text-muted d-block">Total Nights</small>
                                                <div className="fw-bold">{booking.booking_summary?.nights || 0}</div>
                                            </div>
                                        </Col>
                                    </Row>
                                </Card.Body>
                            </Card>

                            {/* Billing Summary */}
                            <Card className="mb-4 border-primary">
                                <Card.Header className="bg-primary text-white">
                                    <h5 className="mb-0">
                                        <CsLineIcons icon="file-text" className="me-2" />
                                        Billing Summary
                                    </h5>
                                </Card.Header>
                                <Card.Body>
                                    <div className="border rounded">
                                        <div className="p-3 border-bottom">
                                            <Row className="g-0">
                                                <Col>
                                                    <small className="text-muted">
                                                        Room Charges ({booking.booking_summary?.nights} nights × {booking.booking.total_rooms || booking.rooms.length} room{booking.rooms.length > 1 ? 's' : ''})
                                                    </small>
                                                </Col>
                                                <Col xs="auto" className="fw-bold">
                                                    {process.env.REACT_APP_CURRENCY} {booking.booking.total_amount + (booking.booking.discount_amount || 0)}
                                                </Col>
                                            </Row>
                                        </div>

                                        {booking.booking.discount_amount > 0 && (
                                            <div className="p-3 border-bottom">
                                                <Row className="g-0">
                                                    <Col>
                                                        <small className="text-muted">
                                                            Discount {booking.booking.coupon_code && `(${booking.booking.coupon_code})`}
                                                        </small>
                                                    </Col>
                                                    <Col xs="auto" className="text-danger fw-bold">
                                                        -{process.env.REACT_APP_CURRENCY} {booking.booking.discount_amount}
                                                    </Col>
                                                </Row>
                                            </div>
                                        )}

                                        {booking.booking.extra_charges > 0 && (
                                            <div className="p-3 border-bottom">
                                                <Row className="g-0">
                                                    <Col>
                                                        <small className="text-muted">
                                                            Extra Charges
                                                            {booking.booking.extra_charges_description && (
                                                                <div className="text-small mt-1">{booking.booking.extra_charges_description}</div>
                                                            )}
                                                        </small>
                                                    </Col>
                                                    <Col xs="auto" className="text-primary fw-bold">
                                                        +{process.env.REACT_APP_CURRENCY} {booking.booking.extra_charges}
                                                    </Col>
                                                </Row>
                                            </div>
                                        )}

                                        <div className="p-3 bg-light">
                                            <Row className="g-0">
                                                <Col>
                                                    <h5 className="mb-0">Grand Total</h5>
                                                </Col>
                                                <Col xs="auto">
                                                    <h5 className="mb-0 text-primary">
                                                        {process.env.REACT_APP_CURRENCY} {finalAmount.toFixed(2)}
                                                    </h5>
                                                </Col>
                                            </Row>
                                        </div>
                                    </div>
                                </Card.Body>
                            </Card>

                            {/* Special Requests */}
                            {booking.booking.special_requests && (
                                <Card className="mb-4">
                                    <Card.Header>
                                        <h6 className="mb-0">
                                            <CsLineIcons icon="message-square" className="me-2" />
                                            Special Requests
                                        </h6>
                                    </Card.Header>
                                    <Card.Body>
                                        <p className="mb-0">{booking.booking.special_requests}</p>
                                    </Card.Body>
                                </Card>
                            )}

                            {/* Booking Metadata */}
                            <Card className="mb-4">
                                <Card.Header>
                                    <h6 className="mb-0">
                                        <CsLineIcons icon="info" className="me-2" />
                                        Additional Information
                                    </h6>
                                </Card.Header>
                                <Card.Body>
                                    <Row>
                                        <Col md={6}>
                                            <div className="mb-2">
                                                <small className="text-muted d-block">Created At</small>
                                                <div>{formatDateTime(booking.booking.created_at)}</div>
                                            </div>
                                        </Col>
                                        <Col md={6}>
                                            <div className="mb-2">
                                                <small className="text-muted d-block">Last Updated</small>
                                                <div>{formatDateTime(booking.booking.updated_at)}</div>
                                            </div>
                                        </Col>
                                    </Row>
                                </Card.Body>
                            </Card>

                            {/* Action Buttons */}
                            <Card>
                                <Card.Body>
                                    <div className="d-flex gap-2 justify-content-end flex-wrap">
                                        <Button variant="outline-secondary" onClick={handleBack}>
                                            <CsLineIcons icon="arrow-left" className="me-2" />
                                            Back to Bookings
                                        </Button>

                                        <Button
                                            variant="outline-primary"
                                            onClick={() => setShowPaymentTracker(true)}
                                        >
                                            <CsLineIcons icon="credit-card" className="me-2" />
                                            Manage Payments
                                        </Button>

                                        {booking.booking.booking_status === 'confirmed' && (
                                            <>
                                                <Button variant="primary" onClick={handleCheckIn}>
                                                    <CsLineIcons icon="log-in" className="me-2" />
                                                    Check-In
                                                </Button>
                                                <Button variant="outline-primary" onClick={handleEdit}>
                                                    <CsLineIcons icon="edit" className="me-2" />
                                                    Edit
                                                </Button>
                                                <Button variant="danger" onClick={handleCancel}>
                                                    <CsLineIcons icon="x-circle" className="me-2" />
                                                    Cancel
                                                </Button>
                                            </>
                                        )}

                                        {booking.booking.booking_status === 'checked_in' && (
                                            <>
                                                <Button variant="primary" onClick={handleCheckOut}>
                                                    <CsLineIcons icon="log-out" className="me-2" />
                                                    Check-Out
                                                </Button>
                                                <Button variant="outline-primary" onClick={handleEdit}>
                                                    <CsLineIcons icon="edit" className="me-2" />
                                                    Edit
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                </Col>
            </Row>

            {/* Payment Tracker Modal */}
            <PaymentTracker
                show={showPaymentTracker}
                onHide={() => setShowPaymentTracker(false)}
                bookingId={id}
                bookingReference={booking.booking.booking_reference}
                onPaymentAdded={handlePaymentAdded}
            />
        </>
    );
};

export default BookingDetails;