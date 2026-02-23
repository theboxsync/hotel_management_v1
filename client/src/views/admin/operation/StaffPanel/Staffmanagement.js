import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { Row, Col, Card, Button, Form, Spinner, Badge, Table, Modal } from 'react-bootstrap';
import HtmlHead from 'components/html-head/HtmlHead';
import BreadcrumbList from 'components/breadcrumb-list/BreadcrumbList';
import CsLineIcons from 'cs-line-icons/CsLineIcons';
import axios from 'axios';
import { toast } from 'react-toastify';

const StaffManagement = () => {
    const title = 'Staff Management';
    const description = 'Create and manage hotel staff with custom permissions';
    const breadcrumbs = [
        { to: '', text: 'Home' },
        { to: 'dashboard', text: 'Dashboard' },
        { to: 'dashboard/staff-management', text: 'Staff Management' },
    ];

    const history = useHistory();
    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchStaffList = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get(`${process.env.REACT_APP_API}/auth/staff`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });
            setStaffList(data.data || []);
        } catch (error) {
            console.error('Error fetching staff:', error);
            toast.error('Failed to fetch staff list');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStaffList();
    }, []);

    const toggleStaffStatus = async (staffId, currentStatus) => {
        try {
            await axios.put(
                `${process.env.REACT_APP_API}/auth/staff/${staffId}/status`,
                { is_active: !currentStatus },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                }
            );
            toast.success(`Staff ${!currentStatus ? 'activated' : 'deactivated'} successfully!`);
            fetchStaffList();
        } catch (error) {
            console.error('Failed to update status:', error);
            toast.error(error.response?.data?.message || 'Failed to update status');
        }
    };

    const deleteStaff = async (staffId, staffName) => {
        if (!window.confirm(`Are you sure you want to delete ${staffName}? This action cannot be undone.`)) {
            return;
        }

        try {
            await axios.delete(`${process.env.REACT_APP_API}/auth/staff/${staffId}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });
            toast.success('Staff member deleted successfully!');
            fetchStaffList();
        } catch (error) {
            console.error('Failed to delete staff:', error);
            toast.error(error.response?.data?.message || 'Failed to delete staff member');
        }
    };

    const getRoleBadge = (role) => {
        const variants = {
            admin: 'primary',
            manager: 'info',
            staff: 'success',
        };
        return <Badge bg={variants[role] || 'secondary'}>{role.toUpperCase()}</Badge>;
    };

    const getStatusBadge = (isActive) => {
        return <Badge bg={isActive ? 'success' : 'danger'}>{isActive ? 'Active' : 'Inactive'}</Badge>;
    };

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
                        <Button
                            variant="primary"
                            onClick={() => history.push('/dashboard/staff-management/add')}
                            className="btn-icon btn-icon-start w-100 w-md-auto"
                        >
                            <CsLineIcons icon="plus" />
                            <span>Add New Staff</span>
                        </Button>
                    </Col>
                </Row>
            </div>

            <Row>
                {/* Staff List */}
                <Col>
                    <Card className="mb-5">
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <div>
                                    <h5 className="mb-1">
                                        <CsLineIcons icon="user" className="me-2" />
                                        Staff Members
                                    </h5>
                                    <p className="text-muted mb-0">Manage your hotel staff and their permissions</p>
                                </div>
                                <div className="d-flex gap-2">
                                    <Button variant="outline-primary" size="sm" onClick={fetchStaffList} disabled={loading}>
                                        <CsLineIcons icon="sync" className={loading ? 'rotate' : ''} />
                                    </Button>
                                </div>
                            </div>

                            {loading ? (
                                <div className="text-center py-5">
                                    <Spinner animation="border" variant="primary" />
                                    <p className="text-muted mt-2">Loading staff members...</p>
                                </div>
                            ) : staffList.length === 0 ? (
                                <div className="text-center py-5">
                                    <div
                                        className="sw-13 sh-13 rounded-xl d-flex justify-content-center align-items-center mx-auto mb-4"
                                        style={{ backgroundColor: '#f5f5f5' }}
                                    >
                                        <CsLineIcons icon="user" size="50" className="text-muted" />
                                    </div>
                                    <h5 className="mb-2">No Staff Members Yet</h5>
                                    <p className="text-muted mb-4">Get started by creating your first staff member</p>
                                    <Button variant="primary" onClick={() => history.push('/dashboard/staff-management/add')}>
                                        <CsLineIcons icon="plus" className="me-2" />
                                        Add First Staff Member
                                    </Button>
                                </div>
                            ) : (
                                <div className="table-responsive">
                                    <Table hover className="mb-0">
                                        <thead>
                                            <tr>
                                                <th className="text-muted text-small text-uppercase">Name</th>
                                                <th className="text-muted text-small text-uppercase">Email</th>
                                                <th className="text-muted text-small text-uppercase">Role</th>
                                                <th className="text-muted text-small text-uppercase">Status</th>
                                                <th className="text-muted text-small text-uppercase">Last Login</th>
                                                <th className="text-muted text-small text-uppercase text-end">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {staffList.map((staff) => (
                                                <tr key={staff._id}>
                                                    <td>
                                                        <div className="d-flex align-items-center">
                                                            <div
                                                                className="sw-4 sh-4 me-3 rounded-xl d-flex justify-content-center align-items-center"
                                                                style={{
                                                                    backgroundColor: '#e3f2fd',
                                                                    color: '#1976d2',
                                                                    fontWeight: 'bold',
                                                                }}
                                                            >
                                                                {staff.name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <div className="text-alternate">{staff.name}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="text-muted">
                                                        <small>{staff.email}</small>
                                                    </td>
                                                    <td>{getRoleBadge(staff.role)}</td>
                                                    <td>{getStatusBadge(staff.is_active)}</td>
                                                    <td className="text-muted">
                                                        <small>{staff.last_login ? new Date(staff.last_login).toLocaleDateString() : 'Never'}</small>
                                                    </td>
                                                    <td>
                                                        <div className="d-flex gap-1 justify-content-end">
                                                            <Button
                                                                variant="outline-primary"
                                                                size="sm"
                                                                onClick={() => history.push(`/operations/staff-panel/edit/${staff._id}`)}
                                                                title="Edit"
                                                            >
                                                                <CsLineIcons icon="edit" />
                                                            </Button>
                                                            <Button
                                                                variant={staff.is_active ? 'outline-warning' : 'outline-success'}
                                                                size="sm"
                                                                onClick={() => toggleStaffStatus(staff._id, staff.is_active)}
                                                                title={staff.is_active ? 'Deactivate' : 'Activate'}
                                                            >
                                                                <CsLineIcons icon={staff.is_active ? 'close' : 'check'} />
                                                            </Button>
                                                            <Button
                                                                variant="outline-danger"
                                                                size="sm"
                                                                onClick={() => deleteStaff(staff._id, staff.name)}
                                                                title="Delete"
                                                            >
                                                                <CsLineIcons icon="bin" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </>
    );
};

export default StaffManagement;