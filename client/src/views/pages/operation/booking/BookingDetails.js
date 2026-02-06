import React, { useState, useEffect } from 'react';
import { useParams, useHistory, Link } from 'react-router-dom';
import { Card, Row, Col, Button, Badge, Alert, Spinner, Table, Modal, Form } from 'react-bootstrap';
import { bookingAPI } from 'services/api';
import { toast } from 'react-toastify';
import { format, parseISO } from 'date-fns';
import HtmlHead from 'components/html-head/HtmlHead';
import BreadcrumbList from 'components/breadcrumb-list/BreadcrumbList';
import CsLineIcons from 'cs-line-icons/CsLineIcons';

const BookingDetails = () => {
    const { id } = useParams();
    const history = useHistory();
    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [invoiceData, setInvoiceData] = useState(null);
    const [generatingInvoice, setGeneratingInvoice] = useState(false);

    const title = 'Booking Details';
    const description = 'View detailed information about a booking';

    const breadcrumbs = [
        { to: '/operations', text: 'Operations' },
        { to: '/operations/bookings', text: 'All Bookings' },
        { to: `/operations/bookings/${id}`, text: 'Booking Details' },
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
        if (id) {
            fetchBookingDetails();
        }
    }, [id]);

    const handleCancelBooking = async () => {
        try {
            await bookingAPI.cancel(id);
            toast.success('Booking cancelled successfully');
            setShowCancelModal(false);
            fetchBookingDetails();
        } catch (error) {
            console.error('Error cancelling booking:', error);
            toast.error(error.response?.data?.message || 'Failed to cancel booking');
        }
    };

    const handleCheckIn = () => {
        history.push(`/operations/bookings/${id}/check-in`);
    };

    const handleCheckOut = () => {
        history.push(`/operations/bookings/${id}/check-out`);
    };

    // const handleGenerateInvoice = async () => {
    //     setGeneratingInvoice(true);
    //     try {
    //         const response = await invoiceAPI.generate(id);
    //         setInvoiceData(response.data.data);
    //         setShowInvoiceModal(true);
    //     } catch (error) {
    //         console.error('Error generating invoice:', error);
    //         toast.error('Failed to generate invoice');
    //     } finally {
    //         setGeneratingInvoice(false);
    //     }
    // };

    // const handleDownloadInvoice = async () => {
    //     try {
    //         const response = await invoiceAPI.download(id);
    //         const url = window.URL.createObjectURL(new Blob([response.data]));
    //         const link = document.createElement('a');
    //         link.href = url;
    //         link.setAttribute('download', `Invoice_${booking?.booking_reference}.pdf`);
    //         document.body.appendChild(link);
    //         link.click();
    //         link.remove();
    //     } catch (error) {
    //         console.error('Error downloading invoice:', error);
    //         toast.error('Failed to download invoice');
    //     }
    // };

    const formatDate = (date) => {
        if (!date) return 'N/A';
        return format(parseISO(date), 'MMM dd, yyyy');
    };

    const formatDateTime = (date) => {
        if (!date) return 'N/A';
        return format(parseISO(date), 'MMM dd, yyyy hh:mm a');
    };

    const getStatusBadge = (status) => {
        const badges = {
            confirmed: { bg: 'success', text: 'Confirmed', icon: 'check' },
            checked_in: { bg: 'primary', text: 'Checked In', icon: 'log-in' },
            checked_out: { bg: 'info', text: 'Checked Out', icon: 'log-out' },
            cancelled: { bg: 'danger', text: 'Cancelled', icon: 'x-circle' },
            no_show: { bg: 'warning', text: 'No Show', icon: 'user-x' },
        };
        const badge = badges[status] || { bg: 'secondary', text: status, icon: 'help-circle' };
        return (
            <Badge bg={badge.bg} className="d-flex align-items-center gap-1" style={{ width: 'fit-content' }}>
                <CsLineIcons icon={badge.icon} size="12" />
                {badge.text}
            </Badge>
        );
    };

    const getPaymentBadge = (status) => {
        const badges = {
            pending: { bg: 'warning', text: 'Pending', icon: 'clock' },
            paid: { bg: 'success', text: 'Paid', icon: 'check-circle' },
            refunded: { bg: 'info', text: 'Refunded', icon: 'refresh-cw' },
            partial: { bg: 'primary', text: 'Partial', icon: 'dollar-sign' },
        };
        const badge = badges[status] || { bg: 'secondary', text: status, icon: 'help-circle' };
        return (
            <Badge bg={badge.bg} className="d-flex align-items-center gap-1" style={{ width: 'fit-content' }}>
                <CsLineIcons icon={badge.icon} size="12" />
                {badge.text}
            </Badge>
        );
    };

    if (loading) {
        return (
            <>
                <HtmlHead title={title} description={description} />
                <Row>
                    <Col>
                        <div className="page-title-container mb-4">
                            <h1 className="mb-0 pb-0 display-4">{title}</h1>
                            <BreadcrumbList items={breadcrumbs} />
                        </div>
                        <div className="text-center py-5">
                            <Spinner animation="border" variant="primary" className="mb-3" />
                            <p>Loading booking details...</p>
                        </div>
                    </Col>
                </Row>
            </>
        );
    }

    if (!booking) {
        return (
            <Alert variant="danger">
                <CsLineIcons icon="alert-circle" className="me-2" />
                Booking not found
            </Alert>
        );
    }

    return (
        <>
            <HtmlHead title={title} description={description} />

            <div className="page-title-container mb-4">
                <Row className="align-items-center">
                    <Col xs="12" md="7">
                        <h1 className="mb-0 pb-0 display-4">
                            Booking: {booking.booking.booking_reference}
                        </h1>
                        <BreadcrumbList items={breadcrumbs} />
                    </Col>
                    <Col xs="12" md="5" className="text-end">
                        <div className="d-flex gap-2 justify-content-end">
                            <Button variant="outline-secondary" as={Link} to="/operations/bookings">
                                <CsLineIcons icon="arrow-left" className="me-2" />
                                Back to Bookings
                            </Button>

                            {booking.booking_status === 'confirmed' && (
                                <>
                                    <Button variant="primary" onClick={handleCheckIn}>
                                        <CsLineIcons icon="log-in" className="me-2" />
                                        Check In
                                    </Button>
                                    <Button variant="outline-danger" onClick={() => setShowCancelModal(true)}>
                                        <CsLineIcons icon="x-circle" className="me-2" />
                                        Cancel
                                    </Button>
                                </>
                            )}

                            {booking.booking_status === 'checked_in' && (
                                <Button variant="primary" onClick={handleCheckOut}>
                                    <CsLineIcons icon="log-out" className="me-2" />
                                    Check Out
                                </Button>
                            )}

                            {/* <Button variant="success" onClick={handleGenerateInvoice} disabled={generatingInvoice}>
                                {generatingInvoice ? (
                                    <>
                                        <Spinner as="span" animation="border" size="sm" className="me-2" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <CsLineIcons icon="file-text" className="me-2" />
                                        Invoice
                                    </>
                                )}
                            </Button> */}
                        </div>
                    </Col>
                </Row>
            </div>

            {/* Status Bar */}
            <Card className="mb-4">
                <Card.Body>
                    <Row className="g-3 align-items-center">
                        <Col md={3}>
                            <div className="d-flex align-items-center">
                                <div className="me-3">
                                    {getStatusBadge(booking.booking_status)}
                                </div>
                                <div>
                                    <div className="text-muted text-small">Status</div>
                                    <div className="font-weight-bold">{booking.booking_status?.replace('_', ' ').toUpperCase()}</div>
                                </div>
                            </div>
                        </Col>
                        <Col md={3}>
                            <div>
                                <div className="text-muted text-small">Payment Status</div>
                                <div className="d-flex align-items-center gap-2">
                                    {getPaymentBadge(booking.payment_status)}
                                    {booking.payment_method && (
                                        <Badge bg="secondary">{booking.payment_method}</Badge>
                                    )}
                                </div>
                            </div>
                        </Col>
                        <Col md={3}>
                            <div>
                                <div className="text-muted text-small">Booking Source</div>
                                <div className="font-weight-bold">{booking.booking_source?.replace('_', ' ')}</div>
                            </div>
                        </Col>
                        <Col md={3}>
                            <div>
                                <div className="text-muted text-small">Created On</div>
                                <div className="font-weight-bold">{formatDateTime(booking.created_at)}</div>
                            </div>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            <Row className="g-4">
                {/* Guest Information */}
                <Col lg={4}>
                    <Card className="h-100">
                        <Card.Header>
                            <h5 className="mb-0">Guest Information</h5>
                        </Card.Header>
                        <Card.Body>
                            <div className="mb-3">
                                <div className="text-muted text-small">Full Name</div>
                                <div className="font-weight-bold h5">{booking.customer_name}</div>
                            </div>

                            <div className="mb-3">
                                <div className="text-muted text-small">Email Address</div>
                                <div>{booking.customer_email}</div>
                            </div>

                            <div className="mb-3">
                                <div className="text-muted text-small">Phone Number</div>
                                <div>{booking.customer_phone}</div>
                            </div>

                            <div className="mb-3">
                                <div className="text-muted text-small">Number of Guests</div>
                                <div className="font-weight-bold">{booking.guests_count}</div>
                            </div>

                            {booking.special_requests && (
                                <div>
                                    <div className="text-muted text-small">Special Requests</div>
                                    <div className="border rounded p-3 bg-light mt-1">
                                        {booking.special_requests}
                                    </div>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>

                {/* Room Information */}
                <Col lg={4}>
                    <Card className="h-100">
                        <Card.Header>
                            <h5 className="mb-0">Room Information</h5>
                        </Card.Header>
                        <Card.Body>
                            {booking.is_group_booking ? (
                                <>
                                    <div className="mb-3">
                                        <Badge bg="info" className="mb-2">Group Booking</Badge>
                                        <div className="text-muted text-small">Total Rooms</div>
                                        <div className="font-weight-bold">{booking.room_details?.length || 1}</div>
                                    </div>

                                    <div className="mb-3">
                                        <div className="text-muted text-small">Selected Rooms</div>
                                        <div className="font-weight-bold">
                                            {booking.room_details?.map(r => r.room_number).join(', ')}
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <div className="text-muted text-small">Guest Distribution</div>
                                        {booking.split_guests && Object.entries(booking.split_guests).map(([roomId, guests]) => {
                                            const room = booking.room_details?.find(r => r._id === roomId);
                                            return (
                                                <div key={roomId} className="d-flex justify-content-between">
                                                    <span>Room {room?.room_number}:</span>
                                                    <span className="font-weight-bold">{guests} guest(s)</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="mb-3">
                                        <div className="text-muted text-small">Room Number</div>
                                        <div className="font-weight-bold h5">{booking.room_details?.room_number || 'N/A'}</div>
                                    </div>

                                    <div className="mb-3">
                                        <div className="text-muted text-small">Category</div>
                                        <div>{booking.room_details?.category_name}</div>
                                    </div>

                                    <div className="mb-3">
                                        <div className="text-muted text-small">Floor</div>
                                        <div>{booking.room_details?.floor}</div>
                                    </div>

                                    <div className="mb-3">
                                        <div className="text-muted text-small">Price per Night</div>
                                        <div className="font-weight-bold">{process.env.REACT_APP_CURRENCY} {booking.room_details?.price_per_night}</div>
                                    </div>
                                </>
                            )}
                        </Card.Body>
                    </Card>
                </Col>

                {/* Booking Dates */}
                <Col lg={4}>
                    <Card className="h-100">
                        <Card.Header>
                            <h5 className="mb-0">Booking Dates</h5>
                        </Card.Header>
                        <Card.Body>
                            <div className="mb-4">
                                <div className="text-muted text-small">Check-In Date</div>
                                <div className="font-weight-bold h5">{formatDate(booking.booking.check_in_date)}</div>
                                {booking.booking.actual_check_in && (
                                    <div className="text-muted text-small">
                                        Actual: {formatDateTime(booking.booking.actual_check_in)}
                                    </div>
                                )}
                            </div>

                            <div className="mb-4">
                                <div className="text-muted text-small">Check-Out Date</div>
                                <div className="font-weight-bold h5">{formatDate(booking.check_out_date)}</div>
                                {booking.actual_check_out && (
                                    <div className="text-muted text-small">
                                        Actual: {formatDateTime(booking.actual_check_out)}
                                    </div>
                                )}
                            </div>

                            <div className="mb-3">
                                <div className="text-muted text-small">Duration</div>
                                <div className="font-weight-bold">{booking.booking_summary?.nights} nights</div>
                            </div>

                            {booking.early_check_in && (
                                <Badge bg="warning" className="me-2">Early Check-In</Badge>
                            )}
                            {booking.late_check_out && (
                                <Badge bg="info">Late Check-Out</Badge>
                            )}
                        </Card.Body>
                    </Card>
                </Col>

                {/* Billing Summary */}
                <Col lg={12}>
                    <Card>
                        <Card.Header>
                            <h5 className="mb-0">Billing Summary</h5>
                        </Card.Header>
                        <Card.Body>
                            <div className="border rounded">
                                {/* Room Charges */}
                                {booking.is_group_booking ? (
                                    booking.room_details?.map((room, index) => (
                                        <div key={room._id} className="p-3 border-bottom">
                                            <Row className="g-0 align-items-center">
                                                <Col>
                                                    <div className="d-flex align-items-center">
                                                        <span className="me-2">•</span>
                                                        <div>
                                                            <div className="font-weight-bold">Room {room.room_number}</div>
                                                            <div className="text-muted">
                                                                {booking.booking_summary?.nights} nights × {process.env.REACT_APP_CURRENCY} {room.price_per_night}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Col>
                                                <Col xs="auto" className="font-weight-bold">
                                                    {process.env.REACT_APP_CURRENCY} {(room.price_per_night * booking.booking_summary?.nights).toFixed(2)}
                                                </Col>
                                            </Row>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-3 border-bottom">
                                        <Row className="g-0 align-items-center">
                                            <Col>
                                                <div className="d-flex align-items-center">
                                                    <span className="me-2">•</span>
                                                    <div>
                                                        <div className="font-weight-bold">Room {booking.room_details?.room_number}</div>
                                                        <div className="text-muted">
                                                            {booking.booking_summary?.nights} nights × {process.env.REACT_APP_CURRENCY} {booking.booking_summary?.price_per_night}
                                                        </div>
                                                    </div>
                                                </div>
                                            </Col>
                                            <Col xs="auto" className="font-weight-bold">
                                                {process.env.REACT_APP_CURRENCY} {booking.booking_summary?.subtotal}
                                            </Col>
                                        </Row>
                                    </div>
                                )}

                                {/* Discount */}
                                {booking.discount_amount > 0 && (
                                    <div className="p-3 border-bottom">
                                        <Row className="g-0">
                                            <Col>
                                                <div className="text-muted">Discount</div>
                                                {booking.coupon_code && (
                                                    <div className="text-small">Coupon: {booking.coupon_code}</div>
                                                )}
                                            </Col>
                                            <Col xs="auto" className="text-danger font-weight-bold">
                                                -{process.env.REACT_APP_CURRENCY} {booking.discount_amount.toFixed(2)}
                                            </Col>
                                        </Row>
                                    </div>
                                )}

                                {/* Extra Charges */}
                                {booking.extra_charges > 0 && (
                                    <div className="p-3 border-bottom">
                                        <Row className="g-0">
                                            <Col>
                                                <div className="text-muted">Extra Charges</div>
                                                {booking.extra_charges_description && (
                                                    <div className="text-small">{booking.extra_charges_description}</div>
                                                )}
                                            </Col>
                                            <Col xs="auto" className="text-primary font-weight-bold">
                                                +{process.env.REACT_APP_CURRENCY} {booking.extra_charges.toFixed(2)}
                                            </Col>
                                        </Row>
                                    </div>
                                )}

                                {/* Tax (if applicable) */}
                                {booking.tax_amount > 0 && (
                                    <div className="p-3 border-bottom">
                                        <Row className="g-0">
                                            <Col>
                                                <div className="text-muted">Tax (12% GST)</div>
                                            </Col>
                                            <Col xs="auto" className="font-weight-bold">
                                                +{process.env.REACT_APP_CURRENCY} {booking.tax_amount.toFixed(2)}
                                            </Col>
                                        </Row>
                                    </div>
                                )}

                                {/* Total */}
                                <div className="p-3 bg-light">
                                    <Row className="g-0 align-items-center">
                                        <Col>
                                            <h5 className="mb-0">Total Amount</h5>
                                            <div className="text-muted">Amount to be paid</div>
                                        </Col>
                                        <Col xs="auto">
                                            <h4 className="mb-0 text-primary">
                                                {process.env.REACT_APP_CURRENCY} {booking.total_amount?.toFixed(2)}
                                            </h4>
                                        </Col>
                                    </Row>
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                {/* Activity Log */}
                <Col lg={12}>
                    <Card>
                        <Card.Header>
                            <h5 className="mb-0">Activity Log</h5>
                        </Card.Header>
                        <Card.Body>
                            <Table hover>
                                <thead>
                                    <tr>
                                        <th>Date & Time</th>
                                        <th>Activity</th>
                                        <th>User</th>
                                        <th>Details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {booking.activity_log?.length > 0 ? (
                                        booking.activity_log.map((activity, index) => (
                                            <tr key={index}>
                                                <td>{formatDateTime(activity.timestamp)}</td>
                                                <td>
                                                    <Badge bg={activity.type === 'created' ? 'success' :
                                                        activity.type === 'updated' ? 'info' :
                                                            activity.type === 'cancelled' ? 'danger' : 'secondary'}>
                                                        {activity.type}
                                                    </Badge>
                                                </td>
                                                <td>{activity.user_name || 'System'}</td>
                                                <td>{activity.description}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" className="text-center text-muted">
                                                No activity recorded
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Cancel Modal */}
            <Modal show={showCancelModal} onHide={() => setShowCancelModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Cancel Booking</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Alert variant="warning">
                        <CsLineIcons icon="alert-triangle" className="me-2" />
                        Are you sure you want to cancel this booking? This action cannot be undone.
                    </Alert>
                    <Form.Group>
                        <Form.Label>Reason for cancellation</Form.Label>
                        <Form.Control as="textarea" rows={3} placeholder="Optional: Enter reason for cancellation" />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowCancelModal(false)}>
                        Keep Booking
                    </Button>
                    <Button variant="danger" onClick={handleCancelBooking}>
                        Yes, Cancel Booking
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Invoice Modal */}
            <Modal show={showInvoiceModal} onHide={() => setShowInvoiceModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Invoice Preview</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {invoiceData ? (
                        <div className="invoice-preview">
                            {/* Invoice content here */}
                            <p>Invoice generated successfully</p>
                        </div>
                    ) : (
                        <div className="text-center py-4">
                            <Spinner animation="border" variant="primary" />
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowInvoiceModal(false)}>
                        Close
                    </Button>
                    {/* <Button variant="primary" onClick={handleDownloadInvoice}>
                        <CsLineIcons icon="download" className="me-2" />
                        Download Invoice
                    </Button> */}
                    <Button variant="success" onClick={() => window.print()}>
                        <CsLineIcons icon="printer" className="me-2" />
                        Print Invoice
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default BookingDetails;