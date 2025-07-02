const mongoose = require('mongoose');
const crypto = require('crypto');

const EmployeeSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  activeTabCount: {
    type: Number,
    default: 0,
  },
  
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  employeeId: {
    type: String,
    unique: true
  },
  location: {
    type: [String], //Changed from String to Array of String
    required: true,
    validate: {
      validator: function (v) {
        return v && v.length > 0;
      },
      message: 'At least one location is required'
    }
  },
  language: {
    type: [String], //Changed from String to Array of String
    required: true,
    validate: {
      validator: function (v) {
        return v && v.length > 0;
      },
      message: 'At least one language is required'
    }
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Generate unique employee ID before saving
EmployeeSchema.pre('save', async function (next) {
  if (!this.employeeId) {
    const randomId = crypto.randomBytes(3).toString('hex').toUpperCase();
    this.employeeId = `EMP-${randomId}`;
  }
  next();
});

module.exports = mongoose.model('Employee', EmployeeSchema);
