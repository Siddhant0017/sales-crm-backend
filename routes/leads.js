const express = require('express');
const router = express.Router();
const leadController = require('../controllers/leadController');
const multer = require('multer');
const path = require('path');

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, `CSV${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv') {
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

// Status update route - this should be a specific path, not a parameter route
router.put('/status/:id', leadController.updateLeadStatus);

module.exports = router;
