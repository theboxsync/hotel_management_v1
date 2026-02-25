import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { Row, Col, Card, Button, Form, Spinner, Badge, Modal } from 'react-bootstrap';
import HtmlHead from 'components/html-head/HtmlHead';
import BreadcrumbList from 'components/breadcrumb-list/BreadcrumbList';
import CsLineIcons from 'cs-line-icons/CsLineIcons';
import axios from 'axios';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

const validationSchema = Yup.object().shape({
    name: Yup.string().required('Name is required'),
    current_password: Yup.string().when('new_password', {
        is: (val) => val && val.length > 0,
        then: Yup.string().required('Current password is required to set new password'),
    }),
    new_password: Yup.string().min(8, 'Password must be at least 8 characters'),
    confirm_password: Yup.string().when('new_password', {
        is: (val) => val && val.length > 0,
        then: Yup.string()
            .required('Please confirm your new password')
            .oneOf([Yup.ref('new_password')], 'Passwords must match'),
    }),
});

const AdminProfile = () => {
    const title = 'My Profile';
    const description = 'Manage your account settings and profile information';
    const breadcrumbs = [
        { to: '', text: 'Home' },
        { to: 'dashboard', text: 'Dashboard' },
        { to: 'dashboard/profile', text: 'My Profile' },
    ];

    const history = useHistory();
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [profileData, setProfileData] = useState(null);
    const [hotelData, setHotelData] = useState(null);
    const [isEditingBasic, setIsEditingBasic] = useState(false);
    const [isEditingPassword, setIsEditingPassword] = useState(false);
    const [showPassword, setShowPassword] = useState({
        current: false,
        new: false,
        confirm: false,
    });

    // Define fetchProfileData before formik
    const fetchProfileData = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get(`${process.env.REACT_APP_API}/auth/profile`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });

            setProfileData(data.data.admin);
            setHotelData(data.data.hotel);

            // Update formik values after data is fetched
            return {
                name: data.data.admin.name,
                email: data.data.admin.email,
            };
        } catch (error) {
            console.error('Error fetching profile:', error);
            toast.error('Failed to load profile data');
            return null;
        } finally {
            setLoading(false);
        }
    };

    const formik = useFormik({
        initialValues: {
            name: '',
            email: '',
            current_password: '',
            new_password: '',
            confirm_password: '',
        },
        validationSchema,
        onSubmit: async (values, { resetForm, setFieldError }) => {
            setIsSubmitting(true);
            try {
                const updateData = {
                    name: values.name,
                };

                // Only include password fields if user is changing password
                if (values.new_password) {
                    updateData.current_password = values.current_password;
                    updateData.new_password = values.new_password;
                }

                await axios.put(`${process.env.REACT_APP_API}/auth/profile`, updateData, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                });

                toast.success('Profile updated successfully!');
                setIsEditingBasic(false);
                setIsEditingPassword(false);

                // Clear password fields but keep name and email
                formik.setFieldValue('current_password', '');
                formik.setFieldValue('new_password', '');
                formik.setFieldValue('confirm_password', '');

                // Refresh profile data
                const newData = await fetchProfileData();
                if (newData) {
                    formik.setFieldValue('name', newData.name);
                    formik.setFieldValue('email', newData.email);
                }
            } catch (error) {
                console.error('Failed to update profile:', error);
                if (error.response?.data?.field) {
                    setFieldError(error.response.data.field, error.response.data.message);
                }
                toast.error(error.response?.data?.message || 'Failed to update profile');
            } finally {
                setIsSubmitting(false);
            }
        },
    });

    // Load profile data on mount
    useEffect(() => {
        const loadProfile = async () => {
            const data = await fetchProfileData();
            if (data) {
                formik.setValues({
                    name: data.name,
                    email: data.email,
                    current_password: '',
                    new_password: '',
                    confirm_password: '',
                });
            }
        };
        loadProfile();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty dependency array - only run once on mount

    const getRoleBadge = (role) => {
        const variants = {
            admin: 'primary',
            manager: 'info',
            staff: 'success',
        };
        const labels = {
            admin: 'Administrator',
            manager: 'Manager',
            staff: 'Staff Member',
        };
        return (
            <Badge bg={variants[role] || 'secondary'} className="text-uppercase">
                {labels[role] || role}
            </Badge>
        );
    };

    const getStatusBadge = (isActive) => {
        return (
            <Badge bg={isActive ? 'success' : 'danger'} className="text-uppercase">
                {isActive ? 'Active' : 'Inactive'}
            </Badge>
        );
    };

    const { values, errors, touched, handleChange, handleSubmit } = formik;

    if (loading) {
        return (
            <>
                <HtmlHead title={title} description={description} />
                <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
                    <Spinner animation="border" variant="primary" />
                    <span className="ms-3 text-muted">Loading profile...</span>
                </div>
            </>
        );
    }

    return (
        <>
            <HtmlHead title={title} description={description} />

            <div className="page-title-container">
                <Row className="g-0">
                    <Col md="7" className="mb-2">
                        <h1 className="mb-2 pb-0 display-4">{title}</h1>
                        <BreadcrumbList items={breadcrumbs} />
                    </Col>
                </Row>
            </div>

            <Row>
                {/* Left Column - Profile Overview */}
                <Col lg="4">
                    {/* Profile Card */}
                    <Card className="mb-4">
                        <Card.Body className="text-center">
                            <div className="mb-4">
                                <div
                                    className="sw-13 sh-13 rounded-xl d-flex justify-content-center align-items-center mx-auto"
                                    style={{
                                        backgroundColor: '#e3f2fd',
                                        fontSize: '3rem',
                                        fontWeight: 'bold',
                                        color: '#1976d2',
                                    }}
                                >
                                    {profileData?.name.charAt(0).toUpperCase()}
                                </div>
                            </div>

                            <h4 className="mb-1">{profileData?.name}</h4>
                            <p className="text-muted mb-3">{profileData?.email}</p>

                            <div className="d-flex justify-content-center gap-2 mb-4">
                                {getRoleBadge(profileData?.role)}
                                {getStatusBadge(profileData?.is_active)}
                            </div>

                            <div className="border-top pt-3">
                                <Row className="g-0 text-center">
                                    <Col xs="6" className="border-end">
                                        <div className="text-muted small mb-1">Last Login</div>
                                        <div className="cta-3">
                                            {profileData?.last_login ? format(new Date(profileData.last_login), 'MMM dd, yyyy') : 'Never'}
                                        </div>
                                    </Col>
                                    <Col xs="6">
                                        <div className="text-muted small mb-1">Member Since</div>
                                        <div className="cta-3">{format(new Date(profileData?.created_at), 'MMM dd, yyyy')}</div>
                                    </Col>
                                </Row>
                            </div>
                        </Card.Body>
                    </Card>

                    {/* Hotel Information */}
                    {hotelData && (
                        <Card className="mb-4">
                            <Card.Body>
                                <h5 className="mb-4">
                                    <CsLineIcons icon="home" className="me-2" />
                                    Hotel Information
                                </h5>

                                <div className="mb-3">
                                    <small className="text-muted d-block mb-1">Hotel Name</small>
                                    <div className="fw-bold">{hotelData.hotel_name}</div>
                                </div>

                                <div className="mb-3">
                                    <small className="text-muted d-block mb-1">Owner</small>
                                    <div>{hotelData.owner_name}</div>
                                </div>

                                <div className="mb-3">
                                    <small className="text-muted d-block mb-1">Contact Email</small>
                                    <div>{hotelData.email}</div>
                                </div>

                                <div className="mb-3">
                                    <small className="text-muted d-block mb-1">Phone</small>
                                    <div>{hotelData.phone}</div>
                                </div>

                                <div className="mb-0">
                                    <small className="text-muted d-block mb-1">Address</small>
                                    <div>{hotelData.address}</div>
                                </div>
                            </Card.Body>
                        </Card>
                    )}

                    {/* Quick Stats */}
                    {profileData?.role === 'admin' && (
                        <Card className="mb-4">
                            <Card.Body>
                                <h5 className="mb-3">
                                    <CsLineIcons icon="shield" className="me-2" />
                                    Administrator Access
                                </h5>
                                <p className="text-muted small mb-0">
                                    You have full administrative privileges with complete access to all system features and settings.
                                </p>
                            </Card.Body>
                        </Card>
                    )}
                </Col>

                {/* Right Column - Edit Forms */}
                <Col lg="8">
                    {/* Basic Information Form */}
                    <Card className="mb-4">
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <h5 className="mb-0">
                                    <CsLineIcons icon="user" className="me-2" />
                                    Basic Information
                                </h5>
                                {!isEditingBasic && (
                                    <Button variant="outline-primary" size="sm" onClick={() => setIsEditingBasic(true)}>
                                        <CsLineIcons icon="edit" className="me-1" />
                                        Edit
                                    </Button>
                                )}
                            </div>

                            <Form onSubmit={handleSubmit}>
                                <Row>
                                    <Col md="6">
                                        <Form.Group className="mb-3">
                                            <Form.Label>Full Name</Form.Label>
                                            <Form.Control
                                                type="text"
                                                name="name"
                                                value={values.name}
                                                onChange={handleChange}
                                                isInvalid={touched.name && errors.name}
                                                disabled={!isEditingBasic || isSubmitting}
                                                placeholder="Enter your name"
                                            />
                                            <Form.Control.Feedback type="invalid">{errors.name}</Form.Control.Feedback>
                                        </Form.Group>
                                    </Col>

                                    <Col md="6">
                                        <Form.Group className="mb-3">
                                            <Form.Label>Email Address</Form.Label>
                                            <Form.Control type="email" name="email" value={values.email} disabled className="bg-light" />
                                            <Form.Text className="text-muted">Email cannot be changed</Form.Text>
                                        </Form.Group>
                                    </Col>

                                    <Col md="6">
                                        <Form.Group className="mb-3">
                                            <Form.Label>Role</Form.Label>
                                            <Form.Control type="text" value={profileData?.role.toUpperCase()} disabled className="bg-light" />
                                            <Form.Text className="text-muted">Role is assigned by system</Form.Text>
                                        </Form.Group>
                                    </Col>

                                    <Col md="6">
                                        <Form.Group className="mb-3">
                                            <Form.Label>Account Status</Form.Label>
                                            <div>{getStatusBadge(profileData?.is_active)}</div>
                                        </Form.Group>
                                    </Col>
                                </Row>

                                {isEditingBasic && (
                                    <div className="d-flex gap-2 justify-content-end">
                                        <Button
                                            variant="outline-secondary"
                                            onClick={() => {
                                                setIsEditingBasic(false);
                                                formik.setFieldValue('name', profileData.name);
                                            }}
                                            disabled={isSubmitting}
                                        >
                                            Cancel
                                        </Button>
                                        <Button type="submit" variant="primary" disabled={isSubmitting}>
                                            {isSubmitting ? (
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
                                )}
                            </Form>
                        </Card.Body>
                    </Card>

                    {/* Password Change Form */}
                    <Card className="mb-4">
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <div>
                                    <h5 className="mb-1">
                                        <CsLineIcons icon="lock" className="me-2" />
                                        Change Password
                                    </h5>
                                    <small className="text-muted">Update your password to keep your account secure</small>
                                </div>
                                {!isEditingPassword && (
                                    <Button variant="outline-primary" size="sm" onClick={() => setIsEditingPassword(true)}>
                                        <CsLineIcons icon="edit" className="me-1" />
                                        Change
                                    </Button>
                                )}
                            </div>

                            {isEditingPassword ? (
                                <Form onSubmit={handleSubmit}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Current Password</Form.Label>
                                        <div className="position-relative">
                                            <Form.Control
                                                type={showPassword.current ? 'text' : 'password'}
                                                name="current_password"
                                                value={values.current_password}
                                                onChange={handleChange}
                                                isInvalid={touched.current_password && errors.current_password}
                                                disabled={isSubmitting}
                                                placeholder="Enter current password"
                                            />
                                            <Button
                                                variant="link"
                                                className="position-absolute end-0 top-0 text-muted"
                                                onClick={() => setShowPassword({ ...showPassword, current: !showPassword.current })}
                                                tabIndex={-1}
                                            >
                                                <CsLineIcons icon={showPassword.current ? 'eye-off' : 'eye'} />
                                            </Button>
                                        </div>
                                        <Form.Control.Feedback type="invalid">{errors.current_password}</Form.Control.Feedback>
                                    </Form.Group>

                                    <Row>
                                        <Col md="6">
                                            <Form.Group className="mb-3">
                                                <Form.Label>New Password</Form.Label>
                                                <div className="position-relative">
                                                    <Form.Control
                                                        type={showPassword.new ? 'text' : 'password'}
                                                        name="new_password"
                                                        value={values.new_password}
                                                        onChange={handleChange}
                                                        isInvalid={touched.new_password && errors.new_password}
                                                        disabled={isSubmitting}
                                                        placeholder="Enter new password"
                                                    />
                                                    <Button
                                                        variant="link"
                                                        className="position-absolute end-0 top-0 text-muted"
                                                        onClick={() => setShowPassword({ ...showPassword, new: !showPassword.new })}
                                                        tabIndex={-1}
                                                    >
                                                        <CsLineIcons icon={showPassword.new ? 'eye-off' : 'eye'} />
                                                    </Button>
                                                </div>
                                                <Form.Control.Feedback type="invalid">{errors.new_password}</Form.Control.Feedback>
                                                <Form.Text className="text-muted">Minimum 8 characters</Form.Text>
                                            </Form.Group>
                                        </Col>

                                        <Col md="6">
                                            <Form.Group className="mb-3">
                                                <Form.Label>Confirm New Password</Form.Label>
                                                <div className="position-relative">
                                                    <Form.Control
                                                        type={showPassword.confirm ? 'text' : 'password'}
                                                        name="confirm_password"
                                                        value={values.confirm_password}
                                                        onChange={handleChange}
                                                        isInvalid={touched.confirm_password && errors.confirm_password}
                                                        disabled={isSubmitting}
                                                        placeholder="Confirm new password"
                                                    />
                                                    <Button
                                                        variant="link"
                                                        className="position-absolute end-0 top-0 text-muted"
                                                        onClick={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })}
                                                        tabIndex={-1}
                                                    >
                                                        <CsLineIcons icon={showPassword.confirm ? 'eye-off' : 'eye'} />
                                                    </Button>
                                                </div>
                                                <Form.Control.Feedback type="invalid">{errors.confirm_password}</Form.Control.Feedback>
                                            </Form.Group>
                                        </Col>
                                    </Row>

                                    <div className="d-flex gap-2 justify-content-end">
                                        <Button
                                            variant="outline-secondary"
                                            onClick={() => {
                                                setIsEditingPassword(false);
                                                formik.setFieldValue('current_password', '');
                                                formik.setFieldValue('new_password', '');
                                                formik.setFieldValue('confirm_password', '');
                                            }}
                                            disabled={isSubmitting}
                                        >
                                            Cancel
                                        </Button>
                                        <Button type="submit" variant="primary" disabled={isSubmitting}>
                                            {isSubmitting ? (
                                                <>
                                                    <Spinner as="span" animation="border" size="sm" className="me-2" />
                                                    Updating...
                                                </>
                                            ) : (
                                                <>
                                                    <CsLineIcons icon="lock" className="me-2" />
                                                    Update Password
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </Form>
                            ) : (
                                <div className="text-muted">
                                    <p className="mb-0">Your password is secure. Click "Change" to update it.</p>
                                </div>
                            )}
                        </Card.Body>
                    </Card>

                    {/* Permissions Overview (for non-admin users) */}
                    {profileData?.role !== 'admin' && profileData?.permissions && (
                        <Card className="mb-4">
                            <Card.Body>
                                <h5 className="mb-4">
                                    <CsLineIcons icon="shield" className="me-2" />
                                    Your Permissions
                                </h5>

                                <Row className="g-3">
                                    {Object.entries(profileData.permissions).map(([module, actions]) => {
                                        const hasAnyPermission = Object.values(actions).some((val) => val === true);
                                        if (!hasAnyPermission) return null;

                                        return (
                                            <Col key={module} md="6">
                                                <Card className="h-100">
                                                    <Card.Body className="p-3">
                                                        <div className="fw-bold text-primary mb-2 text-capitalize">{module.replace(/_/g, ' ')}</div>
                                                        <div className="d-flex flex-wrap gap-1">
                                                            {Object.entries(actions).map(([action, allowed]) =>
                                                                allowed ? (
                                                                    <Badge key={action} bg="success" className="text-capitalize">
                                                                        {action.replace(/_/g, ' ')}
                                                                    </Badge>
                                                                ) : null
                                                            )}
                                                        </div>
                                                    </Card.Body>
                                                </Card>
                                            </Col>
                                        );
                                    })}
                                </Row>

                                <div className="mt-3 p-3 bg-light rounded">
                                    <small className="text-muted">
                                        <CsLineIcons icon="info-circle" className="me-1" />
                                        Contact your administrator if you need additional permissions
                                    </small>
                                </div>
                            </Card.Body>
                        </Card>
                    )}
                </Col>
            </Row>

            {/* Loading Overlay */}
            {isSubmitting && (
                <div
                    className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
                    style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        zIndex: 9999,
                        backdropFilter: 'blur(3px)',
                    }}
                >
                    <Card className="shadow-lg border-0">
                        <Card.Body className="text-center p-5">
                            <Spinner animation="border" variant="primary" className="mb-3" style={{ width: '4rem', height: '4rem' }} />
                            <h4 className="mb-2">Updating Profile</h4>
                            <p className="text-muted mb-0">Please wait while we save your changes...</p>
                        </Card.Body>
                    </Card>
                </div>
            )}
        </>
    );
};

export default AdminProfile;