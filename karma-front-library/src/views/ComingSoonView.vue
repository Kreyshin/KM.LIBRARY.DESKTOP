<script setup lang="ts">
import { useRoute } from 'vue-router';
const route = useRoute();
</script>

<template>
  <div>
    <h1 class="section-title">{{ route.meta.title }}</h1>
    <p class="section-sub">Esta sección todavía no está construida.</p>
    <div class="placeholder-section">
      <b>{{ route.meta.title }}</b> es parte del diseño de referencia de Karma Corp Systems,
      pero requiere su propio subsistema de datos (aún no implementado en karma-api-library).
      Dime si quieres que lo construyamos a continuación.
    </div>
  </div>
</template>
