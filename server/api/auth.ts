import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../db';

const router = Router();

// Rate limiting and memory store logic mock for OTP cooldown
const otpRequests: Record<string, number> = {}; // phone -> timestamp

router.post('/otp/request', async (req: Request, res: Response) => {
  const { phone, type } = req.body;
  if (!phone) {
    res.status(400).json({ error: 'Phone is required' });
    return;
  }

  // Cooldown check (60s)
  const lastRequest = otpRequests[phone];
  if (lastRequest && Date.now() - lastRequest < 60000) {
    res.status(429).json({ error: 'Vui lòng đợi 60s trước khi gửi lại' });
    return;
  }

  try {
    let formattedPhone = phone.startsWith('0') ? `+84${phone.slice(1)}` : phone;
    if (!formattedPhone.startsWith('+')) formattedPhone = `+${formattedPhone}`;

    // If type is login, we should verify the user exists in our DB first
    if (type === 'login') {
      const { data: existingUser } = await supabaseAdmin.from('users').select('id').eq('phone', formattedPhone).single();
      if (!existingUser) {
        res.status(404).json({ error: 'Tài khoản không tồn tại, vui lòng đăng ký' });
        return;
      }
    }

    if (type === 'register') {
      const { data: existingUser } = await supabaseAdmin.from('users').select('id').eq('phone', formattedPhone).single();
      if (existingUser) {
        res.status(400).json({ error: 'Số điện thoại đã được đăng ký' });
        return;
      }
    }

    const { error } = await supabaseAdmin.auth.signInWithOtp({
      phone: formattedPhone,
    });

    if (error) {
      console.error(error);
      res.status(400).json({ error: error.message });
      return;
    }

    otpRequests[phone] = Date.now();
    res.json({ success: true, message: 'OTP sent' });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Internal Server Error' });
  }
});

router.post('/otp/verify', async (req: Request, res: Response) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) {
    res.status(400).json({ error: 'Phone and OTP required' });
    return;
  }

  try {
    let formattedPhone = phone.startsWith('0') ? `+84${phone.slice(1)}` : phone;
    if (!formattedPhone.startsWith('+')) formattedPhone = `+${formattedPhone}`;

    const { data, error } = await supabaseAdmin.auth.verifyOtp({
      phone: formattedPhone,
      token: otp,
      type: 'sms',
    });

    if (error) {
      res.status(400).json({ error: 'Mã OTP không hợp lệ hoặc đã hết hạn' });
      return;
    }

    res.json({ session: data.session });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Internal Server Error' });
  }
});

router.post('/register/profile', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const token = authHeader.split(' ')[1];

  const { name, phone, universityId } = req.body;
  
  try {
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    let formattedPhone = phone.startsWith('0') ? `+84${phone.slice(1)}` : phone;
    if (!formattedPhone.startsWith('+')) formattedPhone = `+${formattedPhone}`;

    const { data: existing } = await supabaseAdmin.from('users').select('id').eq('id', user.id).single();
    if (existing) {
      res.status(400).json({ error: 'User already registered' });
      return;
    }

    const { error: insertErr } = await supabaseAdmin.from('users').insert({
      id: user.id,
      name,
      phone: formattedPhone,
      status: 'PENDING_STUDENT_VERIFICATION',
    });

    if (insertErr) throw insertErr;

    // Save temporary profile info to be used in student_verifications later if needed,
    // or just let them select university again, but the plan says university is part of registration.
    // We should save it to student_profiles
    await supabaseAdmin.from('student_profiles').insert({
      user_id: user.id,
      university_id: universityId,
      verification_status: 'NOT_SUBMITTED'
    });
    
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Internal Server Error' });
  }
});

router.get('/me', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const token = authHeader.split(' ')[1];

  try {
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('users')
      .select('id, name, phone, status')
      .eq('id', user.id)
      .single();

    if (profileErr || !profile) {
      res.json({ 
        id: user.id, 
        phone: user.phone, 
        status: 'UNVERIFIED_PHONE' 
      });
      return;
    }

    res.json(profile);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Internal Server Error' });
  }
});

router.post('/logout', (req: Request, res: Response) => {
  res.json({ success: true });
});

export default router;
