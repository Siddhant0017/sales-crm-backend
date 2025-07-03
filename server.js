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



app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://salescrm-admin.netlify.app',
    'https://salescrm-employee.netlify.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Routes
app.use('/api/leads', require('./routes/leads'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/calls', require('./routes/calls'));
app.use('/api/activities', require('./routes/activities'));
app.use('/api/employee', require('./routes/employeeLogin'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/admin', require('./routes/adminRoutes'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!', 
    error: process.env.NODE_ENV === 'development' ? err.message : 'Server error' 
  });
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Employee break handling code
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
