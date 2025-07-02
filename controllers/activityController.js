const Activity = require('../models/Activity');
const Employee = require('../models/Employee');
const Lead = require('../models/Lead');

const getTimeAgo = (date) => {
  if (!date || isNaN(new Date(date))) {
    return 'Unknown time';
  }

  const now = new Date();
  const diff = Math.floor((now - new Date(date)) / 1000);

  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
    second: 1,
  };

  for (let key in intervals) {
    const interval = Math.floor(diff / intervals[key]);
    if (interval >= 1) {
      return `${interval} ${key}${interval > 1 ? 's' : ''} ago`;
    }
  }
  return 'just now';
};

exports.addActivity = async (req, res) => {
  try {
    const { type, lead, employee } = req.body;

    if (!type || !lead || !employee) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const activity = new Activity({
      type,
      lead,
      employee
    });

    await activity.save();

    res.status(201).json({ message: 'Activity logged successfully', activity });
  } catch (err) {
    console.error('Error adding activity:', err);
    res.status(500).json({ error: err.message });
  }
};
exports.getActivities = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const activities = await Activity.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('employee', 'firstName lastName')
      .populate('lead', 'name');

    const formatted = activities.map(act => {
      let message = '';

      if (act.type === 'assigned') {
        message = `You assigned a lead to ${act.employee?.firstName || 'Unknown'}`;
      } 
      else if (act.type === 'closed') {
        message = `${act.employee?.firstName || 'Someone'} closed a deal`;
      } 
      else if (act.type === 'added') {
        message = `You added a lead ${act.lead?.name || 'Unnamed'}`;
      }

      return {
        message,
        timeAgo: getTimeAgo(act.createdAt)
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error('Error fetching activities:', err);
    res.status(500).json({ error: err.message });
  }
};
exports.getEmployeeActivities = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    const activities = await Activity.find({ employee: employeeId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('lead', 'name');

    const formatted = activities.map((act) => {
      let message = '';

      if (act.type === 'assigned') {
        message = `You were assigned a lead`;
      } else if (act.type === 'closed') {
        message = `You closed a deal`;
      } else if (act.type === 'added') {
        message = `You added lead ${act.lead?.name || 'Unnamed'}`;
      }

      return {
        message,
        time: getTimeAgo(act.createdAt),
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error('Error fetching employee activities:', err);
    res.status(500).json({ error: err.message });
  }
};

