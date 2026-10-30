import { MEDIA } from '../config';

export type Unit = 'kg' | 'dozen' | 'bunch';

export interface Product {
  id: string;
  name: string;
  description: string;
  farmName: string;
  harvestDate: string; // ISO date
  price: number; // in CURRENCY units, per `unit`
  unit: Unit;
  organicCertified: boolean;
  certificationLabel: string;
  stock: number;
  /** Position on the interior still, as fractions of the image (0..1). */
  hotspot: { x: number; y: number };
  image: string;
}

export const products: Product[] = [
  {
    id: 'mangoes',
    name: 'Alphonso mangoes',
    description: 'Ripened on the tree until they smell like mango through the skin.',
    farmName: 'North orchard, row 4',
    harvestDate: '2026-10-27',
    price: 480,
    unit: 'kg',
    organicCertified: true,
    certificationLabel: 'India Organic (NPOP)',
    stock: 24,
    hotspot: { x: 0.708, y: 0.75 },
    image: `${MEDIA.base}/products/mangoes.webp`,
  },
  {
    id: 'oranges',
    name: 'Coorg oranges',
    description: 'Thin skinned and sharp. Good for juice, better eaten in the sun.',
    farmName: 'Hillside grove',
    harvestDate: '2026-10-28',
    price: 160,
    unit: 'kg',
    organicCertified: true,
    certificationLabel: 'India Organic (NPOP)',
    stock: 40,
    hotspot: { x: 0.366, y: 0.7 },
    image: `${MEDIA.base}/products/oranges.webp`,
  },
  {
    id: 'strawberries',
    name: 'Strawberries',
    description: 'Small, dark and sweet. Picked in the cool of the morning.',
    farmName: 'Polytunnel 2',
    harvestDate: '2026-10-29',
    price: 220,
    unit: 'kg',
    organicCertified: true,
    certificationLabel: 'PGS-India Organic',
    stock: 0,
    hotspot: { x: 0.77, y: 0.91 },
    image: `${MEDIA.base}/products/strawberries.webp`,
  },
  {
    id: 'green-grapes',
    name: 'Green grapes',
    description: 'Seedless Thompson grapes with a little tartness left in.',
    farmName: 'East vineyard',
    harvestDate: '2026-10-27',
    price: 140,
    unit: 'kg',
    organicCertified: false,
    certificationLabel: 'In conversion (year 2 of 3)',
    stock: 18,
    hotspot: { x: 0.345, y: 0.905 },
    image: `${MEDIA.base}/products/green-grapes.webp`,
  },
  {
    id: 'wildflowers',
    name: 'Wildflower bunch',
    description: 'Whatever is flowering along the meadow path that week, tied with twine.',
    farmName: 'Meadow path',
    harvestDate: '2026-10-29',
    price: 350,
    unit: 'bunch',
    organicCertified: true,
    certificationLabel: 'PGS-India Organic',
    stock: 12,
    hotspot: { x: 0.625, y: 0.63 },
    image: `${MEDIA.base}/products/wildflowers.png`,
  },
  {
    id: 'lavender',
    name: 'Lavender bunch',
    description: 'Cut just as the buds open. Dries well and keeps its scent for months.',
    farmName: 'Lavender beds by the gate',
    harvestDate: '2026-10-26',
    price: 300,
    unit: 'bunch',
    organicCertified: true,
    certificationLabel: 'PGS-India Organic',
    stock: 9,
    hotspot: { x: 0.379, y: 0.44 },
    image: `${MEDIA.base}/products/lavender.png`,
  },
];

export const productById = Object.fromEntries(products.map((p) => [p.id, p])) as Record<string, Product>;
