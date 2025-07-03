const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://salescrm-admin.netlify.app',
    'https://salescrm-employee.netlify.app'
  ],
  credentials: true,
}));




// Routes
app.use('/api/leads', require('./routes/leads'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/calls', require('./routes/calls'));
app.use('/api/activities', require('./routes/activities'));
app.use('/api/employee', require('./routes/employeeLogin'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/admin', require('./routes/adminRoutes'));


// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('admin-frontend/build'));
  app.use('/employee', express.static('user-frontend/build'));

  app.get('/admin*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../admin-frontend', 'build', 'index.html'));
  });

  app.get('/employee*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../user-frontend', 'build', 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
const Employee = require('./models/Employee');
const Attendance = require('./models/Attendance');

const startBreakForEmployee = async (employeeId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const attendance = await Attendance.findOne({ employee: employeeId, date: today });
  if (!attendance) return;

  const hasOpenBreak = attendance.breaks?.some(b => !b.endTime);
  if (hasOpenBreak) return;

  attendance.breaks.push({ startTime: new Date() });
  await attendance.save();
};

//  Check if user is offline for >10 seconds
setInterval(async () => {
  const threshold = new Date(Date.now() - 10000); // 10 seconds ago

  const offlineEmployees = await Employee.find({
    isOnline: false,
    lastTabClosedAt: { $lte: threshold }
  });

  for (const emp of offlineEmployees) {
    await startBreakForEmployee(emp._id);
    console.log(`Auto break started for employee ${emp.firstName} ${emp.lastName}`);
  }
}, 10000); // Run every 10 seconds
