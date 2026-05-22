<script setup lang="ts">
import DefaultTheme from "vitepress/theme";
import HomeInstall from "./components/HomeInstall.vue";
import HomeShowcase from "./components/HomeShowcase.vue";
import HomePaths from "./components/HomePaths.vue";
import HomeHighlights from "./components/HomeHighlights.vue";

const { Layout } = DefaultTheme;
</script>

<template>
  <Layout>
    <template #home-hero-after>
      <div class="sentinel-hero-stack">
        <HomeInstall />
        <HomeShowcase />
      </div>
    </template>
    <template #home-features-before>
      <HomePaths />
      <HomeHighlights />
    </template>
  </Layout>
</template>
