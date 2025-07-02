const Employee = require('../models/Employee');
const Lead = require('../models/Lead');

//Create Employee
exports.createEmployee = async (req, res) => {
  try {
    const { firstName, lastName, email, location, language } = req.body;

    //Check if employee already exists
    const employeeExists = await Employee.findOne({ email });
    if (employeeExists) {
      return res.status(400).json({ message: 'Employee with this email already exists' });
    }

    //reate the new employee
    const newEmployee = await Employee.create({
      firstName,
      lastName,
      email,
      location,
      language,
      status: 'active'
    });

    // Finding the all active employees matching location or language
    const matchingEmployees = await Employee.find({
      status: 'active',
      $or: [
        { location: location },
        { language: language }
      ]
    });

    if (matchingEmployees.length === 0) {
      return res.status(200).json({
        message: 'Employee created but no matching employees found for assignment.',
        employee: newEmployee
      });
    }

    //Find all unassigned leads matching location or language
    const unassignedLeads = await Lead.find({
      assignedEmployee: null,
      $or: [
        { location: { $in: [location] } },
        { language: { $in: [language] } }
      ]
    });

    let assignedCount = 0;

    if (unassignedLeads.length > 0) {
      // Distribute leads using round-robin
      let index = 0;

      for (const lead of unassignedLeads) {
        const assignedEmployee = matchingEmployees[index % matchingEmployees.length];

        await Lead.findByIdAndUpdate(lead._id, {
          assignedEmployee: assignedEmployee._id,
          assignedDate: new Date()
        });

        index++;
        assignedCount++;
      }
    }

    res.status(201).json({
      message: `Employee created successfully. ${assignedCount} leads assigned among ${matchingEmployees.length} matching employees.`,
      employee: newEmployee
    });

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};



//Get All Employees (Simple Without Stats)
exports.getAllEmployees = async (req, res) => {
  try {
    const employees = await Employee.find();
    res.json(employees);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get Single Employee by ID
exports.getEmployeeById = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    res.json(employee);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update Employee
exports.updateEmployee = async (req, res) => {
  try {
    const employee = await Employee.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    res.json(employee);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

//Deleting Employee with Reassignment Logic
exports.deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    // Finding d the employee to delete
    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Findig all open/ongoing/pending leads assigned to this employee
    const leadsToReassign = await Lead.find({
      assignedEmployee: id,
      status: { $in: ['open', 'ongoing', 'pending'] }
    });

    // Finding all other active employees (excluding this one)
    const otherEmployees = await Employee.find({
      _id: { $ne: id },
      status: 'active'
    });

    if (otherEmployees.length === 0) {
      return res.status(400).json({ message: 'No other active employees available for reassignment' });
    }

    // Reassignment using equal distribution (round robin)
    let index = 0;
    for (const lead of leadsToReassign) {
      const newEmployee = otherEmployees[index % otherEmployees.length];

      await Lead.findByIdAndUpdate(lead._id, {
        assignedEmployee: newEmployee._id,
        assignedDate: new Date()
      });

      index++;
    }

    //Delete the employee
    await Employee.findByIdAndDelete(id);

    res.json({
      message: `Employee ${employee.firstName} ${employee.lastName} deleted successfully. ${leadsToReassign.length} leads reassigned to other employees.`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Getting the  Employees with Lead Stats (Main for Dashboard and Employee Page)
exports.getEmployeesWithStats = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = 'firstName',
      sortDirection = 'asc',
      search = ''
    } = req.query;

    // Search Filter
    const query = search
      ? {
          $or: [
            { firstName: { $regex: search, $options: 'i' } },
            { lastName: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { employeeId: { $regex: search, $options: 'i' } }
          ]
        }
      : {};

    //Sort
    const sort = {};
    sort[sortBy] = sortDirection === 'asc' ? 1 : -1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Fetch Employees
    const employees = await Employee.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const totalCount = await Employee.countDocuments(query);
    const employeeIds = employees.map(emp => emp._id);

    //Get Assigned Leads Count
    const assignedLeadsCounts = await Lead.aggregate([
      { $match: { assignedEmployee: { $in: employeeIds } } },
      { $group: { _id: '$assignedEmployee', count: { $sum: 1 } } }
    ]);

    // Get Closed Leads Count
    const closedLeadsCounts = await Lead.aggregate([
      { $match: { assignedEmployee: { $in: employeeIds }, status: 'closed' } },
      { $group: { _id: '$assignedEmployee', count: { $sum: 1 } } }
    ]);

    //Attach Counts to Each Employee
    employees.forEach(emp => {
      const assigned = assignedLeadsCounts.find(item => item._id?.toString() === emp._id?.toString());
      const closed = closedLeadsCounts.find(item => item._id?.toString() === emp._id?.toString());

      emp.assignedLeadsCount = assigned ? assigned.count : 0;
      emp.closedLeadsCount = closed ? closed.count : 0;
      emp.conversionRate = emp.assignedLeadsCount > 0 
        ? `${((emp.closedLeadsCount / emp.assignedLeadsCount) * 100).toFixed(2)}%`
        : '0%';
    });

    res.json({
      employees,
      totalCount,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalCount / parseInt(limit))
    });

  } catch (error) {
    console.error('Error fetching employees with stats:', error);
    res.status(500).json({ error: error.message });
  }
};
//Getting All Employees with Stats (For Admin Dashboard)
exports.getAllEmployeesWithStats = async (req, res) => {
  try {
    const employees = await Employee.find().lean();

    const employeeIds = employees.map(emp => emp._id);

    const assignedLeadsCounts = await Lead.aggregate([
      { $match: { assignedEmployee: { $in: employeeIds } } },
      { $group: { _id: '$assignedEmployee', count: { $sum: 1 } } }
    ]);

    const closedLeadsCounts = await Lead.aggregate([
      { $match: { assignedEmployee: { $in: employeeIds }, status: 'closed' } },
      { $group: { _id: '$assignedEmployee', count: { $sum: 1 } } }
    ]);

    const result = employees.map(emp => {
      const assigned = assignedLeadsCounts.find(item => item._id?.toString() === emp._id?.toString());
      const closed = closedLeadsCounts.find(item => item._id?.toString() === emp._id?.toString());

      return {
        id: emp._id,
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        location: emp.location,
        preferredLanguage: emp.preferredLanguage,
        employeeId: emp.employeeId,
        status: emp.status,
        assignedLeads: assigned ? assigned.count : 0,
        closedLeads: closed ? closed.count : 0,
        conversionRate: (assigned && assigned.count > 0) 
          ? `${((closed?.count || 0) / assigned.count * 100).toFixed(2)}%`
          : '0%'
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching employees with stats:', error);
    res.status(500).json({ error: error.message });
  }
};
// Update Employee Profile
exports.updateEmployee = async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, email } = req.body;

  try {
    const updatedEmployee = await Employee.findByIdAndUpdate(
      id,
      { firstName, lastName, email },
      { new: true }
    );

    if (!updatedEmployee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      employee: {
        id: updatedEmployee._id,
        firstName: updatedEmployee.firstName,
        lastName: updatedEmployee.lastName,
        email: updatedEmployee.email,
        location: updatedEmployee.location,
        language: updatedEmployee.language,
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
