// Reordenar elementos arrastrando (horizontal). Usa eventos de puntero (no HTML5 drag&drop) para que funcione con el
// escenario escalado, en pantallas táctiles y sin pelearse con los clics de los botones.
//   makeSortable(container, { items: () => [elementos], enabled: () => bool, onReorder: (from, to) => void })
// Al soltar llama onReorder(índiceInicial, índiceFinal); quien llama actualiza el estado (y vuelve a dibujar si quiere).
import { viewScale } from './anim.js';

const THRESHOLD = 6; // px antes de considerar que es un arrastre y no un clic

export function makeSortable(container, { items, enabled = () => true, onReorder }) {
  let drag = null;
  let suppressClick = false;

  const list = () => items();

  function onDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    if (!enabled()) return;
    const arr = list();
    const item = arr.find((x) => x === e.target || x.contains(e.target));
    if (!item) return;
    const r = item.getBoundingClientRect();
    drag = { item, from: arr.indexOf(item), startX: e.clientX, grab: e.clientX - r.left, moving: false, pid: e.pointerId };
    // OJO: no capturar el puntero aquí; si se captura, el clic llega al contenedor y no al botón de dentro (vender / ver joker).
  }

  // Coloca el elemento bajo el puntero: mide su hueco real en el DOM (sin transform) y lo desplaza hasta el puntero.
  function place(e) {
    const it = drag.item;
    it.style.transform = 'none';
    const slotLeft = it.getBoundingClientRect().left;
    const wanted = e.clientX - drag.grab;
    it.style.transform = `translateX(${(wanted - slotLeft) / viewScale()}px) scale(1.06)`;
    return wanted + it.getBoundingClientRect().width / 2; // centro visual del elemento
  }

  function onMove(e) {
    if (!drag || e.pointerId !== drag.pid) return;
    if (!drag.moving) {
      if (Math.abs(e.clientX - drag.startX) < THRESHOLD) return;
      drag.moving = true;
      drag.item.setPointerCapture?.(e.pointerId); // solo al empezar a arrastrar de verdad
      drag.item.classList.add('dragging');
      drag.item.style.zIndex = '60';
      drag.item.style.transition = 'none';
    }
    const cx = place(e);
    const arr = list();
    const idx = arr.indexOf(drag.item);
    // ¿Cruzó el centro de un vecino? Se intercambia en el DOM y se vuelve a colocar bajo el puntero.
    if (idx < arr.length - 1) { const o = arr[idx + 1].getBoundingClientRect(); if (cx > o.left + o.width / 2) { arr[idx + 1].after(drag.item); place(e); return; } }
    if (idx > 0) { const o = arr[idx - 1].getBoundingClientRect(); if (cx < o.left + o.width / 2) { arr[idx - 1].before(drag.item); place(e); } }
  }

  function onUp(e) {
    if (!drag || e.pointerId !== drag.pid) return;
    const { item, from, moving } = drag;
    drag = null;
    item.releasePointerCapture?.(e.pointerId);
    if (!moving) return;
    suppressClick = true;
    setTimeout(() => { suppressClick = false; }, 0);
    item.classList.remove('dragging');
    item.style.transform = '';
    item.style.zIndex = '';
    item.style.transition = '';
    const to = list().indexOf(item);
    if (to !== from) onReorder?.(from, to);
  }

  container.addEventListener('pointerdown', onDown);
  container.addEventListener('pointermove', onMove);
  container.addEventListener('pointerup', onUp);
  container.addEventListener('pointercancel', onUp);
  // Un arrastre no debe contar como clic (p. ej. abrir el menú de vender o elegir carta para descartar).
  container.addEventListener('click', (e) => { if (suppressClick) { e.stopPropagation(); e.preventDefault(); } }, true);
  return { destroy() { container.removeEventListener('pointerdown', onDown); container.removeEventListener('pointermove', onMove); container.removeEventListener('pointerup', onUp); container.removeEventListener('pointercancel', onUp); } };
}
