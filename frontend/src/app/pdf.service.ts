import { Injectable } from '@angular/core';

declare var require: any;

export interface AuditReport {
  url: string;
  timestamp: string;
  violations: any[];
  passes: any[];
  summary: any;
  criteria: any[];
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  affectedCriterion: string;
  affectedCriterionId: string;
  impact: string;
  difficulty: string;
  priorityScore: number;
  actions: string[];
  estimatedTimeMinutes: number;
}

@Injectable({
  providedIn: 'root'
})
export class PdfService {
  private pdfMake: any;

  constructor() {
    this.initializePdfMake();
  }

  private initializePdfMake(): void {
    try {
      this.pdfMake = require('pdfmake/build/pdfmake');
      const pdfFonts = require('pdfmake/build/vfs_fonts');
      this.pdfMake.vfs = pdfFonts.pdfMake.vfs;
    } catch (error) {
      console.error('Error inicializando pdfMake:', error);
    }
  }

  generateAuditPdf(report: AuditReport, recommendations: Recommendation[], fileName: string = 'audit-report.pdf') {
    const docDefinition: any = {
      pageSize: 'A4',
      pageMargins: [40, 40, 40, 40],
      header: (currentPage: number, pageCount: number) => {
        return {
          text: `AccesAudit - Informe de Auditoría · Página ${currentPage} de ${pageCount}`,
          alignment: 'center',
          fontSize: 10,
          color: '#666666',
          margin: [0, 0, 0, 10]
        };
      },
      footer: (currentPage: number) => {
        return {
          text: `Generado el ${new Date().toLocaleString()}`,
          alignment: 'center',
          fontSize: 8,
          color: '#999999'
        };
      },
      content: [
        // Título
        {
          text: '🔍 INFORME DE AUDITORÍA DE ACCESIBILIDAD WEB',
          fontSize: 24,
          bold: true,
          color: '#0066ff',
          alignment: 'center',
          margin: [0, 0, 0, 20]
        },

        // Información del sitio
        {
          text: 'Información del Sitio Auditado',
          fontSize: 16,
          bold: true,
          color: '#1e293b',
          margin: [0, 0, 0, 10]
        },
        {
          table: {
            widths: ['30%', '70%'],
            body: [
              ['URL', report.url],
              ['Fecha de Auditoría', new Date(report.timestamp).toLocaleString()],
              ['Estándar', 'WCAG 2.1']
            ]
          },
          layout: 'lightHorizontalLines',
          margin: [0, 0, 0, 20]
        },

        // Resumen de resultados
        {
          text: 'Resumen de Resultados',
          fontSize: 16,
          bold: true,
          color: '#1e293b',
          margin: [0, 20, 0, 10]
        },
        {
          columns: [
            {
              text: `Tasa de Conformidad\n${report.summary.passRate}%`,
              alignment: 'center',
              fontSize: 14,
              bold: true,
              color: '#0066ff',
              border: [1, 1, 1, 1],
              borderColor: '#334155',
              padding: [10, 10, 10, 10]
            },
            {
              text: `Nivel de Conformidad\n${report.summary.conformanceLevel}`,
              alignment: 'center',
              fontSize: 14,
              bold: true,
              color: '#10b981',
              border: [1, 1, 1, 1],
              borderColor: '#334155',
              padding: [10, 10, 10, 10]
            },
            {
              text: `Total de Reglas\n${report.summary.totalRules}`,
              alignment: 'center',
              fontSize: 14,
              bold: true,
              color: '#f59e0b',
              border: [1, 1, 1, 1],
              borderColor: '#334155',
              padding: [10, 10, 10, 10]
            }
          ],
          columnGap: 10,
          margin: [0, 0, 0, 20]
        },

        // Desglose de violaciones
        {
          text: 'Desglose de Violaciones por Impacto',
          fontSize: 16,
          bold: true,
          color: '#1e293b',
          margin: [0, 20, 0, 10]
        },
        {
          table: {
            widths: ['25%', '25%', '25%', '25%'],
            body: [
              [
                { text: '🔴 Crítico', bold: true, color: '#dc2626' },
                { text: '🟠 Serio', bold: true, color: '#f97316' },
                { text: '🟡 Moderado', bold: true, color: '#eab308' },
                { text: '🔵 Menor', bold: true, color: '#3b82f6' }
              ],
              [
                report.summary.levelCounts.critical.toString(),
                report.summary.levelCounts.serious.toString(),
                report.summary.levelCounts.moderate.toString(),
                report.summary.levelCounts.minor.toString()
              ]
            ]
          },
          layout: 'lightHorizontalLines',
          margin: [0, 0, 0, 20]
        },

        // Violaciones encontradas
        ...(report.violations.length > 0 ? [
          {
            text: '🚨 Violaciones Encontradas',
            fontSize: 16,
            bold: true,
            color: '#dc2626',
            margin: [0, 20, 0, 10],
            pageBreak: 'before'
          },
          {
            table: {
              widths: ['15%', '30%', '40%', '15%'],
              headerRows: 1,
              body: [
                [
                  { text: 'ID', bold: true, color: 'white', fillColor: '#dc2626' },
                  { text: 'Título', bold: true, color: 'white', fillColor: '#dc2626' },
                  { text: 'Descripción', bold: true, color: 'white', fillColor: '#dc2626' },
                  { text: 'Afectados', bold: true, color: 'white', fillColor: '#dc2626' }
                ],
                ...report.violations.map(v => [
                  v.id,
                  v.help || 'N/A',
                  v.description ? v.description.substring(0, 100) + '...' : 'N/A',
                  v.nodes.length.toString()
                ])
              ]
            },
            layout: 'lightHorizontalLines',
            margin: [0, 0, 0, 20]
          }
        ] : [
          {
            text: '✅ No se encontraron violaciones',
            fontSize: 14,
            color: '#10b981',
            margin: [0, 20, 0, 20]
          }
        ]),

        // Recomendaciones
        ...(recommendations.length > 0 ? [
          {
            text: '💡 Recomendaciones Priorizadas',
            fontSize: 16,
            bold: true,
            color: '#1e293b',
            margin: [0, 20, 0, 10],
            pageBreak: 'before'
          },
          ...recommendations.map((rec, index) => [
            {
              text: `${index + 1}. ${rec.title}`,
              fontSize: 13,
              bold: true,
              color: '#0066ff',
              margin: [0, 15, 0, 5]
            },
            {
              columns: [
                {
                  width: '25%',
                  text: `Impacto: ${rec.impact}`,
                  fontSize: 10
                },
                {
                  width: '25%',
                  text: `Dificultad: ${rec.difficulty}`,
                  fontSize: 10
                },
                {
                  width: '25%',
                  text: `Prioridad: ${rec.priorityScore}/100`,
                  fontSize: 10
                },
                {
                  width: '25%',
                  text: `Tiempo: ${rec.estimatedTimeMinutes} min`,
                  fontSize: 10
                }
              ],
              margin: [0, 0, 0, 5]
            },
            {
              text: rec.description,
              fontSize: 10,
              color: '#475569',
              margin: [0, 5, 0, 10]
            },
            {
              text: 'Acciones recomendadas:',
              fontSize: 10,
              bold: true,
              margin: [0, 5, 0, 5]
            },
            {
              ul: rec.actions,
              fontSize: 9,
              color: '#64748b',
              margin: [0, 0, 0, 10]
            },
            {
              text: `Criterio afectado: ${rec.affectedCriterionId}`,
              fontSize: 9,
              color: '#94a3b8',
              italics: true,
              margin: [0, 0, 0, 15]
            }
          ]).flat()
        ] : [
          {
            text: '✅ Sin recomendaciones - El sitio es accesible',
            fontSize: 14,
            color: '#10b981',
            margin: [0, 20, 0, 20]
          }
        ]),

        // Criterios evaluados
        {
          text: '✅ Criterios Evaluados (WCAG 2.1)',
          fontSize: 14,
          bold: true,
          color: '#1e293b',
          margin: [0, 30, 0, 10],
          pageBreak: 'before'
        },
        {
          table: {
            widths: ['20%', '50%', '15%', '15%'],
            headerRows: 1,
            body: [
              [
                { text: 'ID', bold: true, color: 'white', fillColor: '#64748b' },
                { text: 'Descripción', bold: true, color: 'white', fillColor: '#64748b' },
                { text: 'Nivel', bold: true, color: 'white', fillColor: '#64748b' },
                { text: 'Estado', bold: true, color: 'white', fillColor: '#64748b' }
              ],
              ...report.criteria.map(c => {
                const statusColor = c.status === 'passed' ? '#10b981' : c.status === 'failed' ? '#dc2626' : '#f59e0b';
                const statusText = c.status === 'passed' ? '✓ Pasado' : c.status === 'failed' ? '✗ Fallido' : '? Manual';
                return [
                  c.id,
                  c.description,
                  c.level,
                  { text: statusText, color: statusColor, bold: true }
                ];
              })
            ]
          },
          layout: 'lightHorizontalLines',
          margin: [0, 0, 0, 20]
        },

        // Conclusiones
        {
          text: 'Conclusiones',
          fontSize: 14,
          bold: true,
          color: '#1e293b',
          margin: [0, 30, 0, 10]
        },
        {
          text: this.getConclusion(report),
          fontSize: 11,
          color: '#475569',
          margin: [0, 0, 0, 20]
        },

        // Pie de página adicional
        {
          text: 'Este informe fue generado automáticamente por AccesAudit. Para más información sobre WCAG 2.1, visite https://www.w3.org/WAI/WCAG21/quickref/',
          fontSize: 9,
          color: '#94a3b8',
          italics: true,
          alignment: 'center',
          margin: [0, 50, 0, 0]
        }
      ]
    };

    if (this.pdfMake) {
      this.pdfMake.createPdf(docDefinition).download(fileName);
    } else {
      console.error('pdfMake no está inicializado');
    }
  }

  private getConclusion(report: AuditReport): string {
    const passRate = report.summary.passRate;
    const violationCount = report.violations.length;

    if (passRate >= 95) {
      return 'Excelente: El sitio tiene un muy alto nivel de conformidad con WCAG 2.1. Continúe monitoreando y manteniendo los estándares de accesibilidad.';
    } else if (passRate >= 90) {
      return 'Bueno: El sitio cumple bien con WCAG 2.1 (nivel AA). Se recomienda implementar las recomendaciones para alcanzar el nivel AAA.';
    } else if (passRate >= 80) {
      return 'Aceptable: El sitio tiene un nivel de conformidad aceptable (nivel A). Se recomienda implementar las recomendaciones identificadas para mejorar la accesibilidad.';
    } else {
      return `Necesita mejoras: El sitio tiene ${violationCount} violaciones de accesibilidad que deben corregirse. Se recomienda implementar todas las recomendaciones priorizadas de inmediato para mejorar significativamente la accesibilidad.`;
    }
  }
}
