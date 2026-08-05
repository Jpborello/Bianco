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
    imagenUrl: "https://images.unsplash.com/photo-1535399831218-d5bd36d1a6b3?w=800&auto=format&fit=crop&q=80",
    categoria: "Entradas & Picoteos",
    stock: 30,
    stockMinimo: 5
  },
  {
    id: 2,
    nombre: "Causa Limeña de Pollo & Palta",
    descripcion: "Suave masa artesanal de papa amarilla prensada sazonada con ají amarillo y limón sutil, rellena de pechuga de pollo deshilachada, mayonesa casera, palta fresca y huevo duro.",
    precio: 10800,
    imagenUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80",
    categoria: "Entradas & Picoteos",
    stock: 25,
    stockMinimo: 5
  },
  {
    id: 3,
    nombre: "Papa a la Huancaína",
    descripcion: "Rodajas de papa amarilla sancocha bañadas en una cremosa salsa huancaína a base de ají amarillo, queso fresco y galleta. Coronada con aceituna de botija y huevo duro.",
    precio: 9500,
    imagenUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&auto=format&fit=crop&q=80",
    categoria: "Entradas & Picoteos",
    stock: 40,
    stockMinimo: 5
  },
  {
    id: 4,
    nombre: "Anticuchos de Corazón Tradicionales",
    descripcion: "Jugosas brochetas marinadas en ají panca, comino, ajos y vinagre tinto, doradas a la parrilla y servidas con papa dorada, choclo tierno y crema de ají pollero.",
    precio: 11500,
    imagenUrl: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&auto=format&fit=crop&q=80",
    categoria: "Entradas & Picoteos",
    stock: 20,
    stockMinimo: 5
  },
  {
    id: 5,
    nombre: "Lomo Saltado al Wok",
    descripcion: "Tiras jugosas de lomo salteadas a fuego alto de wok con cebolla morada, tomate en cascos, ají amarillo, cilantro, vinagre tinto y sillao. Servido con papas fritas crocantes y arroz con choclo.",
    precio: 16200,
    imagenUrl: "https://images.unsplash.com/photo-1603073163308-9655c3b7284b?w=800&auto=format&fit=crop&q=80",
    categoria: "Platos Principales",
    stock: 35,
    stockMinimo: 5
  },
  {
    id: 6,
    nombre: "Ají de Gallina Cremoso",
    descripcion: "Pechuga deshilachada sumergida en una suave y reconfortante crema a base de ají amarillo, crema de leche y queso fresco, servida sobre papas cocidas, arroz blanco, aceituna de botija y huevo duro.",
    precio: 13800,
    imagenUrl: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800&auto=format&fit=crop&q=80",
    categoria: "Platos Principales",
    stock: 25,
    stockMinimo: 5
  },
  {
    id: 7,
    nombre: "Seco de Cordero a la Norteña",
    descripcion: "Tierno osobuco de cordero guisado a fuego lento en reducción de chicha de jora, cilantro fresco y ají mirasol. Acompañado de frijoles canarios bien cremosos y arroz criollo.",
    precio: 17900,
    imagenUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80",
    categoria: "Platos Principales",
    stock: 18,
    stockMinimo: 3
  },
  {
    id: 8,
    nombre: "Arroz con Mariscos a la Chalaca",
    descripcion: "Arroz graneado al wok sazonado con ají panca y sofrito criollo, abundante en camarones, calamares y mejillones frescos, servido con sarsa criolla y ají de la casa.",
    precio: 17500,
    imagenUrl: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800&auto=format&fit=crop&q=80",
    categoria: "Especialidades Peruanas",
    stock: 22,
    stockMinimo: 4
  },
  {
    id: 9,
    nombre: "Tacu Tacu con Sábana de Lomo & Huevo",
    descripcion: "Típico pastel crocante a base de arroz y frijoles refritos al wok, servido con un sabroso filete de lomo apanado, huevo frito a caballo y plátano frito dulce.",
    precio: 16800,
    imagenUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&auto=format&fit=crop&q=80",
    categoria: "Especialidades Peruanas",
    stock: 15,
    stockMinimo: 3
  },
  {
    id: 10,
    nombre: "Chaufa de Mariscos & Cerdo",
    descripcion: "Arroz frito al estilo Chifa peruano salteado a gran fuego con cebollita china, kion, tortilla de huevo, camarones jugosos y chicharroncito de cerdo glaseado.",
    precio: 15900,
    imagenUrl: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800&auto=format&fit=crop&q=80",
    categoria: "Especialidades Peruanas",
    stock: 30,
    stockMinimo: 5
  },
  {
    id: 11,
    nombre: "Suspiro a la Limeña",
    descripcion: "Postre criollo tradicional peruano. Manjarblanco artesanal perfumado con vainilla de Madagascar cubierto con suave merengue aireado al vino Oporto y canela fina molida.",
    precio: 5200,
    imagenUrl: "https://images.unsplash.com/photo-1587314168485-3236d6710814?w=800&auto=format&fit=crop&q=80",
    categoria: "Postres Tradicionales",
    stock: 25,
    stockMinimo: 5
  },
  {
    id: 12,
    nombre: "Picarones con Miel de Chancaca",
    descripcion: "Buñuelos crocantes por fuera y suaves por dentro elaborados con masa de zapallo macre y camote, servidos tibios y bañados en generosa miel de chancaca especiada con hoja de higo.",
    precio: 5500,
    imagenUrl: "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=800&auto=format&fit=crop&q=80",
    categoria: "Postres Tradicionales",
    stock: 30,
    stockMinimo: 5
  },
  {
    id: 13,
    nombre: "Pisco Sour Peruano Clásico",
    descripcion: "Coctel de autor preparado con Pisco Quebranta selección, jugo de limón sutil recién exprimido, jarabe de goma casero, clara de huevo emulsionada y gotas de Amargo de Angostura.",
    precio: 5800,
    imagenUrl: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&auto=format&fit=crop&q=80",
    categoria: "Bebidas & Coctelería",
    stock: 100,
    stockMinimo: 10
  },
  {
    id: 14,
    nombre: "Chicha Morada Artesanal (1 L)",
    descripcion: "Bebida tradicional andina elaborada artesanalmente hirviendo maíz morado con cáscaras de piña, manzana, membrillo, canela en rama y clavo de olor, aromatizada con limón sutil.",
    precio: 4200,
    imagenUrl: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&auto=format&fit=crop&q=80",
    categoria: "Bebidas & Coctelería",
    stock: 50,
    stockMinimo: 10
  },
  {
    id: 15,
    nombre: "Chilcano de Pisco con Kion",
    descripcion: "Refrescante trago criollo con Pisco Acholado, Ginger Ale bien helada, jugo de limón sutil, rodaja de kion fresco y gotas de amargo.",
    precio: 5200,
    imagenUrl: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&auto=format&fit=crop&q=80",
    categoria: "Bebidas & Coctelería",
    stock: 80,
    stockMinimo: 10
  }
];
