const express = require('express');
const router = express.Router();
const { loginEmployee, updateProfile } = require('../controllers/employeeLoginController');

// Login
router.post('/login', loginEmployee);

// Update own profile (for employee)
router.put('/update/:id', updateProfile);

module.exports = router;
