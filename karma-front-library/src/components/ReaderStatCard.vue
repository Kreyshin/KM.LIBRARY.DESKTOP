<script setup lang="ts">
import type { Component } from 'vue';
defineProps<{ label: string; value: string | number; icon: Component; tone?: string }>();
</script>

<template>
  <div class="reader-stat card" :style="{ '--stat-tone': tone || 'var(--accent)' }">
    <div class="reader-stat-icon"><component :is="icon" /></div>
    <div><strong>{{ value }}</strong><span>{{ label }}</span></div>
  </div>
</template>
