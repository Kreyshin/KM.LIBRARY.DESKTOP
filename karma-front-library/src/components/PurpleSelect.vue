<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { Check, ChevronDown, Search, X } from 'lucide-vue-next';

export interface PurpleSelectOption {
  value: string | number;
  label: string;
  description?: string;
  disabled?: boolean;
}

const props = withDefaults(defineProps<{
  options: PurpleSelectOption[];
  placeholder?: string;
  ariaLabel?: string;
  searchable?: boolean;
  clearable?: boolean;
  compact?: boolean;
  disabled?: boolean;
  required?: boolean;
  emptyText?: string;
}>(), {
  placeholder: 'Seleccionar…',
  ariaLabel: 'Seleccionar opción',
  searchable: false,
  clearable: false,
  compact: false,
  disabled: false,
  required: false,
  emptyText: 'No hay resultados',
});

const model = defineModel<string | number>({ default: '' });
const emit = defineEmits<{ (event: 'change', value: string | number): void }>();
const root = ref<HTMLElement | null>(null);
const popover = ref<HTMLElement | null>(null);
const searchInput = ref<HTMLInputElement | null>(null);
const open = ref(false);
const query = ref('');
const activeIndex = ref(-1);
const popoverStyle = ref<Record<string, string>>({});

const selected = computed(() => props.options.find((option) => option.value === model.value));
const filteredOptions = computed(() => {
  const term = query.value.trim().toLocaleLowerCase('es');
  return term
    ? props.options.filter((option) => `${option.label} ${option.description || ''}`.toLocaleLowerCase('es').includes(term))
    : props.options;
});

watch(filteredOptions, () => {
  if (activeIndex.value >= filteredOptions.value.length) activeIndex.value = -1;
});

async function toggle() {
  if (props.disabled) return;
  open.value = !open.value;
  query.value = '';
  activeIndex.value = Math.max(0, filteredOptions.value.findIndex((option) => option.value === model.value));
  if (open.value) {
    await nextTick();
    updatePosition();
    if (props.searchable) searchInput.value?.focus();
  }
}

function choose(option: PurpleSelectOption) {
  if (option.disabled) return;
  model.value = option.value;
  emit('change', option.value);
  open.value = false;
  query.value = '';
  root.value?.querySelector<HTMLButtonElement>('.purple-select__trigger')?.focus();
}

function clear(event?: Event) {
  event?.stopPropagation();
  model.value = '';
  emit('change', '');
  open.value = false;
}

function updatePosition() {
  if (!open.value || !root.value) return;
  const anchor = root.value.getBoundingClientRect();
  const width = Math.max(anchor.width, props.compact ? 210 : 240);
  const maxWidth = window.innerWidth - 16;
  const resolvedWidth = Math.min(width, maxWidth);
  const left = Math.max(8, Math.min(anchor.left, window.innerWidth - resolvedWidth - 8));
  const height = Math.min(popover.value?.getBoundingClientRect().height || 280, 330);
  const opensUp = window.innerHeight - anchor.bottom < height + 8 && anchor.top > height + 8;
  const top = opensUp ? anchor.top - height - 6 : anchor.bottom + 6;
  popoverStyle.value = { left: `${left}px`, top: `${Math.max(8, top)}px`, width: `${resolvedWidth}px`, transformOrigin: opensUp ? 'bottom center' : 'top center' };
}

function onDocumentPointer(event: PointerEvent) {
  const target = event.target as Node;
  if (open.value && !root.value?.contains(target) && !popover.value?.contains(target)) open.value = false;
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') { open.value = false; return; }
  if (!open.value && ['ArrowDown', 'Enter', ' '].includes(event.key)) { event.preventDefault(); void toggle(); return; }
  if (!open.value || !['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) return;
  event.preventDefault();
  if (event.key === 'Enter') {
    const option = filteredOptions.value[activeIndex.value];
    if (option) choose(option);
    return;
  }
  const direction = event.key === 'ArrowDown' ? 1 : -1;
  const length = filteredOptions.value.length;
  if (length) activeIndex.value = (activeIndex.value + direction + length) % length;
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointer);
  document.addEventListener('keydown', onKeydown);
  window.addEventListener('resize', updatePosition);
  window.addEventListener('scroll', updatePosition, true);
});
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointer);
  document.removeEventListener('keydown', onKeydown);
  window.removeEventListener('resize', updatePosition);
  window.removeEventListener('scroll', updatePosition, true);
});
</script>

<template>
  <div ref="root" class="purple-select" :class="{ 'purple-select--open': open, 'purple-select--compact': compact, 'purple-select--disabled': disabled, 'purple-select--clearable': clearable && selected }">
    <button type="button" class="purple-select__trigger" :disabled="disabled" :aria-label="ariaLabel" :aria-expanded="open" aria-haspopup="listbox" @click="toggle">
      <span :class="{ placeholder: !selected }">{{ selected?.label || placeholder }}</span>
      <ChevronDown class="purple-select__chevron" />
    </button>
    <button v-if="clearable && selected && !disabled" type="button" class="purple-select__clear" aria-label="Limpiar selección" @click="clear"><X /></button>

    <Teleport to="body">
      <Transition name="purple-options">
        <section v-if="open" ref="popover" class="purple-select__popover" :style="popoverStyle">
          <div v-if="searchable" class="purple-select__search"><Search /><input ref="searchInput" v-model="query" type="text" placeholder="Buscar…" aria-label="Buscar opción" /></div>
          <div class="purple-select__options" role="listbox" :aria-label="ariaLabel">
            <button v-for="(option, index) in filteredOptions" :key="option.value" type="button" role="option" :aria-selected="option.value === model" :disabled="option.disabled" :class="{ selected: option.value === model, active: index === activeIndex }" @mouseenter="activeIndex = index" @click="choose(option)">
              <span><strong>{{ option.label }}</strong><small v-if="option.description">{{ option.description }}</small></span><Check v-if="option.value === model" />
            </button>
            <p v-if="!filteredOptions.length">{{ emptyText }}</p>
          </div>
        </section>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.purple-select{position:relative;width:100%}.purple-select__trigger{width:100%;height:38px;display:flex;align-items:center;gap:7px;padding:0 9px 0 11px;color:var(--text);background:#080b12;border:1px solid rgba(255,255,255,.075);border-radius:8px;outline:none;font:12px inherit;text-align:left;cursor:pointer;transition:border-color .18s,box-shadow .18s,background .18s}.purple-select--clearable .purple-select__trigger{padding-right:38px}.purple-select__trigger:hover{background:#0b0e16;border-color:rgba(159,107,255,.3)}.purple-select--open .purple-select__trigger{border-color:rgba(159,107,255,.72);box-shadow:0 0 0 3px rgba(159,107,255,.09)}.purple-select__trigger>span{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.purple-select__trigger .placeholder{color:var(--text-faint)}.purple-select__chevron{width:14px;flex:0 0 auto;color:#a884de;transition:transform .2s ease}.purple-select--open .purple-select__chevron{transform:rotate(180deg)}.purple-select__clear{position:absolute;z-index:1;top:50%;right:28px;width:23px;height:23px;display:grid;place-items:center;padding:0;color:var(--text-faint);background:#080b12;border:0;border-radius:5px;cursor:pointer;transform:translateY(-50%)}.purple-select__clear:hover{color:#fca5a5;background:rgba(248,113,113,.07)}.purple-select__clear svg{width:12px}.purple-select--disabled{opacity:.58}.purple-select--disabled .purple-select__trigger{cursor:not-allowed}.purple-select--compact .purple-select__trigger{height:32px;padding-left:8px;font-size:9.5px}.purple-select__popover{position:fixed;z-index:5200;overflow:hidden;padding:6px;color:var(--text);background:linear-gradient(145deg,#171020,#090c13 58%);border:1px solid rgba(192,132,252,.25);border-radius:11px;box-shadow:0 22px 60px rgba(0,0,0,.68),0 0 28px rgba(109,40,217,.13);backdrop-filter:blur(18px)}.purple-select__popover:before{content:"";position:absolute;inset:0 0 auto;height:1px;background:linear-gradient(90deg,transparent,#a855f7,transparent)}.purple-select__search{display:flex;align-items:center;gap:7px;height:33px;margin:2px 2px 6px;padding:0 9px;color:#a884de;background:#070a11;border:1px solid rgba(255,255,255,.07);border-radius:7px}.purple-select__search svg{width:13px}.purple-select__search input{min-width:0;flex:1;color:var(--text);background:transparent;border:0;outline:0;font:10.5px inherit}.purple-select__options{max-height:286px;overflow-y:auto;padding:1px}.purple-select__options>button{width:100%;min-height:34px;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:7px 9px;color:#c9c2d2;background:transparent;border:1px solid transparent;border-radius:7px;text-align:left;cursor:pointer;transition:background .14s,border-color .14s,transform .14s}.purple-select__options>button:hover,.purple-select__options>button.active{color:#fff;background:rgba(159,107,255,.1);border-color:rgba(159,107,255,.16);transform:translateX(1px)}.purple-select__options>button.selected{color:#f1e9ff;background:linear-gradient(135deg,rgba(168,85,247,.2),rgba(109,40,217,.1));border-color:rgba(192,132,252,.27)}.purple-select__options>button:disabled{opacity:.45;cursor:not-allowed}.purple-select__options strong,.purple-select__options small{display:block}.purple-select__options strong{font-size:10.5px}.purple-select__options small{margin-top:2px;color:var(--text-faint);font-size:8px}.purple-select__options svg{width:13px;flex:0 0 auto;color:#c084fc}.purple-select__options>p{margin:0;padding:20px 10px;color:var(--text-faint);font-size:9px;text-align:center}.purple-options-enter-active,.purple-options-leave-active{transition:opacity .16s ease,transform .2s cubic-bezier(.2,.8,.2,1)}.purple-options-enter-from,.purple-options-leave-to{opacity:0;transform:translateY(-5px) scale(.975)}
</style>
