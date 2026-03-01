import { useState, useEffect } from 'react';
import { useNavigate, Outlet, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, RefreshCw, Loader2, Download, CheckCircle2 } from 'lucide-react';
import { useCandidates } from '@/hooks/use-candidates';

export interface ImportCandidate {
  candidate_id: string;
  full_name: string;
  email: string;
  password?: string;
}

interface UploadResponse {
  count: number;
  data: any[];
  success: boolean;
}


export function CandidateReviewPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { bulkCreateCandidates, isBulkCreating } = useCandidates();

  const uploadedData = queryClient.getQueryData<UploadResponse>(['uploadedCsvData']);

  const initialCandidates: ImportCandidate[] =
    uploadedData?.data?.map((item: any) => ({
      candidate_id: item.candidate_id,
      full_name: item.full_name || item.fullName || item.name || '',
      email: item.email || '',
      password: undefined,
    })) || [];

  const [localCandidates, setLocalCandidates] = useState<ImportCandidate[]>(initialCandidates);
  const [importResult, setImportResult] = useState<{ inserted: number; updated: number } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const allPasswordsGenerated = localCandidates.length > 0 && localCandidates.every(c => !!c.password);

  useEffect(() => {
    if (uploadedData?.data) {
      const candidates = uploadedData.data.map((item: any) => ({
        candidate_id: item.candidate_id,
        full_name: item.full_name || item.fullName || item.name || '',
        email: item.email || '',
        password: undefined,
      }));
      setLocalCandidates(candidates);
    }
  }, [uploadedData]);

  const generatePassword = (index: number) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const updated = [...localCandidates];
    updated[index] = { ...updated[index], password };
    setLocalCandidates(updated);
    setImportError(null);
  };

  const generateAllPasswords = () => {
    const updated = localCandidates.map(candidate => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
      let password = '';
      for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return { ...candidate, password };
    });
    setLocalCandidates(updated);
    setImportError(null);
  };

  const downloadCSV = () => {
    const headers = ['Full Name', 'Email', 'Password'];
    const rows = localCandidates.map(c => [
      `"${c.full_name}"`,
      `"${c.email}"`,
      `"${c.password ?? ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `candidates-credentials-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    if (localCandidates.length === 0) return;

    if (!allPasswordsGenerated) {
      setImportError('Please generate passwords for all candidates before importing.');
      return;
    }

    const payload = localCandidates.map(c => ({
      full_name: c.full_name,
      email: c.email,
      password: c.password!,
    }));

    bulkCreateCandidates(payload, {
      onSuccess: (data: any) => {
        setImportResult({ inserted: data.inserted, updated: data.updated });
        queryClient.removeQueries({ queryKey: ['uploadedCsvData'] });
        queryClient.invalidateQueries({ queryKey: ['candidates'] });
      },
      onError: (err: any) => {
        const message = err?.response?.data?.error ?? 'Import failed. Please try again.';
        setImportError(message);
      },
    });
  };

  const onBack = () => navigate(-1);

  if (importResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
            <CardTitle>Import Complete</CardTitle>
            <CardDescription>
              {importResult.inserted} candidate{importResult.inserted !== 1 ? 's' : ''} created
              {importResult.updated > 0 && `, ${importResult.updated} password${importResult.updated !== 1 ? 's' : ''} updated`}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button
              onClick={downloadCSV}
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Credentials CSV
            </Button>
            <Button
              onClick={() => navigate('/dashboard')}
              variant="outline"
              className="w-full"
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
        <div className="container mx-auto px-4 py-8 max-w-6xl">

          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="outline"
              size="icon"
              onClick={onBack}
              className="border-border text-foreground hover:bg-secondary"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-primary">Import Review</h1>
              <p className="text-muted-foreground">
                Review and generate passwords before importing
              </p>
            </div>
          </div>

          {/* Summary Card */}
          <Card className="mb-6 border-accent/30 bg-gradient-to-br from-card to-secondary/30">
            <CardHeader>
              <CardTitle className="text-accent">Import Summary</CardTitle>
              <CardDescription>
                {localCandidates.length} candidate{localCandidates.length !== 1 ? 's' : ''} ready to import
                {allPasswordsGenerated && (
                  <span className="ml-2 text-green-500 font-medium">· All passwords generated</span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button
                onClick={generateAllPasswords}
                disabled={isBulkCreating}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Generate All Passwords
              </Button>

              {/* Download only enabled when all passwords are generated */}
              <Button
                onClick={downloadCSV}
                disabled={!allPasswordsGenerated || isBulkCreating}
                variant="outline"
                className="border-border text-foreground hover:bg-secondary disabled:opacity-40"
              >
                <Download className="w-4 h-4 mr-2" />
                Download CSV
              </Button>

              <Button
                onClick={handleImport}
                disabled={isBulkCreating || !allPasswordsGenerated}
                className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
              >
                {isBulkCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Import Candidates
              </Button>
            </CardContent>
          </Card>

          {/* Error message */}
          {importError && (
            <div className="mb-4 p-4 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-sm">
              {importError}
            </div>
          )}

          {/* Candidates Table */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-foreground">Candidates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50">
                      <TableHead className="text-foreground">Full Name</TableHead>
                      <TableHead className="text-foreground">Email</TableHead>
                      <TableHead className="text-foreground">Password</TableHead>
                      <TableHead className="text-foreground text-center">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {localCandidates.map((candidate, idx) => (
                      <TableRow key={idx} className="border-border/50 hover:bg-secondary/30">
                        <TableCell className="font-medium text-foreground">
                          {candidate.full_name}
                        </TableCell>
                        <TableCell className="text-foreground">
                          {candidate.email}
                        </TableCell>
                        <TableCell>
                          {candidate.password ? (
                            <code className="px-2 py-1 bg-secondary/50 rounded text-xs font-mono text-accent">
                              {candidate.password}
                            </code>
                          ) : (
                            <span className="text-muted-foreground text-sm">Not generated</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => generatePassword(idx)}
                            disabled={isBulkCreating}
                            className="border-border text-foreground hover:bg-secondary"
                          >
                            <RefreshCw className="w-3 h-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3 mt-6">
            <Button
              onClick={onBack}
              variant="outline"
              disabled={isBulkCreating}
              className="border-border text-foreground"
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={isBulkCreating || !allPasswordsGenerated}
              className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
            >
              {isBulkCreating ? 'Processing...' : 'Confirm Import'}
            </Button>
          </div>
        </div>
      </div>
      <Outlet />
    </>
  );
}