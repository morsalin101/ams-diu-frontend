import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Cpu, UploadCloud, Trash2, Sparkles, Save, KeyRound } from 'lucide-react';
import { fileAPI } from '../services/api';
import { MathText } from '../components/MathText';
import toast from 'react-hot-toast';

const BOTH_KEYS = ['ক', 'খ', 'গ', 'ঘ'] as const;
const ENG_KEYS = ['A', 'B', 'C', 'D'] as const;

const API_KEY_STORAGE = 'gemini_api_key';
const MODEL_STORAGE = 'gemini_model';
const DEFAULT_MODEL = 'gemini-3.5-flash';

type OptionMap = Record<string, string>;

interface EditableQuestion {
  subject: string;
  question_bangla: string;
  question_english: string;
  options: { both: OptionMap; english: OptionMap };
  answer: { both: string[]; english: string[] };
  semester: string;
  department: string;
  qno: number | string;
}

function normalizeIncoming(item: any, index: number): EditableQuestion {
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

function hasContent(map: OptionMap) {
  return Object.values(map || {}).some((v) => (v ?? '').toString().trim().length > 0);
}

export default function AiQuestionScrapper() {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [file, setFile] = useState<File | null>(null);
  const [isScraping, setIsScraping] = useState(false);
  const [isInserting, setIsInserting] = useState(false);
  const [questions, setQuestions] = useState<EditableQuestion[]>([]);
  const [filename, setFilename] = useState<string>('');
  const [insertResult, setInsertResult] = useState<any>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Remember key + model in the browser (never sent anywhere except the scrape request).
  useEffect(() => {
    setApiKey(localStorage.getItem(API_KEY_STORAGE) || '');
    setModel(localStorage.getItem(MODEL_STORAGE) || DEFAULT_MODEL);
  }, []);
  useEffect(() => {
    localStorage.setItem(API_KEY_STORAGE, apiKey);
  }, [apiKey]);
  useEffect(() => {
    localStorage.setItem(MODEL_STORAGE, model);
  }, [model]);

  const acceptFile = (f: File | undefined | null) => {
    if (!f) return;
    const name = f.name.toLowerCase();
    if (!name.endsWith('.pdf') && !name.endsWith('.docx')) {
      toast.error('Please select a .pdf or .docx file');
      return;
    }
    setFile(f);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    acceptFile(e.dataTransfer.files?.[0]);
  }, []);

  const onFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    acceptFile(e.target.files?.[0]);
    e.currentTarget.value = '';
  };

  const handleScrape = async () => {
    if (!apiKey.trim()) {
      toast.error('Enter your Gemini API key first');
      return;
    }
    if (!file) {
      toast.error('Select a .pdf or .docx file to scrape');
      return;
    }
    try {
      setIsScraping(true);
      setInsertResult(null);
      setQuestions([]);
      const result = await fileAPI.aiScrape(file, apiKey.trim(), model.trim());
      const fileResult = result?.results?.[0];
      if (!fileResult?.success) {
        throw new Error(fileResult?.message || result?.message || 'Extraction failed');
      }
      const items = (fileResult.data || []).map(normalizeIncoming);
      setFilename(fileResult.filename || file.name);
      setQuestions(items);
      if (items.length === 0) {
        toast('No questions were extracted from this file', { icon: '⚠️' });
      } else {
        toast.success(`Extracted ${items.length} question(s) — review and edit below`);
      }
    } catch (err: any) {
      console.error('AI scrape error', err);
      toast.error(err?.message || err?.detail || 'Extraction failed');
    } finally {
      setIsScraping(false);
    }
  };

  // ---- editing helpers ----
  const updateQuestion = (idx: number, patch: Partial<EditableQuestion>) => {
    setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  };

  const updateOption = (idx: number, set: 'both' | 'english', key: string, value: string) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === idx
          ? { ...q, options: { ...q.options, [set]: { ...q.options[set], [key]: value } } }
          : q
      )
    );
  };

  const setAnswer = (idx: number, set: 'both' | 'english', key: string) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, answer: { ...q.answer, [set]: [key] } } : q))
    );
  };

  const removeQuestion = (idx: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const buildPayload = () => {
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
  };

  const handleInsert = async () => {
    if (questions.length === 0) {
      toast.error('Nothing to insert. Scrape a file first.');
      return;
    }
    try {
      setIsInserting(true);
      setInsertResult(null);
      const res = await fileAPI.insertScrappedQuestions(buildPayload());
      setInsertResult(res);
      const created = res?.created_count ?? 0;
      const skipped = res?.skipped_duplicates ?? 0;
      const invalid = res?.invalid_count ?? 0;
      toast.success(`Inserted ${created} • skipped ${skipped} • invalid ${invalid}`);
    } catch (err: any) {
      console.error('Insert error', err);
      toast.error(err?.message || err?.detail || 'Insert failed');
    } finally {
      setIsInserting(false);
    }
  };

  const brandBtn =
    'bg-gradient-to-r from-[#2E3094] to-[#4C51BF] hover:from-[#1E2078] hover:to-[#3A3F9A] text-white';

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
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5" /> AI Question Scrapper
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Credentials */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="flex items-center gap-1 mb-1">
                <KeyRound className="h-4 w-4" /> Gemini API Key
              </Label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Paste your Gemini API key"
              />
              <p className="text-xs text-gray-400 mt-1">
                Stored only in this browser; sent only with the scrape request.
              </p>
            </div>
            <div>
              <Label className="mb-1">Model</Label>
              <Input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={DEFAULT_MODEL}
              />
              <p className="text-xs text-gray-400 mt-1">
                e.g. {DEFAULT_MODEL}, gemini-flash-lite-latest
              </p>
            </div>
          </div>

          {/* Dropzone */}
          <div
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-dashed border-2 border-gray-300 rounded-lg p-6 text-center bg-gray-50 hover:bg-gray-100 cursor-pointer"
            onClick={() => inputRef.current?.click()}
            role="button"
            aria-label="Drop a .pdf or .docx file here or click to select"
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx"
              className="hidden"
              onChange={onFilesSelected}
            />
            <div className="flex items-center justify-center gap-3">
              <UploadCloud className="h-6 w-6 text-gray-600" />
              <div>
                <div className="font-semibold">
                  Drag &amp; drop a .pdf or .docx file here, or click to select
                </div>
                <div className="text-sm text-gray-500">
                  PDF is recommended for Bijoy-font documents
                </div>
              </div>
            </div>
          </div>

          {file && (
            <div className="flex items-center justify-between text-sm bg-white p-3 rounded border">
              <div className="truncate mr-4">
                {file.name}{' '}
                <span className="text-gray-400">({Math.round(file.size / 1024)} KB)</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setFile(null)}>
                  <Trash2 className="h-4 w-4 mr-1" /> Remove
                </Button>
                <Button onClick={handleScrape} disabled={isScraping} className={brandBtn}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {isScraping ? 'Extracting…' : 'Extract with AI'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Editable results */}
      {questions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Review &amp; Edit ({questions.length})</span>
              <Button onClick={handleInsert} disabled={isInserting} className={brandBtn}>
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

      {/* Insert summary */}
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
    </div>
  );
}
