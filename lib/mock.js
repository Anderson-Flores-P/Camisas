export const mockProductos = [
  {
    id: 'mock-1',
    nombre: 'Wave Club — negra',
    sku: 'SKU 001',
    ubicacion: '',
    categoria: 'Wave Club',
    mostrar_inicio: true,
    precio: 59.9,
    tela: 'Algodón 220g',
    corte: 'Recto / oversize leve',
    estampado: 'Serigrafía frente',
    color_base: '#232323',
    activo: true,
  },
  {
    id: 'mock-2',
    nombre: 'Naruto — sabio',
    sku: 'SKU 002',
    ubicacion: '',
    categoria: 'Naruto',
    mostrar_inicio: false,
    precio: 64.9,
    tela: 'Algodón 220g',
    corte: 'Recto',
    estampado: 'Serigrafía frente',
    color_base: '#2e4a7a',
    activo: true,
  },
];

export const mockVariantes = [
  { id: 'v-s', producto_id: 'mock-1', talla: 'S', color: 'Negro taller', stock: 10 },
  { id: 'v-m', producto_id: 'mock-1', talla: 'M', color: 'Negro taller', stock: 8 },
  { id: 'v-l', producto_id: 'mock-1', talla: 'L', color: 'Negro taller', stock: 5 },
  { id: 'v-xl', producto_id: 'mock-1', talla: 'XL', color: 'Negro taller', stock: 3 },
  { id: 'v2-s', producto_id: 'mock-2', talla: 'S', color: 'Único', stock: 4 },
  { id: 'v2-m', producto_id: 'mock-2', talla: 'M', color: 'Único', stock: 6 },
  { id: 'v2-l', producto_id: 'mock-2', talla: 'L', color: 'Único', stock: 2 },
  { id: 'v2-xl', producto_id: 'mock-2', talla: 'XL', color: 'Único', stock: 0 },
];

export const mockPedidos = [];

export const mockCategorias = [
  { id: 'c1', nombre: 'Wave Club' },
  { id: 'c2', nombre: 'One Piece' },
  { id: 'c3', nombre: 'Naruto' },
  { id: 'c4', nombre: 'Pokemon' },
  { id: 'c5', nombre: 'Kimetsu no Yaiba' },
];
