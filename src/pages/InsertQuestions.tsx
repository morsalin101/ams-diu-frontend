import { useState, useRef, useCallback } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { FileText, UploadCloud, Trash2 } from 'lucide-react';
import { fileAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function InsertQuestions() {
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [responseJson, setResponseJson] = useState<any>(null);
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
      setResponseJson(null);
      const result = await fileAPI.scrapeDocx(files);
      setResponseJson(result);
      toast.success('Upload complete — JSON response received');
    } catch (err: any) {
      console.error('Upload error', err);
      toast.error(err?.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-6">
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
                  <Button onClick={handleUpload} disabled={isUploading}>
                    {isUploading ? 'Uploading...' : 'Upload & Scrape'}
                  </Button>
                </div>
              </div>

              <div className="space-y-2 bg-white p-3 rounded border">
                {files.map((f, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <div className="truncate mr-4">{f.name} <span className="text-gray-400">({Math.round(f.size / 1024)} KB)</span></div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => removeFile(idx)}>Remove</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6">
            <Label className="font-medium mb-2">Server response</Label>
            <div className="bg-black text-white p-3 rounded h-64 overflow-auto text-xs">
              {responseJson ? (
                <pre className="whitespace-pre-wrap">{JSON.stringify(responseJson, null, 2)}</pre>
              ) : (
                <div className="text-gray-400">Response will appear here after upload</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
