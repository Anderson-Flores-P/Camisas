export const mockProductos = [
  {
    id: 'mock-1',
    nombre: 'Wave Club — negra',
    sku: 'SKU 001',
    ubicacion: '',
    precio: 59.9,
    tela: 'Algodón 220g',
    corte: 'Recto / oversize leve',
    estampado: 'Serigrafía frente',
    color_base: '#232323',
    activo: true,
  },
];

export const mockVariantes = [
  { id: 'v-s', producto_id: 'mock-1', talla: 'S', color: 'Negro taller', stock: 10 },
  { id: 'v-m', producto_id: 'mock-1', talla: 'M', color: 'Negro taller', stock: 8 },
  { id: 'v-l', producto_id: 'mock-1', talla: 'L', color: 'Negro taller', stock: 5 },
  { id: 'v-xl', producto_id: 'mock-1', talla: 'XL', color: 'Negro taller', stock: 3 },
];

export const mockPedidos = [];
