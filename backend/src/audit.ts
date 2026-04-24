import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

type WcagCounts = Record<string, number>;

type CriterionStatus = 'passed' | 'failed' | 'manual';

type DifficultyLevel = 'fácil' | 'media' | 'difícil';
type ImpactLevel = 'crítico' | 'serio' | 'moderado' | 'menor';

interface CriterionDefinition {
  id: string;
  level: string;
  description: string;
  autoVerification: string;
  axeRules: string[];
  manual?: boolean;
}

interface Discrepancy {
  criterionId: string;
  criterionDescription: string;
  automaticResult: CriterionStatus;
  manualResult: CriterionStatus | null;
  match: boolean;
  discrepancyType?: string; // 'false-positive' | 'false-negative' | 'different-manual-reading'
}

interface Recommendation {
  id: string;
  title: string;
  description: string;
  affectedCriterion: string;
  affectedCriterionId: string;
  impact: ImpactLevel;
  difficulty: DifficultyLevel;
  priorityScore: number; // 0-100
  actions: string[];
  estimatedTimeMinutes: number;
}

export async function auditPage(url: string) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

  const results = await new AxeBuilder({ page }).analyze();

  await browser.close();

  const failedRuleIds = new Set(results.violations.map((violation) => violation.id));

  const criteriaDefinitions: CriterionDefinition[] = [
    {
      id: '1.1.1',
      level: 'A',
      description: 'Contenido no textual',
      autoVerification: 'axe-core: image-alt',
      axeRules: ['image-alt'],
    },
    {
      id: '1.2.1',
      level: 'A',
      description: 'Solo audio y video (grabado)',
      autoVerification: 'axe-core: audio-caption',
      axeRules: ['audio-caption'],
    },
    {
      id: '1.3.1',
      level: 'A',
      description: 'Información y relaciones',
      autoVerification: 'axe-core: heading-order, list',
      axeRules: ['heading-order', 'list'],
    },
    {
      id: '1.3.2',
      level: 'A',
      description: 'Secuencia significativa',
      autoVerification: 'axe-core: meta-viewport',
      axeRules: ['meta-viewport'],
    },
    {
      id: '1.4.1',
      level: 'A',
      description: 'Uso del color',
      autoVerification: 'axe-core: color-contrast (parcial)',
      axeRules: ['color-contrast'],
    },
    {
      id: '1.4.3',
      level: 'AA',
      description: 'Contraste mínimo',
      autoVerification: 'axe-core: color-contrast',
      axeRules: ['color-contrast'],
    },
    {
      id: '1.4.4',
      level: 'AA',
      description: 'Redimensionar texto',
      autoVerification: 'Playwright: zoom test',
      axeRules: [],
      manual: true,
    },
    {
      id: '1.4.10',
      level: 'AA',
      description: 'Reflow',
      autoVerification: 'Playwright: viewport test',
      axeRules: [],
      manual: true,
    },
    {
      id: '2.1.1',
      level: 'A',
      description: 'Teclado',
      autoVerification: 'axe-core: keyboard',
      axeRules: ['keyboard'],
    },
    {
      id: '2.1.2',
      level: 'A',
      description: 'Sin trampa de foco',
      autoVerification: 'axe-core: focus-traps',
      axeRules: ['focus-traps'],
    },
    {
      id: '2.4.1',
      level: 'A',
      description: 'Saltar bloques',
      autoVerification: 'axe-core: skip-link',
      axeRules: ['skip-link'],
    },
    {
      id: '2.4.2',
      level: 'A',
      description: 'Título de página',
      autoVerification: 'axe-core: page-title',
      axeRules: ['page-title'],
    },
    {
      id: '2.4.3',
      level: 'A',
      description: 'Orden de foco',
      autoVerification: 'axe-core: focus-order',
      axeRules: ['focus-order'],
    },
    {
      id: '2.4.4',
      level: 'A',
      description: 'Propósito del enlace (en contexto)',
      autoVerification: 'axe-core: link-name',
      axeRules: ['link-name'],
    },
    {
      id: '4.1.2',
      level: 'A',
      description: 'Nombre, rol, valor',
      autoVerification: 'axe-core: label',
      axeRules: ['label'],
    },
  ];

  const criteria = criteriaDefinitions.map((criterion) => {
    const failedRules = criterion.axeRules.filter((rule) => failedRuleIds.has(rule));
    const status: CriterionStatus = criterion.manual
      ? 'manual'
      : failedRules.length > 0
      ? 'failed'
      : 'passed';

    return {
      ...criterion,
      status,
      failedRules: failedRules.length ? failedRules : undefined,
    };
  });

  const totalRules =
    results.passes.length +
    results.violations.length +
    results.incomplete.length +
    results.inapplicable.length;
  const passRate = totalRules > 0 ? Math.round((results.passes.length / totalRules) * 10000) / 100 : 0;

  const levelCounts = {
    critical: results.violations.filter((v) => v.impact === 'critical').length,
    serious: results.violations.filter((v) => v.impact === 'serious').length,
    moderate: results.violations.filter((v) => v.impact === 'moderate').length,
    minor: results.violations.filter((v) => v.impact === 'minor').length,
  };

  const wcagTags = ['wcag2a', 'wcag2aa', 'wcag2aaa', 'wcag21a', 'wcag21aa', 'wcag21aaa'];
  const wcagCounts: WcagCounts = wcagTags.reduce((acc, tag) => ({ ...acc, [tag]: 0 }), {});

  results.violations.forEach((violation) => {
    const tags = Array.isArray(violation.tags) ? violation.tags : [];
    tags.forEach((tag) => {
      if (wcagCounts[tag] !== undefined) {
        wcagCounts[tag] += 1;
      }
    });
  });

  const conformanceLevel =
    passRate >= 95 ? 'AAA' : passRate >= 90 ? 'AA' : passRate >= 80 ? 'A' : 'Below A';

  return {
    url,
    timestamp: new Date().toISOString(),
    violations: results.violations,
    passes: results.passes,
    incomplete: results.incomplete,
    inapplicable: results.inapplicable,
    toolOptions: results.toolOptions,
    testEngine: results.testEngine,
    criteria,
    summary: {
      totalRules,
      passed: results.passes.length,
      violations: results.violations.length,
      incomplete: results.incomplete.length,
      inapplicable: results.inapplicable.length,
      passRate,
      conformanceLevel,
      levelCounts,
      wcagCounts,
    },
  };
}

// Función para generar recomendaciones basadas en criterios fallidos
export function generateRecommendations(auditReport: any): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const impactToPriorityMap: Record<string, number> = {
    'critical': 100,
    'serious': 75,
    'moderate': 50,
    'minor': 25,
  };

  const difficultyToPriorityMap: Record<DifficultyLevel, number> = {
    'fácil': 40,
    'media': 20,
    'difícil': 10,
  };

  // Generar recomendaciones basadas en criterios fallidos
  auditReport.criteria.forEach((criterion: any, index: number) => {
    if (criterion.status === 'failed') {
      const impact = getImpactForCriterion(criterion.id);
      const difficulty = getDifficultyForCriterion(criterion.id);
      const impactScore = impactToPriorityMap[impact] || 50;
      const difficultyScore = difficultyToPriorityMap[difficulty];
      const priorityScore = Math.round((impactScore + difficultyScore) / 2);

      const rec = getRecommendationForCriterion(criterion.id);

      recommendations.push({
        id: `rec-${index}`,
        title: rec.title,
        description: rec.description,
        affectedCriterion: criterion.description,
        affectedCriterionId: criterion.id,
        impact,
        difficulty,
        priorityScore,
        actions: rec.actions,
        estimatedTimeMinutes: rec.estimatedTimeMinutes,
      });
    }
  });

  // Ordenar por priorityScore descendente (mayor prioridad primero)
  return recommendations.sort((a, b) => b.priorityScore - a.priorityScore);
}

// Mapeo de reglas axe a criterios WCAG
function findRelatedCriterion(axeRuleId: string): any {
  const criteriaDefinitions: CriterionDefinition[] = [
    {
      id: '1.1.1',
      level: 'A',
      description: 'Contenido no textual',
      autoVerification: 'axe-core: image-alt',
      axeRules: ['image-alt'],
    },
    {
      id: '1.2.1',
      level: 'A',
      description: 'Solo audio y video (grabado)',
      autoVerification: 'axe-core: audio-caption',
      axeRules: ['audio-caption'],
    },
    {
      id: '1.3.1',
      level: 'A',
      description: 'Información y relaciones',
      autoVerification: 'axe-core: heading-order, list',
      axeRules: ['heading-order', 'list'],
    },
    {
      id: '1.3.2',
      level: 'A',
      description: 'Secuencia significativa',
      autoVerification: 'axe-core: meta-viewport',
      axeRules: ['meta-viewport'],
    },
    {
      id: '1.4.1',
      level: 'A',
      description: 'Uso del color',
      autoVerification: 'axe-core: color-contrast (parcial)',
      axeRules: ['color-contrast'],
    },
    {
      id: '1.4.3',
      level: 'AA',
      description: 'Contraste mínimo',
      autoVerification: 'axe-core: color-contrast',
      axeRules: ['color-contrast'],
    },
    {
      id: '2.1.1',
      level: 'A',
      description: 'Teclado',
      autoVerification: 'axe-core: keyboard',
      axeRules: ['keyboard'],
    },
    {
      id: '2.1.2',
      level: 'A',
      description: 'Sin trampa de foco',
      autoVerification: 'axe-core: focus-traps',
      axeRules: ['focus-traps'],
    },
    {
      id: '2.4.1',
      level: 'A',
      description: 'Saltar bloques',
      autoVerification: 'axe-core: skip-link',
      axeRules: ['skip-link'],
    },
    {
      id: '2.4.2',
      level: 'A',
      description: 'Título de página',
      autoVerification: 'axe-core: page-title',
      axeRules: ['page-title'],
    },
    {
      id: '2.4.3',
      level: 'A',
      description: 'Orden de foco',
      autoVerification: 'axe-core: focus-order',
      axeRules: ['focus-order'],
    },
    {
      id: '2.4.4',
      level: 'A',
      description: 'Propósito del enlace (en contexto)',
      autoVerification: 'axe-core: link-name',
      axeRules: ['link-name'],
    },
    {
      id: '4.1.2',
      level: 'A',
      description: 'Nombre, rol, valor',
      autoVerification: 'axe-core: label',
      axeRules: ['label'],
    },
  ];

  for (const criterion of criteriaDefinitions) {
    if (criterion.axeRules.includes(axeRuleId)) {
      return criterion;
    }
  }
  return null;
}

// Estimar dificultad de corrección
function estimateDifficulty(axeRuleId: string): DifficultyLevel {
  const easyFixes = ['page-title', 'image-alt', 'link-name', 'label'];
  const mediumFixes = ['color-contrast', 'heading-order', 'list', 'focus-order'];
  const hardFixes = ['keyboard', 'focus-traps', 'skip-link'];

  if (easyFixes.includes(axeRuleId)) return 'fácil';
  if (mediumFixes.includes(axeRuleId)) return 'media';
  if (hardFixes.includes(axeRuleId)) return 'difícil';
  return 'media';
}

// Estimar tiempo de corrección
function estimateTime(difficulty: DifficultyLevel): number {
  switch (difficulty) {
    case 'fácil': return 15;
    case 'media': return 45;
    case 'difícil': return 120;
    default: return 30;
  }
}

// Obtener impacto para un criterio
function getImpactForCriterion(criterionId: string): ImpactLevel {
  const impactMap: Record<string, ImpactLevel> = {
    '1.1.1': 'crítico',
    '1.2.1': 'serio',
    '1.3.1': 'moderado',
    '1.3.2': 'moderado',
    '1.4.1': 'serio',
    '1.4.3': 'crítico',
    '1.4.4': 'moderado',
    '1.4.10': 'moderado',
    '2.1.1': 'crítico',
    '2.1.2': 'serio',
    '2.4.1': 'moderado',
    '2.4.2': 'menor',
    '2.4.3': 'moderado',
    '2.4.4': 'moderado',
    '4.1.2': 'serio',
  };
  return impactMap[criterionId] || 'moderado';
}

// Obtener dificultad para un criterio
function getDifficultyForCriterion(criterionId: string): DifficultyLevel {
  const difficultyMap: Record<string, DifficultyLevel> = {
    '1.1.1': 'fácil',
    '1.2.1': 'difícil',
    '1.3.1': 'media',
    '1.3.2': 'media',
    '1.4.1': 'media',
    '1.4.3': 'media',
    '1.4.4': 'fácil',
    '1.4.10': 'media',
    '2.1.1': 'difícil',
    '2.1.2': 'difícil',
    '2.4.1': 'fácil',
    '2.4.2': 'fácil',
    '2.4.3': 'media',
    '2.4.4': 'fácil',
    '4.1.2': 'fácil',
  };
  return difficultyMap[criterionId] || 'media';
}

// Obtener recomendación específica para un criterio
function getRecommendationForCriterion(criterionId: string): { title: string; description: string; actions: string[]; estimatedTimeMinutes: number } {
  const recommendationsMap: Record<string, { title: string; description: string; actions: string[]; estimatedTimeMinutes: number }> = {
    '1.1.1': {
      title: 'Agregar texto alternativo a imágenes',
      description: 'Todas las imágenes deben tener un atributo alt descriptivo para usuarios con discapacidades visuales.',
      actions: [
        'Identificar todas las imágenes sin alt',
        'Escribir descripciones concisas pero informativas',
        'Agregar atributo alt="" para imágenes decorativas'
      ],
      estimatedTimeMinutes: 15
    },
    '1.2.1': {
      title: 'Proporcionar subtítulos para contenido multimedia',
      description: 'El contenido de audio y video debe tener subtítulos o transcripciones.',
      actions: [
        'Crear subtítulos sincronizados',
        'Proporcionar transcripción textual',
        'Verificar precisión de los subtítulos'
      ],
      estimatedTimeMinutes: 120
    },
    '1.3.1': {
      title: 'Mejorar la estructura semántica del contenido',
      description: 'Usar encabezados, listas y otras estructuras HTML correctamente.',
      actions: [
        'Revisar jerarquía de encabezados (H1-H6)',
        'Convertir texto en negrita a encabezados apropiados',
        'Usar elementos de lista para contenido listado'
      ],
      estimatedTimeMinutes: 45
    },
    '1.3.2': {
      title: 'Asegurar secuencia significativa del contenido',
      description: 'El orden de lectura debe ser lógico tanto visual como programáticamente.',
      actions: [
        'Verificar orden de tabulación',
        'Reorganizar contenido si es necesario',
        'Usar CSS para posicionamiento sin afectar accesibilidad'
      ],
      estimatedTimeMinutes: 45
    },
    '1.4.1': {
      title: 'Evitar el uso exclusivo del color para transmitir información',
      description: 'La información no debe depender únicamente del color.',
      actions: [
        'Agregar texto o iconos junto al color',
        'Usar patrones o texturas adicionales',
        'Proporcionar alternativas textuales'
      ],
      estimatedTimeMinutes: 30
    },
    '1.4.3': {
      title: 'Mejorar el contraste de color',
      description: 'El texto debe tener suficiente contraste con el fondo.',
      actions: [
        'Medir ratios de contraste',
        'Ajustar colores de texto y fondo',
        'Considerar usuarios con baja visión'
      ],
      estimatedTimeMinutes: 30
    },
    '1.4.4': {
      title: 'Permitir redimensionar texto hasta 200%',
      description: 'El contenido debe ser legible cuando se amplía.',
      actions: [
        'Probar zoom al 200%',
        'Usar unidades relativas (em, rem)',
        'Evitar texto en imágenes'
      ],
      estimatedTimeMinutes: 15
    },
    '1.4.10': {
      title: 'Asegurar que el contenido se adapte a diferentes tamaños de pantalla',
      description: 'El contenido debe fluir correctamente en pantallas pequeñas.',
      actions: [
        'Probar en viewport de 320px',
        'Usar media queries apropiadas',
        'Evitar scroll horizontal'
      ],
      estimatedTimeMinutes: 45
    },
    '2.1.1': {
      title: 'Hacer todo funcional con teclado',
      description: 'Todas las funciones deben ser accesibles sin mouse.',
      actions: [
        'Probar navegación con tab',
        'Agregar indicadores de foco visibles',
        'Implementar atajos de teclado'
      ],
      estimatedTimeMinutes: 120
    },
    '2.1.2': {
      title: 'Evitar trampas de foco',
      description: 'El foco no debe quedar atrapado en secciones.',
      actions: [
        'Revisar modales y menús desplegables',
        'Asegurar escape de foco',
        'Probar navegación secuencial'
      ],
      estimatedTimeMinutes: 60
    },
    '2.4.1': {
      title: 'Agregar enlaces para saltar bloques de contenido',
      description: 'Proporcionar atajos para navegar secciones importantes.',
      actions: [
        'Agregar enlace "Saltar al contenido principal"',
        'Crear enlaces para navegación',
        'Posicionar al inicio de la página'
      ],
      estimatedTimeMinutes: 15
    },
    '2.4.2': {
      title: 'Agregar título descriptivo a la página',
      description: 'Cada página debe tener un título único y descriptivo.',
      actions: [
        'Revisar etiqueta <title>',
        'Hacer títulos únicos por página',
        'Incluir nombre del sitio y página actual'
      ],
      estimatedTimeMinutes: 5
    },
    '2.4.3': {
      title: 'Corregir orden de foco lógico',
      description: 'El orden de tabulación debe seguir el orden visual.',
      actions: [
        'Probar secuencia de tabulación',
        'Usar tabindex solo cuando sea necesario',
        'Reorganizar elementos HTML si es necesario'
      ],
      estimatedTimeMinutes: 30
    },
    '2.4.4': {
      title: 'Hacer que el propósito de los enlaces sea claro',
      description: 'Los enlaces deben tener texto descriptivo.',
      actions: [
        'Revisar enlaces como "click aquí"',
        'Agregar contexto al texto del enlace',
        'Usar aria-label si es necesario'
      ],
      estimatedTimeMinutes: 20
    },
    '4.1.2': {
      title: 'Proporcionar nombres accesibles a elementos interactivos',
      description: 'Botones, campos de formulario y otros controles deben tener etiquetas.',
      actions: [
        'Agregar etiquetas <label> a inputs',
        'Usar aria-label para elementos sin texto visible',
        'Asegurar nombres únicos para elementos similares'
      ],
      estimatedTimeMinutes: 20
    },
  };
  return recommendationsMap[criterionId] || {
    title: 'Revisar cumplimiento de accesibilidad',
    description: 'Verificar que el criterio de accesibilidad se cumpla correctamente.',
    actions: ['Revisar documentación WCAG', 'Implementar correcciones necesarias'],
    estimatedTimeMinutes: 30
  };
}

// Generar acciones concretas
function generateActions(axeRuleId: string, violation: any): string[] {
  const actionsMap: Record<string, string[]> = {
    'image-alt': [
      'Añadir atributo alt a todas las imágenes',
      'Describir el contenido visual de forma clara y concisa',
      'Usar alt="" para imágenes decorativas',
    ],
    'color-contrast': [
      'Aumentar el contraste entre texto y fondo',
      'Usar colores más oscuros para el texto',
      'Usar colores más claros para el fondo',
      'Verificar que el ratio sea al menos 4.5:1 para texto normal',
    ],
    'link-name': [
      'Cambiar "click aquí" por texto más descriptivo',
      'Incluir el destino del enlace en el texto',
      'Usar aria-label si el texto visual no es suficiente',
    ],
    'page-title': [
      'Agregar etiqueta <title> con contenido descriptivo',
      'Hacer el título único y representativo',
    ],
    'heading-order': [
      'Usar jerarquía de encabezados correcta (h1, h2, h3...)',
      'Evitar saltar niveles de encabezado',
      'Comenzar con h1',
    ],
    'label': [
      'Añadir etiqueta <label> asociada a inputs',
      'Usar atributo for="id" en labels',
      'Proporcionar instrucciones claras para campos',
    ],
    'keyboard': [
      'Permitir navegación por teclado en todos los elementos interactivos',
      'Implementar order de tabulación lógico',
      'Hacer visibles los indicadores de foco',
    ],
  };

  return actionsMap[axeRuleId] || [
    'Revisar la descripción del error',
    'Consultar la guía WCAG relacionada',
    'Implementar la corrección sugerida',
  ];
}

// Función para calcular discrepancias entre análisis automático y manual
export function calculateDiscrepancies(
  criteria: any[],
  manualResults: Record<string, boolean>
): Discrepancy[] {
  const discrepancies: Discrepancy[] = [];

  criteria.forEach((criterion) => {
    const manualResult = manualResults[criterion.id];

    if (manualResult !== undefined) {
      const manualStatus: CriterionStatus = manualResult ? 'passed' : 'failed';
      const matches = criterion.status === manualStatus || criterion.status === 'manual';

      if (!matches) {
        discrepancies.push({
          criterionId: criterion.id,
          criterionDescription: criterion.description,
          automaticResult: criterion.status,
          manualResult: manualStatus,
          match: false,
          discrepancyType: criterion.status === 'passed' && manualStatus === 'failed'
            ? 'false-positive'
            : 'false-negative',
        });
      }
    }
  });

  return discrepancies;
}
