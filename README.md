# nuevas camisas — taller / maqueta v2

Maqueta solo visual de la futura tienda. No cobra, no guarda datos, no tiene backend. Sirve para ver **dónde va cada cosa y cómo se va a ver**.

## Cómo abrirla

Doble clic en `index.html`. No necesita internet ni instalar nada.

```
Nuevas camisas/
├── index.html   → estructura: portada, catálogo, mapa, pedido, pie
├── styles.css   → diseño papel/tinta + animaciones
├── script.js    → colores, tallas, anotados, modal, tilt
└── README.md    → este archivo
```

## Qué cambió en la v2 (porque la v1 se veía a IA)

La v1 tenía los tics típicos de IA: fondo oscuro con brillos morados/naranjas, glassmorphism, emojis por todos lados, textos genéricos tipo "✨ vista previa", tarjetas idénticas perfectas.

En la v2 lo cambié todo:

- **Estética de taller, no de startup:** fondo papel `#efe9db`, tinta negra, bordes gruesos, sombras duras, tipografía Georgia + Courier. Sin degradados neón.
- **Textura:** grano sutil en toda la página para que no se vea plano digital.
- **Imperfecciones a propósito:** tarjeta de foto ligeramente girada, cintas adhesivas en las esquinas, sello "muestra" girado, tarjetas del catálogo con rotación distinta, recuadros vacíos con borde punteado.
- **Copy humano:** habla de "se imprime bajo pedido, tardamos 3 a 5 días", "mándame la foto y lo monto", precios en S/ 59.90 de ejemplo, borrador de mensaje de WhatsApp. Nada de "Descubre la revolución".
- **Cero emojis en la UI:** solo texto, `[01]`, `·`, `→`. Lo único ilustrado es la camisa.
- **Camisa más creíble:** el SVG ahora tiene arrugas (filtro turbulence), costuras punteadas, cuello con rib, etiqueta de talla M, y estampado con leve descalce como serigrafía real. Ya no es un vector plano perfecto.
- **Animaciones que te gustaron, afinadas:** flotación más lenta y corta, marquesina más lenta (26s, estilo cinta de taller), aparición al scroll más sobria, tilt 3D leve en la foto solo en desktop. Quité el brillo cruzando y el bounce de etiquetas.

## Dónde está cada cosa

1. **Arriba:** barra negra (aviso de drop) + menú fijo con logo, 3 enlaces y contador "Anotados".
2. **Portada (#camisa):** a la izquierda título, selector de color con nombre real (Negro taller / Crudo / Azul trabajo / Verde), selector S–XL, precio y botones. A la derecha la camisa de referencia con cinta y nota a mano.
3. **Cinta negra:** datos de taller en loop.
4. **Catálogo (#catalogo):** 1 ficha real (SKU 001, tela/corte/estampado, precio, botón Anotar) + 3 huecos punteados para tus próximos diseños.
5. **Mapa:** lista 01–04 que explica la página.
6. **Pedido (#pedido):** propuesta de vender por WhatsApp con borrador de mensaje copiable a ojo.
7. **Pie:** taller, contacto y horario de ejemplo + aviso de maqueta.
8. **Extras:** modal "Ficha de la camisa" y toast "Anotado".

## La camisa de referencia

- Es SVG en código, no foto, para que se vea decente sin fotos aún.
- Cambia de color con los botones y se replica en la tarjeta del catálogo (mismo `fill`).
- Cuando tengas fotos: reemplaza el `<svg class="shirt">` por `<img src="wave-negra-frente.jpg" alt="...">`. Te dejé el `figcaption` ya escrito como "Foto 1 — frente, sin modelo".

## Cómo editar rápido

- Precio/nombre: busca `Wave Club` o `59.90` en `index.html`.
- Colores de tela: en `index.html` cambia `data-color` y `data-name`; en `script.js` no hay que tocar nada.
- Agregar camisa: copia el `<article class="card empty">`, cámbiale el título y el precio.
- WhatsApp real: en la sección pedido cambia el `href="#"` por `https://wa.me/51XXXXXXXXX?text=Hola...`.
- Quitar grano: borra el `<div class="grain">` y su CSS.

## Pendiente para cuando sea tienda real

- Fotos frente + atrás por cada diseño.
- Tabla de medidas en cm por talla.
- Precios y stock finales.
- Definir si el pedido queda en WhatsApp o pasamos a carrito con pagos.

---
v2 hecha el 2026-10-06. Si algo sigue oliendo a IA dime qué parte y la ajusto puntual.
