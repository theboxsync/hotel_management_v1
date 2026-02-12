import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Badge, Spinner, ButtonGroup } from 'react-bootstrap';
// import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { analyticsAPI } from 'services/api';
import { toast } from 'react-toastify';
import HtmlHead from 'components/html-head/HtmlHead';
import CsLineIcons from 'cs-line-icons/CsLineIcons';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const DashboardAnalytics = () => {
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('month'); // today, week, month
    const [analytics, setAnalytics] = useState(null);

    const title = 'Dashboard Analytics';
    const description = 'Hotel performance metrics and insights';

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const response = await analyticsAPI.getDashboard(period);
            setAnalytics(response.data.data);
        } catch (error) {
            console.error('Error fetching analytics:', error);
            toast.error('Failed to fetch analytics data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, [period]);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: process.env.REACT_APP_CURRENCY_CODE || 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const getGrowthBadge = (growth) => {
        const value = parseFloat(growth);
        if (value > 0) {
            return (
                <Badge bg="success" className="ms-2">
                    <CsLineIcons icon="arrow-top" size="12" className="me-1" />
                    {Math.abs(value).toFixed(1)}%
                </Badge>
            );
        } else if (value < 0) {
            return (
                <Badge bg="danger" className="ms-2">
                    <CsLineIcons icon="arrow-bottom" size="12" className="me-1" />
                    {Math.abs(value).toFixed(1)}%
                </Badge>
            );
        }
        return <Badge bg="secondary" className="ms-2">0%</Badge>;
    };

    if (loading) {
        return (
            <>
                <HtmlHead title={title} description={description} />
                <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-3">Loading analytics...</p>
                </div>
            </>
        );
    }

    if (!analytics) {
        return (
            <>
                <HtmlHead title={title} description={description} />
                <div className="text-center py-5">
                    <p>No analytics data available</p>
                </div>
            </>
        );
    }

    // Chart configurations
    const revenueTrendConfig = {
        labels: analytics.revenueAnalytics.trend.map(t => t.date || t.week || t.month),
        datasets: [
            {
                label: 'Daily Revenue',
                data: analytics.revenueAnalytics.trend.map(t => t.daily || 0),
                borderColor: '#0d6efd',
                backgroundColor: 'rgba(13, 110, 253, 0.1)',
                fill: true,
                tension: 0.4,
            },
            {
                label: 'Weekly Revenue',
                data: analytics.revenueAnalytics.trend.map(t => t.weekly || 0),
                borderColor: '#6f42c1',
                backgroundColor: 'rgba(111, 66, 193, 0.1)',
                fill: true,
                tension: 0.4,
            },
            {
                label: 'Monthly Revenue',
                data: analytics.revenueAnalytics.trend.map(t => t.monthly || 0),
                borderColor: '#20c997',
                backgroundColor: 'rgba(32, 201, 151, 0.1)',
                fill: true,
                tension: 0.4,
            },
        ],
    };

    const occupancyHistoricalConfig = {
        labels: analytics.occupancyRate.historical.map(h => h.month),
        datasets: [
            {
                label: 'Occupancy %',
                data: analytics.occupancyRate.historical.map(h => h.occupancy),
                backgroundColor: '#0d6efd',
                borderRadius: 8,
            },
        ],
    };

    const bookingsBySourceConfig = {
        labels: analytics.bookingStatistics.bySource.map(s => s.source),
        datasets: [
            {
                data: analytics.bookingStatistics.bySource.map(s => s.percentage),
                backgroundColor: ['#0d6efd', '#20c997', '#ffc107', '#dc3545', '#6c757d'],
            },
        ],
    };

    const revenueBySourceConfig = {
        labels: analytics.revenueAnalytics.bySource.map(s => s.source),
        datasets: [
            {
                label: 'Revenue',
                data: analytics.revenueAnalytics.bySource.map(s => s.revenue),
                backgroundColor: '#0d6efd',
                borderRadius: 8,
            },
        ],
    };

    return (
        <>
            <HtmlHead title={title} description={description} />
            <Row>
                <Col>
                    {/* Header */}
                    <div className="page-title-container mb-4">
                        <Row className="align-items-center">
                            <Col xs="12" md="7">
                                <h1 className="mb-0 pb-0 display-4">Dashboard Analytics</h1>
                            </Col>
                            <Col xs="12" md="5" className="text-end">
                                <ButtonGroup size="sm">
                                    <Button
                                        variant={period === 'today' ? 'primary' : 'outline-primary'}
                                        onClick={() => setPeriod('today')}
                                    >
                                        Today
                                    </Button>
                                    <Button
                                        variant={period === 'week' ? 'primary' : 'outline-primary'}
                                        onClick={() => setPeriod('week')}
                                    >
                                        This Week
                                    </Button>
                                    <Button
                                        variant={period === 'month' ? 'primary' : 'outline-primary'}
                                        onClick={() => setPeriod('month')}
                                    >
                                        This Month
                                    </Button>
                                </ButtonGroup>
                                <Button variant="outline-secondary" size="sm" className="ms-2">
                                    <CsLineIcons icon="download" className="me-1" />
                                    Export
                                </Button>
                            </Col>
                        </Row>
                    </div>

                    {/* Key Metrics */}
                    <Card className="mb-4">
                        <Card.Header>
                            <h5 className="mb-0">Key Metrics</h5>
                        </Card.Header>
                        <Card.Body>
                            <Row className="g-3">
                                <Col md={6} lg={4} xl={2}>
                                    <div className="border rounded p-3">
                                        <div className="d-flex justify-content-between align-items-start mb-2">
                                            <small className="text-muted">Total Revenue</small>
                                            <CsLineIcons icon="dollar" className="text-primary" size="18" />
                                        </div>
                                        <h4 className="mb-0">
                                            {formatCurrency(analytics.keyMetrics.totalRevenue.total)}
                                            {getGrowthBadge(analytics.keyMetrics.totalRevenue.growth)}
                                        </h4>
                                        <small className="text-muted">
                                            {formatCurrency(analytics.keyMetrics.totalRevenue.previous)} prev period
                                        </small>
                                    </div>
                                </Col>

                                <Col md={6} lg={4} xl={2}>
                                    <div className="border rounded p-3">
                                        <div className="d-flex justify-content-between align-items-start mb-2">
                                            <small className="text-muted">Occupancy</small>
                                            <CsLineIcons icon="home" className="text-success" size="18" />
                                        </div>
                                        <h4 className="mb-0">
                                            {analytics.keyMetrics.occupancyRate}%
                                            {getGrowthBadge(analytics.occupancyRate.trend)}
                                        </h4>
                                        <small className="text-muted">
                                            {analytics.occupancyRate.capacityPercentage}% of capacity
                                        </small>
                                    </div>
                                </Col>

                                <Col md={6} lg={4} xl={2}>
                                    <div className="border rounded p-3">
                                        <div className="d-flex justify-content-between align-items-start mb-2">
                                            <small className="text-muted">Total Bookings</small>
                                            <CsLineIcons icon="calendar" className="text-info" size="18" />
                                        </div>
                                        <h4 className="mb-0">
                                            {analytics.keyMetrics.totalBookings.total}
                                            {getGrowthBadge(analytics.keyMetrics.totalBookings.growth)}
                                        </h4>
                                        <small className="text-muted">
                                            {analytics.keyMetrics.totalBookings.previous} prev period
                                        </small>
                                    </div>
                                </Col>

                                <Col md={6} lg={4} xl={2}>
                                    <div className="border rounded p-3">
                                        <div className="d-flex justify-content-between align-items-start mb-2">
                                            <small className="text-muted">Staff Performance</small>
                                            <CsLineIcons icon="user" className="text-warning" size="18" />
                                        </div>
                                        <h4 className="mb-0">
                                            {analytics.keyMetrics.staffPerformance}%
                                            {getGrowthBadge(0.5)}
                                        </h4>
                                        <small className="text-muted">Average score</small>
                                    </div>
                                </Col>

                                <Col md={6} lg={4} xl={2}>
                                    <div className="border rounded p-3">
                                        <div className="d-flex justify-content-between align-items-start mb-2">
                                            <small className="text-muted">Customer Satisfaction</small>
                                            <CsLineIcons icon="star" className="text-warning" size="18" />
                                        </div>
                                        <h4 className="mb-0">
                                            {analytics.keyMetrics.customerSatisfaction.averageRating}/5
                                            <Badge bg="success" className="ms-2">
                                                <CsLineIcons icon="arrow-top" size="12" className="me-1" />
                                                Improved
                                            </Badge>
                                        </h4>
                                        <small className="text-muted">
                                            {analytics.customerSatisfaction.totalReviews} reviews
                                        </small>
                                    </div>
                                </Col>

                                <Col md={6} lg={4} xl={2}>
                                    <div className="border rounded p-3">
                                        <div className="d-flex justify-content-between align-items-start mb-2">
                                            <small className="text-muted">Channel Performance</small>
                                            <CsLineIcons icon="trending-up" className="text-primary" size="18" />
                                        </div>
                                        <h4 className="mb-0">
                                            {analytics.keyMetrics.channelPerformance}%
                                            {getGrowthBadge(0.3)}
                                        </h4>
                                        <small className="text-muted">Avg. performance</small>
                                    </div>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>

                    {/* Revenue Analytics */}
                    <Card className="mb-4">
                        <Card.Header>
                            <h5 className="mb-0">Revenue Analytics</h5>
                        </Card.Header>
                        <Card.Body>
                            <div className="mb-3">
                                <h6>Revenue Trend</h6>
                                <ButtonGroup size="sm">
                                    <Button variant="outline-primary" active>Daily</Button>
                                    <Button variant="outline-primary">Weekly</Button>
                                    <Button variant="outline-primary">Monthly</Button>
                                </ButtonGroup>
                            </div>
                            {/* <div style={{ height: '300px' }}>
                                <Line
                                    data={revenueTrendConfig}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: {
                                            legend: { display: true, position: 'bottom' },
                                        },
                                        scales: {
                                            y: { beginAtZero: true },
                                        },
                                    }}
                                />
                            </div> */}
                        </Card.Body>
                    </Card>

                    {/* Occupancy Rate */}
                    <Row className="mb-4">
                        <Col lg={6}>
                            <Card className="h-100">
                                <Card.Header>
                                    <h5 className="mb-0">Occupancy Rate</h5>
                                </Card.Header>
                                <Card.Body>
                                    <Row>
                                        <Col md={6}>
                                            <h6>Current Occupancy</h6>
                                            <div className="position-relative d-inline-block" style={{ width: '200px', height: '200px' }}>
                                                {/* <Doughnut
                                                    data={{
                                                        datasets: [{
                                                            data: [analytics.occupancyRate.current, 100 - analytics.occupancyRate.current],
                                                            backgroundColor: ['#0d6efd', '#e9ecef'],
                                                            borderWidth: 0,
                                                        }],
                                                    }}
                                                    options={{
                                                        responsive: true,
                                                        maintainAspectRatio: false,
                                                        cutout: '80%',
                                                        plugins: { legend: { display: false } },
                                                    }}
                                                /> */}
                                                <div className="position-absolute top-50 start-50 translate-middle text-center">
                                                    <h2 className="mb-0">{analytics.occupancyRate.current}%</h2>
                                                    <small className="text-muted">Occupied</small>
                                                </div>
                                            </div>
                                        </Col>
                                        <Col md={6}>
                                            <h6>Historical Occupancy</h6>
                                            {/* <div style={{ height: '200px' }}>
                                                <Bar
                                                    data={occupancyHistoricalConfig}
                                                    options={{
                                                        responsive: true,
                                                        maintainAspectRatio: false,
                                                        plugins: { legend: { display: false } },
                                                        scales: {
                                                            y: { beginAtZero: true, max: 100 },
                                                        },
                                                    }}
                                                />
                                            </div> */}
                                        </Col>
                                    </Row>
                                </Card.Body>
                            </Card>
                        </Col>

                        <Col lg={6}>
                            <Card className="h-100">
                                <Card.Header>
                                    <h5 className="mb-0">Booking Statistics</h5>
                                </Card.Header>
                                <Card.Body>
                                    <h6 className="mb-3">Bookings by Source</h6>
                                    <Row>
                                        <Col md={6}>
                                            <div style={{ height: '200px' }}>
                                                {/* <Doughnut
                                                    data={bookingsBySourceConfig}
                                                    options={{
                                                        responsive: true,
                                                        maintainAspectRatio: false,
                                                        plugins: {
                                                            legend: { display: false },
                                                        },
                                                    }}
                                                /> */}
                                            </div>
                                        </Col>
                                        <Col md={6}>
                                            <div className="d-flex flex-column gap-2">
                                                {analytics.bookingStatistics.bySource.map((source, idx) => (
                                                    <div key={idx} className="d-flex justify-content-between align-items-center p-2 border rounded">
                                                        <div className="d-flex align-items-center">
                                                            <div
                                                                style={{
                                                                    width: '12px',
                                                                    height: '12px',
                                                                    borderRadius: '50%',
                                                                    backgroundColor: ['#0d6efd', '#20c997', '#ffc107', '#dc3545', '#6c757d'][idx],
                                                                    marginRight: '8px',
                                                                }}
                                                            />
                                                            <small>{source.source}</small>
                                                        </div>
                                                        <Badge bg="primary">{source.percentage}%</Badge>
                                                    </div>
                                                ))}
                                            </div>
                                        </Col>
                                    </Row>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>

                    {/* Staff Performance & Customer Satisfaction */}
                    <Row className="mb-4">
                        <Col lg={8}>
                            <Card className="h-100">
                                <Card.Header>
                                    <h5 className="mb-0">Staff Performance</h5>
                                </Card.Header>
                                <Card.Body>
                                    <Row>
                                        <Col md={6}>
                                            <h6>Attendance Overview</h6>
                                            {analytics.staffPerformance.attendance.map((dept, idx) => (
                                                <div key={idx} className="mb-3">
                                                    <div className="d-flex justify-content-between mb-1">
                                                        <small>{dept.department}</small>
                                                        <small className="fw-bold">{dept.rate}%</small>
                                                    </div>
                                                    <div className="progress" style={{ height: '8px' }}>
                                                        <div
                                                            className="progress-bar bg-primary"
                                                            style={{ width: `${dept.rate}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </Col>
                                        <Col md={6}>
                                            <h6>Productivity Scores</h6>
                                            <div className="table-responsive">
                                                <table className="table table-sm">
                                                    <thead>
                                                        <tr>
                                                            <th>Staff</th>
                                                            <th>Role</th>
                                                            <th className="text-end">Score</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {analytics.staffPerformance.productivity.slice(0, 5).map((staff, idx) => (
                                                            <tr key={idx}>
                                                                <td><small>{staff.staff}</small></td>
                                                                <td><small>{staff.role}</small></td>
                                                                <td className="text-end">
                                                                    <Badge bg={staff.score >= 90 ? 'success' : 'warning'}>
                                                                        {staff.score}%
                                                                    </Badge>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </Col>
                                    </Row>
                                </Card.Body>
                            </Card>
                        </Col>

                        <Col lg={4}>
                            <Card className="h-100 bg-primary-light">
                                <Card.Header className="bg-primary text-white">
                                    <h6 className="mb-0">Top Performer</h6>
                                </Card.Header>
                                <Card.Body className="text-center">
                                    <div className="mb-3">
                                        <div
                                            className="rounded-circle bg-primary d-inline-flex align-items-center justify-content-center"
                                            style={{ width: '80px', height: '80px' }}
                                        >
                                            <CsLineIcons icon="user" className="text-white" size="40" />
                                        </div>
                                    </div>
                                    <h5 className="mb-1">{analytics.staffPerformance.topPerformer.staff}</h5>
                                    <small className="text-muted d-block mb-3">
                                        {analytics.staffPerformance.topPerformer.role}
                                    </small>
                                    <Badge bg="success" className="p-2 px-3">
                                        <CsLineIcons icon="star" size="14" className="me-1" />
                                        Elite Performer
                                    </Badge>
                                    <div className="mt-3">
                                        <small className="text-muted d-block">Performance Score</small>
                                        <h3 className="mb-0 text-primary">
                                            {analytics.staffPerformance.topPerformer.score}%
                                        </h3>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>

                    {/* Customer Satisfaction */}
                    <Card className="mb-4">
                        <Card.Header>
                            <h5 className="mb-0">Customer Satisfaction</h5>
                        </Card.Header>
                        <Card.Body>
                            <Row>
                                <Col md={4}>
                                    <div className="text-center p-4 border rounded">
                                        <h6>Average Rating & Trend</h6>
                                        <h1 className="display-3 mb-0">
                                            {analytics.customerSatisfaction.averageRating}
                                            <small className="text-muted">/5</small>
                                        </h1>
                                        <Badge bg="success" className="mt-2">
                                            <CsLineIcons icon="arrow-top" size="12" className="me-1" />
                                            Improved
                                        </Badge>
                                    </div>
                                </Col>
                                <Col md={8}>
                                    <h6>Recent Feedback</h6>
                                    {analytics.customerSatisfaction.recentFeedback.map((feedback, idx) => (
                                        <Card key={idx} className="mb-2 border-0 bg-light">
                                            <Card.Body className="p-3">
                                                <div className="d-flex justify-content-between align-items-start mb-2">
                                                    <div className="d-flex">
                                                        {[...Array(5)].map((_, i) => (
                                                            <CsLineIcons
                                                                key={i}
                                                                icon="star"
                                                                className={i < Math.floor(feedback.rating) ? 'text-warning' : 'text-muted'}
                                                                size="14"
                                                            />
                                                        ))}
                                                        <small className="ms-2 fw-bold">{feedback.rating}/5</small>
                                                    </div>
                                                    <small className="text-muted">{feedback.guest}</small>
                                                </div>
                                                <small className="text-muted">{feedback.feedback}</small>
                                            </Card.Body>
                                        </Card>
                                    ))}
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>

                    {/* Channel Performance */}
                    <Card>
                        <Card.Header>
                            <h5 className="mb-0">Channel Performance Comparison</h5>
                        </Card.Header>
                        <Card.Body>
                            <h6 className="mb-3">Revenue by Booking Platform</h6>
                            {/* <div style={{ height: '300px' }}>
                                <Bar
                                    data={revenueBySourceConfig}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: {
                                            legend: { display: false },
                                        },
                                        scales: {
                                            y: { beginAtZero: true },
                                        },
                                    }}
                                />
                            </div> */}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </>
    );
};

export default DashboardAnalytics;