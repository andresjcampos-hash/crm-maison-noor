export interface Product {
  id: string;
  name: string;
  brand?: string;
  olfactoryProfile?: string;
  notesTop?: string;
  notesMiddle?: string;
  notesBase?: string;
  occasion?: string;

  price: number;
  stock: number;
  active: boolean;

  createdAt: number;
}
