const Employee = require('../models/Employee');

// Login Employee
exports.loginEmployee = async (req, res) => {
  const { email, password } = req.body;

  try {
    const employee = await Employee.findOne({ email });

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    if (employee.lastName !== password) {
      return res.status(401).json({ message: 'Invalid password (last name)' });
    }

    res.status(200).json({
      message: 'Login successful',
      employee: {
        id: employee._id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        location: employee.location,
        language: employee.language,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Employee Profile (self)
exports.updateProfile = async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, email, password } = req.body;

  try {
    const employee = await Employee.findById(id);

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    employee.firstName = firstName || employee.firstName;
    employee.lastName = lastName || employee.lastName;
    employee.email = email || employee.email;
    employee.password = password || employee.lastName;

    await employee.save();

    res.status(200).json({
      _id: employee._id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      location: employee.location,
      language: employee.language,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
