const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');

// Get employees with stats
router.get('/with-stats', employeeController.getEmployeesWithStats);

// Add new employee
router.post('/', employeeController.createEmployee);


// For Admin Dashboard Employee Summar
router.get('/summary/all', employeeController.getAllEmployeesWithStats);

// Get all employees
router.get('/', employeeController.getAllEmployees);

// Get employee by ID
router.get('/:id', employeeController.getEmployeeById);

// Update employee
router.put('/:id', employeeController.updateEmployee);

// Delete employee
router.delete('/:id', employeeController.deleteEmployee);

module.exports = router;
