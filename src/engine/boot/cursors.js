/**
 * Cat-paw mouse cursors. The 16 x 16 pictures from the UI pack are drawn twice as big
 * (so they stay crisp) and used as CSS cursors: a plain paw, a pointing paw over buttons
 * and a holding paw while the button is down. Touch screens have no cursor, so nothing happens there.
 */
function enlarge(url) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.width * 2;
      canvas.height = image.height * 2;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/png'));
    };
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

export async function installCursors(art, canvas) {
  const c = art.ui.cursors;
  if (!c || !canvas || !window.matchMedia?.('(pointer: fine)').matches) return;
  const [normal, point, hold] = await Promise.all([enlarge(c.normal), enlarge(c.point), enlarge(c.hold)]);
  if (!normal) return;
  const [hx, hy] = c.hotspot || [4, 2];
  const css = (data) => `url(${data}) ${hx * 2} ${hy * 2}, auto`;
  const root = document.documentElement.style;
  root.setProperty('--cursor-normal', css(normal));
  root.setProperty('--cursor-point', css(point || normal));
  root.setProperty('--cursor-hold', css(hold || normal));
  document.body.classList.add('paw-cursor');
  // Phaser switches the canvas to "pointer" over buttons; that is what tells us to show the pointing paw.
  const watch = () => canvas.classList.toggle('over-button', canvas.style.cursor === 'pointer');
  new MutationObserver(watch).observe(canvas, { attributes: true, attributeFilter: ['style'] });
  canvas.addEventListener('pointerdown', () => canvas.classList.add('pressing'));
  window.addEventListener('pointerup', () => canvas.classList.remove('pressing'));
}
