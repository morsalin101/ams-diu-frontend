import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Trash2, Save, ArrowUp } from 'lucide-react';
import { MathText } from './MathText';

const BOTH_KEYS = ['ক', 'খ', 'গ', 'ঘ'] as const;
const ENG_KEYS = ['A', 'B', 'C', 'D'] as const;

type OptionMap = Record<string, string>;

export interface EditableQuestion {
  subject: string;
  question_bangla: string;
  question_english: string;
  options: { both: OptionMap; english: OptionMap };
  answer: { both: string[]; english: string[] };
  semester: string;
  department: string;
  qno: number | string;
}

export function normalizeIncoming(item: any, index: number): EditableQuestion {
  const opts = item?.options ?? {};
  const ans = item?.answer ?? {};
  return {
    subject: item?.subject ?? '',
    question_bangla: item?.question_bangla ?? '',
    question_english: item?.question_english ?? '',
    options: {
      both: (opts.both && typeof opts.both === 'object') ? opts.both : {},
      english: (opts.english && typeof opts.english === 'object') ? opts.english : {},
    },
    answer: {
      both: Array.isArray(ans.both) ? ans.both : (ans.both ? [ans.both] : []),
      english: Array.isArray(ans.english) ? ans.english : (ans.english ? [ans.english] : []),
    },
    semester: item?.semester ?? '',
    department: item?.department ?? item?.department_shortname ?? 'CSE',
    qno: item?.qno ?? index + 1,
  };
}

export function buildInsertPayload(questions: EditableQuestion[], filename: string) {
  const data = questions.map((q) => {
    const bangla = q.question_bangla.trim();
    const english = q.question_english.trim();
    const both = english ? `${bangla} (${english})`.trim() : bangla;
    return {
      subject: q.subject.trim(),
      question_bangla: bangla,
      question_english: english,
      question_both: both,
      options: q.options,
      answer: q.answer,
      semester: q.semester.trim(),
      department: (q.department || 'CSE').trim(),
      qno: q.qno,
    };
  });
  return { results: [{ filename, success: true, count: data.length, data }] };
}

const brandBtn =
  'bg-gradient-to-r from-[#2E3094] to-[#4C51BF] hover:from-[#1E2078] hover:to-[#3A3F9A] text-white';

interface ScrappedQuestionEditorProps {
  questions: EditableQuestion[];
  onQuestionsChange: (questions: EditableQuestion[]) => void;
  onInsert: () => void;
  isInserting: boolean;
  insertResult: any;
}

export function ScrappedQuestionEditor({
  questions,
  onQuestionsChange,
  onInsert,
  isInserting,
  insertResult,
}: ScrappedQuestionEditorProps) {
  const [showTopButton, setShowTopButton] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTopButton(window.scrollY > 300);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const updateQuestion = (idx: number, patch: Partial<EditableQuestion>) => {
    onQuestionsChange(questions.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  };

  const updateOption = (idx: number, set: 'both' | 'english', key: string, value: string) => {
    onQuestionsChange(
      questions.map((q, i) =>
        i === idx
          ? { ...q, options: { ...q.options, [set]: { ...q.options[set], [key]: value } } }
          : q
      )
    );
  };

  const setAnswer = (idx: number, set: 'both' | 'english', key: string) => {
    onQuestionsChange(
      questions.map((q, i) => (i === idx ? { ...q, answer: { ...q.answer, [set]: [key] } } : q))
    );
  };

  const removeQuestion = (idx: number) => {
    onQuestionsChange(questions.filter((_, i) => i !== idx));
  };

  const renderOptionSet = (q: EditableQuestion, idx: number, set: 'both' | 'english') => {
    const keys = set === 'both' ? BOTH_KEYS : ENG_KEYS;
    const map = q.options[set];
    return (
      <div className="mt-3">
        <Label className="text-xs font-semibold text-gray-500 uppercase">
          {set === 'both' ? 'Options (ক / খ / গ / ঘ)' : 'English options (A / B / C / D)'}
        </Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
          {keys.map((k) => {
            const selected = q.answer[set]?.[0] === k;
            return (
              <div
                key={k}
                className={`flex items-start gap-2 p-2 rounded border ${
                  selected ? 'border-green-500 bg-green-50' : 'border-gray-200'
                }`}
              >
                <input
                  type="radio"
                  className="mt-2"
                  name={`answer-${idx}-${set}`}
                  checked={selected}
                  onChange={() => setAnswer(idx, set, k)}
                  title="Mark as correct answer"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold w-5">{k}.</span>
                    <Input
                      value={map[k] ?? ''}
                      onChange={(e) => updateOption(idx, set, k, e.target.value)}
                      placeholder={`Option ${k}`}
                    />
                  </div>
                  {(map[k] || '').includes('$') && (
                    <div className="text-sm text-gray-700 mt-1 pl-6">
                      <MathText text={map[k]} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      {questions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Review &amp; Edit ({questions.length})</span>
              <Button onClick={onInsert} disabled={isInserting} className={brandBtn}>
                <Save className="h-4 w-4 mr-2" />
                {isInserting ? 'Inserting…' : 'Insert to Database'}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {questions.map((q, idx) => (
              <div key={idx} className="border rounded-lg p-4 bg-white">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-[#2E3094]">Question #{q.qno}</span>
                  <Button variant="ghost" size="sm" onClick={() => removeQuestion(idx)}>
                    <Trash2 className="h-4 w-4 mr-1" /> Remove
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                  <div>
                    <Label className="text-xs">Subject</Label>
                    <Input
                      value={q.subject}
                      onChange={(e) => updateQuestion(idx, { subject: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Semester</Label>
                    <Input
                      value={q.semester}
                      onChange={(e) => updateQuestion(idx, { semester: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Department</Label>
                    <Input
                      value={q.department}
                      onChange={(e) => updateQuestion(idx, { department: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Question No.</Label>
                    <Input
                      value={String(q.qno)}
                      onChange={(e) => updateQuestion(idx, { qno: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Question (Bangla)</Label>
                    <Textarea
                      value={q.question_bangla}
                      onChange={(e) => updateQuestion(idx, { question_bangla: e.target.value })}
                      rows={2}
                    />
                    {q.question_bangla.includes('$') && (
                      <div className="text-sm text-gray-700 mt-1 p-2 bg-gray-50 rounded">
                        <MathText text={q.question_bangla} />
                      </div>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs">Question (English)</Label>
                    <Textarea
                      value={q.question_english}
                      onChange={(e) => updateQuestion(idx, { question_english: e.target.value })}
                      rows={2}
                    />
                    {q.question_english.includes('$') && (
                      <div className="text-sm text-gray-700 mt-1 p-2 bg-gray-50 rounded">
                        <MathText text={q.question_english} />
                      </div>
                    )}
                  </div>
                </div>

                {renderOptionSet(q, idx, 'both')}
                {renderOptionSet(q, idx, 'english')}
                <p className="text-xs text-gray-400 mt-2">
                  Select the radio next to the correct option. Each option set needs exactly 4
                  filled options and one selected answer.
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {insertResult && (
        <Card>
          <CardHeader>
            <CardTitle>Insert Result</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 text-sm mb-3">
              <span className="text-green-700">Created: {insertResult.created_count ?? 0}</span>
              <span className="text-yellow-700">
                Skipped duplicates: {insertResult.skipped_duplicates ?? 0}
              </span>
              <span className="text-red-700">Invalid: {insertResult.invalid_count ?? 0}</span>
            </div>
            {Array.isArray(insertResult.invalid) && insertResult.invalid.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded p-3 text-sm">
                <div className="font-semibold text-red-700 mb-1">Invalid items:</div>
                <ul className="list-disc pl-5 space-y-1">
                  {insertResult.invalid.map((inv: any, i: number) => (
                    <li key={i}>
                      Q{inv.question_no ?? '?'} — {inv.subject}: {(inv.issues || []).join(', ')}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {showTopButton && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-40 h-12 w-12 rounded-full bg-gradient-to-r from-[#2E3094] to-[#4C51BF] text-white shadow-lg flex items-center justify-center hover:from-[#1E2078] hover:to-[#3A3F9A]"
          aria-label="Back to top"
          title="Back to top"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}
    </>
  );
}
