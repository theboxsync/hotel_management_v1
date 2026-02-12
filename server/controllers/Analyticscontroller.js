const Booking = require("../models/Booking");
const Room = require("../models/Room");
const Staff = require("../models/Staff");
const PaymentTransaction = require("../models/PaymentTransaction");
const Inventory = require("../models/Inventory");

/**
 * @desc    Get dashboard analytics
 * @route   GET /api/analytics/dashboard
 * @access  Private
 */
const getDashboardAnalytics = async (req, res) => {
    try {
        const { period = 'month' } = req.query; // today, week, month, custom
        const hotelId = req.user.hotel_id;

        // Calculate date range based on period
        const now = new Date();
        let startDate, endDate;

        switch (period) {
            case 'today':
                startDate = new Date(now.setHours(0, 0, 0, 0));
                endDate = new Date(now.setHours(23, 59, 59, 999));
                break;
            case 'week':
                startDate = new Date(now.setDate(now.getDate() - 7));
                endDate = new Date();
                break;
            case 'month':
                startDate = new Date(now.setMonth(now.getMonth() - 1));
                endDate = new Date();
                break;
            default:
                startDate = new Date(now.setMonth(now.getMonth() - 1));
                endDate = new Date();
        }

        // Parallel queries for better performance
        const [
            totalRevenue,
            totalBookings,
            occupancyData,
            staffPerformance,
            bookingsBySource,
            revenueBySource,
            paymentStats,
            customerSatisfaction,
        ] = await Promise.all([
            calculateTotalRevenue(hotelId, startDate, endDate),
            calculateTotalBookings(hotelId, startDate, endDate),
            calculateOccupancyRate(hotelId),
            calculateStaffPerformance(hotelId),
            getBookingsBySource(hotelId, startDate, endDate),
            getRevenueBySource(hotelId, startDate, endDate),
            getPaymentStatistics(hotelId, startDate, endDate),
            getCustomerSatisfaction(hotelId, startDate, endDate),
        ]);

        res.status(200).json({
            success: true,
            data: {
                period,
                dateRange: { startDate, endDate },
                keyMetrics: {
                    totalRevenue,
                    totalBookings,
                    occupancyRate: occupancyData.currentOccupancy,
                    staffPerformance: staffPerformance.averageScore,
                    customerSatisfaction: customerSatisfaction.averageRating,
                    channelPerformance: calculateChannelPerformance(revenueBySource),
                },
                revenueAnalytics: {
                    trend: await getRevenueTrend(hotelId, startDate, endDate),
                    bySource: revenueBySource,
                    totalRevenue: totalRevenue.total,
                    growth: totalRevenue.growth,
                },
                occupancyRate: {
                    current: occupancyData.currentOccupancy,
                    historical: occupancyData.historical,
                    trend: occupancyData.trend,
                },
                bookingStatistics: {
                    total: totalBookings.total,
                    bySource: bookingsBySource,
                    growth: totalBookings.growth,
                },
                staffPerformance: {
                    attendance: staffPerformance.attendance,
                    productivity: staffPerformance.productivity,
                    topPerformer: staffPerformance.topPerformer,
                },
                paymentStatistics: paymentStats,
                customerSatisfaction,
            },
        });
    } catch (error) {
        console.error("Dashboard analytics error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch dashboard analytics",
            error: error.message,
        });
    }
};

// Helper Functions

async function calculateTotalRevenue(hotelId, startDate, endDate) {
    const currentPeriod = await PaymentTransaction.aggregate([
        {
            $match: {
                hotel_id: hotelId,
                payment_status: "success",
                payment_date: { $gte: startDate, $lte: endDate },
            },
        },
        {
            $group: {
                _id: null,
                total: { $sum: "$amount" },
            },
        },
    ]);

    // Previous period for growth calculation
    const periodLength = endDate - startDate;
    const prevStartDate = new Date(startDate.getTime() - periodLength);
    const prevEndDate = startDate;

    const previousPeriod = await PaymentTransaction.aggregate([
        {
            $match: {
                hotel_id: hotelId,
                payment_status: "success",
                payment_date: { $gte: prevStartDate, $lt: prevEndDate },
            },
        },
        {
            $group: {
                _id: null,
                total: { $sum: "$amount" },
            },
        },
    ]);

    const current = currentPeriod[0]?.total || 0;
    const previous = previousPeriod[0]?.total || 0;
    const growth = previous > 0 ? ((current - previous) / previous) * 100 : 0;

    return { total: current, previous, growth: growth.toFixed(2) };
}

async function calculateTotalBookings(hotelId, startDate, endDate) {
    const current = await Booking.countDocuments({
        hotel_id: hotelId,
        created_at: { $gte: startDate, $lte: endDate },
        booking_status: { $ne: "cancelled" },
    });

    const periodLength = endDate - startDate;
    const prevStartDate = new Date(startDate.getTime() - periodLength);
    const previous = await Booking.countDocuments({
        hotel_id: hotelId,
        created_at: { $gte: prevStartDate, $lt: startDate },
        booking_status: { $ne: "cancelled" },
    });

    const growth = previous > 0 ? ((current - previous) / previous) * 100 : 0;

    return { total: current, previous, growth: growth.toFixed(2) };
}

async function calculateOccupancyRate(hotelId) {
    const totalRooms = await Room.countDocuments({ hotel_id: hotelId });
    const occupiedRooms = await Room.countDocuments({
        hotel_id: hotelId,
        status: "occupied",
    });

    const currentOccupancy = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;

    // Historical occupancy (last 6 months)
    const months = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

        const monthBookings = await Booking.aggregate([
            {
                $match: {
                    hotel_id: hotelId,
                    booking_status: { $in: ["checked_in", "checked_out"] },
                    check_in_date: { $lte: nextMonth },
                    check_out_date: { $gte: date },
                },
            },
            {
                $group: {
                    _id: null,
                    totalRoomNights: { $sum: "$total_rooms" },
                },
            },
        ]);

        const daysInMonth = nextMonth.getDate();
        const availableRoomNights = totalRooms * daysInMonth;
        const occupancyRate = availableRoomNights > 0
            ? ((monthBookings[0]?.totalRoomNights || 0) / availableRoomNights) * 100
            : 0;

        months.push({
            month: date.toLocaleString('default', { month: 'short' }),
            occupancy: Math.round(occupancyRate),
        });
    }

    return {
        currentOccupancy: Math.round(currentOccupancy),
        capacityPercentage: Math.round((occupiedRooms / totalRooms) * 100),
        historical: months,
        trend: months.length > 1 ? months[months.length - 1].occupancy - months[months.length - 2].occupancy : 0,
    };
}

async function calculateStaffPerformance(hotelId) {
    const staff = await Staff.find({ user_id: hotelId });

    // Calculate attendance
    const attendanceByDepartment = {};
    const productivityScores = [];

    staff.forEach((member) => {
        const position = member.position || 'Other';

        if (!attendanceByDepartment[position]) {
            attendanceByDepartment[position] = { total: 0, present: 0 };
        }

        // Calculate attendance from last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentAttendance = member.attandance?.filter(
            a => new Date(a.date) >= thirtyDaysAgo
        ) || [];

        const presentDays = recentAttendance.filter(a => a.status === 'present').length;

        attendanceByDepartment[position].total += recentAttendance.length;
        attendanceByDepartment[position].present += presentDays;

        // Calculate productivity score (based on attendance)
        const attendanceRate = recentAttendance.length > 0
            ? (presentDays / recentAttendance.length) * 100
            : 0;

        productivityScores.push({
            staff: `${member.f_name} ${member.l_name}`,
            role: position,
            score: Math.round(attendanceRate),
        });
    });

    // Format attendance overview
    const attendance = Object.entries(attendanceByDepartment).map(([dept, data]) => ({
        department: dept,
        rate: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0,
    }));

    // Top performer
    const topPerformer = productivityScores.reduce((max, curr) =>
        curr.score > max.score ? curr : max,
        productivityScores[0] || { staff: 'N/A', role: 'N/A', score: 0 }
    );

    // Average performance score
    const averageScore = productivityScores.length > 0
        ? Math.round(productivityScores.reduce((sum, s) => sum + s.score, 0) / productivityScores.length)
        : 0;

    return {
        attendance,
        productivity: productivityScores.sort((a, b) => b.score - a.score).slice(0, 5),
        topPerformer,
        averageScore,
    };
}

async function getBookingsBySource(hotelId, startDate, endDate) {
    const bookings = await Booking.aggregate([
        {
            $match: {
                hotel_id: hotelId,
                created_at: { $gte: startDate, $lte: endDate },
                booking_status: { $ne: "cancelled" },
            },
        },
        {
            $group: {
                _id: "$booking_source",
                count: { $sum: 1 },
            },
        },
    ]);

    const total = bookings.reduce((sum, b) => sum + b.count, 0);

    return bookings.map(b => ({
        source: b._id,
        count: b.count,
        percentage: total > 0 ? Math.round((b.count / total) * 100) : 0,
    }));
}

async function getRevenueBySource(hotelId, startDate, endDate) {
    const revenue = await Booking.aggregate([
        {
            $match: {
                hotel_id: hotelId,
                created_at: { $gte: startDate, $lte: endDate },
                booking_status: { $in: ["checked_in", "checked_out"] },
            },
        },
        {
            $group: {
                _id: "$booking_source",
                revenue: { $sum: "$total_amount" },
            },
        },
        {
            $sort: { revenue: -1 },
        },
    ]);

    return revenue.map(r => ({
        source: r._id,
        revenue: r.revenue,
    }));
}

async function getRevenueTrend(hotelId, startDate, endDate) {
    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

    if (days <= 31) {
        // Daily data
        return await getDailyRevenue(hotelId, startDate, endDate);
    } else if (days <= 90) {
        // Weekly data
        return await getWeeklyRevenue(hotelId, startDate, endDate);
    } else {
        // Monthly data
        return await getMonthlyRevenue(hotelId, startDate, endDate);
    }
}

async function getDailyRevenue(hotelId, startDate, endDate) {
    const revenue = await PaymentTransaction.aggregate([
        {
            $match: {
                hotel_id: hotelId,
                payment_status: "success",
                payment_date: { $gte: startDate, $lte: endDate },
            },
        },
        {
            $group: {
                _id: {
                    $dateToString: { format: "%Y-%m-%d", date: "$payment_date" },
                },
                daily: { $sum: "$amount" },
            },
        },
        {
            $sort: { _id: 1 },
        },
    ]);

    return revenue.map(r => ({
        date: r._id,
        daily: r.daily,
    }));
}

async function getWeeklyRevenue(hotelId, startDate, endDate) {
    const revenue = await PaymentTransaction.aggregate([
        {
            $match: {
                hotel_id: hotelId,
                payment_status: "success",
                payment_date: { $gte: startDate, $lte: endDate },
            },
        },
        {
            $group: {
                _id: {
                    week: { $isoWeek: "$payment_date" },
                    year: { $isoWeekYear: "$payment_date" },
                },
                weekly: { $sum: "$amount" },
            },
        },
        {
            $sort: { "_id.year": 1, "_id.week": 1 },
        },
    ]);

    return revenue.map(r => ({
        week: `Week ${r._id.week}`,
        weekly: r.weekly,
    }));
}

async function getMonthlyRevenue(hotelId, startDate, endDate) {
    const revenue = await PaymentTransaction.aggregate([
        {
            $match: {
                hotel_id: hotelId,
                payment_status: "success",
                payment_date: { $gte: startDate, $lte: endDate },
            },
        },
        {
            $group: {
                _id: {
                    month: { $month: "$payment_date" },
                    year: { $year: "$payment_date" },
                },
                monthly: { $sum: "$amount" },
            },
        },
        {
            $sort: { "_id.year": 1, "_id.month": 1 },
        },
    ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return revenue.map(r => ({
        month: monthNames[r._id.month - 1],
        monthly: r.monthly,
    }));
}

async function getPaymentStatistics(hotelId, startDate, endDate) {
    const stats = await PaymentTransaction.aggregate([
        {
            $match: {
                hotel_id: hotelId,
                payment_date: { $gte: startDate, $lte: endDate },
            },
        },
        {
            $group: {
                _id: "$payment_method",
                count: { $sum: 1 },
                amount: { $sum: "$amount" },
            },
        },
    ]);

    const statusStats = await PaymentTransaction.aggregate([
        {
            $match: {
                hotel_id: hotelId,
                payment_date: { $gte: startDate, $lte: endDate },
            },
        },
        {
            $group: {
                _id: "$payment_status",
                count: { $sum: 1 },
                amount: { $sum: "$amount" },
            },
        },
    ]);

    return {
        byMethod: stats,
        byStatus: statusStats,
    };
}

async function getCustomerSatisfaction(hotelId, startDate, endDate) {
    // Mock data - Replace with actual review/rating system when available
    const mockRatings = [
        { rating: 5, feedback: 'Excellent service, very clean rooms!', guest: 'Guest A', date: new Date() },
        { rating: 4, feedback: 'Good stay, but check-in was a bit slow', guest: 'Guest B', date: new Date() },
        { rating: 4.5, feedback: 'Friendly staff and great location', guest: 'Guest C', date: new Date() },
    ];

    const averageRating = mockRatings.reduce((sum, r) => sum + r.rating, 0) / mockRatings.length;

    return {
        averageRating: averageRating.toFixed(1),
        totalReviews: mockRatings.length,
        recentFeedback: mockRatings,
        trend: 'improved', // 'improved', 'declined', 'stable'
    };
}

function calculateChannelPerformance(revenueBySource) {
    if (!revenueBySource || revenueBySource.length === 0) return 0;

    const totalRevenue = revenueBySource.reduce((sum, s) => sum + s.revenue, 0);
    const avgRevenuePerChannel = totalRevenue / revenueBySource.length;

    // Performance score based on distribution
    const score = Math.min(100, Math.round((avgRevenuePerChannel / totalRevenue) * 100 * revenueBySource.length));

    return score;
}

module.exports = {
    getDashboardAnalytics,
};