<script setup lang="ts">
import { AlertTriangle, HelpCircle, X } from 'lucide-vue-next';
import { onBeforeUnmount, onMounted } from 'vue';
import { confirmationState, resolveConfirmation } from '../services/notifications';

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && confirmationState.open) resolveConfirmation(false);
}
onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
  <Teleport to="body">
    <Transition name="confirm-fade">
      <div v-if="confirmationState.open" class="confirm-overlay" role="presentation" @click.self="resolveConfirmation(false)">
        <section class="confirm-dialog" role="alertdialog" aria-modal="true" :aria-labelledby="'confirm-title'" :aria-describedby="confirmationState.description ? 'confirm-description' : undefined" :class="{ danger: confirmationState.danger }">
          <button class="confirm-close" type="button" aria-label="Cerrar confirmación" @click="resolveConfirmation(false)"><X /></button>
          <div class="confirm-icon"><AlertTriangle v-if="confirmationState.danger" /><HelpCircle v-else /></div>
          <span class="confirm-eyebrow">CONFIRMACIÓN</span>
          <h2 id="confirm-title">{{ confirmationState.title }}</h2>
          <p v-if="confirmationState.description" id="confirm-description">{{ confirmationState.description }}</p>
          <footer>
            <button type="button" class="confirm-cancel" @click="resolveConfirmation(false)">{{ confirmationState.cancelLabel }}</button>
            <button type="button" class="confirm-accept" @click="resolveConfirmation(true)">{{ confirmationState.confirmLabel }}</button>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.confirm-overlay{position:fixed;inset:0;z-index:5000;display:grid;place-items:center;padding:20px;background:rgba(3,3,8,.76);backdrop-filter:blur(12px)}.confirm-dialog{position:relative;width:min(430px,100%);padding:27px 27px 23px;border:1px solid rgba(159,107,255,.3);border-radius:18px;background:linear-gradient(145deg,#171120,#090b12 70%);box-shadow:0 35px 100px rgba(0,0,0,.7),0 0 55px rgba(124,58,237,.12);text-align:center}.confirm-close{position:absolute;top:15px;right:15px;display:grid;place-items:center;width:32px;height:32px;border:1px solid rgba(255,255,255,.08);border-radius:9px;background:#0d0c13;color:#8f8899}.confirm-close:hover{color:#fff;border-color:rgba(159,107,255,.35)}.confirm-close svg{width:15px}.confirm-icon{display:grid;place-items:center;width:52px;height:52px;margin:0 auto 15px;border:1px solid rgba(159,107,255,.28);border-radius:15px;background:rgba(159,107,255,.1);color:#ad7cff;box-shadow:0 0 28px rgba(139,92,246,.16)}.confirm-icon svg{width:24px}.confirm-eyebrow{color:#9f6bff;font-size:9px;font-weight:850;letter-spacing:.17em}.confirm-dialog h2{margin:7px 25px 7px;color:#f5f0fb;font-size:19px;line-height:1.25}.confirm-dialog p{max-width:350px;margin:0 auto;color:#9891a2;font-size:11.5px;line-height:1.55}.confirm-dialog footer{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:23px}.confirm-dialog footer button{min-height:40px;border-radius:9px;font:750 11px inherit}.confirm-cancel{border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.035);color:#b5aebf}.confirm-accept{border:1px solid rgba(202,169,255,.24);background:linear-gradient(135deg,#a768ff,#7136db);color:#fff;box-shadow:0 8px 22px rgba(113,54,219,.22)}.confirm-dialog.danger{border-color:rgba(248,113,113,.28)}.confirm-dialog.danger .confirm-icon{border-color:rgba(248,113,113,.3);background:rgba(248,113,113,.1);color:#fb7185;box-shadow:0 0 28px rgba(239,68,68,.12)}.confirm-dialog.danger .confirm-eyebrow{color:#fb7185}.confirm-dialog.danger .confirm-accept{border-color:rgba(252,165,165,.23);background:linear-gradient(135deg,#ef6575,#b91c3a)}.confirm-fade-enter-active,.confirm-fade-leave-active{transition:.18s}.confirm-fade-enter-active .confirm-dialog,.confirm-fade-leave-active .confirm-dialog{transition:.18s}.confirm-fade-enter-from,.confirm-fade-leave-to{opacity:0}.confirm-fade-enter-from .confirm-dialog,.confirm-fade-leave-to .confirm-dialog{transform:translateY(8px) scale(.97)}@media(max-width:480px){.confirm-dialog{padding:24px 18px 18px}.confirm-dialog footer{grid-template-columns:1fr}}
</style>
