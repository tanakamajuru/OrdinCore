import { Request, Response } from 'express';
import { screenAssistService } from '../services/screenAssist.service';
import { screenAssistDoctrineService } from '../services/screenAssistDoctrine.service';

export const screenAssistController = {
  async answer(req: Request, res: Response) {
    try {
      const user = req.user!;
      const data = await screenAssistService.answer({
        companyId: user.company_id!, userId: user.user_id, role: user.role,
        screenKey: req.body?.screen_key, question: req.body?.question,
      });
      const status = data.classification === 'INVALID' ? 403 : 200;
      return res.status(status).json({ success: status === 200, data, meta: { read_only: true } });
    } catch {
      return res.status(500).json({ success: false, message: 'Screen Assist could not answer safely.', errors: [] });
    }
  },
  async listVersions(_req: Request, res: Response) {
    try { return res.json({ success: true, data: await screenAssistDoctrineService.listVersions() }); }
    catch { return res.status(500).json({ success: false, message: 'Could not load doctrine versions.', errors: [] }); }
  },
  async publishVersion(req: Request, res: Response) {
    try {
      const data = await screenAssistDoctrineService.publishVersion(
        req.params.version, req.user!.user_id, String(req.body?.approval_note || ''), req.body?.effective_from);
      return res.json({ success: true, data });
    } catch (error) {
      return res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Doctrine publication failed.', errors: [] });
    }
  },
  async retireVersion(req: Request, res: Response) {
    try {
      const data = await screenAssistDoctrineService.retireVersion(
        req.params.version, req.user!.user_id, String(req.body?.retirement_note || ''));
      return res.json({ success: true, data });
    } catch (error) {
      return res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Doctrine retirement failed.', errors: [] });
    }
  },
};
