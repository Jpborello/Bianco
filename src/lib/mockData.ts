import { BRAND_CONFIG } from './brandConfig';

export interface Producto {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  imagenUrl: string;
  categoria: string;
  esCafe?: boolean;
  stock?: number | null;
  stockMinimo?: number | null;
}

export const CATEGORIAS = [
  "Entradas & Picoteos",
  "Platos Principales",
  "Especialidades Peruanas",
  "Postres Tradicionales",
  "Bebidas & Coctelería"
];

export const PRODUCTOS_MOCK: Producto[] = [
  {
    id: 1,
    nombre: "Ceviche Clásico Peruano",
    descripcion: "Cubos de pesca fresca del día marinados en leche de tigre de ají mochero y limón sutil. Acompañado de camote glaseado, choclo tierno desgranado y cancha serrana crocante.",
    precio: 14500,
    imagenUrl: "/productos/ceviche-clasico.jpg",
    categoria: "Entradas & Picoteos",
    stock: 30,
    stockMinimo: 5
  },
  {
    id: 2,
    nombre: "Causa Limeña de Pollo & Palta",
    descripcion: "Suave masa artesanal de papa amarilla prensada sazonada con ají amarillo y limón sutil, rellena de pechuga de pollo deshilachada, mayonesa casera, palta fresca y huevo duro.",
    precio: 10800,
    imagenUrl: "/productos/causa-limena.jpg",
    categoria: "Entradas & Picoteos",
    stock: 25,
    stockMinimo: 5
  },
  {
    id: 3,
    nombre: "Papa a la Huancaína",
    descripcion: "Rodajas de papa amarilla sancocha bañadas en una cremosa salsa huancaína a base de ají amarillo, queso fresco y galleta. Coronada con aceituna de botija y huevo duro.",
    precio: 9500,
    imagenUrl: "/productos/papa-huancaina.jpg",
    categoria: "Entradas & Picoteos",
    stock: 40,
    stockMinimo: 5
  },
  {
    id: 4,
    nombre: "Anticuchos de Corazón Tradicionales",
    descripcion: "Jugosas brochetas marinadas en ají panca, comino, ajos y vinagre tinto, doradas a la parrilla y servidas con papa dorada, choclo tierno y crema de ají pollero.",
    precio: 11500,
    imagenUrl: "/productos/anticuchos.jpg",
    categoria: "Entradas & Picoteos",
    stock: 20,
    stockMinimo: 5
  },
  {
    id: 5,
    nombre: "Lomo Saltado al Wok",
    descripcion: "Tiras jugosas de lomo salteadas a fuego alto de wok con cebolla morada, tomate en cascos, ají amarillo, cilantro, vinagre tinto y sillao. Servido con papas fritas crocantes y arroz con choclo.",
    precio: 16200,
    imagenUrl: "/productos/lomo-saltado.jpg",
    categoria: "Platos Principales",
    stock: 35,
    stockMinimo: 5
  },
  {
    id: 6,
    nombre: "Ají de Gallina Cremoso",
    descripcion: "Pechuga deshilachada sumergida en una suave y reconfortante crema a base de ají amarillo, crema de leche y queso fresco, servida sobre papas cocidas, arroz blanco, aceituna de botija y huevo duro.",
    precio: 13800,
    imagenUrl: "/productos/aji-de-gallina.jpg",
    categoria: "Platos Principales",
    stock: 25,
    stockMinimo: 5
  },
  {
    id: 7,
    nombre: "Seco de Cordero a la Norteña",
    descripcion: "Tierno osobuco de cordero guisado a fuego lento en reducción de chicha de jora, cilantro fresco y ají mirasol. Acompañado de frijoles canarios bien cremosos y arroz criollo.",
    precio: 17900,
    imagenUrl: "/productos/seco-de-cordero.jpg",
    categoria: "Platos Principales",
    stock: 18,
    stockMinimo: 3
  },
  {
    id: 8,
    nombre: "Arroz con Mariscos a la Chalaca",
    descripcion: "Arroz graneado al wok sazonado con ají panca y sofrito criollo, abundante en camarones, calamares y mejillones frescos, servido con sarsa criolla y ají de la casa.",
    precio: 17500,
    imagenUrl: "/productos/arroz-con-mariscos.jpg",
    categoria: "Especialidades Peruanas",
    stock: 22,
    stockMinimo: 4
  },
  {
    id: 9,
    nombre: "Tacu Tacu con Sábana de Lomo & Huevo",
    descripcion: "Típico pastel crocante a base de arroz y frijoles refritos al wok, servido con un sabroso filete de lomo apanado, huevo frito a caballo y plátano frito dulce.",
    precio: 16800,
    imagenUrl: "/productos/tacu-tacu.jpg",
    categoria: "Especialidades Peruanas",
    stock: 15,
    stockMinimo: 3
  },
  {
    id: 10,
    nombre: "Chaufa de Mariscos & Cerdo",
    descripcion: "Arroz frito al estilo Chifa peruano salteado a gran fuego con cebollita china, kion, tortilla de huevo, camarones jugosos y chicharroncito de cerdo glaseado.",
    precio: 15900,
    imagenUrl: "/productos/arroz-chaufa.jpg",
    categoria: "Especialidades Peruanas",
    stock: 30,
    stockMinimo: 5
  },
  {
    id: 11,
    nombre: "Suspiro a la Limeña",
    descripcion: "Postre criollo tradicional peruano. Manjarblanco artesanal perfumado con vainilla de Madagascar cubierto con suave merengue aireado al vino Oporto y canela fina molida.",
    precio: 5200,
    imagenUrl: "/productos/suspiro-limena.jpg",
    categoria: "Postres Tradicionales",
    stock: 25,
    stockMinimo: 5
  },
  {
    id: 12,
    nombre: "Picarones con Miel de Chancaca",
    descripcion: "Buñuelos crocantes por fuera y suaves por dentro elaborados con masa de zapallo macre y camote, servidos tibios y bañados en generosa miel de chancaca especiada con hoja de higo.",
    precio: 5500,
    imagenUrl: "/productos/picarones.jpg",
    categoria: "Postres Tradicionales",
    stock: 30,
    stockMinimo: 5
  },
  {
    id: 13,
    nombre: "Pisco Sour Peruano Clásico",
    descripcion: "Coctel de autor preparado con Pisco Quebranta selección, jugo de limón sutil recién exprimido, jarabe de goma casero, clara de huevo emulsionada y gotas de Amargo de Angostura.",
    precio: 5800,
    imagenUrl: "/productos/pisco-sour.jpg",
    categoria: "Bebidas & Coctelería",
    stock: 100,
    stockMinimo: 10
  },
  {
    id: 14,
    nombre: "Chicha Morada Artesanal (1 L)",
    descripcion: "Bebida tradicional andina elaborada artesanalmente hirviendo maíz morado con cáscaras de piña, manzana, membrillo, canela en rama y clavo de olor, aromatizada con limón sutil.",
    precio: 4200,
    imagenUrl: "/productos/chicha-morada.jpg",
    categoria: "Bebidas & Coctelería",
    stock: 50,
    stockMinimo: 10
  },
  {
    id: 15,
    nombre: "Chilcano de Pisco con Kion",
    descripcion: "Refrescante trago criollo con Pisco Acholado, Ginger Ale bien helada, jugo de limón sutil, rodaja de kion fresco y gotas de amargo.",
    precio: 5200,
    imagenUrl: "/productos/chilcano.jpg",
    categoria: "Bebidas & Coctelería",
    stock: 80,
    stockMinimo: 10
  }
];
