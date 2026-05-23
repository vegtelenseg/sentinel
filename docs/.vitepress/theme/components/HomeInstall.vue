<script setup lang="ts">
import { withBase } from "vitepress";
</script>

<template>
  <div class="sentinel-install">
    <span class="sentinel-install__prompt" aria-hidden="true">$</span>
    <code class="sentinel-install__cmd">npm install @siremzam/sentinel</code>
    <a class="sentinel-install__link" :href="withBase('/getting-started/installation')">Installation guide →</a>
  </div>
</template>
