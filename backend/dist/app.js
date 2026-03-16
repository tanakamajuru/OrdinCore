"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const swagger_1 = require("./config/swagger");
const logger_1 = __importDefault(require("./utils/logger"));
// Routes
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const companies_routes_1 = __importDefault(require("./routes/companies.routes"));
const users_routes_1 = __importDefault(require("./routes/users.routes"));
const houses_routes_1 = __importDefault(require("./routes/houses.routes"));
const risks_routes_1 = __importDefault(require("./routes/risks.routes"));
const incidents_routes_1 = __importDefault(require("./routes/incidents.routes"));
const governance_routes_1 = __importDefault(require("./routes/governance.routes"));
const escalations_routes_1 = __importDefault(require("./routes/escalations.routes"));
const reports_routes_1 = __importDefault(require("./routes/reports.routes"));
const analytics_routes_1 = __importDefault(require("./routes/analytics.routes"));
const notifications_routes_1 = __importDefault(require("./routes/notifications.routes"));
const roles_routes_1 = __importDefault(require("./routes/roles.routes"));
const system_routes_1 = __importDefault(require("./routes/system.routes"));
const exports_routes_1 = __importDefault(require("./routes/exports.routes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
// ─── Security & Parsing Middleware ────────────────────────────────────────────
app.use((0, helmet_1.default)({ contentSecurityPolicy: false }));
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// ─── HTTP Logging ────────────────────────────────────────────────────────────
app.use((0, morgan_1.default)('combined', {
    stream: { write: (message) => logger_1.default.info(message.trim()) },
}));
// ─── Static Files ────────────────────────────────────────────────────────────
app.use(express_1.default.static(path_1.default.join(__dirname, '../public')));
// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/health', (_, res) => {
    res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' }, meta: {} });
});
// ─── Swagger Documentation ───────────────────────────────────────────────────
app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.swaggerSpec, {
    explorer: true,
    customSiteTitle: 'CareSignal API',
    customCss: `
    .swagger-ui .topbar { background-color: #1e293b; }
    .swagger-ui .topbar .download-url-wrapper { display: none; }
  `,
}));
// Expose raw swagger spec
app.get('/swagger.json', (_, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swagger_1.swaggerSpec);
});
// ─── API Routes ───────────────────────────────────────────────────────────────
const API = '/api/v1';
app.use(`${API}/auth`, auth_routes_1.default);
app.use(`${API}/companies`, companies_routes_1.default);
app.use(`${API}/users`, users_routes_1.default);
app.use(`${API}/houses`, houses_routes_1.default);
app.use(`${API}/risks`, risks_routes_1.default);
app.use(`${API}/incidents`, incidents_routes_1.default);
app.use(`${API}/governance`, governance_routes_1.default);
app.use(`${API}/escalations`, escalations_routes_1.default);
app.use(`${API}/reports`, reports_routes_1.default);
app.use(`${API}/analytics`, analytics_routes_1.default);
app.use(`${API}/notifications`, notifications_routes_1.default);
app.use(`${API}/roles`, roles_routes_1.default);
app.use(`${API}/system`, system_routes_1.default);
app.use(`${API}/exports`, exports_routes_1.default);
// ─── 404 Handler ────────────────────────────────────────────────────────────
app.use('*', (req, res) => {
    res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}`, errors: [] });
});
// ─── Global Error Handler ────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
    logger_1.default.error('Unhandled error', err);
    res.status(500).json({ success: false, message: 'Internal server error', errors: [] });
});
exports.default = app;
//# sourceMappingURL=app.js.map