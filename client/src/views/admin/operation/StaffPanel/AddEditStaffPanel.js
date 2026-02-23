import React, { useState, useEffect } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { Row, Col, Card, Button, Form, Spinner } from 'react-bootstrap';
import HtmlHead from 'components/html-head/HtmlHead';
import BreadcrumbList from 'components/breadcrumb-list/BreadcrumbList';
import CsLineIcons from 'cs-line-icons/CsLineIcons';
import axios from 'axios';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';

const validationSchema = Yup.object().shape({
    name: Yup.string().required('Name is required'),
    email: Yup.string().email('Invalid email').required('Email is required'),
    password: Yup.string().when('isEdit', {
        is: false,
        then: Yup.string().min(8, 'Password must be at least 8 characters').required('Password is required'),
        otherwise: Yup.string().min(8, 'Password must be at least 8 characters'),
    }),
    role: Yup.string().oneOf(['manager', 'staff'], 'Invalid role').required('Role is required'),
});

const AddEditStaffPanel = () => {
    const { id } = useParams();
    const isEdit = Boolean(id);
    const history = useHistory();

    const title = isEdit ? 'Edit Staff Member' : 'Add Staff Member';
    const description = isEdit ? 'Update staff member details and permissions' : 'Create a new staff member with custom permissions';
    const breadcrumbs = [
        { to: '', text: 'Home' },
        { to: 'dashboard', text: 'Dashboard' },
        { to: 'dashboard/staff-management', text: 'Staff Management' },
        { to: isEdit ? `dashboard/staff-management/edit/${id}` : 'dashboard/staff-management/add', text: title },
    ];

    const [loading, setLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Permission structure
    const permissionModules = {
        manage_rooms: {
            label: 'Manage Rooms',
            icon: 'home',
            description: 'Create, view, update and delete room information',
            actions: [
                { key: 'read', label: 'View Rooms', description: 'View room list and details' },
                { key: 'create', label: 'Add Rooms', description: 'Create new rooms' },
                { key: 'update', label: 'Update Rooms', description: 'Modify room information' },
                { key: 'delete', label: 'Delete Rooms', description: 'Remove rooms from system' },
            ],
        },
        manage_bookings: {
            label: 'Manage Bookings',
            icon: 'calendar',
            description: 'Handle guest reservations and bookings',
            actions: [
                { key: 'read', label: 'View Bookings', description: 'Access booking information' },
                { key: 'create', label: 'Create Bookings', description: 'Make new reservations' },
                { key: 'update', label: 'Update Bookings', description: 'Modify booking details' },
                { key: 'delete', label: 'Delete Bookings', description: 'Remove bookings' },
                { key: 'cancel', label: 'Cancel Bookings', description: 'Cancel guest reservations' },
            ],
        },
        manage_staff: {
            label: 'Manage Staff',
            icon: 'user',
            description: 'Control staff accounts and permissions',
            actions: [
                { key: 'read', label: 'View Staff', description: 'See staff member list' },
                { key: 'create', label: 'Add Staff', description: 'Create new staff accounts' },
                { key: 'update', label: 'Update Staff', description: 'Modify staff information' },
                { key: 'delete', label: 'Delete Staff', description: 'Remove staff accounts' },
            ],
        },
        view_analytics: {
            label: 'View Analytics',
            icon: 'chart-4',
            description: 'Access reports and business insights',
            actions: [
                { key: 'dashboard', label: 'Dashboard Access', description: 'View analytics dashboard' },
                { key: 'reports', label: 'Generate Reports', description: 'Create business reports' },
                { key: 'export', label: 'Export Data', description: 'Download analytics data' },
            ],
        },
        manage_settings: {
            label: 'Manage Settings',
            icon: 'gear',
            description: 'Configure hotel system settings',
            actions: [
                { key: 'hotel_info', label: 'Hotel Information', description: 'Update hotel details' },
                { key: 'pricing', label: 'Pricing Settings', description: 'Manage room rates' },
                { key: 'integrations', label: 'Integrations', description: 'Configure third-party services' },
            ],
        },
        manage_payments: {
            label: 'Manage Payments',
            icon: 'wallet',
            description: 'Handle financial transactions',
            actions: [
                { key: 'view', label: 'View Payments', description: 'Access payment history' },
                { key: 'refund', label: 'Process Refunds', description: 'Issue customer refunds' },
            ],
        },
        manage_customers: {
            label: 'Manage Customers',
            icon: 'user',
            description: 'Manage guest information',
            actions: [
                { key: 'read', label: 'View Customers', description: 'Access guest profiles' },
                { key: 'create', label: 'Add Customers', description: 'Create new guest accounts' },
                { key: 'update', label: 'Update Customers', description: 'Modify guest information' },
                { key: 'delete', label: 'Delete Customers', description: 'Remove guest accounts' },
            ],
        },
    };

    // Permission presets
    const permissionPresets = {
        full_manager: {
            name: 'Full Manager',
            description: 'Complete access except staff management',
            permissions: {
                manage_rooms: { read: true, create: true, update: true, delete: true },
                manage_bookings: { read: true, create: true, update: true, delete: true, cancel: true },
                manage_staff: { read: true, create: false, update: false, delete: false },
                view_analytics: { dashboard: true, reports: true, export: true },
                manage_settings: { hotel_info: true, pricing: true, integrations: false },
                manage_payments: { view: true, refund: true },
                manage_customers: { read: true, create: true, update: true, delete: true },
            },
        },
        front_desk: {
            name: 'Front Desk Staff',
            description: 'Guest check-in/out and bookings',
            permissions: {
                manage_rooms: { read: true, create: false, update: true, delete: false },
                manage_bookings: { read: true, create: true, update: true, delete: false, cancel: false },
                manage_staff: { read: false, create: false, update: false, delete: false },
                view_analytics: { dashboard: false, reports: false, export: false },
                manage_settings: { hotel_info: false, pricing: false, integrations: false },
                manage_payments: { view: false, refund: false },
                manage_customers: { read: true, create: true, update: true, delete: false },
            },
        },
        housekeeping: {
            name: 'Housekeeping Manager',
            description: 'Room status and maintenance',
            permissions: {
                manage_rooms: { read: true, create: false, update: true, delete: false },
                manage_bookings: { read: true, create: false, update: false, delete: false, cancel: false },
                manage_staff: { read: true, create: false, update: false, delete: false },
                view_analytics: { dashboard: true, reports: false, export: false },
                manage_settings: { hotel_info: false, pricing: false, integrations: false },
                manage_payments: { view: false, refund: false },
                manage_customers: { read: true, create: false, update: false, delete: false },
            },
        },
        accountant: {
            name: 'Accountant',
            description: 'Financial reporting and payments',
            permissions: {
                manage_rooms: { read: true, create: false, update: false, delete: false },
                manage_bookings: { read: true, create: false, update: false, delete: false, cancel: false },
                manage_staff: { read: false, create: false, update: false, delete: false },
                view_analytics: { dashboard: true, reports: true, export: true },
                manage_settings: { hotel_info: false, pricing: true, integrations: false },
                manage_payments: { view: true, refund: true },
                manage_customers: { read: true, create: false, update: false, delete: false },
            },
        },
        view_only: {
            name: 'View Only',
            description: 'Read-only access to most features',
            permissions: {
                manage_rooms: { read: true, create: false, update: false, delete: false },
                manage_bookings: { read: true, create: false, update: false, delete: false, cancel: false },
                manage_staff: { read: false, create: false, update: false, delete: false },
                view_analytics: { dashboard: true, reports: false, export: false },
                manage_settings: { hotel_info: false, pricing: false, integrations: false },
                manage_payments: { view: false, refund: false },
                manage_customers: { read: true, create: false, update: false, delete: false },
            },
        },
    };

    const [permissions, setPermissions] = useState(() => {
        const initial = {};
        Object.keys(permissionModules).forEach((module) => {
            initial[module] = {};
            permissionModules[module].actions.forEach((action) => {
                initial[module][action.key] = false;
            });
        });
        return initial;
    });

    const formik = useFormik({
        initialValues: {
            name: '',
            email: '',
            password: '',
            role: 'staff',
            isEdit,
        },
        validationSchema,
        onSubmit: async (values, { setSubmitting }) => {
            setIsSubmitting(true);
            try {
                const payload = {
                    name: values.name,
                    email: values.email,
                    role: values.role,
                    permissions,
                };

                // Only include password if it's filled (for edit) or if it's add
                if (!isEdit || values.password) {
                    payload.password = values.password;
                }

                if (isEdit) {
                    // Update staff - need to update basic info and permissions separately
                    await axios.put(
                        `${process.env.REACT_APP_API}/auth/staff/${id}`,
                        payload,
                        {
                            headers: {
                                Authorization: `Bearer ${localStorage.getItem('token')}`,
                            },
                        }
                    );
                    toast.success('Staff member updated successfully!');
                } else {
                    // Create new staff
                    await axios.post(
                        `${process.env.REACT_APP_API}/auth/staff`,
                        payload,
                        {
                            headers: {
                                Authorization: `Bearer ${localStorage.getItem('token')}`,
                            },
                        }
                    );
                    toast.success('Staff member created successfully!');
                }

                history.push('/operations/staff-panel/manage');
            } catch (error) {
                console.error('Failed to save staff:', error);
                toast.error(error.response?.data?.message || `Failed to ${isEdit ? 'update' : 'create'} staff member`);
            } finally {
                setIsSubmitting(false);
                setSubmitting(false);
            }
        },
    });
    const fetchStaffData = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get(`${process.env.REACT_APP_API}/auth/staff`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });

            const staff = data.data.find((s) => s._id === id);

            if (staff) {
                formik.setValues({
                    name: staff.name,
                    email: staff.email,
                    password: '',
                    role: staff.role,
                    isEdit: true,
                });
                setPermissions(staff.permissions);
            } else {
                toast.error('Staff member not found');
                history.push('/dashboard/staff-management');
            }
        } catch (error) {
            console.error('Error fetching staff data:', error);
            toast.error('Failed to load staff data');
            history.push('/dashboard/staff-management');
        } finally {
            setLoading(false);
        }
    };

    // Fetch staff data if editing
    useEffect(() => {
        if (isEdit) {
            fetchStaffData();
        }
    }, [id]);



    const applyPreset = (presetKey) => {
        const preset = permissionPresets[presetKey];
        if (preset) {
            setPermissions(preset.permissions);
            toast.success(`Applied ${preset.name} preset`);
        }
    };

    const togglePermission = (module, action) => {
        setPermissions((prev) => ({
            ...prev,
            [module]: {
                ...prev[module],
                [action]: !prev[module][action],
            },
        }));
    };

    const toggleAllModulePermissions = (module) => {
        const allChecked = permissionModules[module].actions.every((action) => permissions[module]?.[action.key]);
        const newModulePermissions = {};
        permissionModules[module].actions.forEach((action) => {
            newModulePermissions[action.key] = !allChecked;
        });
        setPermissions((prev) => ({
            ...prev,
            [module]: newModulePermissions,
        }));
    };

    const clearAllPermissions = () => {
        const cleared = {};
        Object.keys(permissionModules).forEach((module) => {
            cleared[module] = {};
            permissionModules[module].actions.forEach((action) => {
                cleared[module][action.key] = false;
            });
        });
        setPermissions(cleared);
        toast.info('All permissions cleared');
    };

    const { values, errors, touched, handleChange, handleSubmit, setFieldValue } = formik;

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

            <div className="page-title-container">
                <Row className="g-0">
                    <Col md="7" className="mb-2">
                        <h1 className="mb-2 pb-0 display-4">{title}</h1>
                        <BreadcrumbList items={breadcrumbs} />
                    </Col>
                    <Col md="5" className="d-flex align-items-start justify-content-end">
                        <Button variant="outline-primary" size="sm" onClick={() => history.push('/dashboard/staff-management')} className="btn-icon btn-icon-start">
                            <CsLineIcons icon="arrow-left" />
                            <span>Back to Staff List</span>
                        </Button>
                    </Col>
                </Row>
            </div>

            <Form onSubmit={handleSubmit}>
                <Row>
                    {/* Basic Information */}
                    {/* <Col lg="4"> */}
                    <Card className="mb-5">
                        <Card.Body>
                            <h5 className="mb-4 fs-5">
                                <CsLineIcons icon="user" className="me-2" />
                                Basic Information
                            </h5>

                            <Row className="g-3">
                                <Col md="6">
                                    <Form.Group className="mb-3">
                                        <Form.Label>Full Name *</Form.Label>
                                        <Form.Control
                                            type="text"
                                            name="name"
                                            value={values.name}
                                            onChange={handleChange}
                                            isInvalid={touched.name && errors.name}
                                            placeholder="John Doe"
                                            disabled={isSubmitting}
                                        />
                                        <Form.Control.Feedback type="invalid">{errors.name}</Form.Control.Feedback>
                                    </Form.Group>
                                </Col>
                                <Col md="6">
                                    <Form.Group className="mb-3">
                                        <Form.Label>Email Address *</Form.Label>
                                        <Form.Control
                                            type="email"
                                            name="email"
                                            value={values.email}
                                            onChange={handleChange}
                                            isInvalid={touched.email && errors.email}
                                            placeholder="john@hotel.com"
                                            disabled={isSubmitting || isEdit}
                                        />
                                        <Form.Control.Feedback type="invalid">{errors.email}</Form.Control.Feedback>
                                        {isEdit && <Form.Text className="text-muted">Email cannot be changed</Form.Text>}
                                    </Form.Group>
                                </Col>
                                <Col md="6">
                                    <Form.Group className="mb-3">
                                        <Form.Label>Password {!isEdit && '*'}</Form.Label>
                                        <div className="position-relative">
                                            <Form.Control
                                                type={showPassword ? 'text' : 'password'}
                                                name="password"
                                                value={values.password}
                                                onChange={handleChange}
                                                isInvalid={touched.password && errors.password}
                                                placeholder={isEdit ? 'Leave blank to keep current password' : 'Minimum 8 characters'}
                                                disabled={isSubmitting}
                                            />
                                            <Button
                                                variant="link"
                                                className="position-absolute end-0 top-0 text-muted"
                                                onClick={() => setShowPassword(!showPassword)}
                                                style={{ zIndex: 10 }}
                                                tabIndex={-1}
                                            >
                                                <CsLineIcons icon={showPassword ? 'eye-off' : 'eye'} />
                                            </Button>
                                        </div>
                                        <Form.Control.Feedback type="invalid">{errors.password}</Form.Control.Feedback>
                                        {isEdit && <Form.Text className="text-muted">Leave blank to keep current password</Form.Text>}
                                    </Form.Group>
                                </Col>
                                <Col md="6">
                                    <Form.Group className="mb-4">
                                        <Form.Label>Role *</Form.Label>
                                        <Form.Select name="role" value={values.role} onChange={handleChange} disabled={isSubmitting}>
                                            <option value="staff">Staff</option>
                                            <option value="manager">Manager</option>
                                        </Form.Select>
                                        <Form.Text className="text-muted">
                                            {values.role === 'manager' ? 'Managers typically have broader access' : 'Staff have limited access based on permissions'}
                                        </Form.Text>
                                    </Form.Group>
                                </Col>
                            </Row>

                            {/* New------------------------------------ */}
                            <div className="d-flex justify-content-between align-items-center my-4 border-top pt-3">
                                <h5 className="my-2 fs-5">
                                    <CsLineIcons icon="shield" className="me-2" />
                                    Permissions & Access Control
                                </h5>
                                <Button variant="outline-danger" size="sm" onClick={clearAllPermissions} disabled={isSubmitting}>
                                    <CsLineIcons icon="bin" className="me-1" />
                                    Clear All
                                </Button>
                            </div>

                            <Form.Label className="mb-2 fw-bold">
                                <CsLineIcons icon="lightning" className="me-2" />
                                Quick Permission Presets
                            </Form.Label>
                            <Row className="g-2 mb-3">
                                {Object.entries(permissionPresets).map(([key, preset]) => (
                                    <Col key={key} xl="2" md="3" sm="6">
                                        <Button
                                            variant="outline-primary"
                                            size="md"
                                            className="w-100 text-center"
                                            onClick={() => applyPreset(key)}
                                            disabled={isSubmitting}
                                            title={preset.description}
                                        >
                                            <div className="fw-bold">{preset.name}</div>
                                        </Button>
                                    </Col>
                                ))}
                            </Row>
                            {/* Permission Modules */}
                            <div>
                                {Object.entries(permissionModules).map(([moduleKey, module]) => {
                                    const allChecked = module.actions.every((action) => permissions[moduleKey]?.[action.key]);
                                    const someChecked = module.actions.some((action) => permissions[moduleKey]?.[action.key]);

                                    return (
                                        <div key={moduleKey} className="mb-3">
                                            <div className="p-3">
                                                {/* Module Header */}
                                                <div className="d-flex justify-content-between align-items-start mb-3">
                                                    <div className="flex-grow-1">
                                                        <div className="d-flex align-items-center mb-1">
                                                            <div
                                                                className="sw-4 sh-4 rounded-xl d-flex justify-content-center align-items-center me-2"
                                                                style={{ backgroundColor: someChecked ? '#e3f2fd' : '#f5f5f5' }}
                                                            >
                                                                <CsLineIcons icon={module.icon} className={someChecked ? 'text-primary' : 'text-muted'} />
                                                            </div>
                                                            <strong className="text-primary">{module.label}</strong>
                                                        </div>
                                                        <small className="text-muted ms-5">{module.description}</small>
                                                    </div>
                                                    <Form.Check
                                                        type="checkbox"
                                                        label="Select All"
                                                        checked={allChecked}
                                                        onChange={() => toggleAllModulePermissions(moduleKey)}
                                                        disabled={isSubmitting}
                                                        className="ms-3"
                                                    />
                                                </div>

                                                {/* Actions Grid */}
                                                <div className="ms-5">
                                                    <Row className="g-2">
                                                        {module.actions.map((action) => (
                                                            <Col key={action.key} md="6" lg="3">
                                                                <Card className={`h-100 ${permissions[moduleKey]?.[action.key] ? 'border-primary' : 'border'}`}>
                                                                    <Card.Body className="p-2 d-flex align-items-center">
                                                                        <Form.Check
                                                                            type="checkbox"
                                                                            id={`${moduleKey}-${action.key}`}
                                                                            checked={permissions[moduleKey]?.[action.key] || false}
                                                                            onChange={() => togglePermission(moduleKey, action.key)}
                                                                            disabled={isSubmitting}
                                                                        />
                                                                        <label htmlFor={`${moduleKey}-${action.key}`} className="ms-2 w-100">
                                                                            <div className="fw-bold" style={{ fontSize: '0.85rem' }}>
                                                                                {action.label}
                                                                            </div>
                                                                            <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                                                                                {action.description}
                                                                            </small>
                                                                        </label>
                                                                    </Card.Body>
                                                                </Card>
                                                            </Col>
                                                        ))}
                                                    </Row>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* End ------------------------------------ */}

                            <div className="border-top pt-3">
                                <div className="d-flex gap-2">
                                    <Button type="submit" variant="primary" disabled={isSubmitting}>
                                        {isSubmitting ? (
                                            <>
                                                <Spinner as="span" animation="border" size="sm" className="me-2" />
                                                {isEdit ? 'Updating...' : 'Creating...'}
                                            </>
                                        ) : (
                                            <>
                                                <CsLineIcons icon="save" className="me-2" />
                                                {isEdit ? 'Update Staff Member' : 'Create Staff Member'}
                                            </>
                                        )}
                                    </Button>
                                    <Button variant="outline-secondary" onClick={() => history.push('/dashboard/staff-management')} disabled={isSubmitting}>
                                        <CsLineIcons icon="close" className="me-2" />
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                    {/* </Col> */}
                </Row>
            </Form>

            {/* Full Page Loading Overlay */}
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
                            <h4 className="mb-2">{isEdit ? 'Updating Staff Member' : 'Creating Staff Member'}</h4>
                            <p className="text-muted mb-0">Please wait while we process your request...</p>
                        </Card.Body>
                    </Card>
                </div>
            )}
        </>
    );
};

export default AddEditStaffPanel;