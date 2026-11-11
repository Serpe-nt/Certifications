/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    /** Set by the step page so <Done> can render the lab check right after itself. */
    stepCheck?: {
      stepId: string;
      check: import('./lib/schema.ts').CheckData;
      settingsHref: string;
    };
  }
}
