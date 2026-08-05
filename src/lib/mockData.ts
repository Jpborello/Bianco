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
    categoria: "Entradas & Picoteos"
  },
  {
    id: 2,
    nombre: "Causa Limeña de Pollo & Palta",
    descripcion: "Suave masa artesanal de papa amarilla prensada sazonada con ají amarillo y limón sutil, rellena de pechuga de pollo deshilachada, mayonesa casera, palta fresca y huevo duro.",
    precio: 10800,
    imagenUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80",
    categoria: "Entradas & Picoteos"
  },
  {
    id: 3,
    nombre: "Lomo Saltado al Wok",
    descripcion: "Tiras jugosas de lomo salteadas a fuego de wok con cebolla morada, tomate en cascos, ají amarillo, cilantro, vinagre tinto y sillao. Servido con papas fritas doradas y arroz con choclo.",
    precio: 16200,
    imagenUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80",
    categoria: "Platos Principales"
  },
  {
    id: 4,
    nombre: "Ají de Gallina Cremoso",
    descripcion: "Pechuga deshilachada sumergida en una crema suave a base de ají amarillo, crema de leche y queso fresco, servida sobre rodajas de papa cocida, arroz blanco, aceituna de botija y huevo duro.",
    precio: 13800,
    imagenUrl: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800&auto=format&fit=crop&q=80",
    categoria: "Platos Principales"
  },
  {
    id: 5,
    nombre: "Arroz con Mariscos a la Chalaca",
    descripcion: "Arroz graneado al wok sazonado con ají panca y sofrito criollo, abundante en camarones, calamares y mejillones frescos, servido con sarsa criolla y ají de la casa.",
    precio: 17500,
    imagenUrl: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800&auto=format&fit=crop&q=80",
    categoria: "Especialidades Peruanas"
  },
  {
    id: 6,
    nombre: "Anticuchos de Corazón Tradicionales",
    descripcion: "Jugosas brochetas marinadas en ají panca, comino, ajos y vinagre tinto, doradas a la parrilla y servidas con papa dorada, choclo tierno y crema de ají pollero.",
    precio: 11500,
    imagenUrl: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&auto=format&fit=crop&q=80",
    categoria: "Entradas & Picoteos"
  },
  {
    id: 7,
    nombre: "Chicha Morada Artesanal (1 L)",
    descripcion: "Bebida tradicional andina elaborada artesanalmente hirviendo maíz morado con cáscaras de piña, manzana, membrillo, canela en rama y clavo de olor, aromatizada con limón sutil.",
    precio: 4200,
    imagenUrl: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&auto=format&fit=crop&q=80",
    categoria: "Bebidas & Coctelería"
  },
  {
    id: 8,
    nombre: "Pisco Sour Peruano Clásico",
    descripcion: "Coctel peruano de autor preparado con Pisco Quebranta selección, jugo de limón sutil recién exprimido, jarabe de goma casero, clara de huevo emulsionada y gotas de Amargo de Angostura.",
    precio: 5800,
    imagenUrl: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&auto=format&fit=crop&q=80",
    categoria: "Bebidas & Coctelería"
  },
  {
    id: 9,
    nombre: "Suspiro a la Limeña",
    descripcion: "Postre criollo tradicional peruano. Dulce de leche perfumado con vainilla de Madagascar cubierto con suave merengue aireado al vino de Oporto y canela fina molida.",
    precio: 5200,
    imagenUrl: "https://images.unsplash.com/photo-1587314168485-3236d6710814?w=800&auto=format&fit=crop&q=80",
    categoria: "Postres Tradicionales"
  },
  {
    id: 10,
    nombre: "Picarones con Miel de Chancaca",
    descripcion: "Buñuelos crocantes por fuera y suaves por dentro elaborados con masa de zapallo macre y camote, servidos tibios y bañados en generosa miel de chancaca especiada con hoja de higo.",
    precio: 5500,
    imagenUrl: "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=800&auto=format&fit=crop&q=80",
    categoria: "Postres Tradicionales"
  }
];
