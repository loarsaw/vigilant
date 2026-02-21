import { useState, useEffect } from 'react';
import { useNavigate, Outlet, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';
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
import { ArrowLeft, RefreshCw, Loader2 } from 'lucide-react';

export interface ImportCandidate {
  candidate_id:string,
  full_name: string;
  email: string;
  password?: string;
}

interface UploadResponse {
  count: number;
  data: any[];
  success: boolean;
}
type RouteParams = {
  candidateId: string;
};

export function CandidateReviewPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
 const { candidateId } = useParams<RouteParams>();
 console.log(candidateId , "a")
  const uploadedData = queryClient.getQueryData<UploadResponse>([
    'uploadedCsvData',
  ]);

  const initialCandidates: ImportCandidate[] =
    uploadedData?.data?.map((item: any) => ({
      candidate_id:item.candidate_id,
      full_name: item.full_name || item.fullName || item.name || '',
      email: item.email || '',
      password: undefined,
    })) || [];

  const [localCandidates, setLocalCandidates] =
    useState<ImportCandidate[]>(initialCandidates);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    if (uploadedData?.data) {
      const candidates = uploadedData.data.map((item: any) => ({
        candidate_id:item.candidate_id,
        full_name: item.full_name || item.fullName || item.name || '',
        email: item.email || '',
        password: undefined,
      }));
      setLocalCandidates(candidates);
    }
  }, [uploadedData]);

  const generatePassword = (index: number) => {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const updated = [...localCandidates];
    updated[index] = { ...updated[index], password };
    setLocalCandidates(updated);
  };

  const generateAllPasswords = () => {
    const updated = localCandidates.map(candidate => {
      const chars =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
      let password = '';
      for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return { ...candidate, password };
    });
    setLocalCandidates(updated);
  };

  const handleImport = async () => {
    if (localCandidates.length === 0) return;

    setIsImporting(true);
    try {
      const response = await axios.post('/bulk-candidates', {
        candidates: localCandidates,
      });

      queryClient.removeQueries({ queryKey: ['uploadedCsvData'] });

      navigate('/candidates');
    } catch (err) {
      const error = err as AxiosError;
      console.error('Import failed:', error);
    } finally {
      setIsImporting(false);
    }
  };

  const onBack = () => navigate(-1);

  if (!uploadedData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>No Data Available</CardTitle>
            <CardDescription>Please upload a CSV file first.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate(-1)}>Go Back</Button>
          </CardContent>
        </Card>
      <Outlet />

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
                Review and generate passwords for candidates
              </p>
            </div>
          </div>

          {/* Summary Card */}
          <Card className="mb-6 border-accent/30 bg-gradient-to-br from-card to-secondary/30">
            <CardHeader>
              <CardTitle className="text-accent">Import Summary</CardTitle>
              <CardDescription>
                {localCandidates.length} candidate
                {localCandidates.length !== 1 ? 's' : ''} ready to import
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-3">
              <Button
                onClick={generateAllPasswords}
                disabled={isImporting}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Generate All Passwords
              </Button>
              <Button
                onClick={handleImport}
                disabled={isImporting}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isImporting && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Import Candidates
              </Button>
            </CardContent>
          </Card>

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
                      <TableHead className="text-foreground">
                        Full Name
                      </TableHead>
                      <TableHead className="text-foreground">Email</TableHead>
                      <TableHead className="text-foreground">
                        Password
                      </TableHead>
                      <TableHead className="text-foreground text-center">
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {localCandidates.map((candidate, idx) => (
                      <TableRow
                        key={idx}
                        className="border-border/50 hover:bg-secondary/30"
                      >
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
                            <span className="text-muted-foreground text-sm">
                              Not generated
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => generatePassword(idx)}
                            disabled={isImporting}
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
              disabled={isImporting}
              className="border-border text-foreground"
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={isImporting}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isImporting ? 'Processing...' : 'Confirm Import'}
            </Button>
          </div>
        </div>
      </div>
      <Outlet />
    </>
  );
}
