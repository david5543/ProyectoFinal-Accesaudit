import express, { Request, Response } from 'express';
import cors from 'cors';
import { auditPage, generateRecommendations, calculateDiscrepancies } from './audit';

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3333;

app.use(cors());
app.use(express.json());

// Almacenar último reporte en memoria (para demostración)
let lastReport: any = null;

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', name: 'AccesAudit Backend' });
});

app.post('/api/audit', async (req: Request, res: Response) => {
  const url = typeof req.body.url === 'string' ? req.body.url.trim() : '';

  if (!url) {
    return res.status(400).json({ error: 'Campo url es requerido' });
  }

  try {
    const report = await auditPage(url);
    lastReport = report; // Guardar para usar en otros endpoints
    return res.json(report);
  } catch (error) {
    console.error('Audit failed:', error);
    return res.status(500).json({ error: 'Error al auditar el sitio', detail: String(error) });
  }
});

// Nuevo endpoint para generar recomendaciones
app.post('/api/recommendations', (req: Request, res: Response) => {
  if (!lastReport) {
    return res.status(400).json({ error: 'No hay reporte de auditoría disponible. Ejecuta una auditoría primero.' });
  }

  try {
    const recommendations = generateRecommendations(lastReport);
    return res.json({ recommendations });
  } catch (error) {
    console.error('Recommendations generation failed:', error);
    return res.status(500).json({ error: 'Error al generar recomendaciones', detail: String(error) });
  }
});

// Nuevo endpoint para calcular discrepancias
app.post('/api/discrepancies', (req: Request, res: Response) => {
  const manualResults = req.body.manualResults;

  if (!lastReport) {
    return res.status(400).json({ error: 'No hay reporte de auditoría disponible. Ejecuta una auditoría primero.' });
  }

  if (!manualResults || typeof manualResults !== 'object') {
    return res.status(400).json({ error: 'Campo manualResults es requerido y debe ser un objeto' });
  }

  try {
    const discrepancies = calculateDiscrepancies(lastReport.criteria, manualResults);
    return res.json({ 
      discrepancies,
      summary: {
        totalCriteria: lastReport.criteria.length,
        discrepanciesFount: discrepancies.length,
        falsePositives: discrepancies.filter(d => d.discrepancyType === 'false-positive').length,
        falseNegatives: discrepancies.filter(d => d.discrepancyType === 'false-negative').length,
      }
    });
  } catch (error) {
    console.error('Discrepancies calculation failed:', error);
    return res.status(500).json({ error: 'Error al calcular discrepancias', detail: String(error) });
  }
});

app.listen(PORT, () => {
  console.log(`AccesAudit backend is running on http://localhost:${PORT}`);
});
