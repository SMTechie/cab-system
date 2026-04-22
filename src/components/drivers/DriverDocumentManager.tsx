'use client';

import { useState, type FormEvent } from 'react';
import useSWR from 'swr';
import { Upload, FileText } from 'lucide-react';
import { apiFetcher } from '@/components/providers';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const MAX_DOCUMENT_BYTES = 4_000_000;

interface DriverDocument {
  id: string;
  type: string;
  title: string | null;
  fileName: string;
  filePath: string;
  mimeType: string;
  status: string;
  uploadedAt: string;
}

export function DriverDocumentManager() {
  const { data, mutate, isLoading } = useSWR<{ documents: DriverDocument[] }>('/api/driver/documents', apiFetcher, {
    refreshInterval: 15000
  });
  const [type, setType] = useState('vehicle_reg');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) return;
    if (file.size > MAX_DOCUMENT_BYTES) {
      setMessage('File must be 4 MB or smaller');
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.set('type', type);
      formData.set('title', title);
      formData.set('file', file);

      const response = await fetch('/api/driver/documents', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (!response.ok) {
        setMessage('Unable to upload file');
        return;
      }

      setTitle('');
      setFile(null);
      await mutate();
      setMessage('Uploaded');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="animate-rise-up overflow-hidden rounded-[1.75rem]">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Documents</CardTitle>
            <CardDescription>Upload license and vehicle files up to 4 MB.</CardDescription>
          </div>
          <Badge tone="muted">{data?.documents.length ?? 0}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <form className="grid gap-4 md:grid-cols-[0.9fr_1fr_1.2fr_auto]" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="docType">Type</Label>
            <Input id="docType" value={type} onChange={(event) => setType(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="docTitle">Title</Label>
            <Input id="docTitle" value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="docFile">File</Label>
            <Input
              id="docFile"
              type="file"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={busy || !file}>
              <Upload className="h-4 w-4" />
              Upload
            </Button>
          </div>
        </form>

        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
        {isLoading ? <p className="text-sm text-muted-foreground">Loading documents...</p> : null}

        <div className="space-y-3">
          {data?.documents?.length ? (
            data.documents.map((document) => (
              <div
                key={document.id}
                className="flex flex-col gap-3 rounded-3xl border border-border bg-muted/60 p-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">{document.title ?? document.type}</p>
                    <p className="text-sm text-muted-foreground">{document.fileName}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={badgeTone(document.status)}>{document.status.toLowerCase()}</Badge>
                  <a className="text-sm text-primary underline-offset-4 hover:underline" href={document.filePath} target="_blank" rel="noreferrer">
                    View
                  </a>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function badgeTone(status: string) {
  switch (status) {
    case 'APPROVED':
      return 'success';
    case 'REJECTED':
      return 'danger';
    default:
      return 'warning';
  }
}
