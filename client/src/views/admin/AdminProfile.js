import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { Row, Col, Card, Button, Form, Spinner, Alert, Nav, Tab, Badge } from 'react-bootstrap';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import axios from 'axios';
import HtmlHead from 'components/html-head/HtmlHead';
import BreadcrumbList from 'components/breadcrumb-list/BreadcrumbList';
import CsLineIcons from 'cs-line-icons/CsLineIcons';
import useCustomLayout from 'hooks/useCustomLayout';
import { LAYOUT } from 'constants.js';

const AdminProfile = () => {
    const history = useHistory();
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [adminData, setAdminData] = useState(null);
    const [hotelData, setHotelData] = useState(null);
    const [error, setError] = useState('');
    const [editMode, setEditMode] = useState(false);
    const [activeTab, setActiveTab] = useState('profile');

    const title = 'Admin Profile';
    const description = 'Manage your profile and permissions';

    const breadcrumbs = [
        { to: '', text: 'Home' },
        { to: 'admin', text: 'Admin' },
        { to: 'admin/profile', text: 'Profile' },
    ];

    useCustomLayout({ layout: LAYOUT.Boxed });

    // Validation schema for profile edit
    const validationSchema = Yup.object().shape({
        name: Yup.string().required('Name is required'),
        email: Yup.string().email('Invalid email').required('Email is required'),
        currentPassword: Yup.string().when('newPassword', {
            is: (val) => val && val.length > 0,
            then: Yup.string().required('Current password is required to change password'),
        }),
        newPassword: Yup.string().min(6, 'Password must be at least 6 characters'),
        confirmPassword: Yup.string().oneOf([Yup.ref('newPassword'), null], 'Passwords must match'),
    });

    const fetchProfile = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await axios.get(
                `${process.env.REACT_APP_API}/admin/profile`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                }
            );

            if (response.data.success) {
                setAdminData(response.data.data.admin);
                setHotelData(response.data.data.hotel);

                // Set form values
                formik.setValues({
                    name: response.data.data.admin.name || '',
                    email: response.data.data.admin.email || '',
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: '',
                });
            }
        } catch (err) {
            console.error('Error fetching profile:', err);
            setError('Failed to fetch profile data. Please try again.');
            toast.error('Failed to fetch profile data.');
        } finally {
            setLoading(false);
        }
    };

    const formik = useFormik({
        initialValues: {
            name: '',
            email: '',
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
        },
        validationSchema,
        onSubmit: async (values, { setSubmitting }) => {
            setIsSubmitting(true);
            try {
                const updateData = {
                    name: values.name,
                    email: values.email,
                };

                // Only include password fields if they are provided
                if (values.newPassword) {
                    updateData.currentPassword = values.currentPassword;
                    updateData.newPassword = values.newPassword;
                }

                const response = await axios.put(
                    `${process.env.REACT_APP_API}/admin/profile`,
                    updateData,
                    {
                        headers: {
                            Authorization: `Bearer ${localStorage.getItem('token')}`,
                        },
                    }
                );

                if (response.data.success) {
                    toast.success('Profile updated successfully!');
                    setEditMode(false);
                    fetchProfile(); // Refresh data
                }
            } catch (err) {
                console.error('Error updating profile:', err);
                toast.error(err.response?.data?.message || 'Failed to update profile');
            } finally {
                setIsSubmitting(false);
                setSubmitting(false);
            }
        },
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const handleCancel = () => {
        setEditMode(false);
        // Reset form to original values
        if (adminData) {
            formik.setValues({
                name: adminData.name || '',
                email: adminData.email || '',
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
            });
        }
        formik.resetForm({ touched: {} });
    };

    const getRoleBadge = (role) => {
        const badges = {
            admin: { bg: 'danger', text: 'Admin' },
            manager: { bg: 'warning', text: 'Manager' },
            staff: { bg: 'info', text: 'Staff' },
        };
        const badge = badges[role] || { bg: 'secondary', text: role };
        return <Badge bg={badge.bg}>{badge.text}</Badge>;
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (loading) {
        return (
            <>
                <HtmlHead title={title} description={description} />
                <div className="page-title-container">
                    <h1 className="mb-0 pb-0 display-4">{title}</h1>
                    <BreadcrumbList items={breadcrumbs} />
                </div>
                <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-3">Loading profile...</p>
                </div>
            </>
        );
    }

    if (error) {
        return (
            <>
                <HtmlHead title={title} description={description} />
                <div className="page-title-container">
                    <h1 className="mb-0 pb-0 display-4">{title}</h1>
                    <BreadcrumbList items={breadcrumbs} />
                </div>
                <Alert variant="danger" className="my-4">
                    <CsLineIcons icon="error" className="me-2" />
                    {error}
                    <div className="mt-3">
                        <Button variant="outline-primary" onClick={fetchProfile}>
                            <CsLineIcons icon="refresh" className="me-2" />
                            Retry
                        </Button>
                    </div>
                </Alert>
            </>
        );
    }

    if (!adminData) {
        return (
            <>
                <HtmlHead title={title} description={description} />
                <div className="page-title-container">
                    <h1 className="mb-0 pb-0 display-4">{title}</h1>
                    <BreadcrumbList items={breadcrumbs} />
                </div>
                <Alert variant="info" className="my-4">
                    <CsLineIcons icon="inbox" className="me-2" />
                    Profile not found.
                </Alert>
            </>
        );
    }

    return (
        <>
            <HtmlHead title={title} description={description} />

            {/* Title Section */}
            <div className="page-title-container">
                <Row>
                    <Col md="7">
                        <h1 className="mb-0 pb-0 display-4">Admin Profile</h1>
                        <BreadcrumbList items={breadcrumbs} />
                    </Col>
                    <Col md="5" className="d-flex align-items-start justify-content-end">
                        {!editMode ? (
                            <Button
                                variant="outline-primary"
                                className="btn-icon btn-icon-start"
                                onClick={() => setEditMode(true)}
                            >
                                <CsLineIcons icon="edit-square" /> <span>Edit Profile</span>
                            </Button>
                        ) : (
                            <>
                                <Button
                                    variant="outline-secondary"
                                    className="btn-icon btn-icon-start me-2"
                                    onClick={handleCancel}
                                    disabled={isSubmitting}
                                >
                                    <CsLineIcons icon="close" /> <span>Cancel</span>
                                </Button>
                                <Button
                                    variant="primary"
                                    className="btn-icon btn-icon-start"
                                    onClick={formik.handleSubmit}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <CsLineIcons icon="check" /> <span>Save Changes</span>
                                        </>
                                    )}
                                </Button>
                            </>
                        )}
                    </Col>
                </Row>
            </div>

            <Row className="g-5">
                <Tab.Container id="profileTabs" activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>
                    {/* Sidebar */}
                    <Col xl="4" xxl="3">
                        <h2 className="small-title">Profile</h2>
                        <Card className="mb-5">
                            <Card.Body>
                                <div className="d-flex align-items-center flex-column mb-4">
                                    <div className="sw-13 position-relative mb-3">
                                        <div className="rounded-circle bg-primary d-flex align-items-center justify-content-center text-white fw-bold"
                                            style={{ width: '100%', height: '100%', fontSize: '2rem' }}>
                                            {adminData.name?.charAt(0).toUpperCase()}
                                        </div>
                                    </div>
                                    <div className="h5 mb-0">{adminData.name}</div>
                                    <div className="text-muted mb-2">{adminData.email}</div>
                                    <div className="mb-2">
                                        {getRoleBadge(adminData.role)}
                                        {adminData.is_active ? (
                                            <Badge bg="success" className="ms-2">Active</Badge>
                                        ) : (
                                            <Badge bg="danger" className="ms-2">Inactive</Badge>
                                        )}
                                    </div>
                                    <div className="text-muted small">
                                        <CsLineIcons icon="calendar" className="me-1" size="12" />
                                        Member since: {formatDate(adminData.created_at)}
                                    </div>
                                    {adminData.last_login && (
                                        <div className="text-muted small mt-1">
                                            <CsLineIcons icon="clock" className="me-1" size="12" />
                                            Last login: {formatDate(adminData.last_login)}
                                        </div>
                                    )}
                                </div>

                                <Nav className="flex-column">
                                    <Nav.Link className="px-0 border-bottom border-separator-light cursor-pointer" eventKey="profile">
                                        <CsLineIcons icon="user" className="me-2" size="17" />
                                        <span className="align-middle">Profile Information</span>
                                    </Nav.Link>
                                    <Nav.Link className="px-0 border-bottom border-separator-light cursor-pointer" eventKey="permissions">
                                        <CsLineIcons icon="lock" className="me-2" size="17" />
                                        <span className="align-middle">Permissions</span>
                                    </Nav.Link>
                                    <Nav.Link className="px-0 border-bottom border-separator-light cursor-pointer" eventKey="hotel">
                                        <CsLineIcons icon="home" className="me-2" size="17" />
                                        <span className="align-middle">Hotel Information</span>
                                    </Nav.Link>
                                    <Nav.Link className="px-0 border-bottom border-separator-light cursor-pointer" eventKey="activity">
                                        <CsLineIcons icon="activity" className="me-2" size="17" />
                                        <span className="align-middle">Recent Activity</span>
                                    </Nav.Link>
                                </Nav>
                            </Card.Body>
                        </Card>
                    </Col>

                    {/* Content */}
                    <Col xl="8" xxl="9">
                        <Tab.Content>
                            {/* Profile Information Tab */}
                            <Tab.Pane eventKey="profile">
                                <h2 className="small-title">Profile Information</h2>
                                <Card>
                                    <Card.Body>
                                        {editMode ? (
                                            // Edit Mode Form
                                            <Form>
                                                <Row className="mb-3">
                                                    <Col md={6}>
                                                        <Form.Group className="mb-3">
                                                            <Form.Label>Full Name</Form.Label>
                                                            <Form.Control
                                                                type="text"
                                                                name="name"
                                                                value={formik.values.name}
                                                                onChange={formik.handleChange}
                                                                onBlur={formik.handleBlur}
                                                                isInvalid={formik.touched.name && formik.errors.name}
                                                                disabled={isSubmitting}
                                                            />
                                                            <Form.Control.Feedback type="invalid">
                                                                {formik.errors.name}
                                                            </Form.Control.Feedback>
                                                        </Form.Group>
                                                    </Col>
                                                    <Col md={6}>
                                                        <Form.Group className="mb-3">
                                                            <Form.Label>Email Address</Form.Label>
                                                            <Form.Control
                                                                type="email"
                                                                name="email"
                                                                value={formik.values.email}
                                                                onChange={formik.handleChange}
                                                                onBlur={formik.handleBlur}
                                                                isInvalid={formik.touched.email && formik.errors.email}
                                                                disabled={isSubmitting}
                                                            />
                                                            <Form.Control.Feedback type="invalid">
                                                                {formik.errors.email}
                                                            </Form.Control.Feedback>
                                                        </Form.Group>
                                                    </Col>
                                                </Row>

                                                <h5 className="mt-4 mb-3">Change Password</h5>
                                                <p className="text-muted small mb-3">Leave blank to keep current password</p>

                                                <Row>
                                                    <Col md={12}>
                                                        <Form.Group className="mb-3">
                                                            <Form.Label>Current Password</Form.Label>
                                                            <Form.Control
                                                                type="password"
                                                                name="currentPassword"
                                                                value={formik.values.currentPassword}
                                                                onChange={formik.handleChange}
                                                                onBlur={formik.handleBlur}
                                                                isInvalid={formik.touched.currentPassword && formik.errors.currentPassword}
                                                                disabled={isSubmitting}
                                                            />
                                                            <Form.Control.Feedback type="invalid">
                                                                {formik.errors.currentPassword}
                                                            </Form.Control.Feedback>
                                                        </Form.Group>
                                                    </Col>
                                                </Row>

                                                <Row>
                                                    <Col md={6}>
                                                        <Form.Group className="mb-3">
                                                            <Form.Label>New Password</Form.Label>
                                                            <Form.Control
                                                                type="password"
                                                                name="newPassword"
                                                                value={formik.values.newPassword}
                                                                onChange={formik.handleChange}
                                                                onBlur={formik.handleBlur}
                                                                isInvalid={formik.touched.newPassword && formik.errors.newPassword}
                                                                disabled={isSubmitting}
                                                            />
                                                            <Form.Control.Feedback type="invalid">
                                                                {formik.errors.newPassword}
                                                            </Form.Control.Feedback>
                                                        </Form.Group>
                                                    </Col>
                                                    <Col md={6}>
                                                        <Form.Group className="mb-3">
                                                            <Form.Label>Confirm New Password</Form.Label>
                                                            <Form.Control
                                                                type="password"
                                                                name="confirmPassword"
                                                                value={formik.values.confirmPassword}
                                                                onChange={formik.handleChange}
                                                                onBlur={formik.handleBlur}
                                                                isInvalid={formik.touched.confirmPassword && formik.errors.confirmPassword}
                                                                disabled={isSubmitting}
                                                            />
                                                            <Form.Control.Feedback type="invalid">
                                                                {formik.errors.confirmPassword}
                                                            </Form.Control.Feedback>
                                                        </Form.Group>
                                                    </Col>
                                                </Row>

                                                {formik.errors.general && (
                                                    <Alert variant="danger" className="mt-3">
                                                        {formik.errors.general}
                                                    </Alert>
                                                )}
                                            </Form>
                                        ) : (
                                            // View Mode
                                            <>
                                                <Row className="mb-3">
                                                    <Col md={6}>
                                                        <strong>Name:</strong> {adminData.name}
                                                    </Col>
                                                    <Col md={6}>
                                                        <strong>Email:</strong> {adminData.email}
                                                    </Col>
                                                </Row>
                                                <Row className="mb-3">
                                                    <Col md={6}>
                                                        <strong>Role:</strong> {getRoleBadge(adminData.role)}
                                                    </Col>
                                                    <Col md={6}>
                                                        <strong>Status:</strong>{' '}
                                                        {adminData.is_verified ? (
                                                            <Badge bg="success">Verified</Badge>
                                                        ) : (
                                                            <Badge bg="warning">Not Verified</Badge>
                                                        )}
                                                    </Col>
                                                </Row>
                                                <Row className="mb-3">
                                                    <Col md={6}>
                                                        <strong>Hotel ID:</strong> {adminData.hotel_id}
                                                    </Col>
                                                    <Col md={6}>
                                                        <strong>Last Login:</strong> {formatDate(adminData.last_login)}
                                                    </Col>
                                                </Row>
                                                <Row className="mb-3">
                                                    <Col md={6}>
                                                        <strong>Created At:</strong> {formatDate(adminData.created_at)}
                                                    </Col>
                                                    <Col md={6}>
                                                        <strong>Last Updated:</strong> {formatDate(adminData.updated_at)}
                                                    </Col>
                                                </Row>
                                            </>
                                        )}
                                    </Card.Body>
                                </Card>
                            </Tab.Pane>

                            {/* Permissions Tab */}
                            <Tab.Pane eventKey="permissions">
                                <h2 className="small-title">Permissions</h2>
                                <Card>
                                    <Card.Body>
                                        {adminData.role === 'admin' ? (
                                            <Alert variant="info">
                                                <CsLineIcons icon="star" className="me-2" />
                                                You have full administrator access with all permissions.
                                            </Alert>
                                        ) : (
                                            <div className="permissions-list">
                                                {Object.entries(adminData.effective_permissions || {}).map(([module, permissions]) => (
                                                    <div key={module} className="mb-4">
                                                        <h6 className="text-primary mb-3">
                                                            {module.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                                        </h6>
                                                        <Row>
                                                            {Object.entries(permissions).map(([action, value]) => (
                                                                <Col md={4} key={action} className="mb-2">
                                                                    <div className="d-flex align-items-center">
                                                                        {value ? (
                                                                            <CsLineIcons icon="check" className="text-success me-2" size="14" />
                                                                        ) : (
                                                                            <CsLineIcons icon="close" className="text-danger me-2" size="14" />
                                                                        )}
                                                                        <span className={value ? '' : 'text-muted'}>
                                                                            {action.charAt(0).toUpperCase() + action.slice(1)}
                                                                        </span>
                                                                    </div>
                                                                </Col>
                                                            ))}
                                                        </Row>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </Card.Body>
                                </Card>
                            </Tab.Pane>

                            {/* Hotel Information Tab */}
                            <Tab.Pane eventKey="hotel">
                                <h2 className="small-title">Hotel Information</h2>
                                <Card>
                                    <Card.Body>
                                        {hotelData ? (
                                            <>
                                                <Row className="mb-3">
                                                    <Col md={6}>
                                                        <strong>Hotel Name:</strong> {hotelData.name || hotelData.hotel_name}
                                                    </Col>
                                                    <Col md={6}>
                                                        <strong>Hotel ID:</strong> {hotelData._id}
                                                    </Col>
                                                </Row>
                                                <Row className="mb-3">
                                                    <Col md={6}>
                                                        <strong>Email:</strong> {hotelData.email}
                                                    </Col>
                                                    <Col md={6}>
                                                        <strong>Phone:</strong> {hotelData.phone || hotelData.phone_no || 'N/A'}
                                                    </Col>
                                                </Row>
                                                <Row className="mb-3">
                                                    <Col md={12}>
                                                        <strong>Address:</strong>{' '}
                                                        {hotelData.address ? (
                                                            <>
                                                                {hotelData.address}, {hotelData.city || ''}, {hotelData.state || ''}, {hotelData.country || ''}
                                                            </>
                                                        ) : (
                                                            'N/A'
                                                        )}
                                                    </Col>
                                                </Row>
                                            </>
                                        ) : (
                                            <p className="text-muted">Hotel information not available</p>
                                        )}
                                    </Card.Body>
                                </Card>
                            </Tab.Pane>

                            {/* Recent Activity Tab */}
                            <Tab.Pane eventKey="activity">
                                <h2 className="small-title">Recent Activity</h2>
                                <Card>
                                    <Card.Body>
                                        <div className="text-center py-4">
                                            <CsLineIcons icon="clock" size="32" className="text-muted mb-3" />
                                            <p className="text-muted">Recent activity tracking coming soon...</p>
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Tab.Pane>
                        </Tab.Content>
                    </Col>
                </Tab.Container>
            </Row>

            {/* Full page loader overlay */}
            {isSubmitting && (
                <div
                    className="position-fixed top-0 left-0 w-100 h-100 d-flex justify-content-center align-items-center"
                    style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.7)',
                        zIndex: 9999,
                        backdropFilter: 'blur(2px)',
                    }}
                >
                    <Card className="shadow-lg border-0" style={{ minWidth: '200px' }}>
                        <Card.Body className="text-center p-4">
                            <Spinner animation="border" variant="primary" className="mb-3" style={{ width: '3rem', height: '3rem' }} />
                            <h5 className="mb-0">Updating Profile...</h5>
                            <small className="text-muted">Please wait a moment</small>
                        </Card.Body>
                    </Card>
                </div>
            )}
        </>
    );
};

export default AdminProfile;