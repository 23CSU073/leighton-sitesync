const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

const PORT = process.env.PORT || 5000;
const MONGO_URI =
  process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/leighton-sitesync';

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
].filter(Boolean);

const towers = [
  'Tower A (Residential)',
  'Tower B (Residential)',
  'Commercial Block',
];

const subcontractors = [
  'Ahluwalia Contracts Ltd',
  'Larsen & Toubro (L&T)',
  'Sterling & Wilson',
];

const activities = [
  'Slab Concreting',
  'Formwork / Shuttering',
  'Reinforcement / Steel Binding',
  'Brickwork / Masonry',
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked request from origin: ${origin}`));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
    optionsSuccessStatus: 200,
  })
);

app.use(express.json({ limit: '1mb' }));

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected for Leighton SiteSync DPR logs');
  })
  .catch((error) => {
    console.error('MongoDB connection failed:', error.message);
  });

const realDprSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true,
      trim: true,
    },
    engineerName: {
      type: String,
      required: true,
      trim: true,
    },
    shift: {
      type: String,
      enum: ['Day', 'Night'],
      required: true,
    },
    weather: {
      type: String,
      enum: ['Clear/Sunny', 'Heavy Rains', 'Dust Storm', 'Extreme Heat'],
      required: true,
    },
    tower: {
      type: String,
      enum: towers,
      required: true,
    },
    floor: {
      type: String,
      required: true,
      trim: true,
    },
    subcontractor: {
      type: String,
      enum: subcontractors,
      required: true,
    },
    activity: {
      type: String,
      enum: activities,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    unit: {
      type: String,
      required: true,
      trim: true,
    },
    photoUrl: {
      type: String,
      default: '',
      trim: true,
    },
    remarks: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { timestamps: true }
);

const RealDpr = mongoose.model('RealDpr', realDprSchema);

app.get('/api/health', (req, res) => {
  res.status(200).json({
    service: 'Leighton SiteSync Backend',
    database:
      mongoose.connection.readyState === 1 ? 'connected' : 'not connected',
  });
});

app.post('/api/dpr', async (req, res) => {
  try {
    const dprEntry = new RealDpr(req.body);
    const savedEntry = await dprEntry.save();

    res.status(201).json({
      message: 'DPR entry saved successfully',
      data: savedEntry,
    });
  } catch (error) {
    res.status(400).json({
      message: 'Unable to save DPR entry',
      error: error.message,
    });
  }
});

app.get('/api/dpr', async (req, res) => {
  try {
    const dprEntries = await RealDpr.find().sort({ createdAt: -1 });
    res.status(200).json(dprEntries);
  } catch (error) {
    res.status(500).json({
      message: 'Unable to fetch DPR entries',
      error: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Leighton SiteSync backend running on http://localhost:${PORT}`);
});
