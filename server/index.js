const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
require('dotenv').config();

const videoRoutes = require('./routes/video');
const authRoutes = require('./routes/auth');
const discordRoutes = require('./routes/discord');
const { purgeAllVideos } = require('./services/cleanup');
const { runStartupChecks } = require('./services/preflight');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// Make io accessible in routes
app.set('io', io);

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/video', videoRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/discord', discordRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// Clean up leftover video files from previous sessions on startup
purgeAllVideos();

// Periodic cleanup of abandoned videos (default: every 30 minutes)
const CLEANUP_INTERVAL_MS = parseInt(process.env.CLEANUP_INTERVAL_MS, 10) || 30 * 60 * 1000;
setInterval(() => purgeAllVideos(), CLEANUP_INTERVAL_MS);

const PORT = process.env.PORT || 5000;

const startupChecks = runStartupChecks();
if (!startupChecks.ok) {
  console.error('\n❌ Startup checks failed:');
  for (const err of startupChecks.errors) {
    console.error(`  - ${err}`);
  }
  console.error('\nFix the missing dependencies and restart the server.');
  process.exit(1);
}

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${PORT} is already in use!\n`);
    console.error(`To fix this, run the following in PowerShell:`);
    console.error(`  Stop-Process -Id (Get-NetTCPConnection -LocalPort ${PORT} | Select-Object -ExpandProperty OwningProcess) -Force\n`);
    console.error(`Then run 'node index.js' again.`);
    process.exit(1);
  } else {
    throw err;
  }
});
