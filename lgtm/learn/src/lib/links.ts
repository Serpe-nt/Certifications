// Page addresses, shared by the pages (build time) and the islands (in the browser).
// The base is the build's placeholder, which the server replaces with BASE_PATH.
export const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;

export const href = {
  home: base,
  settings: `${base}settings/`,
  module: (m: string) => `${base}m/${m}/`,
  step: (stepId: string) => {
    const [m, s] = stepId.split('-');
    return `${base}m/${m}/${s}/`;
  },
  end: (m: string) => `${base}m/${m}/done/`,
  quiz: (m: string) => `${base}m/${m}/quiz/`,
  practice: `${base}practice/`,
  stepPractice: (stepId: string) => `${base}practice/?step=${encodeURIComponent(stepId)}`,
  exam: (cert: string) => `${base}exam/${cert}/`,
  bank: `${base}bank.json`,
};
