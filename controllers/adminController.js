const Admin = require('../models/Admin');

const adminController = {
  getProfile: async (req, res) => {
    try {
      let admin = await Admin.findOne();
      
      // If no admin exists, create a default one
      if (!admin) {
        admin = await Admin.create({
          firstName: 'Admin',
          lastName: 'User',
          email: 'admin@example.com'
        });
      }
      
      res.json(admin);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  },

  updateProfile: async (req, res) => {
    try {
      const { firstName, lastName, email } = req.body;
      
      let admin = await Admin.findOne();
      
      if (!admin) {
        admin = new Admin({ firstName, lastName, email });
      } else {
        admin.firstName = firstName;
        admin.lastName = lastName;
        admin.email = email;
      }
      
      await admin.save();
      res.json(admin);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
};

module.exports = adminController;