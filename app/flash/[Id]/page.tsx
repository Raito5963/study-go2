'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import {
  Box,
  Card,
  Typography,
  Button,
  Switch,
  Stack,
  Divider,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  AppBar,
  Toolbar,
  LinearProgress,
} from '@mui/material';
import { ArrowLeft, Edit3, CheckCircle, XCircle, RotateCcw } from 'lucide-react';
import Image from 'next/image';

type Question = {
  problem: string;
  answer: string;
};

type SetData = {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  createdBy: string;
};

type StudyResult = {
  userId: string;
  setId: string;
  questionIndex: number;
  isCorrect: boolean;
  timestamp: Date;
  mode: 'flash' | 'select';
};

export default function FlashSetPage() {
  const params = useParams();
  const id = params?.Id as string;
  const { currentUser } = useAuth();
  const [setData, setSetData] = useState<SetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [random, setRandom] = useState(false);
  const [reverse, setReverse] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editProblem, setEditProblem] = useState('');
  const [editAnswer, setEditAnswer] = useState('');
  const [correctCount, setCorrectCount] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());

  const router = useRouter();
  const isMobile = useMediaQuery('(max-width:400px)');

  // スワイプ用のモーションバリューズ
  const x = useMotionValue(0);
  const rotateValue = useMotionValue(0);
  const opacity = useTransform(x, [-200, -50, 0, 50, 200], [0.5, 1, 1, 1, 0.5]);
  
  // スワイプ方向による背景色の変化
  const backgroundColor = useTransform(
    x,
    [-100, -50, 0, 50, 100],
    ['#ffebee', '#fff3e0', showAnswer ? '#f9fbe7' : '#e3f2fd', '#e8f5e8', '#e8f5e8']
  );

  useEffect(() => {
    if (!id || !currentUser) {
      setLoading(false);
      return;
    }
    fetchData();
  }, [id, currentUser]);

  const fetchData = async () => {
    try {
      const docRef = doc(db, 'sets', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log('取得した生データ:', data);
        console.log('questionsの内容:', data.questions);
        console.log('questionsの型:', typeof data.questions);
        console.log('questionsの長さ:', data.questions?.length);
        
        const safeData: SetData = {
          id: docSnap.id,
          title: data.title || '無題',
          description: data.description || '',
          questions: Array.isArray(data.questions) ? data.questions : [],
          createdBy: data.createdBy || '',
        };
        console.log('整理後のデータ:', safeData);
        setSetData(safeData);
        
        // 最後にアクセスした日時を更新
        if (currentUser) {
          await updateLastAccessDate();
        }
      } else {
        console.error('ドキュメントが存在しません');
      }
    } catch (error) {
      console.error('データ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateLastAccessDate = async () => {
    if (!currentUser) return;
    
    try {
      const userSetRef = doc(db, 'userSets', `${currentUser.uid}_${id}`);
      await setDoc(userSetRef, {
        userId: currentUser.uid,
        setId: id,
        lastAccessed: new Date(),
      }, { merge: true });
    } catch (error) {
      console.error('最終アクセス日時更新エラー:', error);
    }
  };

  const saveStudyResult = async (isCorrect: boolean) => {
    if (!currentUser || !setData) return;

    try {
      const resultRef = doc(collection(db, 'studyResults'));
      const result: StudyResult = {
        userId: currentUser.uid,
        setId: id,
        questionIndex: count,
        isCorrect,
        timestamp: new Date(),
        mode: 'flash',
      };
      
      await setDoc(resultRef, result);
      
      // 統計を更新
      setTotalAnswered(prev => prev + 1);
      if (isCorrect) {
        setCorrectCount(prev => prev + 1);
      }
      setAnsweredQuestions(prev => new Set([...prev, count]));
    } catch (error) {
      console.error('学習結果保存エラー:', error);
    }
  };

  const handleCorrectAnswer = () => {
    // 答えを見ているかどうかに関わらずスワイプ可能
    saveStudyResult(true);
    setTimeout(() => {
      handleNextQuestion();
    }, 500); // 少し遅延を入れて結果を見せる
  };

  const handleIncorrectAnswer = () => {
    // 答えを見ているかどうかに関わらずスワイプ可能
    saveStudyResult(false);
    setTimeout(() => {
      handleNextQuestion();
    }, 500); // 少し遅延を入れて結果を見せる
  };

  const handleNextQuestion = () => {
    // アニメーションをリセット
    x.set(0);
    rotateValue.set(0);
    setIsSwipeInProgress(false);
    
    // 次の問題に移動
    if (random) {
      let newIndex;
      do {
        newIndex = Math.floor(Math.random() * setData!.questions.length);
      } while (newIndex === count && setData!.questions.length > 1);
      setCount(newIndex);
    } else {
      const newIndex = (count + 1) % setData!.questions.length;
      setCount(newIndex);
    }
    
    // 必ず問題表示状態にリセット
    setShowAnswer(false);
  };

  const handlePrevQuestion = () => {
    // アニメーションをリセット
    x.set(0);
    rotateValue.set(0);
    setIsSwipeInProgress(false);
    
    // 前の問題に移動
    if (random) {
      let newIndex;
      do {
        newIndex = Math.floor(Math.random() * setData!.questions.length);
      } while (newIndex === count && setData!.questions.length > 1);
      setCount(newIndex);
    } else {
      setCount((prev) => (prev - 1 + setData!.questions.length) % setData!.questions.length);
    }
    
    // 必ず問題表示状態にリセット
    setShowAnswer(false);
  };

  const toggleAnswer = () => {
    setShowAnswer(prev => !prev);
  };

  const openEditDialog = () => {
    const currentQuestion = setData!.questions[count];
    setEditProblem(currentQuestion.problem);
    setEditAnswer(currentQuestion.answer);
    setEditDialogOpen(true);
  };

  const saveEdit = async () => {
    if (!setData || !currentUser) return;

    try {
      const updatedQuestions = [...setData.questions];
      updatedQuestions[count] = { problem: editProblem, answer: editAnswer };
      
      await updateDoc(doc(db, 'sets', id), {
        questions: updatedQuestions
      });
      
      setSetData({ ...setData, questions: updatedQuestions });
      setEditDialogOpen(false);
    } catch (error) {
      console.error('編集保存エラー:', error);
    }
  };

  // タッチスワイプ用の状態
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isSwipeInProgress, setIsSwipeInProgress] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // 最小スワイプ距離
  const minSwipeDistance = 80;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setIsSwipeInProgress(false);
    setIsDragging(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchStart || isSwipeInProgress) return;
    const currentTouch = e.targetTouches[0].clientX;
    setTouchEnd(currentTouch);
    
    // リアルタイムでカードを動かす
    const distance = currentTouch - touchStart;
    x.set(distance);
    
    // 回転とオパシティの効果を追加
    const rotation = Math.max(-25, Math.min(25, distance / 10));
    rotateValue.set(rotation);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd || isSwipeInProgress) {
      setIsDragging(false);
      return;
    }
    
    setIsSwipeInProgress(true);
    setIsDragging(false);
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      // 左スワイプ - 不正解
      handleIncorrectAnswer();
    } else if (isRightSwipe) {
      // 右スワイプ - 正解
      handleCorrectAnswer();
    } else {
      // スワイプしきれなかった場合は元に戻す
      x.set(0);
      rotateValue.set(0);
      setIsSwipeInProgress(false);
    }
    
    // リセット
    setTouchStart(null);
    setTouchEnd(null);
  };

  // マウスイベント対応
  const onMouseDown = (e: React.MouseEvent) => {
    setTouchEnd(null);
    setTouchStart(e.clientX);
    setIsSwipeInProgress(false);
    setIsDragging(true);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!touchStart || isSwipeInProgress || !isDragging) return;
    const currentMouse = e.clientX;
    setTouchEnd(currentMouse);
    
    const distance = currentMouse - touchStart;
    x.set(distance);
    
    const rotation = Math.max(-25, Math.min(25, distance / 10));
    rotateValue.set(rotation);
  };

  const onMouseUp = () => {
    if (!touchStart || !touchEnd || isSwipeInProgress) {
      setIsDragging(false);
      return;
    }
    
    setIsSwipeInProgress(true);
    setIsDragging(false);
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      handleIncorrectAnswer();
    } else if (isRightSwipe) {
      handleCorrectAnswer();
    } else {
      x.set(0);
      rotateValue.set(0);
      setIsSwipeInProgress(false);
    }
    
    setTouchStart(null);
    setTouchEnd(null);
  };

  const resetStats = () => {
    setCorrectCount(0);
    setTotalAnswered(0);
    setAnsweredQuestions(new Set());
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Typography>読み込み中...</Typography>
      </Box>
    );
  }

  if (!setData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Typography>データが存在しません</Typography>
      </Box>
    );
  }

  if (!currentUser) {
    router.push('/signin');
    return null;
  }

  const currentQuestion = setData.questions[count];
  
  // データの安全性チェック
  if (!currentQuestion || !currentQuestion.problem || !currentQuestion.answer) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Typography>問題データが不正です</Typography>
      </Box>
    );
  }
  
  const progress = (answeredQuestions.size / setData.questions.length) * 100;
  const accuracy = totalAnswered > 0 ? (correctCount / totalAnswered) * 100 : 0;

  return (
    <Box sx={{ minHeight: '100vh' }}>
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => router.push('/dashboard')}>
            <ArrowLeft />
          </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
            <Image 
              src="/GO.png" 
              alt="Study GO Logo" 
              width={24} 
              height={24} 
              style={{ 
                marginRight: 8,
                borderRadius: 4
              }} 
            />
          </Box>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {setData.title}
          </Typography>
          <IconButton color="inherit" onClick={openEditDialog}>
            <Edit3 />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 2 }}>
        <LinearProgress variant="determinate" value={progress} sx={{ mb: 2 }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="body2">
            進捗: {answeredQuestions.size}/{setData.questions.length}
          </Typography>
          <Typography variant="body2">
            正答率: {accuracy.toFixed(1)}% ({correctCount}/{totalAnswered})
          </Typography>
        </Box>
      </Box>

      <Box sx={{ p: { xs: 2, sm: 4 }, maxWidth: 600, mx: 'auto' }}>
        <motion.div
          style={{
            x,
            rotate: rotateValue,
            opacity,
            backgroundColor,
          }}
        >
          <Card
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            sx={{
              p: 3,
              mb: 2,
              backgroundColor: showAnswer ? '#f9fbe7' : '#e3f2fd',
              minHeight: '40vh',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              touchAction: 'manipulation',
              cursor: isDragging ? 'grabbing' : 'grab',
              userSelect: 'none',
              '&:active': {
                cursor: 'grabbing',
              },
            }}
            onClick={toggleAnswer}
          >
            <Typography
              variant="subtitle1"
              color="text.secondary"
              gutterBottom
              sx={{ alignSelf: 'flex-start' }}
            >
              問題 {count + 1} / {setData.questions.length}
            </Typography>

            <Typography
              variant={isMobile ? 'h6' : 'h4'}
              sx={{
                flexGrow: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                my: 2,
                textAlign: 'center',
              }}
            >
              {setData.questions[count] ? (
                reverse
                  ? showAnswer
                    ? setData.questions[count].problem
                    : setData.questions[count].answer
                  : showAnswer
                    ? setData.questions[count].answer
                    : setData.questions[count].problem
              ) : (
                '問題データが見つかりません'
              )}
            </Typography>

            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ alignSelf: 'flex-end' }}
            >
              {showAnswer ? 'タップして問題に戻す' : 'タップして答えを見る'}
            </Typography>

            {/* スワイプヒント */}
            <Box sx={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)' }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <XCircle size={16} color="#f44336" />
                左スワイプ: 不正解
                <CheckCircle size={16} color="#4caf50" />
                右スワイプ: 正解
              </Typography>
            </Box>
          </Card>
        </motion.div>

        {showAnswer && (
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Button
              variant="outlined"
              color="error"
              fullWidth
              onClick={handleIncorrectAnswer}
              startIcon={<XCircle />}
            >
              不正解
            </Button>
            <Button
              variant="outlined"
              color="success"
              fullWidth
              onClick={handleCorrectAnswer}
              startIcon={<CheckCircle />}
            >
              正解
            </Button>
          </Box>
        )}

        <Stack direction="row" spacing={2} justifyContent="center" alignItems="center" sx={{ my: 2 }}>
          <Button variant="outlined" onClick={handlePrevQuestion}>前</Button>
          <Typography>{count + 1}/{setData.questions.length}</Typography>
          <Button variant="outlined" onClick={handleNextQuestion}>次</Button>
        </Stack>

        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Switch checked={random} onChange={() => setRandom(prev => !prev)} />
            <Typography sx={{ mr: 2 }}>ランダム</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Switch checked={reverse} onChange={() => setReverse(prev => !prev)} />
            <Typography>問題↔答え</Typography>
          </Box>
          <IconButton onClick={resetStats} title="統計をリセット">
            <RotateCcw />
          </IconButton>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Button
          variant="contained"
          color="primary"
          fullWidth
          onClick={() => router.push(`/select/${setData.id}`)}
          sx={{ mb: 2 }}
        >
          選択問題で練習する
        </Button>
      </Box>

      {/* 編集ダイアログ */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>問題を編集</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="問題"
            fullWidth
            variant="outlined"
            value={editProblem}
            onChange={(e) => setEditProblem(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="答え"
            fullWidth
            variant="outlined"
            value={editAnswer}
            onChange={(e) => setEditAnswer(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>キャンセル</Button>
          <Button onClick={saveEdit} variant="contained">保存</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
