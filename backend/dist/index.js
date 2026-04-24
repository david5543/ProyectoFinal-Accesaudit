"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const audit_1 = require("./audit");
const app = (0, express_1.default)();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3333;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Almacenar último reporte en memoria (para demostración)
let lastReport = null;
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', name: 'AccesAudit Backend' });
});
app.post('/api/audit', async (req, res) => {
    const url = typeof req.body.url === 'string' ? req.body.url.trim() : '';
    if (!url) {
        return res.status(400).json({ error: 'Campo url es requerido' });
    }
    try {
        const report = await (0, audit_1.auditPage)(url);
        lastReport = report; // Guardar para usar en otros endpoints
        return res.json(report);
    }
    catch (error) {
        console.error('Audit failed:', error);
        return res.status(500).json({ error: 'Error al auditar el sitio', detail: String(error) });
    }
});
// Nuevo endpoint para generar recomendaciones
app.post('/api/recommendations', (req, res) => {
    if (!lastReport) {
        return res.status(400).json({ error: 'No hay reporte de auditoría disponible. Ejecuta una auditoría primero.' });
    }
    try {
        const recommendations = (0, audit_1.generateRecommendations)(lastReport);
        return res.json({ recommendations });
    }
    catch (error) {
        console.error('Recommendations generation failed:', error);
        return res.status(500).json({ error: 'Error al generar recomendaciones', detail: String(error) });
    }
});
// Nuevo endpoint para calcular discrepancias
app.post('/api/discrepancies', (req, res) => {
    const manualResults = req.body.manualResults;
    if (!lastReport) {
        return res.status(400).json({ error: 'No hay reporte de auditoría disponible. Ejecuta una auditoría primero.' });
    }
    if (!manualResults || typeof manualResults !== 'object') {
        return res.status(400).json({ error: 'Campo manualResults es requerido y debe ser un objeto' });
    }
    try {
        const discrepancies = (0, audit_1.calculateDiscrepancies)(lastReport.criteria, manualResults);
        return res.json({
            discrepancies,
            summary: {
                totalCriteria: lastReport.criteria.length,
                discrepanciesFount: discrepancies.length,
                falsePositives: discrepancies.filter(d => d.discrepancyType === 'false-positive').length,
                falseNegatives: discrepancies.filter(d => d.discrepancyType === 'false-negative').length,
            }
        });
    }
    catch (error) {
        console.error('Discrepancies calculation failed:', error);
        return res.status(500).json({ error: 'Error al calcular discrepancias', detail: String(error) });
    }
});
app.listen(PORT, () => {
    console.log(`AccesAudit backend is running on http://localhost:${PORT}`);
});
