import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './api/auth';
import studentVerificationRoutes from './api/student_verifications';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Fake simple health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.get('/api/universities', async (req, res) => {
  try {
    const { supabaseAdmin } = await import('./db');
    const { data, error } = await supabaseAdmin.from('universities').select('*').eq('status', 'ACTIVE');
    if (error) throw error;
    res.json(data || []);
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to fetch universities' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/student-verifications', studentVerificationRoutes);

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
