export interface Producto {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  imagenUrl: string;
  categoria: string;
  esCafe?: boolean;
}

export const CATEGORIAS = [
  "Pastelería de Autor",
  "Cafetería",
  "Viennoiserie",
  "Salados"
];

export const PRODUCTOS_MOCK: Producto[] = [
  {
    id: 1,
    nombre: "Bianco Foret",
    descripcion: "Nuestra versión de Selva Negra con mousse de chocolate belga, bizcochuelo húmedo embebido en licor de cerezas y frosting de vainilla de Madagascar.",
    precio: 6500,
    imagenUrl: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80",
    categoria: "Pastelería de Autor"
  },
  {
    id: 2,
    nombre: "Tarta de Pistacho & Frambuesas",
    descripcion: "Sablée de almendras, frangipane de pistacho, ganache montada de chocolate blanco e inserto de frambuesas frescas.",
    precio: 7200,
    imagenUrl: "https://images.unsplash.com/photo-1519869325930-281384150729?w=600&auto=format&fit=crop&q=80",
    categoria: "Pastelería de Autor"
  },
  {
    id: 3,
    nombre: "Flat White",
    descripcion: "Doble espresso de granos seleccionados de especialidad y leche emulsionada con textura sedosa.",
    precio: 3500,
    imagenUrl: "https://images.unsplash.com/photo-1541167760496-1628856ab772?w=600&auto=format&fit=crop&q=80",
    categoria: "Cafetería",
    esCafe: true
  },
  {
    id: 4,
    nombre: "Cappuccino Italiano",
    descripcion: "Espresso simple, leche al vapor y abundante espuma de leche espolvoreada con cacao belga en polvo.",
    precio: 3400,
    imagenUrl: "https://images.unsplash.com/photo-1534778101976-62847782c213?w=600&auto=format&fit=crop&q=80",
    categoria: "Cafetería",
    esCafe: true
  },
  {
    id: 5,
    nombre: "Croissant de Almendras",
    descripcion: "Hojaldre clásico de manteca de alta calidad relleno con crema frangipane y cubierto con almendras fileteadas tostadas.",
    precio: 3900,
    imagenUrl: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop&q=80",
    categoria: "Viennoiserie"
  },
  {
    id: 6,
    nombre: "Pain au Chocolat",
    descripcion: "Hojaldre súper crocante con dos barras de chocolate semi-amargo belga en su interior.",
    precio: 3700,
    imagenUrl: "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=600&auto=format&fit=crop&q=80",
    categoria: "Viennoiserie"
  },
  {
    id: 7,
    nombre: "Pastel de Cómic 2D (Comic Cake)",
    descripcion: "Nuestra tarta de tendencia con diseño de caricatura en 2D, con capas de vainilla, relleno de chocolate y delineado artesanal.",
    precio: 6200,
    imagenUrl: "/pastel_comic.png",
    categoria: "Pastelería de Autor"
  }
];
