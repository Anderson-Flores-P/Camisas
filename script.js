// aparición al bajar
const reveals = document.querySelectorAll('.reveal');
const obs = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.12 });
reveals.forEach(r => obs.observe(r));

// menú móvil
const menuBtn = document.getElementById('menuBtn');
const mobileMenu = document.getElementById('mobileMenu');
menuBtn.addEventListener('click', () => mobileMenu.classList.toggle('open'));
mobileMenu.querySelectorAll('a').forEach(a =>
  a.addEventListener('click', () => mobileMenu.classList.remove('open'))
);

// colores de tela
const colorBtns = document.querySelectorAll('.color');
const heroBody = document.getElementById('heroShirtBody');
const cardBody = document.getElementById('cardShirtBody');
const colorName = document.getElementById('colorName');
colorBtns.forEach(b => b.addEventListener('click', () => {
  colorBtns.forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  const c = b.dataset.color;
  if (heroBody) heroBody.setAttribute('fill', c);
  if (cardBody) cardBody.setAttribute('fill', c);
  if (colorName) colorName.textContent = b.dataset.name;
}));

// tallas
document.querySelectorAll('.sizes').forEach(group => {
  group.querySelectorAll('.size').forEach(btn => {
    btn.addEventListener('click', () => {
      group.querySelectorAll('.size').forEach(x => x.classList.remove('active'));
      btn.classList.add('active');
    });
  });
});

// inclinación leve de la foto al mover el mouse (desktop)
const tilt = document.getElementById('tiltCard');
if (tilt && window.matchMedia('(pointer:fine)').matches) {
  tilt.addEventListener('mousemove', (e) => {
    const r = tilt.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    tilt.style.transform = `rotate(0.6deg) perspective(700px) rotateY(${x * 7}deg) rotateX(${-y * 7}deg)`;
  });
  tilt.addEventListener('mouseleave', () => { tilt.style.transform = ''; });
}

// anotados (carrito falso)
let count = 0;
const cartCount = document.getElementById('cartCount');
const toast = document.getElementById('toast');
let t;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(t);
  t = setTimeout(() => toast.classList.remove('show'), 2200);
}
document.querySelectorAll('.add-cart').forEach(b => {
  b.addEventListener('click', () => {
    count++;
    cartCount.textContent = count;
    const talla = document.querySelector('.sizes .size.active')?.textContent || 'M';
    const color = colorName?.textContent || '';
    showToast(`Anotado: Wave Club ${color} talla ${talla} (${count})`);
    closeModal();
  });
});
document.getElementById('cartBtn').addEventListener('click', () => {
  showToast(count === 0 ? 'Aún no anotaste nada — es solo maqueta' : `Llevas ${count} anotada(s) — maqueta`);
});

// modal ficha
const modal = document.getElementById('modal');
function closeModal() { modal.classList.remove('open'); }
document.getElementById('quickViewBtn').addEventListener('click', () => modal.classList.add('open'));
document.getElementById('modalClose').addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
