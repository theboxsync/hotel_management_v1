import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { Row, Col, Card, Button, Form, Spinner, Badge, Collapse } from 'react-bootstrap';
import { useTable, useGlobalFilter, useSortBy } from 'react-table';
import HtmlHead from 'components/html-head/HtmlHead';
import BreadcrumbList from 'components/breadcrumb-list/BreadcrumbList';
import CsLineIcons from 'cs-line-icons/CsLineIcons';
import axios from 'axios';
import { toast } from 'react-toastify';

import ControlsSearch from 'components/table/ControlsSearch';
import ControlsPageSize from 'components/table/ControlsPageSize';
import Table from 'components/table/Table';
import TablePagination from 'components/table/TablePagination';

const StaffManagement = () => {
    const title = 'Staff Management';
    const description = 'Create and manage hotel staff with custom permissions';
    const breadcrumbs = [
        { to: '', text: 'Home' },
        { to: 'operations', text: 'Operations' },
        { to: 'operations/staff-panel', text: 'Staff Management' },
    ];

    const history = useHistory();
    const [staffList, setStaffList] = useState([]);
    const [filteredStaff, setFilteredStaff] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');

    // Filter states
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        role: '',
        status: '',
    });

    const getActiveFilterCount = () => {
        let count = 0;
        if (filters.role) count++;
        if (filters.status) count++;
        if (searchTerm) count++;
        return count;
    };

    const fetchStaffList = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get(`${process.env.REACT_APP_API}/auth/staff`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });

            // Add display fields
            const staffWithDisplay = (data.data || []).map(staff => ({
                ...staff,
                last_login_display: staff.last_login
                    ? new Date(staff.last_login).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })
                    : 'Never',
                name_initial: staff.name?.charAt(0).toUpperCase() || '?',
            }));

            setStaffList(staffWithDisplay);
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

    // Apply client-side filtering
    useEffect(() => {
        let filtered = [...staffList];

        // Apply role filter
        if (filters.role) {
            filtered = filtered.filter(staff => staff.role === filters.role);
        }

        // Apply status filter
        if (filters.status) {
            const isActive = filters.status === 'active';
            filtered = filtered.filter(staff => staff.is_active === isActive);
        }

        // Apply search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(staff =>
                staff.name?.toLowerCase().includes(term) ||
                staff.email?.toLowerCase().includes(term) ||
                staff.role?.toLowerCase().includes(term)
            );
        }

        setFilteredStaff(filtered);
        setPageIndex(0);
    }, [staffList, filters, searchTerm]);

    const handlePageChange = (newPageIndex) => {
        setPageIndex(newPageIndex);
    };

    const handlePageSizeChange = (newPageSize) => {
        setPageSize(newPageSize);
        setPageIndex(0);
    };

    const handleSearch = useCallback((value) => {
        setSearchTerm(value);
    }, []);

    const handleFilterChange = (filterName, value) => {
        setFilters((prev) => ({
            ...prev,
            [filterName]: value,
        }));
    };

    const handleClearFilters = () => {
        setFilters({
            role: '',
            status: '',
        });
        setSearchTerm('');
    };

    const toggleStaffStatus = async (staffId, currentStatus, staffName) => {
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
            toast.success(`${staffName} ${!currentStatus ? 'activated' : 'deactivated'} successfully!`);
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
            admin: { bg: 'primary', text: 'Admin' },
            manager: { bg: 'info', text: 'Manager' },
            staff: { bg: 'success', text: 'Staff' },
        };
        const { bg = 'secondary', text = role } = variants[role] || {};
        return <Badge bg={bg}>{text}</Badge>;
    };

    // Paginate filtered staff
    const paginatedStaff = useMemo(() => {
        const start = pageIndex * pageSize;
        const end = start + pageSize;
        return filteredStaff.slice(start, end);
    }, [filteredStaff, pageIndex, pageSize]);

    const columns = React.useMemo(
        () => [
            {
                Header: 'Name',
                accessor: 'name',
                Cell: ({ row }) => (
                    <div className="d-flex align-items-center">
                        <div
                            className="sw-4 sh-4 me-3 rounded-xl d-flex justify-content-center align-items-center"
                            style={{
                                backgroundColor: '#e3f2fd',
                                color: '#1976d2',
                                fontWeight: 'bold',
                                width: '32px',
                                height: '32px',
                            }}
                        >
                            {row.original.name_initial}
                        </div>
                        <div>
                            <div className="text-alternate fw-bold">{row.original.name}</div>
                        </div>
                    </div>
                ),
            },
            {
                Header: 'Email',
                accessor: 'email',
                Cell: ({ value }) => <span className="text-muted small">{value}</span>,
            },
            {
                Header: 'Role',
                accessor: 'role',
                Cell: ({ value }) => getRoleBadge(value),
            },
            {
                Header: 'Status',
                accessor: 'is_active',
                Cell: ({ value }) => (
                    <Badge bg={value ? 'success' : 'danger'}>
                        {value ? 'Active' : 'Inactive'}
                    </Badge>
                ),
            },
            {
                Header: 'Last Login',
                accessor: 'last_login_display',
                Cell: ({ value }) => <span className="text-muted small">{value}</span>,
            },
            {
                Header: 'Actions',
                Cell: ({ row }) => (
                    <div className="d-flex gap-1 justify-content-end">
                        <Button
                            variant="outline-primary"
                            size="sm"
                            className="btn-icon btn-icon-only"
                            onClick={() => history.push(`/operations/staff-panel/edit/${row.original._id}`)}
                            title="Edit"
                        >
                            <CsLineIcons icon="edit" />
                        </Button>
                        <Button
                            variant={row.original.is_active ? 'outline-warning' : 'outline-success'}
                            size="sm"
                            className="btn-icon btn-icon-only"
                            onClick={() => toggleStaffStatus(row.original._id, row.original.is_active, row.original.name)}
                            title={row.original.is_active ? 'Deactivate' : 'Activate'}
                        >
                            <CsLineIcons icon={row.original.is_active ? 'close' : 'check'} />
                        </Button>
                        <Button
                            variant="outline-danger"
                            size="sm"
                            className="btn-icon btn-icon-only"
                            onClick={() => deleteStaff(row.original._id, row.original.name)}
                            title="Delete"
                        >
                            <CsLineIcons icon="bin" />
                        </Button>
                    </div>
                ),
            },
        ],
        []
    );

    const tableInstance = useTable(
        {
            columns,
            data: paginatedStaff,
            manualPagination: true,
            manualSortBy: false,
            autoResetPage: false,
            autoResetSortBy: false,
            initialState: {
                sortBy: [
                    {
                        id: 'name',
                        desc: false,
                    },
                ],
            },
        },
        useGlobalFilter,
        useSortBy
    );

    const totalPages = Math.ceil(filteredStaff.length / pageSize);

    const paginationProps = {
        canPreviousPage: pageIndex > 0,
        canNextPage: pageIndex < totalPages - 1,
        pageCount: totalPages,
        pageIndex,
        gotoPage: handlePageChange,
        nextPage: () => handlePageChange(pageIndex + 1),
        previousPage: () => handlePageChange(pageIndex - 1),
    };

    return (
        <>
            <HtmlHead title={title} description={description} />

            <div className="page-title-container">
                <Row className="g-0 align-items-center">
                    <Col md="7" className="mb-2">
                        <h1 className="mb-2 pb-0 display-4">{title}</h1>
                        <BreadcrumbList items={breadcrumbs} />
                    </Col>
                    <Col md="5" className="d-flex align-items-start justify-content-end">
                        <Button
                            variant="primary"
                            onClick={() => history.push('/operations/staff-panel/add')}
                        >
                            <CsLineIcons icon="plus" className="me-2" />
                            Add New Staff
                        </Button>
                    </Col>
                </Row>
            </div>

            {/* Search and controls - Always visible */}
            <Row className="mb-3">
                <Col sm="12" md="5" lg="3" xxl="2">
                    <div className="d-flex gap-2">
                        <div className="d-inline-block float-md-start me-1 mb-1 mb-md-0 search-input-container w-100 shadow bg-foreground">
                            <ControlsSearch onSearch={handleSearch} />
                        </div>
                        <Button
                            variant={`${showFilters ? 'secondary' : 'outline-secondary'}`}
                            size="sm"
                            className="btn-icon btn-icon-only position-relative"
                            onClick={() => setShowFilters(!showFilters)}
                            title="Filters"
                        >
                            <CsLineIcons icon={`${showFilters ? 'close' : 'filter'}`} />
                            {getActiveFilterCount() > 0 && (
                                <Badge bg="primary" className="position-absolute top-0 start-100 translate-middle">
                                    {getActiveFilterCount()}
                                </Badge>
                            )}
                        </Button>
                    </div>
                </Col>
                <Col sm="12" md="7" lg="9" xxl="10" className="text-end">
                    <div className="d-inline-block me-2 text-muted">
                        {loading ? (
                            'Loading...'
                        ) : (
                            <>
                                Showing {filteredStaff.length > 0 ? pageIndex * pageSize + 1 : 0} to {Math.min((pageIndex + 1) * pageSize, filteredStaff.length)} of {filteredStaff.length} entries
                            </>
                        )}
                    </div>
                    <div className="d-inline-block">
                        <ControlsPageSize pageSize={pageSize} onPageSizeChange={handlePageSizeChange} />
                    </div>
                </Col>
            </Row>

            {/* Filter Section */}
            <Collapse in={showFilters}>
                <Card className="mb-3">
                    <Card.Body>
                        <div className="d-flex justify-content-between align-items-center">
                            <h5>Filters</h5>
                            {getActiveFilterCount() > 0 && (
                                <Button variant="outline-danger" size="sm" onClick={handleClearFilters}>
                                    <CsLineIcons icon="close" className="me-1" />
                                    Clear
                                </Button>
                            )}
                        </div>

                        <div className="mt-2">
                            <Row>
                                <Col md={4} className="mb-3">
                                    <Form.Label className="small text-muted fw-bold">Role</Form.Label>
                                    <Form.Select
                                        size="sm"
                                        value={filters.role}
                                        onChange={(e) => handleFilterChange('role', e.target.value)}
                                    >
                                        <option value="">All Roles</option>
                                        <option value="admin">Admin</option>
                                        <option value="manager">Manager</option>
                                        <option value="staff">Staff</option>
                                    </Form.Select>
                                </Col>

                                <Col md={4} className="mb-3">
                                    <Form.Label className="small text-muted fw-bold">Status</Form.Label>
                                    <Form.Select
                                        size="sm"
                                        value={filters.status}
                                        onChange={(e) => handleFilterChange('status', e.target.value)}
                                    >
                                        <option value="">All Status</option>
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </Form.Select>
                                </Col>
                            </Row>
                        </div>
                    </Card.Body>
                </Card>
            </Collapse>

            <Row>
                <Col>
                    <div className="mb-5">
                        <div>
                            {loading && staffList.length === 0 ? (
                                <div className="text-center py-5">
                                    <Spinner animation="border" variant="primary" />
                                    <p className="text-muted mt-2">Loading staff members...</p>
                                </div>
                            ) : filteredStaff.length === 0 ? (
                                <div className="text-center py-5">
                                    <div
                                        className="sw-13 sh-13 rounded-xl d-flex justify-content-center align-items-center mx-auto mb-4"
                                        style={{ backgroundColor: '#f5f5f5', width: '80px', height: '80px' }}
                                    >
                                        <CsLineIcons icon="user" size="50" className="text-muted" />
                                    </div>
                                    <h5 className="mb-2">
                                        {staffList.length === 0
                                            ? 'No Staff Members Yet'
                                            : 'No Results Found'}
                                    </h5>
                                    <p className="text-muted mb-4">
                                        {staffList.length === 0
                                            ? 'Get started by creating your first staff member'
                                            : 'Try adjusting your search or filters to find what you\'re looking for.'}
                                    </p>
                                    {staffList.length === 0 ? (
                                        <Button variant="primary" onClick={() => history.push('/operations/staff-panel/add')}>
                                            <CsLineIcons icon="plus" className="me-2" />
                                            Add First Staff Member
                                        </Button>
                                    ) : (
                                        <Button variant="outline-primary" onClick={handleClearFilters}>
                                            <CsLineIcons icon="rotate-ccw" className="me-2" />
                                            Clear Filters
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <div className="table-responsive">
                                        <Table className="react-table rows" tableInstance={tableInstance} />
                                    </div>
                                    <div className="mt-3">
                                        <TablePagination paginationProps={paginationProps} />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </Col>
            </Row>
        </>
    );
};

export default StaffManagement;