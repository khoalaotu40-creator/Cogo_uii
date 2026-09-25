import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../db';
import multer from 'multer';

const router = Router();
const upload = multer({ 
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
}); 

router.post('/', upload.single('cardImage'), async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const token = authHeader.split(' ')[1];

  const { studentId, universityId } = req.body;
  const file = req.file;

  if (!studentId || !universityId) {
    res.status(400).json({ error: 'Missing studentId or universityId' });
    return;
  }
  if (!file) {
    res.status(400).json({ error: 'Card image is required' });
    return;
  }

  try {
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Verify university exists
    const { data: uni } = await supabaseAdmin.from('universities').select('id').eq('id', universityId).single();
    if (!uni) {
      res.status(400).json({ error: 'University not found' });
      return;
    }

    const filePath = `${user.id}/${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from('student_cards')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
      });

    if (uploadError) throw uploadError;

    // Update or insert profile
    const { error: profileErr } = await supabaseAdmin.from('student_profiles').upsert({
      user_id: user.id,
      university_id: universityId,
      student_id: studentId,
      verification_status: 'PENDING'
    }, { onConflict: 'user_id' });

    if (profileErr) throw profileErr;

    const { error: insertErr } = await supabaseAdmin.from('student_verifications').insert({
      user_id: user.id,
      university_id: universityId,
      student_id: studentId,
      card_front_path: filePath,
      status: 'PENDING',
    });

    if (insertErr) throw insertErr;

    await supabaseAdmin.from('users').update({ status: 'PENDING_STUDENT_VERIFICATION' }).eq('id', user.id);

    res.json({ success: true, message: 'Verification submitted' });
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

    const { data, error } = await supabaseAdmin
      .from('student_verifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // ignore no rows

    res.json(data || null);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Internal Server Error' });
  }
});

export default router;
