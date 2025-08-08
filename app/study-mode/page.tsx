'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  AppBar,
  Toolbar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
} from '@mui/material';
import { ArrowLeft, Play, RotateCcw } from 'lucide-react';
import Image from 'next/image';

interface StudyProgress {
  userId: string;
  setId: string;
  mode: 'flash' | 'select';
  currentIndex: number;
  totalQuestions: number;
  lastStudied: Date;
}

interface StudySet {
  id: string;
  title: string;
  description: string;
  questions: { problem: string; answer: string }[];
  createdBy: string;
}

export default function StudyModePage() {
  const searchParams = useSearchParams();
  const setId = searchParams?.get('setId');
  const router = useRouter();
  const { currentUser } = useAuth();
  
  const [studySet, setStudySet] = useState<StudySet | null>(null);
  const [flashProgress, setFlashProgress] = useState<StudyProgress | null>(null);
  const [selectProgress, setSelectProgress] = useState<StudyProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    mode: 'flash' | 'select' | null;
    progress?: StudyProgress;
  }>({ open: false, mode: null });

  useEffect(() => {
    if (!setId || !currentUser) {
      router.push('/dashboard');
      return;
    }
    
    fetchData();
  }, [setId, currentUser, router]);

  const fetchData = async () => {
    if (!setId || !currentUser) return;

    try {
      // 単語帳データを取得
      const setDoc = await getDoc(doc(db, 'sets', setId));
      if (setDoc.exists()) {
        const data = setDoc.data();
        setStudySet({
          id: setDoc.id,
          title: data.title || '無題',
          description: data.description || '',
          questions: Array.isArray(data.questions) ? data.questions : [],
          createdBy: data.createdBy || '',
        });
      }

      // 進捗データを取得
      const flashProgressDoc = await getDoc(
        doc(db, 'studyProgress', `${currentUser.uid}_${setId}_flash`)
      );
      if (flashProgressDoc.exists()) {
        const data = flashProgressDoc.data();
        setFlashProgress({
          ...data,
          lastStudied: data.lastStudied.toDate(),
        } as StudyProgress);
      }

      const selectProgressDoc = await getDoc(
        doc(db, 'studyProgress', `${currentUser.uid}_${setId}_select`)
      );
      if (selectProgressDoc.exists()) {
        const data = selectProgressDoc.data();
        setSelectProgress({
          ...data,
          lastStudied: data.lastStudied.toDate(),
        } as StudyProgress);
      }
    } catch (error) {
      console.error('データ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const startStudy = (mode: 'flash' | 'select', fromBeginning: boolean = false) => {
    if (!setId) return;
    
    const params = new URLSearchParams();
    params.set('setId', setId);
    if (!fromBeginning) {
      params.set('continue', 'true');
    }
    
    router.push(`/${mode}/${setId}?${params.toString()}`);
  };

  const handleModeClick = (mode: 'flash' | 'select') => {
    const progress = mode === 'flash' ? flashProgress : selectProgress;
    
    if (progress && progress.currentIndex > 0 && progress.currentIndex < progress.totalQuestions) {
      setConfirmDialog({ open: true, mode, progress });
    } else {
      startStudy(mode, true);
    }
  };

  const handleConfirmChoice = (fromBeginning: boolean) => {
    if (!confirmDialog.mode) return;
    
    startStudy(confirmDialog.mode, fromBeginning);
    setConfirmDialog({ open: false, mode: null });
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LinearProgress sx={{ width: '300px' }} />
      </Box>
    );
  }

  if (!studySet) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="h6">単語帳が見つかりません</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <AppBar position="static" sx={{ bgcolor: '#1976d2' }}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => router.push('/dashboard')}
            sx={{ mr: 2 }}
          >
            <ArrowLeft />
          </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <Image
              src="/GO.png"
              alt="GO Logo"
              width={40}
              height={40}
              style={{ marginRight: '12px' }}
            />
            <Typography variant="h6">学習モード選択</Typography>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 4 }}>
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h4" gutterBottom>
              {studySet.title}
            </Typography>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              {studySet.description}
            </Typography>
            <Typography variant="h6" color="primary">
              問題数: {studySet.questions.length}問
            </Typography>
          </CardContent>
        </Card>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* フラッシュカードモード */}
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                  <Typography variant="h5" gutterBottom>
                    フラッシュカード
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    カードをめくって記憶を確認
                  </Typography>
                </Box>
                {flashProgress && (
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="body2" color="text.secondary">
                      進捗: {flashProgress.currentIndex}/{flashProgress.totalQuestions}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={(flashProgress.currentIndex / flashProgress.totalQuestions) * 100}
                      sx={{ width: 100, mt: 0.5 }}
                    />
                  </Box>
                )}
              </Box>
              <Button
                variant="contained"
                startIcon={<Play />}
                onClick={() => handleModeClick('flash')}
                sx={{ bgcolor: '#1976d2', '&:hover': { bgcolor: '#1565c0' } }}
                fullWidth
              >
                フラッシュカードを開始
              </Button>
            </CardContent>
          </Card>

          {/* 選択問題モード */}
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                  <Typography variant="h5" gutterBottom>
                    選択問題
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    複数の選択肢から正解を選択
                  </Typography>
                </Box>
                {selectProgress && (
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="body2" color="text.secondary">
                      進捗: {selectProgress.currentIndex}/{selectProgress.totalQuestions}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={(selectProgress.currentIndex / selectProgress.totalQuestions) * 100}
                      sx={{ width: 100, mt: 0.5 }}
                    />
                  </Box>
                )}
              </Box>
              <Button
                variant="contained"
                startIcon={<Play />}
                onClick={() => handleModeClick('select')}
                sx={{ bgcolor: '#1565c0', '&:hover': { bgcolor: '#0d47a1' } }}
                fullWidth
              >
                選択問題を開始
              </Button>
            </CardContent>
          </Card>
        </Box>
      </Container>

      {/* 続きから始めるか確認ダイアログ */}
      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ open: false, mode: null })}>
        <DialogTitle>学習を続けますか？</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            前回の続きから始めることができます。
          </Typography>
          {confirmDialog.progress && (
            <Typography variant="body2" color="text.secondary">
              進捗: {confirmDialog.progress.currentIndex}/{confirmDialog.progress.totalQuestions} 
              ({Math.round((confirmDialog.progress.currentIndex / confirmDialog.progress.totalQuestions) * 100)}%)
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => handleConfirmChoice(true)}
            startIcon={<RotateCcw />}
          >
            最初から
          </Button>
          <Button
            onClick={() => handleConfirmChoice(false)}
            variant="contained"
            startIcon={<Play />}
          >
            続きから
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
