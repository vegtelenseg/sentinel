<script setup lang="ts">
const items = [
  { title: "Type-safe schema", detail: "Typos fail at compile time, not in production." },
  { title: "Multi-tenant by default", detail: "Roles and context scoped per tenant." },
  { title: "explain() when it breaks", detail: "Replay every rule that fired — or didn't." },
];
</script>

<template>
  <section class="sentinel-highlights" aria-label="Key capabilities">
    <ul class="sentinel-highlights__list">
      <li v-for="item in items" :key="item.title" class="sentinel-highlights__item">
        <strong class="sentinel-highlights__title">{{ item.title }}</strong>
        <span class="sentinel-highlights__detail">{{ item.detail }}</span>
      </li>
    </ul>
  </section>
</template>
