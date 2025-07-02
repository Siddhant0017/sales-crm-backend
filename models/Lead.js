const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    validate: {
      validator: function (v) {
        return v || this.phone;
      },
      message: 'Either Email or Phone must be provided.'
    }
  },
  phone: {
    type: String,
    trim: true,
    validate: {
      validator: function (v) {
        return v || this.email;
      },
      message: 'Either Phone or Email must be provided.'
    }
  },
  receivedDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['open', 'closed', 'ongoing', 'pending'],
    default: 'open',
    required: true
  },
  type: {
    type: String,
    enum: ['hot', 'warm', 'cold'],
    default: 'warm',
    required: true
  },
  language: {
    type: [String],
    required: true,
    validate: {
      validator: function (v) {
        return Array.isArray(v) && v.length > 0;
      },
      message: 'At least one language is required.'
    }
  },
  location: {
    type: [String],
    required: true,
    validate: {
      validator: function (v) {
        return Array.isArray(v) && v.length > 0;
      },
      message: 'At least one location is required.'
    }
  },
  assignedEmployee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    default: null
  },
  assignedDate: {
    type: Date,
    default: null
  },
  scheduledDate: {
    type: Date,
    default: null
  },
  scheduledEndTime: {
    type: Date,
    default: null
  },
  closedDate: {
    type: Date,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('Lead', leadSchema);
