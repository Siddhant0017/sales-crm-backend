const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');

// Helper - Calculate Duration
const calculateDurationInHours = (start, end) => {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const hours = Math.max(ms / (1000 * 60 * 60), 0);
  return Math.round(hours * 100) / 100;
};

//Check-In
exports.checkIn = async (req, res) => {
  const { employeeId } = req.body;
  const today = new Date();
  const dateOnly = new Date(today.setHours(0, 0, 0, 0));

  try {
    let attendance = await Attendance.findOne({ employee: employeeId, date: dateOnly });

    if (!attendance) {
      attendance = new Attendance({
        employee: employeeId,
        date: dateOnly,
        checkIn: new Date(),
        status: 'active',
      });
    } else {
      attendance.status = 'active';
    }

    await attendance.save();

    await Employee.findByIdAndUpdate(employeeId, {
      isOnline: true,
      activeTabCount: 1,
      $unset: { lastTabClosedAt: "" }
    });

    res.json({ message: 'Checked In Successfully', attendance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Check-Out
exports.checkOut = async (req, res) => {
  const { employeeId } = req.body;
  const today = new Date();
  const dateOnly = new Date(today.setHours(0, 0, 0, 0));

  try {
    const attendance = await Attendance.findOne({ employee: employeeId, date: dateOnly });

    if (!attendance || !attendance.checkIn) {
      return res.status(400).json({ message: 'Check-in not found for today' });
    }

    const totalHours = calculateDurationInHours(attendance.checkIn, new Date());

    attendance.checkOut = new Date();
    attendance.totalHours = totalHours;
    attendance.status = 'inactive';
    await attendance.save();

    await Employee.findByIdAndUpdate(employeeId, {
      isOnline: false,
      activeTabCount: 0,
    });

    res.json({ message: 'Checked Out Successfully', attendance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Attendance Log
exports.getAttendanceLog = async (req, res) => {
  const { employeeId } = req.params;

  try {
    const today = new Date();
    const sevenDaysAgo = new Date(today.setDate(today.getDate() - 6));
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const logs = await Attendance.find({
      employee: employeeId,
      date: { $gte: sevenDaysAgo },
    }).sort({ date: -1 });

    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//Start Break
exports.startBreak = async (req, res) => {
  const { employeeId } = req.body;

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({ employee: employeeId, date: today });

    if (!attendance) {
      return res.status(404).json({ message: 'Attendance not found for today' });
    }

    const ongoingBreak = attendance.breaks.find(b => !b.endTime);
    if (ongoingBreak) {
      return res.status(400).json({ message: 'There is already an ongoing break' });
    }

    attendance.breaks.push({ startTime: new Date() });

    await attendance.save();

    res.status(200).json({ message: 'Break Started Successfully', attendance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//End Break
exports.endBreak = async (req, res) => {
  const { employeeId } = req.body;

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({ employee: employeeId, date: today });

    if (!attendance) {
      return res.status(404).json({ message: 'Attendance not found for today' });
    }

    const ongoingBreak = attendance.breaks.find(b => !b.endTime);

    if (!ongoingBreak) {
      return res.status(400).json({ message: 'No ongoing break found' });
    }

    const endTime = new Date();
    const duration = Math.round((endTime - new Date(ongoingBreak.startTime)) / (1000 * 60));

    ongoingBreak.endTime = endTime;
    ongoingBreak.duration = duration;

    await attendance.save();

    res.status(200).json({ message: 'Break Ended Successfully', attendance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//Handle Tab Open
exports.handleTabOpen = async (req, res) => {
  const { employeeId } = req.body;
  if (!employeeId) return res.status(400).json({ message: 'Employee ID required' });

  const employee = await Employee.findById(employeeId);
  const newTabCount = (employee?.activeTabCount || 0) + 1;

  await Employee.findByIdAndUpdate(employeeId, {
    activeTabCount: newTabCount,
    isOnline: true,
    $unset: { lastTabClosedAt: "" }
  });

  await endBreakForEmployee(employeeId);

  res.json({ message: 'Tab Opened', activeTabCount: newTabCount });
};

// Handle Tab Close with debounce delay
const BREAK_DELAY = 5000; // 5 seconds

exports.handleTabClose = async (req, res) => {
  const { employeeId } = req.body;
  if (!employeeId) return res.status(400).json({ message: 'Employee ID required' });

  const employee = await Employee.findById(employeeId);
  const newTabCount = Math.max((employee?.activeTabCount || 1) - 1, 0);

  await Employee.findByIdAndUpdate(employeeId, {
    activeTabCount: newTabCount,
    isOnline: newTabCount > 0,
    lastTabClosedAt: new Date()
  });

  if (newTabCount === 0) {
    setTimeout(async () => {
      const latest = await Employee.findById(employeeId);
      if (latest?.activeTabCount === 0) {
        await startBreakForEmployee(employeeId);
        console.log(`Break started for ${employeeId} after tab close.`);
      } else {
        console.log(`Tab reopened for ${employeeId} before break start.`);
      }
    }, BREAK_DELAY);
  }

  res.json({ message: 'Tab Closed', activeTabCount: newTabCount });
};

// Heartbeat
exports.heartbeat = async (req, res) => {
  const { employeeId } = req.body;
  if (!employeeId) return res.status(400).json({ message: 'Employee ID required' });

  await Employee.findByIdAndUpdate(employeeId, {
    lastSeen: new Date(),
    isOnline: true
  });

  res.json({ message: 'Heartbeat received' });
};

// Helper: Start Break Automatically
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

//Helper: End Break Automatically
const endBreakForEmployee = async (employeeId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const attendance = await Attendance.findOne({ employee: employeeId, date: today });
  if (!attendance) return;

  const ongoingBreak = attendance.breaks.find(b => !b.endTime);
  if (!ongoingBreak) return;

  const endTime = new Date();
  const duration = Math.round((endTime - new Date(ongoingBreak.startTime)) / (1000 * 60));

  ongoingBreak.endTime = endTime;
  ongoingBreak.duration = duration;

  await attendance.save();
};
