import { Request, Response } from 'express';
import { exportsService } from '../services/exports.service';

export class ExportsController {
  private async handleExportRequest(req: Request, res: Response, exportFunction: Function) {
    try {
      const company_id = req.user!.company_id!;
      const format = (req.query.format as string) || 'csv';
      const result = await exportFunction(company_id, format);
      
      res.setHeader('Content-disposition', `attachment; filename=${result.filename}`);
      res.setHeader('Content-type', result.contentType);
      return res.send(result.content);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate export';
      return res.status(500).json({ success: false, message, errors: [] });
    }
  }

  async exportRisks(req: Request, res: Response) {
    return this.handleExportRequest(req, res, exportsService.exportRisks.bind(exportsService));
  }

  async exportIncidents(req: Request, res: Response) {
    return this.handleExportRequest(req, res, exportsService.exportIncidents.bind(exportsService));
  }

  async exportGovernance(req: Request, res: Response) {
    return this.handleExportRequest(req, res, exportsService.exportGovernance.bind(exportsService));
  }

  async exportUsers(req: Request, res: Response) {
    return this.handleExportRequest(req, res, exportsService.exportUsers.bind(exportsService));
  }

  async exportHouses(req: Request, res: Response) {
    return this.handleExportRequest(req, res, exportsService.exportHouses.bind(exportsService));
  }

  async exportEvidencePack(req: Request, res: Response) {
    try {
        const company_id = req.user!.company_id!;
        const { house_id } = req.params;
        const result = await (exportsService.exportEvidencePack(company_id, house_id) as any);
        
        res.setHeader('Content-disposition', `attachment; filename=${result.filename}`);
        res.setHeader('Content-type', result.contentType);
        return res.send(result.content);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to generate evidence pack';
        return res.status(500).json({ success: false, message });
      }
  }
}

export const exportsController = new ExportsController();
