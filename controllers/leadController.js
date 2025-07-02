const Lead = require('../models/Lead');
const Employee = require('../models/Employee');
const CsvUpload = require('../models/CsvUpload');
const Activity = require('../models/Activity');
const csv = require('csv-parser');
const fs = require('fs');

//  Admin Leads 
exports.getAdminLeads = async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};

    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
          { status: { $regex: search, $options: 'i' } },
          { type: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const leads = await Lead.find(query)
      .populate('assignedEmployee', 'firstName lastName email')
      .sort({ createdAt: -1 });

    const stats = {
      totalLeads: leads.length,
      assignedLeads: leads.filter(lead => lead.assignedEmployee).length,
      unassignedLeads: leads.filter(lead => !lead.assignedEmployee).length
    };

    res.json({ leads, stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

//  Employee Leads 
exports.getEmployeeLeads = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { search, status } = req.query;

    const query = { assignedEmployee: employeeId };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { type: { $regex: search, $options: 'i' } }
      ];
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    const leads = await Lead.find(query).sort({ createdAt: -1 });

    res.json(leads);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

//  CSV Upload with Direct + Auto Distribution 
exports.uploadCSV = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const results = [];
    let assignedCount = 0;
    let unassignedCount = 0;

    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv({
          mapHeaders: ({ header }) => header.toLowerCase().replace(/\s+/g, '')
        }))
        .on('data', (data) => {
          const parsedDate = new Date(data.receiveddate);
          const receivedDate = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

          const languages = data.language
            ? data.language.split(',').map(l => l.trim())
            : [];

          const locations = data.location
            ? data.location.split(',').map(l => l.trim())
            : [];

          results.push({
            name: data.name?.trim() || '',
            email: data.email?.trim() || '',
            phone: data.phone?.trim() || '',
            receivedDate,
            status: data.status?.toLowerCase() || 'open',
            type: data.type?.toLowerCase() || 'warm',
            language: languages,
            location: locations,
            assignedEmployeeName: data.assignedemployee?.trim() || null
          });
        })
        .on('end', resolve)
        .on('error', reject);
    });

    if (results.length === 0) {
      throw new Error('No valid leads found in CSV');
    }

    const savedLeads = await Lead.insertMany(results);

    const employees = await Employee.find({ status: 'active' });

    if (employees.length === 0) {
      throw new Error('No active employees available for assignment');
    }

    for (const lead of savedLeads) {
      let assigned = false;

      //Direct assignment based on CSV name
      if (lead.assignedEmployeeName) {
        const nameParts = lead.assignedEmployeeName.trim().split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ');

        const employee = await Employee.findOne({
          firstName: new RegExp(`^${firstName}$`, 'i'),
          lastName: new RegExp(`^${lastName}$`, 'i'),
          status: 'active'
        });

        if (employee) {
          await Lead.findByIdAndUpdate(lead._id, {
            assignedEmployee: employee._id,
            assignedDate: new Date()
          });

          assignedCount++;
          assigned = true;
        } else {
          unassignedCount++;
        }
      } else {
        unassignedCount++;
      }

      //Auto distribution regardless
      if (!assigned) {
        let matchingEmployees = employees.filter(emp =>
          lead.language.some(l => emp.language.includes(l)) &&
          lead.location.some(loc => emp.location.includes(loc))
        );

        if (!matchingEmployees.length) {
          matchingEmployees = employees.filter(emp =>
            lead.language.some(l => emp.language.includes(l)) ||
            lead.location.some(loc => emp.location.includes(loc))
          );
        }

        if (!matchingEmployees.length) {
          matchingEmployees = employees;
        }

        const assignedEmployee = matchingEmployees[assignedCount % matchingEmployees.length];

        await Lead.findByIdAndUpdate(lead._id, {
          assignedEmployee: assignedEmployee._id,
          assignedDate: new Date()
        });

        assignedCount++;
      }
    }

    await CsvUpload.create({
      fileName: req.file.originalname,
      uploadDate: new Date(),
      totalLeads: savedLeads.length,
      assignedLeads: assignedCount,
      unassignedLeads: unassignedCount
    });

    fs.unlinkSync(req.file.path);

    res.status(201).json({
      success: true,
      message: `Uploaded ${savedLeads.length} leads. Assigned: ${assignedCount}, Unassigned: ${unassignedCount}`
    });

  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message });
  }
};

// ---------------- Lead CRUD ----------------------------
exports.addLead = async (req, res) => {
  try {
    const newLead = new Lead(req.body);
    await newLead.save();
    res.status(201).json(newLead);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateLead = async (req, res) => {
  try {
    const updated = await Lead.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteLead = async (req, res) => {
  try {
    await Lead.findByIdAndDelete(req.params.id);
    res.json({ message: 'Lead deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ---------------- Update Lead Status --------------------
exports.updateLeadStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, type, scheduledDate, scheduledEndTime } = req.body;

    const lead = await Lead.findById(id);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const updateData = {};

    if (status) {
      if (status === 'closed') {
        if (lead.scheduledDate && new Date(lead.scheduledDate) > new Date()) {
          return res.status(400).json({
            error: 'Cannot close a lead that is scheduled for the future.'
          });
        }
      }

      updateData.status = status;
      updateData.closedDate = status === 'closed' ? new Date() : null;
    }

    if (scheduledDate && scheduledEndTime) {
      const start = new Date(scheduledDate);
      const end = new Date(scheduledEndTime);

      const conflicts = await Lead.find({
        _id: { $ne: id },
        assignedEmployee: lead.assignedEmployee,
        scheduledDate: { $lte: end },
        scheduledEndTime: { $gte: start },
      });

      if (conflicts.length > 0) {
        return res.status(400).json({
          error: 'Schedule conflict: Another lead is already scheduled at this time.'
        });
      }

      updateData.scheduledDate = start;
      updateData.scheduledEndTime = end;
    }

    if (type) {
      updateData.type = type;
    }

    const updatedLead = await Lead.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (status && status !== lead.status) {
      await Activity.create({
        type: status === 'closed' ? 'closed' : 'updated',
        lead: lead._id,
        employee: lead.assignedEmployee,
        description: `Lead status changed to ${status}`,
      });
    }

    res.json(updatedLead);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ---------------- CSV Upload History --------------------
exports.getCsvUploads = async (req, res) => {
  try {
    const uploads = await CsvUpload.find().sort({ uploadDate: -1 });
    res.json(uploads);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ---------------- Bulk Assign ---------------------------
exports.bulkAssignLeads = async (req, res) => {
  try {
    const { leadIds, employeeId } = req.body;

    if (!leadIds?.length) {
      return res.status(400).json({ error: 'No leads selected for assignment' });
    }

    if (!employeeId) {
      return res.status(400).json({ error: 'No employee selected for assignment' });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const result = await Lead.updateMany(
      { _id: { $in: leadIds } },
      {
        $set: {
          assignedEmployee: employeeId,
          assignedDate: new Date()
        }
      }
    );

    res.json({
      message: `Successfully assigned ${result.modifiedCount} leads to ${employee.firstName} ${employee.lastName}`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ---------------- Distribute Unassigned Leads ---------------------------
exports.distributeUnassignedLeads = async (req, res) => {
  try {
    const unassignedLeads = await Lead.find({ assignedEmployee: null });

    if (!unassignedLeads.length) {
      return res.status(200).json({ message: 'No unassigned leads found.' });
    }

    const employees = await Employee.find({ status: 'active', isOnline: true });

    if (!employees.length) {
      return res.status(400).json({ message: 'No active employees available for assignment.' });
    }

    let assignedCount = 0;

    for (const lead of unassignedLeads) {
      let matchingEmployees = employees.filter(emp =>
        lead.language.some(l => emp.language.includes(l)) &&
        lead.location.some(loc => emp.location.includes(loc))
      );

      if (!matchingEmployees.length) {
        matchingEmployees = employees.filter(emp =>
          lead.language.some(l => emp.language.includes(l)) ||
          lead.location.some(loc => emp.location.includes(loc))
        );
      }

      if (!matchingEmployees.length) {
        matchingEmployees = employees;
      }

      const assignedEmployee = matchingEmployees[assignedCount % matchingEmployees.length];

      await Lead.findByIdAndUpdate(lead._id, {
        assignedEmployee: assignedEmployee._id,
        assignedDate: new Date()
      });

      assignedCount++;
    }

    res.status(200).json({
      message: `Successfully distributed ${assignedCount} leads.`
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
