import { Router } from 'express';
import { supabaseAdmin } from '../db';
import { Request, Response } from 'express';

const router = Router();

// Rate limiting and memory store logic mock for OTP cooldown
const otpRequests: Record<string, number> = {}; // phone -> timestamp

router.post('/otp/request', async (req: Request, res: Response): Promise<any> => {
  const { phone, type } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone is required' });

  // Cooldown check (60s)
  const lastRequest = otpRequests[phone];
  if (lastRequest && Date.now() - lastRequest < 60000) {
    return res.status(429).json({ error: 'Vui lòng đợi 60s trước khi gửi lại' });
  }

  try {
    // In Supabase, signInWithOtp uses phone. Ensure format is E.164.
    // Assuming +84 prefix is handled or passed correctly.
    let formattedPhone = phone.startsWith('0') ? `+84${phone.slice(1)}` : phone;
    if (!formattedPhone.startsWith('+')) formattedPhone = `+${formattedPhone}`;

    const { error } = await supabaseAdmin.auth.signInWithOtp({
      phone: formattedPhone,
    });

    if (error) {
      console.error(error);
      return res.status(400).json({ error: error.message });
    }

    otpRequests[phone] = Date.now();
    return res.json({ success: true, message: 'OTP sent' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/otp/verify', async (req: Request, res: Response): Promise<any> => {
  const { phone, otp } = req.body;
  if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP required' });

  try {
    let formattedPhone = phone.startsWith('0') ? `+84${phone.slice(1)}` : phone;
    if (!formattedPhone.startsWith('+')) formattedPhone = `+${formattedPhone}`;

    const { data, error } = await supabaseAdmin.auth.verifyOtp({
      phone: formattedPhone,
      token: otp,
      type: 'sms',
    });

    if (error) {
      return res.status(400).json({ error: 'Mã OTP không hợp lệ hoặc đã hết hạn' });
    }

    // Auth flow succeeds, we return the session back to the client to set it
    return res.json({ session: data.session });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/register/profile', async (req: Request, res: Response): Promise<any> => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
  const token = authHeader.split(' ')[1];

  const { name, phone, universityId } = req.body;
  
  try {
    // Verify token
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' });

    // Check if user already exists
    const { data: existing } = await supabaseAdmin.from('users').select('id').eq('id', user.id).single();
    if (existing) {
      return res.status(400).json({ error: 'User already registered' });
    }

    // Insert user record
    const { error: insertErr } = await supabaseAdmin.from('users').insert({
      id: user.id,
      name,
      phone,
      status: 'PENDING_STUDENT_VERIFICATION',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (insertErr) throw insertErr;

    // We can optionally create student_profiles here or upon verification submission.
    // The plan says "PENDING_STUDENT_VERIFICATION" -> student verification.
    
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/me', async (req: Request, res: Response): Promise<any> => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
  const token = authHeader.split(' ')[1];

  try {
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' });

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('users')
      .select('id, name, phone, status')
      .eq('id', user.id)
      .single();

    if (profileErr || !profile) {
      // User created auth but no profile (maybe didn't finish register profile)
      return res.json({ 
        id: user.id, 
        phone: user.phone, 
        status: 'UNVERIFIED_PHONE' 
      });
    }

    return res.json(profile);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/logout', (req: Request, res: Response) => {
  // Mostly handled client-side by dropping session, but we can have this endpoint for completeness
  res.json({ success: true });
});

export default router;
