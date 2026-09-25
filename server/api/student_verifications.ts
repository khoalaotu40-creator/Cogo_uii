import { Router } from 'express';
import { supabaseAdmin } from '../db';
import { Request, Response } from 'express';
import multer from 'multer';

const router = Router();
const upload = multer({ 
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
}); 

router.post('/', upload.single('cardImage'), async (req: Request, res: Response): Promise<any> => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
  const token = authHeader.split(' ')[1];

  const { studentId, universityId = '1' } = req.body;
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'Card image is required' });

  try {
    // 1. Authenticate user
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' });

    // 2. Upload to private bucket
    const filePath = `${user.id}/${Date.now()}_${file.originalname}`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from('student_cards')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
      });

    if (uploadError) throw uploadError;

    // 3. Create student verification record
    const { error: insertErr } = await supabaseAdmin.from('student_verifications').insert({
      user_id: user.id,
      university_id: universityId,
      student_id: studentId,
      card_front_path: filePath,
      status: 'PENDING',
      submitted_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (insertErr) throw insertErr;

    // Update user profile status
    await supabaseAdmin.from('users').update({ status: 'PENDING_STUDENT_VERIFICATION' }).eq('id', user.id);

    return res.json({ success: true, message: 'Verification submitted' });
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

    const { data, error } = await supabaseAdmin
      .from('student_verifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // ignore no rows

    return res.json(data || null);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
