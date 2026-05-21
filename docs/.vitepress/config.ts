import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Sentinel",
  description: "TypeScript-first authorization engine for modern SaaS apps",
  lang: "en-US",
  base: "/sentinel/",
  cleanUrls: true,
  head: [["link", { rel: "icon", href: "/sentinel/favicon.ico" }]],
  themeConfig: {
    logo: { text: "Sentinel" },
    nav: [
      { text: "Docs", link: "/introduction/what-is-sentinel", activeMatch: "/introduction/" },
      { text: "Guide", link: "/getting-started/quickstart", activeMatch: "/getting-started/" },
      { text: "Reference", link: "/reference/access-engine", activeMatch: "/reference/" },
      {
        text: "Playground",
        link: "https://vegtelenseg.github.io/sentinel-example/",
      },
      {
        text: "npm",
        link: "https://www.npmjs.com/package/@siremzam/sentinel",
      },
    ],
    sidebar: [
      {
        text: "Introduction",
        collapsed: false,
        items: [
          { text: "What is Sentinel?", link: "/introduction/what-is-sentinel" },
          { text: "Why Sentinel?", link: "/introduction/why-sentinel" },
          { text: "When not to use", link: "/introduction/when-not-to-use" },
          { text: "Security model", link: "/introduction/security" },
        ],
      },
      {
        text: "Getting started",
        collapsed: false,
        items: [
          { text: "Installation", link: "/getting-started/installation" },
          { text: "Quickstart", link: "/getting-started/quickstart" },
        ],
      },
      {
        text: "Concepts",
        collapsed: false,
        items: [
          { text: "The schema", link: "/concepts/schema" },
          { text: "Subjects and roles", link: "/concepts/subjects-and-roles" },
          { text: "Actions and resources", link: "/concepts/actions-and-resources" },
          { text: "Policy rules", link: "/concepts/policy-rules" },
          { text: "How evaluation works", link: "/concepts/how-evaluation-works" },
          { text: "Multitenancy", link: "/concepts/multitenancy" },
          { text: "Conditions (ABAC)", link: "/concepts/conditions" },
          { text: "Role hierarchy", link: "/concepts/role-hierarchy" },
          { text: "Priority and deny", link: "/concepts/priority-and-deny" },
        ],
      },
      {
        text: "Guides",
        collapsed: false,
        items: [
          { text: "Policy factory", link: "/guides/policy-factory" },
          { text: "Wildcard actions", link: "/guides/wildcards" },
          { text: "Async conditions", link: "/guides/async-conditions" },
          { text: "JSON serialization", link: "/guides/json-serialization" },
          { text: "Testing policies", link: "/guides/testing" },
          { text: "Debugging with explain()", link: "/guides/explain-and-debugging" },
          { text: "Audit logging", link: "/guides/audit-logging" },
          { text: "UI permissions", link: "/guides/ui-permissions" },
          { text: "Evaluation cache", link: "/guides/evaluation-cache" },
          { text: "Performance", link: "/guides/performance" },
          { text: "Express", link: "/guides/express" },
          { text: "Fastify", link: "/guides/fastify" },
          { text: "Hono", link: "/guides/hono" },
          { text: "NestJS", link: "/guides/nestjs" },
          { text: "Server mode", link: "/guides/server-mode" },
        ],
      },
      {
        text: "Patterns",
        collapsed: true,
        items: [
          { text: "Ownership", link: "/patterns/ownership" },
          { text: "Common recipes", link: "/patterns/common-recipes" },
        ],
      },
      {
        text: "Comparisons",
        collapsed: true,
        items: [
          { text: "Feature matrix", link: "/comparisons/feature-matrix" },
          { text: "From CASL", link: "/comparisons/from-casl" },
          { text: "From Casbin", link: "/comparisons/from-casbin" },
          { text: "From accesscontrol", link: "/comparisons/from-accesscontrol" },
        ],
      },
      {
        text: "Reference",
        collapsed: true,
        items: [
          { text: "AccessEngine", link: "/reference/access-engine" },
          { text: "RuleBuilder", link: "/reference/rule-builder" },
          { text: "Types", link: "/reference/types" },
          { text: "Middleware", link: "/reference/middleware" },
          { text: "Server", link: "/reference/server" },
          { text: "Serialization", link: "/reference/serialization" },
        ],
      },
    ],
    socialLinks: [
      { icon: "github", link: "https://github.com/vegtelenseg/sentinel" },
    ],
    editLink: {
      pattern: "https://github.com/vegtelenseg/sentinel/edit/main/docs/:path",
    },
    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright © Sentinel contributors",
    },
    search: {
      provider: "local",
    },
  },
});
