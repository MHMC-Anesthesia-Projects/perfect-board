'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import WhiteboardPage from '../mhmc/page';

export default function FacilityDynamicBoardPage() {
  const params = useParams();
  const facility = params?.facility as string;

  // Render the core whiteboard engine for the requested facility
  return <WhiteboardPage />;
}
