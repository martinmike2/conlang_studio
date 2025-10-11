"use client";
import RuleGraph from '../../../lib/ui/RuleGraph';
import { useActiveLanguage } from '../../../lib/providers/ActiveLanguageProvider';

export default function RuleGraphPage() {
  // For testing, use languageId=2 if no activeLanguage is set
  const { activeLanguage } = useActiveLanguage();
  const languageId = activeLanguage ? String(activeLanguage.id) : '2';
  return <RuleGraph languageId={languageId} />;
}
