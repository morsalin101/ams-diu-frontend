import { useState, useRef, useCallback } from 'react';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { FileText, UploadCloud, Trash2 } from 'lucide-react';
import { fileAPI } from '../services/api';
import {
  ScrappedQuestionEditor,
  buildInsertPayload,
  normalizeIncoming,
  type EditableQuestion,
} from '../components/ScrappedQuestionEditor';
import toast from 'react-hot-toast';

export default function InsertQuestions() {
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isInserting, setIsInserting] = useState(false);
  const [questions, setQuestions] = useState<EditableQuestion[]>([]);
  const [filename, setFilename] = useState('');
  const [failedFiles, setFailedFiles] = useState<{ filename: string; message: string }[]>([]);
  const [insertResult, setInsertResult] = useState<any>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files || []).filter(f => f.name.endsWith('.docx'));
    if (dropped.length === 0) {
      toast.error('Please drop one or more .docx files');
      return;
    }
    setFiles(prev => [...prev, ...dropped]);
  }, []);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const openFilePicker = () => {
    inputRef.current?.click();
  };

  const onFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []).filter(f => f.name.endsWith('.docx'));
    if (selected.length === 0) {
      toast.error('Please select .docx files only');
      return;
    }
    setFiles(prev => [...prev, ...selected]);
    // reset input
    e.currentTarget.value = '';
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearFiles = () => setFiles([]);

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error('Select at least one .docx file to upload');
      return;
    }

    try {
      setIsUploading(true);
      setQuestions([]);
      setFailedFiles([]);
      setInsertResult(null);
      const result = await fileAPI.scrapeDocx(files);

      // Flatten every successfully scraped file into one editable list.
      const items: EditableQuestion[] = [];
      const failures: { filename: string; message: string }[] = [];
      (result?.results || []).forEach((fileResult: any) => {
        if (fileResult?.success && Array.isArray(fileResult.data)) {
          fileResult.data.forEach((item: any) => {
            items.push(normalizeIncoming(item, items.length));
          });
        } else {
          failures.push({
            filename: fileResult?.filename || 'unknown file',
            message: fileResult?.message || 'Extraction failed',
          });
        }
      });

      setQuestions(items);
      setFailedFiles(failures);
      setFilename(files.map(f => f.name).join(', '));

      if (items.length === 0) {
        toast.error('No questions were extracted from the uploaded file(s)');
      } else {
        toast.success(`Extracted ${items.length} question(s) — review and edit below`);
      }
    } catch (err: any) {
      console.error('Upload error', err);
      toast.error(err?.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleInsert = async () => {
    if (questions.length === 0) {
      toast.error('No scraped questions available to insert. Upload first.');
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
      if (created > 0) {
        toast.success(`Inserted ${created} question${created !== 1 ? 's' : ''}` +
          (skipped ? `, ${skipped} duplicate${skipped !== 1 ? 's' : ''} skipped` : '') +
          (invalid ? `, ${invalid} invalid` : ''));
      } else {
        const firstIssue = res?.invalid?.[0]?.issues?.[0];
        toast.error(
          `No questions inserted — ${skipped} duplicate${skipped !== 1 ? 's' : ''}, ${invalid} invalid.` +
          (firstIssue ? ` First issue: ${firstIssue}` : '') +
          ' See details below.',
          { duration: 8000 }
        );
      }
    } catch (err: any) {
      console.error('Insert error', err);
      toast.error(err?.message || 'Insert failed');
    } finally {
      setIsInserting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> Insert Questions (.docx)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            className="border-dashed border-2 border-gray-300 rounded-lg p-6 text-center mb-4 bg-gray-50 hover:bg-gray-100 cursor-pointer"
            onClick={openFilePicker}
            role="button"
            aria-label="Drop .docx files here or click to select"
          >
            <input
              ref={inputRef}
              type="file"
              accept=".docx"
              multiple
              className="hidden"
              onChange={onFilesSelected}
            />

            <div className="flex items-center justify-center gap-3">
              <UploadCloud className="h-6 w-6 text-gray-600" />
              <div>
                <div className="font-semibold">Drag & drop .docx files here, or click to select</div>
                <div className="text-sm text-gray-500">You can upload one or many .docx files</div>
              </div>
            </div>
          </div>

          {files.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <Label className="font-medium">Selected files ({files.length})</Label>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" onClick={clearFiles}>
                    <Trash2 className="h-4 w-4 mr-2" /> Clear
                  </Button>
                  <Button onClick={handleUpload} disabled={isUploading} className="bg-gradient-to-r from-[#2E3094] to-[#4C51BF] hover:from-[#1E2078] hover:to-[#3A3F9A] text-white">
                    {isUploading ? 'Uploading...' : 'Upload & Scrape'}
                  </Button>
                </div>
              </div>

              <div className="space-y-2 bg-white p-3 rounded border">
                {files.map((f, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <div className="truncate mr-4">{f.name} <span className="text-gray-400">({Math.round(f.size / 1024)} KB)</span></div>
                    <div className="flex items-center gap-2">
                      <Button className="bg-gradient-to-r from-[#2E3094] to-[#4C51BF] hover:from-[#1E2078] hover:to-[#3A3F9A] text-white" variant="ghost" size="sm" onClick={() => removeFile(idx)}>Remove</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {failedFiles.length > 0 && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-700">
                {failedFiles.map((f, i) => (
                  <div key={i}>
                    <span className="font-semibold">{f.filename}</span>: {f.message}
                  </div>
                ))}
              </AlertDescription>
            </Alert>
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
