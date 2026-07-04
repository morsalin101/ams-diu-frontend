import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Cpu, UploadCloud, Trash2, Sparkles, KeyRound } from 'lucide-react';
import { fileAPI } from '../services/api';
import {
  ScrappedQuestionEditor,
  buildInsertPayload,
  normalizeIncoming,
  type EditableQuestion,
} from '../components/ScrappedQuestionEditor';
import toast from 'react-hot-toast';

const API_KEY_STORAGE = 'gemini_api_key';
const MODEL_STORAGE = 'gemini_model';
const DEFAULT_MODEL = 'gemini-3.5-flash';

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

  const handleInsert = async () => {
    if (questions.length === 0) {
      toast.error('Nothing to insert. Scrape a file first.');
      return;
    }
    try {
      setIsInserting(true);
      setInsertResult(null);
      const res = await fileAPI.insertScrappedQuestions(buildInsertPayload(questions, filename));
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

      <ScrappedQuestionEditor
        questions={questions}
        onQuestionsChange={setQuestions}
        onInsert={handleInsert}
        isInserting={isInserting}
        insertResult={insertResult}
      />
    </div>
  );
}
