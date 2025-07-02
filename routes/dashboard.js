const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

//Admin Dashboard Metrics (4 cards)
router.get('/metrics', dashboardController.getDashboardMetrics);

// Sales Analytics Chart (14 days)
router.get('/sales', dashboardController.getSalesAnalytics);

// Employee Metrics (total leads, open, closed, scheduled)
router.get('/employee/:id/metrics', dashboardController.getEmployeeMetrics);

// Employee Recent Activity Feed
router.get('/employee/:id/activities', dashboardController.getEmployeeActivities);
router.get('/employees-status', dashboardController.getEmployeeWithOnlineStatus);

module.exports = router;
