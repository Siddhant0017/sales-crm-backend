const router = require('express').Router();
const activityController = require('../controllers/activityController');

// Get recent activities
router.get('/', activityController.getActivities);

// Add a new activity
router.post('/', activityController.addActivity);

// Employee-specific activities
router.get('/employee/:employeeId', activityController.getEmployeeActivities);

module.exports = router;
