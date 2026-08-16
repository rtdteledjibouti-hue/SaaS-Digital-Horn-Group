'use client';

import { useParams } from 'next/navigation';
import DocumentDetail from '@/components/document-detail';

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <DocumentDetail mode="quote" id={id} />;
}
