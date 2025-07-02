const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');


router.post('/check-in', attendanceController.checkIn);

router.post('/check-out', attendanceController.checkOut);

router.get('/log/:employeeId', attendanceController.getAttendanceLog);

router.post('/start-break', attendanceController.startBreak);
router.post('/end-break', attendanceController.endBreak);
//Tab-Based Break Handling
router.post('/tab-open', attendanceController.handleTabOpen);
router.post('/tab-close', attendanceController.handleTabClose);
router.post('/heartbeat', attendanceController.heartbeat);


module.exports = router;
