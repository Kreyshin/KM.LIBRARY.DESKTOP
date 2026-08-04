<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-vue-next';

const props = withDefaults(defineProps<{
  id?: string;
  required?: boolean;
  compact?: boolean;
  ariaLabel?: string;
  placeholder?: string;
}>(), { id: undefined, required: false, compact: false, ariaLabel: 'Seleccionar fecha', placeholder: 'dd/mm/aaaa' });
const model = defineModel<string>({ default: '' });
const root = ref<HTMLElement | null>(null);
const input = ref<HTMLInputElement | null>(null);
const popover = ref<HTMLElement | null>(null);
const open = ref(false);
const invalid = ref(false);
const displayValue = ref('');
const popoverStyle = ref<Record<string, string>>({});
const monthCursor = ref(startOfMonth(parseIso(model.value) || new Date()));
const weekdays = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

function startOfMonth(date: Date) { return new Date(date.getFullYear(), date.getMonth(), 1); }
function isoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
function validDate(year: number, month: number, day: number) {
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}
function parseIso(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  return match ? validDate(Number(match[1]), Number(match[2]), Number(match[3])) : null;
}
function parseTyped(value: string) {
  const text = value.trim();
  const iso = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(text);
  if (iso) return validDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const local = /^(\d{1,2})[\-/](\d{1,2})[\-/](\d{4})$/.exec(text);
  return local ? validDate(Number(local[3]), Number(local[2]), Number(local[1])) : null;
}
function formatDisplay(value: string) {
  const date = parseIso(value);
  return date ? `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}` : '';
}

watch(model, (value) => {
  displayValue.value = formatDisplay(value);
  const date = parseIso(value);
  if (date) monthCursor.value = startOfMonth(date);
  setValidity(true);
}, { immediate: true });

const monthLabel = computed(() => new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric' }).format(monthCursor.value));
const calendarDays = computed(() => {
  const first = monthCursor.value;
  const mondayOffset = (first.getDay() + 6) % 7;
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - mondayOffset);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
    const iso = isoDate(date);
    return { date, iso, day: date.getDate(), outside: date.getMonth() !== first.getMonth(), today: iso === isoDate(new Date()), selected: iso === model.value };
  });
});

function setValidity(valid: boolean) {
  invalid.value = !valid;
  input.value?.setCustomValidity(valid ? '' : 'Ingresa una fecha válida con formato dd/mm/aaaa.');
}
function onInput(event: Event) {
  displayValue.value = (event.target as HTMLInputElement).value;
  if (!displayValue.value.trim()) { model.value = ''; setValidity(true); return; }
  const date = parseTyped(displayValue.value);
  if (date) { model.value = isoDate(date); setValidity(true); }
  else setValidity(false);
}
function commitTyped() {
  if (!displayValue.value.trim()) { model.value = ''; setValidity(!props.required); return; }
  const date = parseTyped(displayValue.value);
  if (!date) { setValidity(false); return; }
  model.value = isoDate(date);
  displayValue.value = formatDisplay(model.value);
  monthCursor.value = startOfMonth(date);
  setValidity(true);
}
async function toggleCalendar() {
  open.value = !open.value;
  if (open.value) {
    monthCursor.value = startOfMonth(parseIso(model.value) || new Date());
    await nextTick();
    updatePopoverPosition();
  }
}
function selectDate(date: Date) {
  model.value = isoDate(date);
  displayValue.value = formatDisplay(model.value);
  monthCursor.value = startOfMonth(date);
  setValidity(true);
  open.value = false;
  input.value?.focus();
}
function changeMonth(amount: number) { monthCursor.value = new Date(monthCursor.value.getFullYear(), monthCursor.value.getMonth() + amount, 1); }
function clearDate() { model.value = ''; displayValue.value = ''; setValidity(!props.required); open.value = false; input.value?.focus(); }
function updatePopoverPosition() {
  if (!open.value || !root.value) return;
  const anchor = root.value.getBoundingClientRect();
  const width = Math.min(292, window.innerWidth - 16);
  const height = popover.value?.getBoundingClientRect().height || 320;
  const left = Math.max(8, Math.min(anchor.left, window.innerWidth - width - 8));
  const spaceBelow = window.innerHeight - anchor.bottom;
  const top = spaceBelow >= height + 8 || anchor.top < height + 8
    ? anchor.bottom + 7
    : anchor.top - height - 7;
  popoverStyle.value = { top: `${Math.max(8, top)}px`, left: `${left}px`, width: `${width}px` };
}
function onPointerDown(event: PointerEvent) {
  const target = event.target as Node;
  if (open.value && root.value && !root.value.contains(target) && !popover.value?.contains(target)) open.value = false;
}
function onKeydown(event: KeyboardEvent) { if (event.key === 'Escape') open.value = false; }
onMounted(() => {
  document.addEventListener('pointerdown', onPointerDown);
  document.addEventListener('keydown', onKeydown);
  window.addEventListener('resize', updatePopoverPosition);
  window.addEventListener('scroll', updatePopoverPosition, true);
});
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onPointerDown);
  document.removeEventListener('keydown', onKeydown);
  window.removeEventListener('resize', updatePopoverPosition);
  window.removeEventListener('scroll', updatePopoverPosition, true);
});
</script>

<template>
  <div ref="root" class="date-picker" :class="{ 'date-picker--open': open, 'date-picker--invalid': invalid, 'date-picker--compact': compact }">
    <div class="date-picker__control">
      <input ref="input" :id="id" :value="displayValue" type="text" inputmode="numeric" autocomplete="off" :required="required" :placeholder="placeholder" :aria-label="ariaLabel" @input="onInput" @blur="commitTyped" @keydown.enter.prevent="commitTyped" />
      <button v-if="model" type="button" class="date-picker__clear" aria-label="Limpiar fecha" @click="clearDate"><X /></button>
      <button type="button" class="date-picker__toggle" :aria-label="open ? 'Cerrar calendario' : 'Abrir calendario'" :aria-expanded="open" @click="toggleCalendar"><CalendarDays /></button>
    </div>

    <Teleport to="body">
      <Transition name="date-popover">
      <section v-if="open" ref="popover" class="date-picker__popover" :style="popoverStyle" aria-label="Calendario">
        <header>
          <button type="button" aria-label="Mes anterior" @click="changeMonth(-1)"><ChevronLeft /></button>
          <strong>{{ monthLabel }}</strong>
          <button type="button" aria-label="Mes siguiente" @click="changeMonth(1)"><ChevronRight /></button>
        </header>
        <div class="date-picker__weekdays"><span v-for="weekday in weekdays" :key="weekday">{{ weekday }}</span></div>
        <div class="date-picker__days">
          <button v-for="item in calendarDays" :key="item.iso" type="button" :class="{ outside: item.outside, today: item.today, selected: item.selected }" :aria-label="new Intl.DateTimeFormat('es-PE', { dateStyle: 'long' }).format(item.date)" @click="selectDate(item.date)">{{ item.day }}</button>
        </div>
        <footer><button type="button" @click="clearDate">Limpiar</button><button type="button" @click="selectDate(new Date())">Hoy</button></footer>
      </section>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.date-picker{position:relative;width:100%}.date-picker__control{position:relative;display:flex;align-items:center}.date-picker__control input{width:100%;height:38px;padding:0 68px 0 11px;color:var(--text);background:#080b12;border:1px solid rgba(255,255,255,.075);border-radius:8px;outline:0;font:12.5px inherit;font-variant-numeric:tabular-nums;transition:border-color .18s,box-shadow .18s,background .18s}.date-picker__control input:focus{border-color:rgba(159,107,255,.72);background:#0b0d15;box-shadow:0 0 0 3px rgba(159,107,255,.09)}.date-picker--invalid .date-picker__control input{border-color:rgba(248,113,113,.7);box-shadow:0 0 0 3px rgba(248,113,113,.08)}.date-picker__toggle,.date-picker__clear{position:absolute;right:4px;width:30px;height:30px;display:grid;place-items:center;padding:0;color:#ad8be2;background:rgba(159,107,255,.08);border:1px solid rgba(159,107,255,.14);border-radius:6px;cursor:pointer;transition:.18s}.date-picker__toggle:hover,.date-picker--open .date-picker__toggle{color:#fff;background:rgba(159,107,255,.18);border-color:rgba(192,132,252,.4)}.date-picker__clear{right:36px;color:var(--text-faint);background:transparent;border-color:transparent}.date-picker__clear:hover{color:#fca5a5;background:rgba(248,113,113,.07)}.date-picker__toggle svg,.date-picker__clear svg{width:14px}.date-picker__popover{position:fixed;z-index:3500;width:292px;padding:12px;color:var(--text);background:linear-gradient(145deg,#171020,#090c13 55%);border:1px solid rgba(192,132,252,.25);border-radius:13px;box-shadow:0 24px 65px rgba(0,0,0,.65),0 0 30px rgba(109,40,217,.12);transform-origin:top left;backdrop-filter:blur(18px)}.date-picker__popover:before{content:"";position:absolute;inset:0 0 auto;height:1px;background:linear-gradient(90deg,transparent,#a855f7,transparent)}.date-picker__popover header{display:grid;grid-template-columns:30px 1fr 30px;align-items:center;margin-bottom:10px}.date-picker__popover header strong{text-align:center;text-transform:capitalize;font-size:11px}.date-picker__popover header button{width:29px;height:29px;display:grid;place-items:center;padding:0;color:#bcb2ca;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.06);border-radius:7px;cursor:pointer}.date-picker__popover header button:hover{color:#fff;background:rgba(159,107,255,.12);border-color:rgba(159,107,255,.28)}.date-picker__popover header svg{width:14px}.date-picker__weekdays,.date-picker__days{display:grid;grid-template-columns:repeat(7,1fr);gap:3px}.date-picker__weekdays{margin-bottom:4px}.date-picker__weekdays span{text-align:center;color:#796d89;font-size:7.5px;font-weight:800;text-transform:uppercase}.date-picker__days button{position:relative;aspect-ratio:1;display:grid;place-items:center;padding:0;color:#c9c3d2;background:transparent;border:1px solid transparent;border-radius:7px;font-size:9.5px;cursor:pointer;transition:transform .14s,background .14s,border-color .14s,color .14s}.date-picker__days button:hover{z-index:1;transform:translateY(-1px);color:#fff;background:rgba(159,107,255,.13);border-color:rgba(159,107,255,.26)}.date-picker__days button.outside{color:#51495e}.date-picker__days button.today:after{content:"";position:absolute;bottom:3px;width:3px;height:3px;background:#c084fc;border-radius:50%}.date-picker__days button.selected{color:#fff;background:linear-gradient(135deg,#a855f7,#6d28d9);border-color:rgba(233,213,255,.4);box-shadow:0 5px 13px rgba(109,40,217,.3);font-weight:800}.date-picker__days button.selected:after{background:#fff}.date-picker__popover footer{display:flex;justify-content:space-between;margin-top:9px;padding-top:9px;border-top:1px solid rgba(255,255,255,.055)}.date-picker__popover footer button{padding:5px 8px;color:#b998eb;background:transparent;border:0;border-radius:6px;font:750 8.5px inherit;cursor:pointer}.date-picker__popover footer button:hover{color:#fff;background:rgba(159,107,255,.1)}.date-popover-enter-active,.date-popover-leave-active{transition:opacity .18s ease,transform .2s cubic-bezier(.2,.8,.2,1)}.date-popover-enter-from,.date-popover-leave-to{opacity:0;transform:translateY(-5px) scale(.97)}.date-picker--compact .date-picker__control input{height:32px;padding-right:56px;font-size:10px}.date-picker--compact .date-picker__toggle,.date-picker--compact .date-picker__clear{width:25px;height:25px}.date-picker--compact .date-picker__clear{right:30px}
</style>
