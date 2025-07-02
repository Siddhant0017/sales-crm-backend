const express = require('express');
const router = express.Router();
const callController = require('../controllers/callController');

// Schedule a call (POST)
router.post('/', callController.scheduleCall);

// Get calls (GET - optional filters)
router.get('/', callController.getAllCalls);

// Update a call (PUT)
router.put('/:id', callController.updateCall);

// Delete a call (DELETE)
router.delete('/:id', callController.deleteCall);

// Get scheduled calls for a specific employee
// This must come BEFORE any other routes with :id parameter
router.get('/employee/:id', callController.getCallsByEmployee);
  
module.exports = router;
