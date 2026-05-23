<script setup lang="ts">
import { withBase } from "vitepress";

const paths = [
  {
    label: "Quickstart",
    title: "First evaluation in 5 minutes",
    href: "/getting-started/quickstart",
  },
  {
    label: "Concepts",
    title: "How policies are evaluated",
    href: "/concepts/how-evaluation-works",
  },
  {
    label: "Frameworks",
    title: "Express, Fastify, Hono, NestJS",
    href: "/reference/middleware",
  },
  {
    label: "Compare",
    title: "Sentinel vs CASL, Casbin, others",
    href: "/comparisons/feature-matrix",
  },
];
</script>

<template>
  <section class="sentinel-paths" aria-labelledby="sentinel-paths-heading">
    <h2 id="sentinel-paths-heading" class="sentinel-paths__heading">Where do you want to start?</h2>
    <div class="sentinel-paths__grid">
      <a
        v-for="path in paths"
        :key="path.href"
        class="sentinel-paths__card"
        :href="withBase(path.href)"
      >
        <span class="sentinel-paths__label">{{ path.label }}</span>
        <span class="sentinel-paths__title">{{ path.title }}</span>
        <span class="sentinel-paths__arrow" aria-hidden="true">→</span>
      </a>
    </div>
  </section>
</template>
