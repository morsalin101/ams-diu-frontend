import React from 'react';
import { CreateQuestions as OriginalCreateQuestions } from './CreateQuestions';

export function SimpleCreateQuestions() {
  return <OriginalCreateQuestions gradientClass="from-[#2E3094] to-[#4C51BF]" />;
}

export default SimpleCreateQuestions;