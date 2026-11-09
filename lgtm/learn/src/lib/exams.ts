// Exam domains and competencies, copied from the official curriculum PDFs.
// OTCA: https://raw.githubusercontent.com/cncf/curriculum/master/OTCA_Curriculum.pdf
// PCA:  https://raw.githubusercontent.com/cncf/curriculum/master/PCA_Curriculum.pdf
// Recorded in lgtm/docs/research/02-certs-and-demand.md. Steps and questions must use these names exactly.

export type Cert = 'otca' | 'pca';

export const DOMAINS: Record<string, { cert: Cert; name: string; competencies: readonly string[] }> = {
  O1: { cert: 'otca', name: 'Fundamentals of Observability', competencies: ['Telemetry Data', 'Semantic Conventions', 'Instrumentation', 'Analysis and Outcomes'] },
  O2: {
    cert: 'otca',
    name: 'The OpenTelemetry API and SDK',
    competencies: ['Data Model', 'Composability and Extension', 'Configuration', 'Signals (Tracing, Metric, Log)', 'SDK Pipelines', 'Context Propagation', 'Agents'],
  },
  O3: { cert: 'otca', name: 'The OpenTelemetry Collector', competencies: ['Configuration', 'Deployment', 'Scaling', 'Pipelines', 'Transforming Data'] },
  O4: {
    cert: 'otca',
    name: 'Maintaining and Debugging Observability Pipelines',
    competencies: ['Context Propagation', 'Debugging Pipelines', 'Error Handling', 'Schema Management'],
  },
  P1: {
    cert: 'pca',
    name: 'Observability Concepts',
    competencies: ['Metrics', 'Understand logs and events', 'Tracing and Spans', 'Push vs Pull', 'Service Discovery', 'Basics of SLOs, SLAs, and SLIs'],
  },
  P2: {
    cert: 'pca',
    name: 'Prometheus Fundamentals',
    competencies: ['System Architecture', 'Configuration and Scraping', 'Understanding Prometheus Limitations', 'Data Model and Labels', 'Exposition Format'],
  },
  P3: {
    cert: 'pca',
    name: 'PromQL',
    competencies: ['Selecting Data', 'Rates and Derivatives', 'Aggregating over time', 'Aggregating over dimensions', 'Binary operators', 'Histograms', 'Timestamp Metrics'],
  },
  P4: { cert: 'pca', name: 'Instrumentation and Exporters', competencies: ['Client Libraries', 'Instrumentation', 'Exporters', 'Structuring and naming metrics'] },
  P5: {
    cert: 'pca',
    name: 'Alerting & Dashboarding',
    competencies: ['Dashboarding basics', 'Configuring Alerting rules', 'Understand and Use Alertmanager', 'Alerting basics (when, what, and why)'],
  },
};

/** Lab addresses a lesson may link to with <LabLink to="...">; from 02-lab-contract.md, "Addresses in the browser". */
export const LAB_HOSTS = ['grafana', 'shop', 'flags', 'loadgen', 'prometheus', 'alertmanager', 'mimir', 'loki', 'tempo', 'alloy', 'otlp', 'longhorn', 's3'] as const;

/**
 * The two exams as the mock exams and the readiness panel use them. Domain weights, question
 * count, duration and pass mark come from lgtm/docs/plan/01-curriculum.md ("Exam domains used
 * for mapping"), which cites the official curriculum PDFs and the Linux Foundation exam FAQ.
 */
export const EXAMS: Record<Cert, { name: string; questions: number; minutes: number; pass: number; weights: Readonly<Record<string, number>> }> = {
  otca: { name: 'OpenTelemetry Certified Associate (OTCA)', questions: 60, minutes: 90, pass: 0.75, weights: { O1: 18, O2: 46, O3: 26, O4: 10 } },
  pca: { name: 'Prometheus Certified Associate (PCA)', questions: 60, minutes: 90, pass: 0.75, weights: { P1: 18, P2: 20, P3: 28, P4: 16, P5: 18 } },
};
