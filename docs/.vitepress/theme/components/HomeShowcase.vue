<script setup lang="ts">
const lines = [
  { n: 1, parts: [{ c: "tok-keyword", t: "const" }, { c: "tok-name", t: " engine " }, { c: "tok-punct", t: "= new " }, { c: "tok-fn", t: "AccessEngine" }, { c: "tok-punct", t: "({ schema });" }] },
  { n: 2, parts: [] },
  { n: 3, parts: [{ c: "tok-keyword", t: "await" }, { c: "tok-name", t: " engine" }, { c: "tok-punct", t: "." }, { c: "tok-fn", t: "can" }, { c: "tok-punct", t: "({ subject, action: " }, { c: "tok-str", t: '"invoice:approve"' }, { c: "tok-punct", t: ", resource });" }] },
  { n: 4, parts: [{ c: "tok-comment", t: "// allow · admin matched · tenant:acme" }] },
];
</script>

<template>
  <section class="sentinel-showcase" aria-label="Example evaluation">
    <div class="sentinel-showcase__header">
      <p class="sentinel-showcase__eyebrow">What it looks like in code</p>
      <a class="sentinel-showcase__cta" href="/getting-started/quickstart">Full quickstart →</a>
    </div>
    <div class="sentinel-showcase__panel">
      <div class="sentinel-showcase__chrome">
        <span class="sentinel-showcase__filename">evaluate.ts</span>
      </div>
      <pre class="sentinel-showcase__code"><code><span
          v-for="line in lines"
          :key="line.n"
          class="sentinel-showcase__line"
        ><span class="sentinel-showcase__ln">{{ line.n }}</span><span
            v-for="(part, i) in line.parts"
            :key="i"
            :class="part.c"
          >{{ part.t }}</span>
</span></code></pre>
      <div class="sentinel-showcase__verdict">
        <span class="sentinel-showcase__badge sentinel-showcase__badge--allow">allow</span>
        <span class="sentinel-showcase__trace">admin → invoice:approve → tenant:acme</span>
      </div>
    </div>
  </section>
</template>
