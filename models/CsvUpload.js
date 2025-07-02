const mongoose = require('mongoose');

const csvUploadSchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: true
  },
  uploadDate: {
    type: Date,
    required: true
  },
  totalLeads: {
    type: Number,
    required: true
  },
  assignedLeads: {
    type: Number,
    required: true
  },
  unassignedLeads: {
    type: Number,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('CsvUpload', csvUploadSchema);