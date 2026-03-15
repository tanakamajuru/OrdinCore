import { Request, Response } from 'express';
import { rolesService } from '../services/roles.service';

export class RolesController {
  async findAll(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const roles = await rolesService.findAll(company_id);
      return res.json({ success: true, data: roles, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch roles';
      return res.status(500).json({ success: false, message, errors: [] });
    }
  }

  async createRole(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const role = await rolesService.createRole(company_id, req.body.name, req.body.description);
      return res.status(201).json({ success: true, data: role, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create role';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async getRolePermissions(req: Request, res: Response) {
    try {
      const permissions = await rolesService.getRolePermissions(req.params.id);
      return res.json({ success: true, data: permissions, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch role permissions';
      return res.status(500).json({ success: false, message, errors: [] });
    }
  }

  async addRolePermission(req: Request, res: Response) {
    try {
      const result = await rolesService.addRolePermission(req.params.id, req.body.permission_id);
      return res.status(201).json({ success: true, data: result, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add permission to role';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async removeRolePermission(req: Request, res: Response) {
    try {
      const result = await rolesService.removeRolePermission(req.params.id, req.params.permissionId);
      return res.json({ success: true, data: result, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to remove permission from role';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }
}

export const rolesController = new RolesController();
