const Call = require('../models/Call');

// Schedule a call
exports.scheduleCall = async (req, res) => {
  try {
    const newCall = new Call(req.body);
    await newCall.save();
    res.status(201).json(newCall);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all calls (admin or filtered)
exports.getAllCalls = async (req, res) => {
  try {
    const filter = {};
    if (req.query.employeeId) filter.employee = req.query.employeeId;
    if (req.query.leadId) filter.lead = req.query.leadId;
    if (req.query.status) filter.status = req.query.status;

    const calls = await Call.find(filter).populate('lead').populate('employee');
    res.json(calls);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update a scheduled call
exports.updateCall = async (req, res) => {
  try {
    const call = await Call.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!call) return res.status(404).json({ message: 'Call not found' });
    res.json(call);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete a call
exports.deleteCall = async (req, res) => {
  try {
    const deleted = await Call.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Call not found' });
    res.json({ message: 'Call deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
exports.getCallsByEmployee = async (req, res) => {
  try {
    const employeeId = req.params.id;

    const calls = await Call.find({ employee: employeeId })
      .populate('lead', 'name email phone') 
      .sort({ scheduledTime: 1 }); 

    res.json(calls);
  } catch (err) {
    console.error('Error fetching calls by employee:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};
