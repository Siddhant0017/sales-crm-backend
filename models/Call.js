const mongoose = require('mongoose');

const CallSchema = new mongoose.Schema({
  lead: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  scheduledTime: {
    type: Date,
    required: true
  },
  callType: {
    type: String,
    enum: ['cold', 'follow_up', 'referral', 'demo', 'other'],
    default: 'follow_up'
  },
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'missed', 'rescheduled'],
    default: 'scheduled'
  },
  notes: {
    type: String
  },
  duration: {
    type: Number // in minutes
  },
  outcome: {
    type: String,
    enum: ['interested', 'not_interested', 'call_back', 'closed_deal', 'no_answer'],
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Call', CallSchema);