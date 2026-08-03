<script setup lang="ts">
import { computed, ref } from 'vue';

const props = defineProps<{ modelValue: string[]; placeholder?: string; suggestions?: string[]; allowCreate?: boolean }>();
const emit = defineEmits<{ (e: 'update:modelValue', value: string[]): void; (e: 'create', value: string): void }>();

const draft = ref('');

const filteredSuggestions = computed(() => {
  const query = draft.value.trim().toLocaleLowerCase('es');
  return (props.suggestions || []).filter((item) => !props.modelValue.includes(item) && (!query || item.toLocaleLowerCase('es').includes(query))).slice(0, 8);
});

function addTag(value = draft.value, fromCatalog = false) {
  const v = value.trim();
  if (!v) return;
  if (!props.modelValue.includes(v)) {
    emit('update:modelValue', [...props.modelValue, v]);
    if (props.allowCreate && !fromCatalog && !(props.suggestions || []).some((item) => item.toLocaleLowerCase('es') === v.toLocaleLowerCase('es'))) emit('create', v);
  }
  draft.value = '';
}

function removeTag(tag: string) {
  emit('update:modelValue', props.modelValue.filter((t) => t !== tag));
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') { e.preventDefault(); addTag(); }
  if (e.key === 'Backspace' && !draft.value && props.modelValue.length) {
    removeTag(props.modelValue[props.modelValue.length - 1]);
  }
}
</script>

<template>
  <div class="tag-input-wrap">
  <div class="tag-input-box">
    <span v-for="tag in modelValue" :key="tag" class="tag-pill">
      {{ tag }}
      <button type="button" @click="removeTag(tag)">×</button>
    </span>
    <input
      type="text"
      v-model="draft"
      :placeholder="placeholder || 'Escribe y presiona Enter…'"
      @keydown="onKeydown"
      @blur="addTag()"
    />
  </div>
  <div v-if="filteredSuggestions.length" class="tag-suggestions">
    <button v-for="suggestion in filteredSuggestions" :key="suggestion" type="button" @mousedown.prevent="addTag(suggestion, true)">{{ suggestion }}</button>
  </div>
  </div>
</template>

<style scoped>
.tag-input-wrap{position:relative}.tag-suggestions{display:flex;flex-wrap:wrap;gap:5px;margin-top:7px}.tag-suggestions button{padding:4px 8px;border:1px solid rgba(159,107,255,.18);border-radius:999px;background:rgba(159,107,255,.055);color:#9f98ae;font:9px inherit;cursor:pointer}.tag-suggestions button:hover{border-color:rgba(159,107,255,.5);background:rgba(159,107,255,.12);color:#d9c9f5}
</style>
