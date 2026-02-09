import React, { useState, useEffect } from 'react';
import { Modal, Card, Row, Col, Button, Form, Table, Badge, Spinner, Alert } from 'react-bootstrap';
import { paymentAPI } from 'services/api';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import CsLineIcons from 'cs-line-icons/CsLineIcons';

const PaymentTracker = ({ bookingId, bookingReference, onPaymentAdded, show, onHide }) => {
    const [payments, setPayments] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showAddPayment, setShowAddPayment] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [paymentForm, setPaymentForm] = useState({
        amount: '',
        payment_method: 'cash',
        transaction_id: '',
        reference_number: '',
        notes: '',
    });


    const fetchPayments = async () => {
        setLoading(true);
        try {
            const response = await paymentAPI.getBookingPayments(bookingId);
            setPayments(response.data.data.payments || []);
            setSummary(response.data.data.summary || null);
        } catch (error) {
            console.error('Error fetching payments:', error);
            toast.error('Failed to fetch payment history');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (show && bookingId) {
            fetchPayments();
        }
    }, [show, bookingId]);

    const handleFormChange = (e) => {
        setPaymentForm({
            ...paymentForm,
            [e.target.name]: e.target.value,
        });
    };

    const handleAddPayment = async (e) => {
        e.preventDefault();

        if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }

        if (parseFloat(paymentForm.amount) > summary.pending_amount) {
            toast.error(`Amount cannot exceed pending amount (${process.env.REACT_APP_CURRENCY} ${summary.pending_amount})`);
            return;
        }

        setSubmitting(true);
        try {
            await paymentAPI.addPayment({
                booking_id: bookingId,
                amount: parseFloat(paymentForm.amount),
                payment_method: paymentForm.payment_method,
                transaction_id: paymentForm.transaction_id || undefined,
                reference_number: paymentForm.reference_number || undefined,
                notes: paymentForm.notes || undefined,
            });

            toast.success('Payment added successfully');

            // Reset form
            setPaymentForm({
                amount: '',
                payment_method: 'cash',
                transaction_id: '',
                reference_number: '',
                notes: '',
            });

            setShowAddPayment(false);
            fetchPayments();

            if (onPaymentAdded) {
                onPaymentAdded();
            }
        } catch (error) {
            console.error('Error adding payment:', error);
            toast.error(error.response?.data?.message || 'Failed to add payment');
        } finally {
            setSubmitting(false);
        }
    };

    const handleRefund = async (paymentId) => {
        if (!window.confirm('Are you sure you want to refund this payment?')) {
            return;
        }

        try {
            await paymentAPI.refundPayment(paymentId, {
                notes: 'Refunded by admin',
            });
            toast.success('Payment refunded successfully');
            fetchPayments();

            if (onPaymentAdded) {
                onPaymentAdded();
            }
        } catch (error) {
            console.error('Error refunding payment:', error);
            toast.error(error.response?.data?.message || 'Failed to refund payment');
        }
    };

    const getPaymentMethodBadge = (method) => {
        const badges = {
            cash: { bg: 'success', text: 'Cash' },
            card: { bg: 'primary', text: 'Card' },
            upi: { bg: 'info', text: 'UPI' },
            online: { bg: 'warning', text: 'Online' },
            bank_transfer: { bg: 'secondary', text: 'Bank Transfer' },
            cheque: { bg: 'dark', text: 'Cheque' },
        };
        const { bg = 'secondary', text = method } = badges[method] || {};
        return <Badge bg={bg}>{text}</Badge>;
    };

    const getPaymentStatusBadge = (status) => {
        const badges = {
            success: { bg: 'success', text: 'Success', icon: 'check-circle' },
            pending: { bg: 'warning', text: 'Pending', icon: 'clock' },
            failed: { bg: 'danger', text: 'Failed', icon: 'x-circle' },
            refunded: { bg: 'info', text: 'Refunded', icon: 'rotate-ccw' },
        };
        const { bg = 'secondary', text = status, icon = 'info' } = badges[status] || {};
        return (
            <Badge bg={bg}>
                <CsLineIcons icon={icon} size="12" className="me-1" />
                {text}
            </Badge>
        );
    };

    const formatDateTime = (date) => {
        return format(new Date(date), 'MMM dd, yyyy hh:mm a');
    };

    return (
        <Modal show={show} onHide={onHide} size="xl" scrollable>
            <Modal.Header closeButton>
                <Modal.Title>
                    <CsLineIcons icon="credit-card" className="me-2" />
                    Payment Tracker - {bookingReference}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {loading ? (
                    <div className="text-center py-5">
                        <Spinner animation="border" variant="primary" />
                    </div>
                ) : (
                    <>
                        {/* Payment Summary */}
                        {summary && (
                            <Card className="mb-4 border-primary">
                                <Card.Header className="bg-primary text-white">
                                    <h6 className="mb-0">Payment Summary</h6>
                                </Card.Header>
                                <Card.Body>
                                    <Row className="g-3">
                                        <Col md={3}>
                                            <div className="text-center p-3 border rounded">
                                                <small className="text-muted d-block mb-1">Total Amount</small>
                                                <h4 className="mb-0">{process.env.REACT_APP_CURRENCY} {summary.total_amount}</h4>
                                            </div>
                                        </Col>
                                        <Col md={3}>
                                            <div className="text-center p-3 border rounded bg-success-light">
                                                <small className="text-muted d-block mb-1">Paid Amount</small>
                                                <h4 className="mb-0 text-success">{process.env.REACT_APP_CURRENCY} {summary.paid_amount}</h4>
                                            </div>
                                        </Col>
                                        <Col md={3}>
                                            <div className="text-center p-3 border rounded bg-warning-light">
                                                <small className="text-muted d-block mb-1">Pending Amount</small>
                                                <h4 className="mb-0 text-warning">{process.env.REACT_APP_CURRENCY} {summary.pending_amount}</h4>
                                            </div>
                                        </Col>
                                        <Col md={3}>
                                            <div className="text-center p-3 border rounded">
                                                <small className="text-muted d-block mb-1">Payment Status</small>
                                                <div className="mt-2">
                                                    <Badge
                                                        bg={
                                                            summary.payment_status === 'paid' ? 'success' :
                                                                summary.payment_status === 'partial' ? 'warning' :
                                                                    'secondary'
                                                        }
                                                        className="p-2"
                                                    >
                                                        {summary.payment_status.toUpperCase()}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </Col>
                                    </Row>

                                    {/* Progress Bar */}
                                    <div className="mt-3">
                                        <div className="d-flex justify-content-between mb-1">
                                            <small className="text-muted">Payment Progress</small>
                                            <small className="text-muted">
                                                {((summary.paid_amount / summary.total_amount) * 100).toFixed(1)}%
                                            </small>
                                        </div>
                                        <div className="progress" style={{ height: '10px' }}>
                                            <div
                                                className="progress-bar bg-success"
                                                role="progressbar"
                                                style={{ width: `${(summary.paid_amount / summary.total_amount) * 100}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Transaction Stats */}
                                    <Row className="mt-3 g-2">
                                        <Col xs={4}>
                                            <small className="text-muted d-block">Total Transactions</small>
                                            <div className="fw-bold">{summary.total_transactions}</div>
                                        </Col>
                                        <Col xs={4}>
                                            <small className="text-muted d-block">Successful</small>
                                            <div className="fw-bold text-success">{summary.successful_payments}</div>
                                        </Col>
                                        <Col xs={4}>
                                            <small className="text-muted d-block">Refunded</small>
                                            <div className="fw-bold text-info">{summary.refunded_payments}</div>
                                        </Col>
                                    </Row>
                                </Card.Body>
                            </Card>
                        )}

                        {/* Add Payment Button */}
                        {summary && summary.pending_amount > 0 && !showAddPayment && (
                            <div className="mb-4">
                                <Button variant="primary" onClick={() => setShowAddPayment(true)}>
                                    <CsLineIcons icon="plus" className="me-2" />
                                    Add Payment
                                </Button>
                            </div>
                        )}

                        {/* Add Payment Form */}
                        {showAddPayment && (
                            <Card className="mb-4 border-success">
                                <Card.Header className="bg-success text-white">
                                    <h6 className="mb-0">Add New Payment</h6>
                                </Card.Header>
                                <Card.Body>
                                    <Form onSubmit={handleAddPayment}>
                                        <Row className="g-3">
                                            <Col md={6}>
                                                <Form.Group>
                                                    <Form.Label>Amount <span className="text-danger">*</span></Form.Label>
                                                    <Form.Control
                                                        type="number"
                                                        name="amount"
                                                        value={paymentForm.amount}
                                                        onChange={handleFormChange}
                                                        required
                                                        step="0.01"
                                                        max={summary?.pending_amount}
                                                        placeholder="0.00"
                                                    />
                                                    <Form.Text className="text-muted">
                                                        Max: {process.env.REACT_APP_CURRENCY} {summary?.pending_amount}
                                                    </Form.Text>
                                                </Form.Group>
                                            </Col>
                                            <Col md={6}>
                                                <Form.Group>
                                                    <Form.Label>Payment Method <span className="text-danger">*</span></Form.Label>
                                                    <Form.Select
                                                        name="payment_method"
                                                        value={paymentForm.payment_method}
                                                        onChange={handleFormChange}
                                                        required
                                                    >
                                                        <option value="cash">Cash</option>
                                                        <option value="card">Card</option>
                                                        <option value="upi">UPI</option>
                                                        <option value="online">Online</option>
                                                        <option value="bank_transfer">Bank Transfer</option>
                                                        <option value="cheque">Cheque</option>
                                                    </Form.Select>
                                                </Form.Group>
                                            </Col>
                                            <Col md={6}>
                                                <Form.Group>
                                                    <Form.Label>Transaction ID</Form.Label>
                                                    <Form.Control
                                                        type="text"
                                                        name="transaction_id"
                                                        value={paymentForm.transaction_id}
                                                        onChange={handleFormChange}
                                                        placeholder="For card/online payments"
                                                    />
                                                </Form.Group>
                                            </Col>
                                            <Col md={6}>
                                                <Form.Group>
                                                    <Form.Label>Reference Number</Form.Label>
                                                    <Form.Control
                                                        type="text"
                                                        name="reference_number"
                                                        value={paymentForm.reference_number}
                                                        onChange={handleFormChange}
                                                        placeholder="For cheque/bank transfer"
                                                    />
                                                </Form.Group>
                                            </Col>
                                            <Col md={12}>
                                                <Form.Group>
                                                    <Form.Label>Notes</Form.Label>
                                                    <Form.Control
                                                        as="textarea"
                                                        rows={2}
                                                        name="notes"
                                                        value={paymentForm.notes}
                                                        onChange={handleFormChange}
                                                        placeholder="Additional notes..."
                                                    />
                                                </Form.Group>
                                            </Col>
                                        </Row>
                                        <div className="d-flex gap-2 justify-content-end mt-3">
                                            <Button variant="outline-secondary" onClick={() => setShowAddPayment(false)}>
                                                Cancel
                                            </Button>
                                            <Button variant="success" type="submit" disabled={submitting}>
                                                {submitting ? (
                                                    <>
                                                        <Spinner as="span" animation="border" size="sm" className="me-2" />
                                                        Processing...
                                                    </>
                                                ) : (
                                                    <>
                                                        <CsLineIcons icon="check" className="me-2" />
                                                        Add Payment
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </Form>
                                </Card.Body>
                            </Card>
                        )}

                        {/* Payment History */}
                        <Card>
                            <Card.Header>
                                <h6 className="mb-0">
                                    <CsLineIcons icon="clock" className="me-2" />
                                    Payment History ({payments.length})
                                </h6>
                            </Card.Header>
                            <Card.Body>
                                {payments.length === 0 ? (
                                    <Alert variant="info" className="text-center mb-0">
                                        <CsLineIcons icon="inbox" className="me-2" />
                                        No payments recorded yet
                                    </Alert>
                                ) : (
                                    <div className="table-responsive">
                                        <Table hover className="mb-0">
                                            <thead>
                                                <tr>
                                                    <th>Date & Time</th>
                                                    <th>Receipt #</th>
                                                    <th>Amount</th>
                                                    <th>Method</th>
                                                    <th>Transaction ID</th>
                                                    <th>Status</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {payments.map((payment) => (
                                                    <tr key={payment._id}>
                                                        <td>
                                                            <div>{formatDateTime(payment.payment_date)}</div>
                                                            {payment.notes && (
                                                                <small className="text-muted">{payment.notes}</small>
                                                            )}
                                                        </td>
                                                        <td>
                                                            <code className="small">{payment.receipt_number}</code>
                                                        </td>
                                                        <td className={`fw-bold ${payment.payment_status === 'refunded' ? 'text-muted text-decoration-line-through' : 'text-success'}`}>
                                                            {process.env.REACT_APP_CURRENCY} {payment.amount}
                                                        </td>
                                                        <td>{getPaymentMethodBadge(payment.payment_method)}</td>
                                                        <td>
                                                            {payment.transaction_id && (
                                                                <code className="small">{payment.transaction_id}</code>
                                                            )}
                                                            {payment.reference_number && (
                                                                <div className="small text-muted">Ref: {payment.reference_number}</div>
                                                            )}
                                                        </td>
                                                        <td>{getPaymentStatusBadge(payment.payment_status)}</td>
                                                        <td>
                                                            {payment.payment_status === 'success' && (
                                                                <Button
                                                                    variant="outline-danger"
                                                                    size="sm"
                                                                    onClick={() => handleRefund(payment._id)}
                                                                >
                                                                    <CsLineIcons icon="rotate-ccw" size="14" className="me-1" />
                                                                    Refund
                                                                </Button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    </div>
                                )}
                            </Card.Body>
                        </Card>
                    </>
                )}
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>
                    Close
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default PaymentTracker;