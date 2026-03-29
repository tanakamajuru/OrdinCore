import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'OrdinCore API',
      version: '1.0.0',
      description:
        'OrdinCore — Multi-tenant governance and risk management SaaS platform API. All endpoints require authentication unless stated otherwise.',
      contact: {
        name: 'OrdinCore Support',
        email: 'support@ordincore.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
            meta: { type: 'object' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            errors: { type: 'array', items: { type: 'object' } },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            total: { type: 'integer' },
            page: { type: 'integer' },
            limit: { type: 'integer' },
            pages: { type: 'integer' },
          },
        },
        Company: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            domain: { type: 'string' },
            status: { type: 'string', enum: ['active', 'inactive', 'suspended'] },
            plan: { type: 'string', enum: ['starter', 'professional', 'enterprise'] },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            company_id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            first_name: { type: 'string' },
            last_name: { type: 'string' },
            role: {
              type: 'string',
              enum: ['SUPER_ADMIN', 'ADMIN', 'REGISTERED_MANAGER', 'RESPONSIBLE_INDIVIDUAL', 'DIRECTOR'],
            },
            status: { type: 'string', enum: ['active', 'inactive', 'pending'] },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        House: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            company_id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            address: { type: 'string' },
            postcode: { type: 'string' },
            status: { type: 'string', enum: ['active', 'inactive', 'closed'] },
            capacity: { type: 'integer' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Risk: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            company_id: { type: 'string', format: 'uuid' },
            house_id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            description: { type: 'string' },
            severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
            status: { type: 'string', enum: ['open', 'in_progress', 'resolved', 'escalated'] },
            category_id: { type: 'string', format: 'uuid' },
            assigned_to: { type: 'string', format: 'uuid' },
            created_by: { type: 'string', format: 'uuid' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        Incident: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            company_id: { type: 'string', format: 'uuid' },
            house_id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            description: { type: 'string' },
            severity: { type: 'string', enum: ['minor', 'moderate', 'serious', 'critical'] },
            status: { type: 'string', enum: ['open', 'under_review', 'resolved', 'closed'] },
            occurred_at: { type: 'string', format: 'date-time' },
            created_by: { type: 'string', format: 'uuid' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        GovernancePulse: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            company_id: { type: 'string', format: 'uuid' },
            house_id: { type: 'string', format: 'uuid' },
            template_id: { type: 'string', format: 'uuid' },
            status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'overdue'] },
            due_date: { type: 'string', format: 'date-time' },
            completed_at: { type: 'string', format: 'date-time' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Escalation: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            company_id: { type: 'string', format: 'uuid' },
            risk_id: { type: 'string', format: 'uuid' },
            escalated_by: { type: 'string', format: 'uuid' },
            escalated_to: { type: 'string', format: 'uuid' },
            reason: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'acknowledged', 'resolved'] },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Notification: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            company_id: { type: 'string', format: 'uuid' },
            type: { type: 'string' },
            title: { type: 'string' },
            body: { type: 'string' },
            read: { type: 'boolean', default: false },
            data: { type: 'object' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Report: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            company_id: { type: 'string', format: 'uuid' },
            type: { type: 'string', enum: ['risk_summary', 'incident_report', 'governance_compliance', 'escalation_report', 'analytics_export'] },
            status: { type: 'string', enum: ['pending', 'processing', 'completed', 'failed'] },
            generated_by: { type: 'string', format: 'uuid' },
            file_url: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
            completed_at: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Authentication & session management' },
      { name: 'Companies', description: 'Company (tenant) management — SUPER_ADMIN only' },
      { name: 'Users', description: 'User management within a company' },
      { name: 'Houses', description: 'House/site management' },
      { name: 'Risks', description: 'Risk identification and management' },
      { name: 'Incidents', description: 'Incident recording and tracking' },
      { name: 'Governance', description: 'Governance pulses and compliance tracking' },
      { name: 'Escalations', description: 'Escalation workflow management' },
      { name: 'Reports', description: 'Report generation and downloads' },
      { name: 'Analytics', description: 'Trend analytics and performance metrics' },
      { name: 'Notifications', description: 'User notification management' },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
export default swaggerSpec;
