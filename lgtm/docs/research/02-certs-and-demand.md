# Certifications and employer demand for an LGTM + OpenTelemetry course

Verified 2026-11-09. Every fact below was checked on the web on that date, and each claim is followed by its source. If a claim rests on a third-party or secondary source, the text says so. Gaps are collected in the last section.

---

## Part A. Certifications

### A1. OpenTelemetry Certified Associate (OTCA), Linux Foundation / CNCF

**Status.** The exam is offered and open for enrollment. The page says "Now Available!" and has an "Enroll Today" button, although its meta description still says "Coming Soon!", which is a stale leftover. Source: https://training.linuxfoundation.org/certification/opentelemetry-certified-associate-otca/

**Launch.** The Linux Foundation announced the exam on 15 November 2024. Source: https://training.linuxfoundation.org/blog/new-certification-opentelemetry-certified-associate-otca/

| Item | Value | Source |
|---|---|---|
| Price | US$250 for the exam only, or US$495 bundled with the THRIVE-ONE annual subscription | https://training.linuxfoundation.org/certification/opentelemetry-certified-associate-otca/ |
| Question type | Online, proctored, multiple choice | same page |
| Duration | 90 minutes | same page |
| Number of questions | 60 by the Linux Foundation's generic multiple-choice rule. The rule carries an asterisk, and the exam page itself gives no count. | https://docs.linuxfoundation.org/tc-docs/certification/important-instructions-mc |
| Passing score | 75% for all LF multiple-choice exams | https://docs.linuxfoundation.org/tc-docs/certification/faq-mc.md |
| Proctoring | Remote, on PSI's "Bridge" platform with the PSI Secure Browser | https://docs.linuxfoundation.org/tc-docs/certification/important-instructions-mc |
| Retake | One retake included. The page says "One Retake" in one place and "Two exam attempts" in another, which amount to the same thing. | https://training.linuxfoundation.org/certification/opentelemetry-certified-associate-otca/ |
| Eligibility window | 12 months to schedule and take the exam | same page |
| Validity | 2 years | same page |
| Prerequisites / level | None / Beginner | same page |

**Curriculum version.** The official curriculum is the PDF `OTCA_Curriculum.pdf` in github.com/cncf/curriculum. It has no version number, and its only commit is "OTCA Exam Curriculum" on 2024-11-28. Sources: https://github.com/cncf/curriculum and https://api.github.com/repos/cncf/curriculum/commits?path=OTCA_Curriculum.pdf

**Domains and competencies.** The names below are copied exactly from the PDF. They match the LF exam page and the launch blog. Sources: https://raw.githubusercontent.com/cncf/curriculum/master/OTCA_Curriculum.pdf and https://training.linuxfoundation.org/certification/opentelemetry-certified-associate-otca/

| Domain | Weight | Competencies |
|---|---|---|
| Fundamentals of Observability | 18% | Telemetry Data; Semantic Conventions; Instrumentation; Analysis and Outcomes |
| The OpenTelemetry API and SDK | 46% | Data Model; Composability and Extension; Configuration; Signals (Tracing, Metric, Log); SDK Pipelines; Context Propagation; Agents |
| The OpenTelemetry Collector | 26% | Configuration; Deployment; Scaling; Pipelines; Transforming Data |
| Maintaining and Debugging Observability Pipelines | 10% | Context Propagation; Debugging Pipelines; Error Handling; Schema Management |

**Changes in 2025 and 2026.** The weighted curriculum (PDF and LF page) has not changed since November 2024. Sources: https://api.github.com/repos/cncf/curriculum/commits?path=OTCA_Curriculum.pdf and https://training.linuxfoundation.org/certification/opentelemetry-certified-associate-otca/

On 2025-11-28, however, a new file `otca/README.md` was added to the curriculum repo in the commit "Add Recognition of the exam authors (#97)". That README gives a different breakdown: five domains at 20% each, namely OpenTelemetry Fundamentals, Instrumentation & SDKs, Metrics, Traces, and Logs & Exporters. Sources: https://github.com/cncf/curriculum/blob/master/otca/README.md and https://api.github.com/repos/cncf/curriculum/commits?path=otca/README.md

The LF exam page, which was last modified 2026-07-28 according to its metadata, still shows the 18/46/26/10 split. The course should follow the PDF and the LF page and treat the README as unexplained. See "Not verified" below.

**Program context.** OTCA is one of the certifications required for CNCF's Golden Kubestronaut title. Sources: https://training.linuxfoundation.org/resources/kubestronaut-program/ and https://www.cncf.io/blog/2026/10/27/over-500-golden-kubestronauts-the-evolving-standard-for-cloud-native-mastery/

### A2. Prometheus Certified Associate (PCA), Linux Foundation / CNCF

**Status.** The exam is offered and open for enrollment. Source: https://training.linuxfoundation.org/certification/prometheus-certified-associate/

| Item | Value | Source |
|---|---|---|
| Price | US$250 for the exam only. US$299 bundled with the LFS241 course "Monitoring Systems and Services with Prometheus". US$495 bundled with THRIVE-ONE. | https://training.linuxfoundation.org/certification/prometheus-certified-associate/ |
| Question type | Online, proctored, multiple choice | same page |
| Duration | 90 minutes | same page |
| Number of questions | 60, from the LF generic multiple-choice rule. PromLabs, the training company of a Prometheus co-founder, also states 60. | https://docs.linuxfoundation.org/tc-docs/certification/important-instructions-mc and https://training.promlabs.com/pca-certification/ |
| Passing score | 75% (PromLabs: 45 of 60) | https://docs.linuxfoundation.org/tc-docs/certification/faq-mc.md and https://training.promlabs.com/pca-certification/ |
| Proctoring | Remote, PSI Bridge with the PSI Secure Browser | https://docs.linuxfoundation.org/tc-docs/certification/important-instructions-mc |
| Retake | One retake | https://training.linuxfoundation.org/certification/prometheus-certified-associate/ |
| Eligibility window | 12 months | same page |
| Validity | 2 years | same page |
| Prerequisites / level | None / Beginner | same page |

**Curriculum version.** The official curriculum is the PDF `PCA_Curriculum.pdf`, which has no version number. Its only commit is "PCA Exam Curriculum" on 2022-08-31. Source: https://api.github.com/repos/cncf/curriculum/commits?path=PCA_Curriculum.pdf

This curriculum predates Prometheus 3.x. For example, native histograms became stable only in v3.8.0, and the curriculum does not name them. Source for the v3.8.0 fact: https://prometheus.io/docs/specs/native_histograms/

**Domains and competencies.** The names below are copied exactly from the PDF and match the LF exam page. Sources: https://raw.githubusercontent.com/cncf/curriculum/master/PCA_Curriculum.pdf and https://training.linuxfoundation.org/certification/prometheus-certified-associate/

| Domain | Weight | Competencies |
|---|---|---|
| Observability Concepts | 18% | Metrics; Understand logs and events; Tracing and Spans; Push vs Pull; Service Discovery; Basics of SLOs, SLAs, and SLIs |
| Prometheus Fundamentals | 20% | System Architecture; Configuration and Scraping; Understanding Prometheus Limitations; Data Model and Labels; Exposition Format |
| PromQL | 28% | Selecting Data; Rates and Derivatives; Aggregating over time; Aggregating over dimensions; Binary operators; Histograms; Timestamp Metrics |
| Instrumentation and Exporters | 16% | Client Libraries; Instrumentation; Exporters; Structuring and naming metrics |
| Alerting & Dashboarding | 18% | Dashboarding basics; Configuring Alerting rules; Understand and Use Alertmanager; Alerting basics (when, what, and why) |

**Changes in 2025 and 2026.** The weighted curriculum is unchanged since August 2022. Source: https://api.github.com/repos/cncf/curriculum/commits?path=PCA_Curriculum.pdf

As with OTCA, a `pca/README.md` was added on 2025-11-28 with different weights. It lists PromQL 30%, Fundamentals & Concepts 20%, Prometheus Architecture 20%, Instrumentation 10%, Alerting & Recording Rules 10%, and Ecosystem & Integrations 10%. It also names the exam authors. Source: https://github.com/cncf/curriculum/blob/master/pca/README.md

The LF exam page still shows the five-domain 2022 split. Source: https://training.linuxfoundation.org/certification/prometheus-certified-associate/

I found no LF announcement of a PCA revision, and third-party searches turned up none either. Source: https://www.cncf.io/training/certification/pca/

**Program context.** PCA is required for Golden Kubestronaut. Source: https://training.linuxfoundation.org/resources/kubestronaut-program/

### A3. Grafana Labs credentials

**No proctored certification found.** I found no official Grafana Labs certification exam, meaning a proctored, paid, expiring credential. Grafana's training page lists only instructor-led workshops and does not mention any certification or exam. Source: https://grafana.com/training/

The workshops cover these topics, according to the same page:

- Alloy pipelines
- Grafana observability
- OpenTelemetry
- Loki
- Dashboard makeover
- Tempo
- SLOs
- k6
- AWS observability
- Dashboarding 201
- Grafana Assistant
- Agent observability

**What does exist: free learning badges.** Grafana Labs issues free Credly badges through its self-paced platform, GROT Academy, at learn.grafana.com. Credly lists exactly 7 badge templates. Six are of type "Learning" and cost "Free", and one is a community recognition. Source: https://www.credly.com/organizations/grafana-labs/badges.json

| Badge | What it covers / how earned | Assessment? |
|---|---|---|
| Trailblazer Technical Practitioner (Foundational) | Technical Practitioner 101 path, including hands-on labs | Yes, an in-path assessment |
| Explorer Technical Practitioner (Intermediate) | Technical Practitioner 201 path | Yes, an in-path assessment |
| Observability Signals Foundations Navigator | Metrics, logs and traces path | No, completion only |
| Dashboard Design & Visual Storytelling Navigator | Dashboard design path | No |
| PromQL Zero to Hero Navigator | PromQL path | No |
| LogQL Zero to Hero Navigator | LogQL path | No |
| Grafana Champion | Community recognition; no course | No |

Source for all rows: https://www.credly.com/organizations/grafana-labs/badges.json

These are learning badges, not certifications. Credly lists their cost as free, and they carry no proctoring or expiry. Source: same Credly listing.

**Unverified "Certified Grafana Associate".** Several third-party practice-exam and training sites describe a "Certified Grafana Associate" exam, for example at US$250 with 60 questions. They conflict with one another on price, passing score and even the exam's name. I found no grafana.com page that confirms the exam. Treat it as unverified, and do not plan the course around it. Sources: https://open-exam-prep.com/practice/grafana-certified-associate and https://www.koenig-solutions.com/grafana-certification

### A4. Other observability credentials

Job posts name these credentials only occasionally. I found no count of how often they appear, so this short list is based on vendor pages only.

| Credential | Facts | Source |
|---|---|---|
| Datadog certifications: Datadog Fundamentals, Log Management Fundamentals, APM and Distributed Tracing Fundamentals, plus two others | US$100 per exam, multiple choice, 120 minutes, proctored on Kryterion Webassessor, valid 3 years | https://www.datadoghq.com/certification/overview/ |
| Elastic Certified Observability Engineer | Elastic's ELK-stack observability exam. The landing page gives no price or format. | https://www.elastic.co/training/certification |
| Golden Kubestronaut (CNCF meta-title) | Requires all current CNCF certifications plus LFCS, including PCA and OTCA | https://training.linuxfoundation.org/resources/kubestronaut-program/ |

---

## Part B. Employer demand

### B1. The evidence base and its limits

There is no large, methodologically documented 2025-2026 study that counts tool mentions in observability job posts. The sources available are of three kinds:

1. **Vendor or foundation practitioner surveys.** These are the Grafana Labs Observability Survey 2026 (n=1,363, fielded Oct 2025 to Jan 2026), the CNCF Annual Survey 2025 (published 20 Jan 2026), and the OpenTelemetry Collector follow-up survey. Sources: https://grafana.com/press/2026/03/18/grafana-labs-4th-annual-observability-survey-reveals-a-field-at-a-crossroads-ai-economics-complexity-and-the-enduring-power-of-open-source/ and https://www.cncf.io/announcements/2026/01/20/kubernetes-established-as-the-de-facto-operating-system-for-ai-as-production-use-hits-82-in-2025-cncf-annual-cloud-native-survey/ and https://opentelemetry.io/blog/2026/otel-collector-follow-up-survey-analysis/
2. **A developer survey.** This is the Stack Overflow Developer Survey 2025, with 49,000+ responses. Source: https://survey.stackoverflow.co/2025/technology/
3. **Job-ad counts.** IT Jobs Watch counts UK permanent ads over the 6 months to 9 Nov 2026, which is large but UK-only. A single blogger also scraped LinkedIn DevOps posts, with about 700 posts and undocumented methods. Sources: https://www.itjobswatch.co.uk/jobs/uk/observability.do and https://prepare.sh/articles/devops-job-market-trends-2025

### B2. Ranked list of tools and skills for course weighting

The ranking combines job-ad presence with practitioner adoption. Within each row the numbers are as published, and every cell names its source.

| Rank | Skill / tool | Job-post evidence | Survey / adoption evidence |
|---|---|---|---|
| 1 | **Grafana (dashboards, the UI for everything)** | UK: 519 permanent ads (rank 405), up from 362 a year earlier ([IT Jobs Watch](https://www.itjobswatch.co.uk/jobs/uk/grafana.do)). Grafana is the top-ranked observability tool among skills co-occurring with "Observability" (19.7% of 1,520 ads) ([IT Jobs Watch](https://www.itjobswatch.co.uk/jobs/uk/observability.do)) and appears in 14.9% of Kubernetes ads ([IT Jobs Watch](https://www.itjobswatch.co.uk/jobs/uk/kubernetes.do)). LinkedIn DevOps sample: 54% of posts (thin) ([prepare.sh](https://prepare.sh/articles/devops-job-market-trends-2025)). | Grafana users configure 16 data sources on average ([Grafana survey 2025](https://grafana.com/observability-survey/2025/)). |
| 2 | **Prometheus and PromQL** | UK: 295 ads ([IT Jobs Watch](https://www.itjobswatch.co.uk/jobs/uk/prometheus.do)); 9.9% of Kubernetes ads ([IT Jobs Watch](https://www.itjobswatch.co.uk/jobs/uk/kubernetes.do)). LinkedIn sample: 48% (thin) ([prepare.sh](https://prepare.sh/articles/devops-job-market-trends-2025)). | 77% invest in Prometheus and 59% use it in production ([Grafana 2026 blog](https://grafana.com/blog/observability-survey-OSS-open-standards-2026)). 11.8% of all Stack Overflow respondents use it ([SO 2025](https://survey.stackoverflow.co/2025/technology/)). |
| 3 | **Kubernetes monitoring** (kube-state-metrics, cAdvisor, operator / ServiceMonitor) | UK: 2,333 Kubernetes ads, and Kubernetes appears in 31.6% of Observability ads ([IT Jobs Watch](https://www.itjobswatch.co.uk/jobs/uk/observability.do)) | 81% of OTel Collector users deploy on Kubernetes ([OTel Collector survey](https://opentelemetry.io/blog/2026/otel-collector-follow-up-survey-analysis/)). 82% of container users run Kubernetes in production ([CNCF 2025](https://www.cncf.io/announcements/2026/01/20/kubernetes-established-as-the-de-facto-operating-system-for-ai-as-production-use-hits-82-in-2025-cncf-annual-cloud-native-survey/)). |
| 4 | **Terraform / IaC** (including Grafana as code) | Terraform is in 37.2% of UK Observability ads, and IaC in 42.8% ([IT Jobs Watch](https://www.itjobswatch.co.uk/jobs/uk/observability.do)). LinkedIn sample: 88% of DevOps posts ([prepare.sh](https://prepare.sh/articles/devops-job-market-trends-2025)). | Grafana documents a Terraform provider, the Grafana Operator, Git Sync and the Foundation SDK as its as-code paths ([Grafana docs](https://grafana.com/docs/grafana/latest/as-code/)). |
| 5 | **OpenTelemetry** (SDKs, Collector, OTLP) | UK: 81 ads, up from 34 (2025) and 9 (2024). Small but the fastest growth of any tool checked ([IT Jobs Watch](https://www.itjobswatch.co.uk/jobs/uk/opentelemetry.do)). | 76% invest and 41% are in production. 47% increased use over the past year, against 42% for Prometheus ([Grafana 2026 blog](https://grafana.com/blog/observability-survey-OSS-open-standards-2026)). OTel is the second-highest-velocity CNCF project; contributors went from 1,301 to 1,756 ([CNCF velocity](https://www.cncf.io/blog/2026/02/09/what-cncf-project-velocity-in-2025-reveals-about-cloud-natives-future/)). 49% production use per CNCF 2025, from a secondary source ([o11y.news](https://buttondown.com/o11y.news/archive/2026-01-26/)). |
| 6 | **Alerting, SLOs and incident response** | "Site Reliability Engineering" appears in 14.7% of UK Observability ads, and "Incident Management" in 15.6% of SRE ads ([IT Jobs Watch](https://www.itjobswatch.co.uk/jobs/uk/site%20reliability%20engineering.do)) | Alert fatigue is the top obstacle to faster incident response (30%) ([Grafana 2026 press](https://grafana.com/press/2026/03/18/grafana-labs-4th-annual-observability-survey-reveals-a-field-at-a-crossroads-ai-economics-complexity-and-the-enduring-power-of-open-source/)). About three-quarters use SLOs in some capacity, no exact figure ([Grafana 2026 report](https://grafana.com/observability-survey/2026/)). In 2025, 50% were investigating or running a proof of concept on SLOs ([Grafana 2025](https://grafana.com/observability-survey/2025/)). |
| 7 | **Cost and cardinality control** | No job-ad counts found | Cost is the top tool-selection criterion for the third year running (65%) ([Grafana 2026 press](https://grafana.com/press/2026/03/18/grafana-labs-4th-annual-observability-survey-reveals-a-field-at-a-crossroads-ai-economics-complexity-and-the-enduring-power-of-open-source/)). 2025: 74% call cost a top priority, and observability spend averages 17% of infrastructure spend (median 10%) ([Grafana 2025](https://grafana.com/observability-survey/2025/)). |
| 8 | **ELK / Elasticsearch / OpenSearch** | UK: 319 Elasticsearch ads ([IT Jobs Watch](https://www.itjobswatch.co.uk/jobs/uk/elasticsearch.do)). LinkedIn sample: "ELK Stack" in 32% ([prepare.sh](https://prepare.sh/articles/devops-job-market-trends-2025)). | 16.7% of Stack Overflow respondents use Elasticsearch ([SO 2025](https://survey.stackoverflow.co/2025/technology/)). Readers of The Pragmatic Engineer mentioned Kibana 102 times and Elasticsearch 90 times ([Pragmatic Engineer](https://newsletter.pragmaticengineer.com/p/the-pragmatic-engineer-2025-survey-part-3)). |
| 9 | **Commercial SaaS: Splunk, Datadog, Dynatrace, New Relic** | UK ads: Splunk 399 ([IT Jobs Watch](https://www.itjobswatch.co.uk/jobs/uk/splunk.do)), Datadog 202 ([IT Jobs Watch](https://www.itjobswatch.co.uk/jobs/uk/datadog.do)), Dynatrace 130 ([IT Jobs Watch](https://www.itjobswatch.co.uk/jobs/uk/dynatrace.do)), New Relic 47 ([IT Jobs Watch](https://www.itjobswatch.co.uk/jobs/uk/new%20relic.do)). LinkedIn sample: Datadog 16% ([prepare.sh](https://prepare.sh/articles/devops-job-market-trends-2025)). | Datadog is used by 8.9% of Stack Overflow respondents ([SO 2025](https://survey.stackoverflow.co/2025/technology/)). SaaS-only observability use rose from 10% (2024) to 17% (2026) ([Grafana 2026 press](https://grafana.com/press/2026/03/18/grafana-labs-4th-annual-observability-survey-reveals-a-field-at-a-crossroads-ai-economics-complexity-and-the-enduring-power-of-open-source/)). |
| 10 | **Loki and LogQL** | UK: only 22 ads name "Loki" ([IT Jobs Watch](https://www.itjobswatch.co.uk/jobs/uk/loki.do)) | No survey percentage found. Use of the OTel Collector's lokiexporter declined; the survey gives no reason ([OTel Collector survey](https://opentelemetry.io/blog/2026/otel-collector-follow-up-survey-analysis/)). |
| 11 | **Dashboards as code** | No counts found | Only qualitative evidence: Grafana's documented tooling ([Grafana docs](https://grafana.com/docs/grafana/latest/as-code/)) |
| 12 | **Tempo / tracing backends** | No reliable counts found. Tempo is named in individual posts only ([Dice example](https://www.dice.com/job-detail/dc804d52-0247-44b3-83a6-2522232c955e)). | Traces are used by 57% of respondents in 2025 ([Grafana 2025](https://grafana.com/observability-survey/2025/)), and 50% use OTel for traces in 2026 ([Grafana 2026 blog](https://grafana.com/blog/observability-survey-OSS-open-standards-2026)) |
| 13 | **Grafana Alloy** | No counts found | Grafana Agent reached end of life on 1 Nov 2025, with Alloy as its successor ([Grafana docs](https://grafana.com/docs/alloy/latest/set-up/migrate/)). This makes Alloy the default collector for new LGTM work, but no adoption number was found. |
| 14 | **Mimir** | No counts found | No survey figure found |

**What this means for weighting.** Grafana dashboards, Prometheus with PromQL, Kubernetes monitoring, Terraform-style IaC and OpenTelemetry have the clearest evidence. Alerting, SLOs and cost or cardinality control have strong survey evidence but no job-ad counts. Loki, Tempo, Mimir and Alloy are rarely named by brand in job ads. They are the implementation layer behind the "Grafana" and "observability" keywords. That reading is my inference from the low Loki count next to the high Grafana count, and it is not directly measured. Sources for the two counts: https://www.itjobswatch.co.uk/jobs/uk/loki.do and https://www.itjobswatch.co.uk/jobs/uk/grafana.do

**Other context.**

- The Grafana 2025 survey found 101 technologies in use and an average of 8 per company. Source: https://grafana.com/observability-survey/2025/
- Signal use in 2025 was metrics 95%, logs 87%, traces 57% and profiles 16%. Source: https://grafana.com/observability-survey/2025/
- The CNCF 2025 survey says nearly 20% use profiling. Source: https://www.cncf.io/announcements/2026/01/20/kubernetes-established-as-the-de-facto-operating-system-for-ai-as-production-use-hits-82-in-2025-cncf-annual-cloud-native-survey/
- Among OTel Collector users, 63% name configuration management as the top pain point, and 58% of Kubernetes deployments use a gateway Collector. Source: https://opentelemetry.io/blog/2026/otel-collector-follow-up-survey-analysis/
- In the SRE Report 2026, median toil rose to 34% of engineers' time. Source: https://www.businesswire.com/news/home/20260122462526/en

### B3. Recurring interview topics for observability roles

No source counts interview questions. This list is built from the exam curricula above, the skills in B2 and recurring concepts in the canonical documentation. Each topic links to one authoritative explanation.

| # | Topic | Source |
|---|---|---|
| 1 | Four golden signals (latency, traffic, errors, saturation) | https://sre.google/sre-book/monitoring-distributed-systems/ |
| 2 | RED method (rate, errors, duration) | https://grafana.com/blog/2018/08/02/the-red-method-how-to-instrument-your-services/ |
| 3 | USE method (utilization, saturation, errors) | https://www.brendangregg.com/usemethod.html |
| 4 | SLI vs SLO vs SLA | https://sre.google/sre-book/service-level-objectives/ |
| 5 | Error budgets and error budget policy | https://sre.google/workbook/error-budget-policy/ |
| 6 | Multiwindow, multi-burn-rate SLO alerting | https://sre.google/workbook/alerting-on-slos/ |
| 7 | Alert on symptoms, not causes; alert fatigue | https://prometheus.io/docs/practices/alerting/ |
| 8 | Push vs pull, and when to use Pushgateway | https://prometheus.io/docs/introduction/faq/#why-do-you-pull-rather-than-push |
| 9 | Metric types: counter, gauge, histogram, summary | https://prometheus.io/docs/concepts/metric_types/ |
| 10 | Histograms vs summaries, and `histogram_quantile` | https://prometheus.io/docs/practices/histograms/ |
| 11 | Native histograms (stable since Prometheus v3.8.0) | https://prometheus.io/docs/specs/native_histograms/ |
| 12 | `rate` vs `irate` vs `increase`, and counter resets | https://prometheus.io/docs/prometheus/latest/querying/functions/ |
| 13 | Label cardinality and metric naming | https://prometheus.io/docs/practices/naming/ |
| 14 | Recording rules for expensive queries | https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/ |
| 15 | Alertmanager grouping, inhibition, silences and routing | https://prometheus.io/docs/alerting/latest/alertmanager/ |
| 16 | Kubernetes service discovery and relabeling | https://prometheus.io/docs/prometheus/latest/configuration/configuration/ |
| 17 | kube-state-metrics vs cAdvisor vs node-exporter | https://github.com/kubernetes/kube-state-metrics |
| 18 | Long-term storage and remote write; Mimir architecture | https://grafana.com/docs/mimir/latest/references/architecture/ |
| 19 | HA Prometheus pairs and deduplication | https://grafana.com/docs/mimir/latest/configure/configure-high-availability-deduplication/ |
| 20 | Loki labels vs structured metadata | https://grafana.com/docs/loki/latest/get-started/labels/structured-metadata/ |
| 21 | Loki label best practices (bounded labels, stream count) | https://grafana.com/docs/loki/latest/get-started/labels/bp-labels/ |
| 22 | Head vs tail sampling | https://opentelemetry.io/docs/concepts/sampling/ |
| 23 | Context propagation and W3C traceparent | https://opentelemetry.io/docs/concepts/context-propagation/ |
| 24 | Collector deployment: agent vs gateway | https://opentelemetry.io/docs/collector/deploy/ |
| 25 | Semantic conventions and resource attributes | https://opentelemetry.io/docs/concepts/semantic-conventions/ |
| 26 | Auto- vs manual instrumentation | https://opentelemetry.io/docs/concepts/instrumentation/ |
| 27 | Correlating signals: exemplars, trace-to-logs | https://grafana.com/docs/grafana/latest/fundamentals/exemplars/ |
| 28 | Span metrics and service graphs from traces | https://grafana.com/docs/tempo/latest/metrics-generator/ |
| 29 | Dashboards and alerts as code | https://grafana.com/docs/grafana/latest/as-code/ |
| 30 | Migrating from Grafana Agent / Promtail to Alloy | https://grafana.com/docs/alloy/latest/set-up/migrate/ |

Fetch status of these links:

- **Fetched and confirmed today:** rows 2, 6, 8, 10, 11, 20, 21, 22, 23, 29 and 19.
- **Shown in today's search results but not opened:** row 30.
- **Not individually fetched today:** the remaining links. These are long-standing canonical pages.

---

## Not verified / thin evidence

**Certifications**

- **Question count and passing score per exam.** The LF exam pages for PCA and OTCA state neither. The 60 questions and 75% come from LF's generic multiple-choice docs. The 60 carries an asterisk there, and neither PCA nor OTCA is named on those pages. PromLabs confirms 60 and 75% for PCA, but it is third-party. Sources: https://docs.linuxfoundation.org/tc-docs/certification/important-instructions-mc and https://training.promlabs.com/pca-certification/
- **The 2025-11-28 README weights.** Both `otca/README.md` (5 x 20%) and `pca/README.md` (30/20/20/10/10/10) contradict the official PDFs and the LF exam pages. I could not tell whether they announce a coming revision or are simply inaccurate summaries. No LF announcement of a revision was found. Watch this before booking an exam. Sources: https://github.com/cncf/curriculum/blob/master/otca/README.md and https://github.com/cncf/curriculum/blob/master/pca/README.md
- **Stale OTCA meta description.** The OTCA page's meta description still says "Coming Soon!" while its body says "Now Available!". Source: https://training.linuxfoundation.org/certification/opentelemetry-certified-associate-otca/
- **Grafana credentials.** learn.grafana.com returned HTTP 403 to my fetch, so the GROT Academy details come from the Credly listing, not from Grafana's own page. The "Certified Grafana Associate" exam could not be confirmed on any grafana.com page.
- **Job-post frequency of credentials.** I found no data on how often job posts name OTCA, PCA, Datadog or Elastic certifications.

**Demand**

- **No documented, large, global job-posting study** counting observability tools in 2025-2026 was found. IT Jobs Watch is UK-only. The prepare.sh LinkedIn figures come from about 700 posts, give no 2025 sample size and describe no method.
- **IT Jobs Watch percentages moved oddly across years.** Grafana went from 0.71% to 0.42% while its ad count rose, which suggests the denominator of total ads changed. Compare raw counts within one period, not percentages across years.
- **CNCF Annual Survey 2025.** The full PDF exceeded the fetch size limit. The 49% OTel production figure comes only from a newsletter, and I found no CNCF 2025 Prometheus figure.
- **Stack Overflow 2025** has no Grafana or OpenTelemetry row, and its audience is developers rather than SREs.
- **Per-tool percentages from the Grafana 2024 report** could not be extracted, because the PDF is image-based.
- **Tool-specific numbers missing.** No job-ad or survey numbers were found for Mimir, Tempo, Alloy, dashboards as code, or cardinality management as a named skill.
- **Pragmatic Engineer ranking.** Its observability ranking is an image behind a paywall; only the ELK mention counts were readable.
- **Discarded source.** A widely shared DEV Community claim that OpenTelemetry job openings grew 112% was discarded. It cites no method and uses non-existent version numbers. Source: https://dev.to/johalputt/the-case-for-specializing-in-opentelemetry-120-in-2026-40-more-job-openings-than-prometheus-250-g54
- **Interview-topic list.** This is a synthesis, not a measured frequency.
