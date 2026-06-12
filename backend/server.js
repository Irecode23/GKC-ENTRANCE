const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  'http://localhost:5173',
  'https://gkcee.vercel.app',
  process.env.CLIENT_URL,
  process.env.CLIENT_URL?.replace(/\/$/, ''),
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Make io accessible to controllers
app.set('io', io);

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/students', require('./routes/students'));
app.use('/api/subjects', require('./routes/subjects'));
app.use('/api/questions', require('./routes/questions'));
app.use('/api/exam', require('./routes/exam'));
app.use('/api/results', require('./routes/results'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// Socket.IO — Live monitoring
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on('admin:join', () => {
    socket.join('admin-room');
    console.log('Admin joined monitoring room');
  });

  socket.on('candidate:update', (data) => {
    io.to('admin-room').emit('candidate:status', data);
  });

  socket.on('candidate:submit', (data) => {
    io.to('admin-room').emit('candidate:submitted', data);
  });

  socket.on('candidate:security', (data) => {
    io.to('admin-room').emit('candidate:security-alert', data);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', socket.id, reason);
  });
});

// Connect DB and start
const startServer = async () => {
  await connectDB();
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => console.log(`GKC CBT Server running on port ${PORT}`));
};

startServer();