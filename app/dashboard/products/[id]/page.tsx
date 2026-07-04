'use client';

import ProductForm from '@/components/catalog/ProductForm';

export default function EditProductPage({ params }: { params: { id: string } }) {
  return <ProductForm productId={parseInt(params.id)} />;
}
