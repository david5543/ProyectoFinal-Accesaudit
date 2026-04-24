import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { PdfService } from './pdf.service';

interface AuditSummary {
  totalRules: number;
  passed: number;
  violations: number;
  incomplete: number;
  inapplicable: number;
  passRate: number;
  conformanceLevel: string;
  levelCounts: {
    critical: number;
    serious: number;
    moderate: number;
    minor: number;
  };
  wcagCounts: Record<string, number>;
}

interface CriterionResult {
  id: string;
  level: string;
  description: string;
  autoVerification: string;
  status: 'passed' | 'failed' | 'manual';
  failedRules?: string[];
}

interface AuditResult {
  url: string;
  timestamp: string;
  violations: any[];
  passes: any[];
  incomplete: any[];
  inapplicable: any[];
  criteria: CriterionResult[];
  summary: AuditSummary;
}

interface ManualCheck {
  id: string;
  label: string;
  description: string;
  autoVerification?: string;
  passed: boolean;
}

interface Recommendation {
  id: string;
  title: string;
  description: string;
  affectedCriterion: string;
  affectedCriterionId: string;
  impact: 'crítico' | 'serio' | 'moderado' | 'menor';
  difficulty: 'fácil' | 'media' | 'difícil';
  priorityScore: number;
  actions: string[];
  estimatedTimeMinutes: number;
}

interface Discrepancy {
  criterionId: string;
  criterionDescription: string;
  automaticResult: 'passed' | 'failed' | 'manual';
  manualResult: 'passed' | 'failed' | null;
  match: boolean;
  discrepancyType?: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, NgChartsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  auditUrl = 'https://example.com';
  report: AuditResult | null = null;
  reports: AuditResult[] = [];
  recommendations: Recommendation[] = [];
  discrepancies: Discrepancy[] = [];
  loading = false;
  error = '';
  wcagTagKeys = ['wcag2a', 'wcag2aa', 'wcag2aaa', 'wcag21a', 'wcag21aa', 'wcag21aaa'];
  activeTab: 'report' | 'recommendations' | 'discrepancies' | 'comparison' = 'report';

  // Configuración del gráfico comparativo
  public barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    scales: {
      x: {},
      y: {
        min: 0,
        max: 100
      }
    },
    plugins: {
      legend: {
        display: true,
      },
      title: {
        display: true,
        text: 'Comparación de Conformidad de Accesibilidad (%)'
      }
    }
  };

  public barChartType: ChartType = 'bar';

  public barChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'Tasa de Conformidad',
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      }
    ]
  };

  get reportsCount(): number {
    return this.reports.length;
  }

  get averagePassRate(): number {
    if (!this.reports.length) {
      return 0;
    }
    const total = this.reports.reduce((sum, report) => sum + report.summary.passRate, 0);
    return Math.round((total / this.reports.length) * 100) / 100;
  }

  get bestSite(): AuditResult | null {
    return this.reports.length
      ? this.reports.reduce((best, current) => (current.summary.passRate > best.summary.passRate ? current : best))
      : null;
  }

  get worstSite(): AuditResult | null {
    return this.reports.length
      ? this.reports.reduce((worst, current) => (current.summary.passRate < worst.summary.passRate ? current : worst))
      : null;
  }

  get criticalViolations(): number {
    return this.report?.summary.levelCounts.critical || 0;
  }

  get seriousViolations(): number {
    return this.report?.summary.levelCounts.serious || 0;
  }

  get moderateViolations(): number {
    return this.report?.summary.levelCounts.moderate || 0;
  }

  get minorViolations(): number {
    return this.report?.summary.levelCounts.minor || 0;
  }

  manualChecks: ManualCheck[] = [
    {
      id: '1.1.1',
      label: '1.1.1 – Contenido no textual',
      description: 'Toda imagen tiene texto alternativo.',
      autoVerification: 'axe-core: image-alt',
      passed: false,
    },
    {
      id: '1.2.1',
      label: '1.2.1 – Solo audio y video (grabado)',
      description: 'Alternativa para contenido multimedia.',
      autoVerification: 'axe-core: audio-caption',
      passed: false,
    },
    {
      id: '1.3.1',
      label: '1.3.1 – Información y relaciones',
      description: 'La estructura semántica (encabezados, listas) es correcta.',
      autoVerification: 'axe-core: heading-order, list',
      passed: false,
    },
    {
      id: '1.3.2',
      label: '1.3.2 – Secuencia significativa',
      description: 'El orden de lectura del DOM tiene sentido.',
      autoVerification: 'axe-core: meta-viewport',
      passed: false,
    },
    {
      id: '1.4.1',
      label: '1.4.1 – Uso del color',
      description: 'El color no es el único medio para transmitir información.',
      autoVerification: 'axe-core: color-contrast (parcial)',
      passed: false,
    },
    {
      id: '1.4.3',
      label: '1.4.3 – Contraste (mínimo)',
      description: 'Contraste de texto de al menos 4.5:1.',
      autoVerification: 'axe-core: color-contrast',
      passed: false,
    },
    {
      id: '1.4.4',
      label: '1.4.4 – Redimensionar texto',
      description: 'El texto puede escalarse hasta 200% sin pérdida.',
      autoVerification: 'Playwright: zoom test',
      passed: false,
    },
    {
      id: '1.4.10',
      label: '1.4.10 – Reflow',
      description: 'No requiere desplazamiento horizontal en ancho 320px.',
      autoVerification: 'Playwright: viewport test',
      passed: false,
    },
    {
      id: '2.1.1',
      label: '2.1.1 – Teclado',
      description: 'Todas las funciones son accesibles por teclado.',
      autoVerification: 'axe-core: keyboard',
      passed: false,
    },
    {
      id: '2.1.2',
      label: '2.1.2 – Sin trampa de foco',
      description: 'El foco no queda atrapado en ningún elemento.',
      autoVerification: 'axe-core: focus-traps',
      passed: false,
    },
    {
      id: '2.4.1',
      label: '2.4.1 – Saltar bloques',
      description: 'Existe un enlace para saltar al contenido principal.',
      autoVerification: 'axe-core: skip-link',
      passed: false,
    },
    {
      id: '2.4.2',
      label: '2.4.2 – Título de página',
      description: 'La página tiene un título descriptivo.',
      autoVerification: 'axe-core: page-title',
      passed: false,
    },
    {
      id: '2.4.3',
      label: '2.4.3 – Orden de foco',
      description: 'El orden de tabulación es lógico.',
      autoVerification: 'axe-core: focus-order',
      passed: false,
    },
    {
      id: '2.4.4',
      label: '2.4.4 – Propósito del enlace (en contexto)',
      description: 'El texto del enlace describe su destino.',
      autoVerification: 'axe-core: link-name',
      passed: false,
    },
    {
      id: '4.1.2',
      label: '4.1.2 – Nombre, rol, valor',
      description: 'Los elementos de formulario tienen etiquetas asociadas.',
      autoVerification: 'axe-core: label',
      passed: false,
    },
  ];

  constructor(private http: HttpClient, private pdfService: PdfService) {}

  runAudit(): void {
    this.error = '';
    this.report = null;
    this.recommendations = [];
    this.discrepancies = [];
    this.manualChecks = this.manualChecks.map((check) => ({ ...check, passed: false }));

    if (!this.auditUrl || !this.auditUrl.startsWith('http')) {
      this.error = 'Ingresa una URL válida que comience con http:// o https://';
      return;
    }

    this.loading = true;

    this.http.post<AuditResult>('/api/audit', { url: this.auditUrl })
      .subscribe({
        next: (result) => {
          this.report = result;
          this.reports.unshift(result);
          this.reports.sort((a, b) => b.summary.passRate - a.summary.passRate);
          this.updateChart();
          
          // Cargar recomendaciones automáticamente
          this.loadRecommendations();
          this.activeTab = 'report';
          this.loading = false;
        },
        error: (err) => {
          this.error = err?.error?.error || 'Error al ejecutar la auditoría';
          this.loading = false;
        }
      });
  }

  loadRecommendations(): void {
    if (!this.report) return;

    this.http.post<{ recommendations: Recommendation[] }>('/api/recommendations', {})
      .subscribe({
        next: (result) => {
          this.recommendations = result.recommendations;
        },
        error: (err) => {
          console.error('Error loading recommendations:', err);
        }
      });
  }

  calculateDiscrepancies(): void {
    if (!this.report) return;

    const manualResults: Record<string, boolean> = {};
    this.manualChecks.forEach((check) => {
      manualResults[check.id] = check.passed;
    });

    this.http.post<{ discrepancies: Discrepancy[] }>('/api/discrepancies', { manualResults })
      .subscribe({
        next: (result) => {
          this.discrepancies = result.discrepancies;
          this.activeTab = 'discrepancies';
        },
        error: (err) => {
          this.error = 'Error al calcular discrepancias: ' + (err?.error?.error || 'desconocido');
        }
      });
  }

  clearHistory(): void {
    this.reports = [];
    this.updateChart();
  }

  getBestSiteName(): string {
    if (!this.bestSite) return '';
    try {
      return new URL(this.bestSite.url).hostname;
    } catch {
      return this.bestSite.url;
    }
  }

  getWorstSiteName(): string {
    if (!this.worstSite) return '';
    try {
      return new URL(this.worstSite.url).hostname;
    } catch {
      return this.worstSite.url;
    }
  }

  updateChart(): void {
    const labels = this.reports.map(r => {
      try {
        const url = new URL(r.url);
        return url.hostname;
      } catch {
        return r.url;
      }
    });
    const data = this.reports.map(r => r.summary.passRate);

    this.barChartData = {
      labels,
      datasets: [
        {
          data,
          label: 'Tasa de Conformidad (%)',
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }
      ]
    };
  }

  get manualScore(): number {
    const total = this.manualChecks.length;
    const passed = this.manualChecks.filter((check) => check.passed).length;
    return total > 0 ? Math.round((passed / total) * 100) : 0;
  }

  // Métodos para obtener conteos de criterios
  getPassedCriteriaCount(): number {
    return this.report?.criteria.filter(c => c.status === 'passed').length || 0;
  }

  getFailedCriteriaCount(): number {
    return this.report?.criteria.filter(c => c.status === 'failed').length || 0;
  }

  getManualCriteriaCount(): number {
    return this.report?.criteria.filter(c => c.status === 'manual').length || 0;
  }

  // Método para determinar tipo de discrepancia con texto
  getDiscrepancyLabel(discrepancyType?: string): string {
    switch (discrepancyType) {
      case 'false-positive':
        return '❌ Falso Positivo';
      case 'false-negative':
        return '⚠️ Falso Negativo';
      default:
        return '❓ Diferencia';
    }
  }

  // Método para verificar si hay discrepancias sin analizar
  hasDiscrepanciesNotAnalyzed(): boolean {
    return this.discrepancies.length === 0 && this.manualChecks.some(c => c.passed);
  }

  getImpactColor(impact: string): string {
    switch (impact) {
      case 'crítico': return '#dc2626';
      case 'serio': return '#ea580c';
      case 'moderado': return '#f59e0b';
      case 'menor': return '#06b6d4';
      default: return '#6b7280';
    }
  }

  getDifficultyColor(difficulty: string): string {
    switch (difficulty) {
      case 'fácil': return '#10b981';
      case 'media': return '#f59e0b';
      case 'difícil': return '#ef4444';
      default: return '#6b7280';
    }
  }

  setActiveTab(tab: 'report' | 'recommendations' | 'discrepancies' | 'comparison'): void {
    this.activeTab = tab;
  }

  downloadPdf(): void {
    if (!this.report) {
      this.error = 'No hay reporte disponible para descargar';
      return;
    }

    try {
      const fileName = `audit-report-${new URL(this.report.url).hostname}-${new Date().toISOString().split('T')[0]}.pdf`;
      this.pdfService.generateAuditPdf(this.report, this.recommendations, fileName);
    } catch (error) {
      this.error = 'Error al generar el PDF: ' + (error instanceof Error ? error.message : 'desconocido');
    }
  }
}