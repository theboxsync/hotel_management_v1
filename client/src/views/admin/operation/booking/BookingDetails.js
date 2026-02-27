import React, { useState, useEffect } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { Card, Row, Col, Button, Badge, Table, Spinner, Alert, Modal, Form } from 'react-bootstrap';
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
    const [cancelModal, setCancelModal] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [cancelReason, setCancelReason] = useState('');

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
        setCancelling(true);
        try {
            await bookingAPI.cancel(id, { cancel_reason: cancelReason });
            toast.success('Booking cancelled successfully');
            setCancelModal(false);
            setCancelReason('');
            fetchBookingDetails();
        } catch (error) {
            console.error('Error cancelling booking:', error);
            toast.error(error.response?.data?.message || 'Failed to cancel booking');
        } finally {
            setCancelling(false);
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
                    {/* Page Title */}
                    <div className="page-title-container mb-4">
                        <Row className="align-items-center">
                            <Col xs="12" md="7">
                                <h1 className="mb-0 pb-0 display-4">{title}</h1>
                                <BreadcrumbList items={breadcrumbs} />
                            </Col>
                            <Col xs="12" md="5" className="text-end">
                                <Button variant="outline-secondary" onClick={handleBack} className="me-2">
                                    <CsLineIcons icon="arrow-left" className="me-2" />
                                    Back
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

                    {/* Booking Reference Header Card */}
                    <Card className="mb-4 shadow-sm">
                        <Card.Body className="p-4">
                            <Row className="align-items-center">
                                <Col md={8}>
                                    <div className="d-flex align-items-center">
                                        <div className="flex-shrink-0">
                                            <div className="bg-light-primary rounded p-3 me-3">
                                                <CsLineIcons icon="calendar" size="24" className="text-primary" />
                                            </div>
                                        </div>
                                        <div>
                                            <small className="text-muted d-block mb-1">Booking Reference</small>
                                            <h2 className="mb-0 text-primary">{booking.booking.booking_reference}</h2>
                                            <div className="mt-2">
                                                <Badge bg="light" text="dark" className="me-2">
                                                    <CsLineIcons icon="globe" size="12" className="me-1" />
                                                    {booking.booking.booking_source}
                                                </Badge>
                                                {getStatusBadge(booking.booking.booking_status)}
                                                <span className="ms-2">{getPaymentBadge(booking.booking.payment_status)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </Col>
                                <Col md={4} className="text-md-end mt-3 mt-md-0">
                                    <div className="bg-light rounded p-3">
                                        <small className="text-muted d-block">Total Amount</small>
                                        <h3 className="mb-0 text-primary">{process.env.REACT_APP_CURRENCY} {finalAmount.toFixed(2)}</h3>
                                    </div>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>

                    {/* Payment Status Alert */}
                    {booking.booking.pending_amount > 0 && (
                        <Alert variant="warning" className="mb-4 d-flex justify-content-between align-items-center">
                            <div>
                                <CsLineIcons icon="alert-circle" className="me-2" />
                                <strong>Pending Payment:</strong> {process.env.REACT_APP_CURRENCY} {booking.booking.pending_amount} remaining
                            </div>
                            <Button
                                variant="warning"
                                size="sm"
                                onClick={() => setShowPaymentTracker(true)}
                                className="ms-3"
                            >
                                <CsLineIcons icon="credit-card" className="me-2" />
                                Add Payment
                            </Button>
                        </Alert>
                    )}

                    {/* Payment Progress Card */}
                    <Card className="mb-4 border-0 shadow-sm">
                        <Card.Body className="p-4">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h5 className="mb-0">
                                    <CsLineIcons icon="credit-card" className="me-2" />
                                    Payment Summary
                                </h5>
                                <Button
                                    variant="outline-primary"
                                    size="sm"
                                    onClick={() => setShowPaymentTracker(true)}
                                >
                                    <CsLineIcons icon="clock" className="me-2" />
                                    View History
                                </Button>
                            </div>

                            <Row className="g-4 mb-3">
                                <Col xs={6} md={3}>
                                    <div className="bg-light rounded p-3 text-center">
                                        <small className="text-muted d-block mb-1">Total</small>
                                        <h4 className="mb-0">{process.env.REACT_APP_CURRENCY} {finalAmount}</h4>
                                    </div>
                                </Col>
                                <Col xs={6} md={3}>
                                    <div className="bg-light rounded p-3 text-center">
                                        <small className="text-muted d-block mb-1">Paid</small>
                                        <h4 className="mb-0 text-success">{process.env.REACT_APP_CURRENCY} {booking.booking.paid_amount || 0}</h4>
                                    </div>
                                </Col>
                                <Col xs={6} md={3}>
                                    <div className="bg-light rounded p-3 text-center">
                                        <small className="text-muted d-block mb-1">Pending</small>
                                        <h4 className="mb-0 text-warning">{process.env.REACT_APP_CURRENCY} {booking.booking.pending_amount || 0}</h4>
                                    </div>
                                </Col>
                                <Col xs={6} md={3}>
                                    <div className="bg-light rounded p-3 text-center">
                                        <small className="text-muted d-block mb-1">Progress</small>
                                        <h4 className="mb-0">{((booking.booking.paid_amount / finalAmount) * 100).toFixed(0)}%</h4>
                                    </div>
                                </Col>
                            </Row>

                            <div className="progress" style={{ height: '10px' }}>
                                <div
                                    className="progress-bar bg-success"
                                    style={{ width: `${(booking.booking.paid_amount / finalAmount) * 100}%` }}
                                />
                            </div>
                        </Card.Body>
                    </Card>

                    {/* Guest Information Card */}
                    <Card className="mb-4 border-0 shadow-sm">
                        <Card.Body className="p-4">
                            <h5 className="mb-4">
                                <CsLineIcons icon="user" className="me-2" />
                                Guest Information
                            </h5>

                            <Row>
                                <Col md={3} className="mb-3">
                                    <small className="text-muted d-block mb-1">Full Name</small>
                                    <div className="fw-bold">{booking.booking.customer_name}</div>
                                </Col>
                                <Col md={3} className="mb-3">
                                    <small className="text-muted d-block mb-1">Email Address</small>
                                    <div>{booking.booking.customer_email}</div>
                                </Col>
                                <Col md={3} className="mb-3">
                                    <small className="text-muted d-block mb-1">Phone Number</small>
                                    <div>{booking.booking.customer_phone}</div>
                                </Col>
                                <Col md={3} className="mb-3">
                                    <small className="text-muted d-block mb-1">Total Guests</small>
                                    <div className="fw-bold">{booking.booking.guests_count}</div>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>

                    {/* Room Information Card */}
                    <Card className="mb-4 border-0 shadow-sm">
                        <Card.Body className="p-4">
                            <h5 className="mb-4">
                                <CsLineIcons icon="bed" className="me-2" />
                                Room Information ({booking.rooms.length} {booking.rooms.length > 1 ? 'Rooms' : 'Room'})
                            </h5>

                            <div className="table-responsive">
                                <Table bordered hover className="mb-0">
                                    <thead className="bg-light">
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
                                                            <td className="text-end fw-bold text-primary">{process.env.REACT_APP_CURRENCY} {breakdown.subtotal}</td>
                                                        </>
                                                    )}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </Table>
                            </div>
                        </Card.Body>
                    </Card>

                    {/* Booking Dates Card */}
                    <Card className="mb-4 border-0 shadow-sm">
                        <Card.Body className="p-4">
                            <h5 className="mb-4">
                                <CsLineIcons icon="calendar" className="me-2" />
                                Booking Dates
                            </h5>

                            <Row>
                                <Col md={3} className="mb-3">
                                    <small className="text-muted d-block mb-1">Expected Check-In</small>
                                    <div className="fw-bold">{formatDate(booking.booking.check_in_date)}</div>
                                </Col>
                                <Col md={3} className="mb-3">
                                    <small className="text-muted d-block mb-1">Expected Check-Out</small>
                                    <div className="fw-bold">{formatDate(booking.booking.check_out_date)}</div>
                                </Col>
                                {booking.booking.actual_check_in && (
                                    <Col md={3} className="mb-3">
                                        <small className="text-muted d-block mb-1">Actual Check-In</small>
                                        <div className="fw-bold text-success">{formatDateTime(booking.booking.actual_check_in)}</div>
                                    </Col>
                                )}
                                {booking.booking.actual_check_out && (
                                    <Col md={3} className="mb-3">
                                        <small className="text-muted d-block mb-1">Actual Check-Out</small>
                                        <div className="fw-bold text-info">{formatDateTime(booking.booking.actual_check_out)}</div>
                                    </Col>
                                )}
                                <Col md={3} className="mb-3">
                                    <small className="text-muted d-block mb-1">Total Nights</small>
                                    <div className="fw-bold">{booking.booking_summary?.nights || 0}</div>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>

                    {/* Billing Summary Card */}
                    <Card className="mb-4 border-0 shadow-sm">
                        <Card.Body className="p-4">
                            <h5 className="mb-4">
                                <CsLineIcons icon="file-text" className="me-2" />
                                Billing Summary
                            </h5>

                            <div className="bg-light rounded p-4">
                                <div className="mb-3 pb-2 border-bottom">
                                    <Row className="align-items-center">
                                        <Col>
                                            <small className="text-muted">Room Charges</small>
                                            <div className="text-small text-muted">
                                                {booking.booking_summary?.nights} nights × {booking.booking.total_rooms || booking.rooms.length} room{booking.rooms.length > 1 ? 's' : ''}
                                            </div>
                                        </Col>
                                        <Col xs="auto">
                                            <span className="fw-bold">{process.env.REACT_APP_CURRENCY} {booking.booking.total_amount + (booking.booking.discount_amount || 0)}</span>
                                        </Col>
                                    </Row>
                                </div>

                                {booking.booking.discount_amount > 0 && (
                                    <div className="mb-3 pb-2 border-bottom">
                                        <Row className="align-items-center">
                                            <Col>
                                                <small className="text-muted">
                                                    Discount {booking.booking.coupon_code && `(${booking.booking.coupon_code})`}
                                                </small>
                                            </Col>
                                            <Col xs="auto">
                                                <span className="text-danger fw-bold">-{process.env.REACT_APP_CURRENCY} {booking.booking.discount_amount}</span>
                                            </Col>
                                        </Row>
                                    </div>
                                )}

                                {booking.booking.extra_charges > 0 && (
                                    <div className="mb-3 pb-2 border-bottom">
                                        <Row className="align-items-center">
                                            <Col>
                                                <small className="text-muted">Extra Charges</small>
                                                {booking.booking.extra_charges_description && (
                                                    <div className="text-small text-muted">{booking.booking.extra_charges_description}</div>
                                                )}
                                            </Col>
                                            <Col xs="auto">
                                                <span className="text-primary fw-bold">+{process.env.REACT_APP_CURRENCY} {booking.booking.extra_charges}</span>
                                            </Col>
                                        </Row>
                                    </div>
                                )}

                                <div className="mt-3 pt-2">
                                    <Row className="align-items-center">
                                        <Col>
                                            <h5 className="mb-0">Grand Total</h5>
                                        </Col>
                                        <Col xs="auto">
                                            <h4 className="mb-0 text-primary">{process.env.REACT_APP_CURRENCY} {finalAmount.toFixed(2)}</h4>
                                        </Col>
                                    </Row>
                                </div>
                            </div>
                        </Card.Body>
                    </Card>

                    {/* Special Requests Card */}
                    {booking.booking.special_requests && (
                        <Card className="mb-4 border-0 shadow-sm">
                            <Card.Body className="p-4">
                                <h5 className="mb-3">
                                    <CsLineIcons icon="message-square" className="me-2" />
                                    Special Requests
                                </h5>
                                <div className="bg-light rounded p-3">
                                    <p className="mb-0">{booking.booking.special_requests}</p>
                                </div>
                            </Card.Body>
                        </Card>
                    )}

                    {/* Additional Information Card */}
                    <Card className="mb-4 border-0 shadow-sm">
                        <Card.Body className="p-4">
                            <h5 className="mb-4">
                                <CsLineIcons icon="info" className="me-2" />
                                Additional Information
                            </h5>

                            <Row>
                                <Col md={6} className="mb-3">
                                    <small className="text-muted d-block mb-1">Created At</small>
                                    <div className="fw-bold">{formatDateTime(booking.booking.created_at)}</div>
                                </Col>
                                <Col md={6} className="mb-3">
                                    <small className="text-muted d-block mb-1">Last Updated</small>
                                    <div className="fw-bold">{formatDateTime(booking.booking.updated_at)}</div>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>

                    {/* Action Buttons Card */}
                    <Card className="border-0 shadow-sm">
                        <Card.Body className="p-4">
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
                                        <Button variant="danger" onClick={() => setCancelModal(true)}>
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

            {/* Payment Tracker Modal */}
            <PaymentTracker
                show={showPaymentTracker}
                onHide={() => setShowPaymentTracker(false)}
                bookingId={id}
                bookingReference={booking.booking.booking_reference}
                onPaymentAdded={handlePaymentAdded}
            />

            {/* Cancel Booking Modal */}
            <Modal
                show={cancelModal}
                onHide={() => {
                    setCancelModal(false);
                    setCancelReason('');
                }}
                centered
            >
                <Modal.Header closeButton>
                    <Modal.Title>Cancel Booking</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>Are you sure you want to cancel this booking?</p>
                    <Form.Group>
                        <Form.Label>Reason for cancellation (optional)</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={4}
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            placeholder="Enter reason for cancellation..."
                            disabled={cancelling}
                        />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="outline-secondary"
                        onClick={() => {
                            setCancelModal(false);
                            setCancelReason('');
                        }}
                        disabled={cancelling}
                    >
                        Close
                    </Button>
                    <Button variant="danger" onClick={handleCancel} disabled={cancelling}>
                        {cancelling ? (
                            <>
                                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                                Cancelling...
                            </>
                        ) : (
                            'Cancel Booking'
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default BookingDetails;