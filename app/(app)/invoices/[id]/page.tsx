'use client';

import { useParams } from 'next/navigation';
import DocumentDetail from '@/components/document-detail';

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <DocumentDetail mode="invoice" id={id} />;
}
