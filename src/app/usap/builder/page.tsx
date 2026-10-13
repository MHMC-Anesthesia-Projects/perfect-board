'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { BoardBuilderWizard } from '@/components/BoardBuilderWizard';

export default function UsapBoardBuilderPage() {
  const router = useRouter();

  return (
    <BoardBuilderWizard
      isOpen={true}
      onClose={() => router.push('/usap')}
      orgSlug="usap"
    />
  );
}
