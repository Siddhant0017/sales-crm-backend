const express = require('express');
const router = express.Router();
const leadController = require('../controllers/leadController');
const multer = require('multer');

// Use in-memory storage instead of disk
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// Admin routes
router.get('/admin', leadController.getAdminLeads);
router.get('/csv-uploads', leadController.getCsvUploads);
router.post('/upload-csv', upload.single('file'), leadController.uploadCSV);

// Employee routes - these must come before general routes with :id
router.get('/employee/:employeeId', leadController.getEmployeeLeads);

// General routes
router.get('/', leadController.getAdminLeads);
router.put('/:id', leadController.updateLead);
router.delete('/:id', leadController.deleteLead);
router.post('/bulk-assign', leadController.bulkAssignLeads);
router.post('/distribute-unassigned', leadController.distributeUnassignedLeads);
router.put('/status/:id', leadController.updateLeadStatus);

module.exports = router;
