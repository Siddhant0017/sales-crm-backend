const Lead = require('../models/Lead');
const Employee = require('../models/Employee');
const Call = require('../models/Call');
const Activity = require('../models/Activity');
const Attendance = require('../models/Attendance');


// Employee Metrics
exports.getEmployeeMetrics = async (req, res) => {
  try {
    const employeeId = req.params.id;

    const total = await Lead.countDocuments({ assignedEmployee: employeeId });
    const open = await Lead.countDocuments({ assignedEmployee: employeeId, status: 'open' });
    const closed = await Lead.countDocuments({ assignedEmployee: employeeId, status: 'closed' });
    const scheduled = await Call.countDocuments({ employee: employeeId });

    res.json({ total, open, closed, scheduled });
  } catch (error) {
    console.error('Error in employee metrics:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};


//Employee Recent Activities
exports.getEmployeeActivities = async (req, res) => {
  try {
    const employeeId = req.params.id;

    const activities = await Activity.find({
      employee: employeeId,
      type: { $in: ['assigned', 'closed'] }
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('lead', 'name');

    const formatted = activities.map(act => ({
      type: act.type,
      leadName: act.lead?.name || 'Unnamed',
      createdAt: act.createdAt
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Error in employee activities:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};


// Admin Dashboard Metrics
exports.getDashboardMetrics = async (req, res) => {
  try {
    const leads = await Lead.find();
    const employees = await Employee.find({ status: 'active' });

    const unassignedLeads = leads.filter(lead => !lead.assignedEmployee).length;

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const assignedThisWeek = leads.filter(lead =>
      lead.assignedEmployee &&
      lead.assignedDate &&
      new Date(lead.assignedDate) >= oneWeekAgo
    ).length;
    const employeeLeadCounts = employees.map(emp => {
      const count = leads.filter(lead =>
        lead.assignedEmployee && lead.assignedEmployee.toString() === emp._id.toString()
      ).length;
      return count;
    });

    const activeSalespeople = employeeLeadCounts.filter(count => count > 0).length;

    const totalLeads = leads.length;
    const closedLeads = leads.filter(lead => lead.status === 'closed').length;
    const conversionRate = totalLeads > 0 ? Math.round((closedLeads / totalLeads) * 100) : 0;

    res.json({
      unassignedLeads,
      assignedThisWeek,
      activeSalespeople,
      conversionRate
    });
  } catch (error) {
    console.error('Error getting dashboard metrics:', error);
    res.status(500).json({ error: error.message });
  }
};


//Sales Analytics Chart (14-day sales trend)
exports.getSalesAnalytics = async (req, res) => {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 13); // 14 days including today

    const closedLeads = await Lead.find({
      status: 'closed',
      closedDate: { $gte: startDate, $lte: endDate }
    });

    const salesByDate = {};

    // Initialize dates in the range
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      salesByDate[dateStr] = 0;
    }

    closedLeads.forEach(lead => {
      const utc = new Date(lead.closedDate);
      const istOffset = 5.5 * 60 * 60 * 1000;
      const istDate = new Date(utc.getTime() + istOffset);
      const dateStr = istDate.toISOString().split('T')[0];
    
      salesByDate[dateStr] = (salesByDate[dateStr] || 0) + 1;
    });
    

    const result = Object.keys(salesByDate).map(date => ({
      date,
      totalSales: salesByDate[date]
    }));

    res.json(result);
  } catch (err) {
    console.error('Error getting sales analytics:', err);
    res.status(500).json({ error: err.message });
  }
};


// Getting Employee with Real-time Online Status (Attendance-based)
exports.getEmployeeWithOnlineStatus = async (req, res) => {
  try {
    const employees = await Employee.find();

    const employeesWithStats = await Promise.all(
      employees.map(async (emp) => {
        const assignedLeadsCount = await Lead.countDocuments({ assignedEmployee: emp._id });
        const closedLeadsCount = await Lead.countDocuments({ assignedEmployee: emp._id, status: 'closed' });

        return {
          ...emp._doc,
          assignedLeadsCount,
          closedLeadsCount,
          onlineStatus: emp.isOnline ? 'online' : 'offline',
        };
      })
    );

    res.json({ employees: employeesWithStats });
  } catch (error) {
    console.error('Error fetching employees with stats:', error);
    res.status(500).json({ error: error.message });
  }
};

