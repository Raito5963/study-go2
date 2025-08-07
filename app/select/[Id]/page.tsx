'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import {
  Card,
  Typography,
  Button,
  Checkbox,
  Box,
  AppBar,
  Toolbar,
  IconButton,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Chip,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { ArrowLeft, Edit3, RotateCcw, Trophy, Users } from 'lucide-react';
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
  sharedWith?: string[];
};

type StudyResult = {
  userId: string;
  setId: string;
  questionIndex: number;
  isCorrect: boolean;
  timestamp: Date;
  mode: 'flash' | 'select';
};

type UserRanking = {
  userId: string;
  displayName: string;
  correctCount: number;
  totalAnswered: number;
  accuracy: number;
};

export default function SelectSetPage() {
  const params = useParams();
  const id = params?.Id as string;
  const { currentUser } = useAuth();

  const [setData, setSetData] = useState<SetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [random, setRandom] = useState(false);
  const [selectNumber, setSelectNumber] = useState(4);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [buttonsDisabled, setButtonsDisabled] = useState(false);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editProblem, setEditProblem] = useState('');
  const [editAnswer, setEditAnswer] = useState('');
  const [showRanking, setShowRanking] = useState(false);
  const [rankings, setRankings] = useState<UserRanking[]>([]);
  const [strikedOptions, setStrikedOptions] = useState<Set<string>>(new Set());
  const [currentOptions, setCurrentOptions] = useState<string[]>([]);

  const router = useRouter();

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
        console.log('選択肢ページ - 取得した生データ:', data);
        console.log('選択肢ページ - questionsの内容:', data.questions);
        console.log('選択肢ページ - questionsの型:', typeof data.questions);
        console.log('選択肢ページ - questionsの長さ:', data.questions?.length);
        
        const safeData: SetData = {
          id: docSnap.id,
          title: data.title || '無題',
          description: data.description || '',
          questions: Array.isArray(data.questions) ? data.questions : [],
          createdBy: data.createdBy || '',
          sharedWith: Array.isArray(data.sharedWith) ? data.sharedWith : [],
        };
        console.log('選択肢ページ - 整理後のデータ:', safeData);
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
        mode: 'select',
      };
      
      await setDoc(resultRef, result);
    } catch (error) {
      console.error('学習結果保存エラー:', error);
    }
  };

  const fetchRankings = async () => {
    if (!setData || !setData.sharedWith) return;

    try {
      const allUserIds = [setData.createdBy, ...setData.sharedWith];
      const rankingData: UserRanking[] = [];

      for (const userId of allUserIds) {
        // ユーザー情報を取得
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (!userDoc.exists()) continue;
        
        const userData = userDoc.data();
        
        // 学習結果を取得
        const resultsQuery = query(
          collection(db, 'studyResults'),
          where('userId', '==', userId),
          where('setId', '==', id),
          where('mode', '==', 'select')
        );
        const resultsSnapshot = await getDocs(resultsQuery);
        
        const results = resultsSnapshot.docs.map(doc => doc.data());
        const correctCount = results.filter(r => r.isCorrect).length;
        const totalAnswered = results.length;
        const accuracy = totalAnswered > 0 ? (correctCount / totalAnswered) * 100 : 0;

        rankingData.push({
          userId,
          displayName: userData.displayName,
          correctCount,
          totalAnswered,
          accuracy,
        });
      }

      // 正答率順にソート
      rankingData.sort((a, b) => b.accuracy - a.accuracy);
      setRankings(rankingData);
    } catch (error) {
      console.error('ランキング取得エラー:', error);
    }
  };

  const generateOptions = () => {
    if (!setData || !setData.questions || setData.questions.length === 0) {
      return [];
    }
    
    const correctAnswer = setData.questions[count].answer;
    const otherAnswers = setData.questions
      .filter((_, idx) => idx !== count)
      .map((q) => q.answer);

    const shuffleArray = <T,>(array: T[]): T[] => {
      const arr = [...array];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    };

    const needed = selectNumber - 1;
    const shuffledOthers = shuffleArray(otherAnswers);
    const randomOptions = shuffledOthers.slice(0, needed);

    return shuffleArray([correctAnswer, ...randomOptions]);
  };

  // 問題または選択肢数が変わった時に選択肢を再生成
  useEffect(() => {
    if (setData && setData.questions.length > 0) {
      const newOptions = generateOptions();
      setCurrentOptions(newOptions);
      setStrikedOptions(new Set()); // 新しい問題では取り消し線をリセット
    }
  }, [count, selectNumber, setData]);

  const handleAnswerClick = (option: string) => {
    if (buttonsDisabled || strikedOptions.has(option) || !setData) return;
    setButtonsDisabled(true);

    const correctAnswer = setData.questions[count].answer;
    const isCorrect = option === correctAnswer;
    setFeedback(isCorrect ? '正解' : '不正解');
    setAnsweredCount((prev) => prev + 1);
    if (isCorrect) setCorrectCount((prev) => prev + 1);
    setAnsweredQuestions(prev => new Set([...prev, count]));

    // 学習結果を保存
    saveStudyResult(isCorrect);

    setTimeout(() => {
      nextQuestion();
    }, 2000);
  };

  const nextQuestion = () => {
    if (!setData) return;
    
    if (random) {
      let newIndex;
      do {
        newIndex = Math.floor(Math.random() * setData.questions.length);
      } while (newIndex === count && setData.questions.length > 1);
      setCount(newIndex);
    } else {
      setCount((prev) => (prev + 1) % setData.questions.length);
    }
    setFeedback(null);
    setButtonsDisabled(false);
    // setStrikedOptions(new Set()); // useEffectで自動的にリセットされるため削除
  };

  const handleOptionStrike = (option: string) => {
    if (buttonsDisabled) return;
    
    setStrikedOptions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(option)) {
        newSet.delete(option);
      } else {
        newSet.add(option);
      }
      return newSet;
    });
  };

  const resetStats = () => {
    setCorrectCount(0);
    setAnsweredCount(0);
    setAnsweredQuestions(new Set());
  };

  const openEditDialog = () => {
    if (!setData) return;
    const currentQuestion = setData.questions[count];
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

  const openRanking = async () => {
    await fetchRankings();
    setShowRanking(true);
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

  const progress = (answeredQuestions.size / setData.questions.length) * 100;
  const accuracy = answeredCount > 0 ? (correctCount / answeredCount) * 100 : 0;

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
          {setData.sharedWith && setData.sharedWith.length > 0 && (
            <IconButton color="inherit" onClick={openRanking}>
              <Trophy />
            </IconButton>
          )}
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 2 }}>
        <LinearProgress variant="determinate" value={progress} sx={{ mb: 2 }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="body2">
            進捗: {answeredQuestions.size}/{setData.questions.length}
          </Typography>
          <Typography variant="body2">
            正答率: {accuracy.toFixed(1)}% ({correctCount}/{answeredCount})
          </Typography>
        </Box>
      </Box>

      <Box sx={{ p: { xs: 2, sm: 4 } }}>
        <Card sx={{ my: 2, p: 3 }}>
          <Typography variant="subtitle1" color="text.secondary" gutterBottom>
            問題 {count + 1} / {setData.questions.length}
          </Typography>
          <Typography variant="h5" sx={{ mt: 2 }}>
            {setData.questions[count].problem}
          </Typography>
        </Card>

        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 3 }}>
          <Chip 
            label={`${selectNumber}択`} 
            color="primary" 
            onClick={() => setSelectNumber(prev => prev === 4 ? 2 : prev + 1)}
          />
          <FormControlLabel
            control={<Checkbox checked={random} onChange={() => setRandom(prev => !prev)} />}
            label="ランダム"
          />
          <IconButton onClick={resetStats} title="統計をリセット">
            <RotateCcw />
          </IconButton>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {currentOptions.map((option: string, index: number) => {
            const isStriked = strikedOptions.has(option);
            const correctAnswer = setData.questions[count].answer;
            const isCorrect = option === correctAnswer;
            const isAnswered = !!feedback;
            
            return (
              <Box 
                key={index}
                sx={{
                  border: '2px solid',
                  borderColor: isAnswered
                    ? isCorrect 
                      ? '#4caf50' 
                      : isStriked 
                        ? '#9e9e9e' 
                        : '#f44336'
                    : isStriked 
                      ? '#9e9e9e' 
                      : '#e0e0e0',
                  borderRadius: 1,
                  p: 2,
                  backgroundColor: isAnswered
                    ? isCorrect 
                      ? '#e8f5e8' 
                      : isStriked 
                        ? '#f5f5f5' 
                        : '#ffebee'
                    : isStriked 
                      ? '#f5f5f5' 
                      : 'white',
                  position: 'relative',
                  cursor: buttonsDisabled || isStriked ? 'default' : 'pointer',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: !buttonsDisabled && !isStriked ? '#f0f0f0' : undefined,
                  }
                }}
                onClick={() => !isStriked && !buttonsDisabled && handleAnswerClick(option)}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      minWidth: '32px',
                      color: isAnswered
                        ? isCorrect 
                          ? '#4caf50' 
                          : '#f44336'
                        : 'text.primary'
                    }}
                  >
                    {String.fromCharCode(65 + index)}.
                  </Typography>
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      flexGrow: 1,
                      textDecoration: isStriked ? 'line-through' : 'none',
                      color: isStriked ? '#9e9e9e' : 'text.primary',
                      opacity: isStriked ? 0.6 : 1,
                    }}
                  >
                    {option}
                  </Typography>
                  <Button
                    variant={isStriked ? "contained" : "outlined"}
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOptionStrike(option);
                    }}
                    disabled={buttonsDisabled}
                    sx={{ 
                      minWidth: '80px',
                      color: isStriked ? 'white' : '#666',
                      backgroundColor: isStriked ? '#666' : 'transparent',
                      '&:hover': {
                        backgroundColor: isStriked ? '#555' : '#f0f0f0',
                      }
                    }}
                  >
                    {isStriked ? '復活' : '除外'}
                  </Button>
                </Box>
                
                {/* 正解時のチェックマーク */}
                {isAnswered && isCorrect && (
                  <Box sx={{ 
                    position: 'absolute', 
                    top: 8, 
                    right: 8,
                    color: '#4caf50'
                  }}>
                    ✓
                  </Box>
                )}
                
                {/* 不正解時のバツマーク */}
                {isAnswered && !isCorrect && !isStriked && (
                  <Box sx={{ 
                    position: 'absolute', 
                    top: 8, 
                    right: 8,
                    color: '#f44336'
                  }}>
                    ✗
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>

        <Box sx={{ minHeight: 100, mt: 3, display: 'flex', alignItems: 'center', flexDirection: 'column', justifyContent: 'center' }}>
          {feedback && (
            <>
              <Typography variant="h4" sx={{ color: feedback === '正解' ? 'green' : 'red', mb: 2 }}>
                {feedback}
              </Typography>
              <Typography variant="h6" color="text.secondary">
                正解：{setData.questions[count].answer}
              </Typography>
            </>
          )}
        </Box>

        <Box sx={{ mt: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button 
            variant="contained" 
            onClick={() => router.push(`/flash/${setData.id}`)}
            fullWidth
            sx={{ mb: 1 }}
          >
            フラッシュカードへ
          </Button>
        </Box>
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

      {/* ランキングダイアログ */}
      <Dialog open={showRanking} onClose={() => setShowRanking(false)} fullWidth maxWidth="sm">
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Trophy color="#ffd700" />
            ランキング
          </Box>
        </DialogTitle>
        <DialogContent>
          <List>
            {rankings.map((ranking, index) => (
              <ListItem key={ranking.userId} sx={{ 
                backgroundColor: ranking.userId === currentUser.uid ? '#e3f2fd' : 'transparent',
                borderRadius: 1,
                mb: 1,
              }}>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="h6">#{index + 1}</Typography>
                      <Typography variant="body1">{ranking.displayName}</Typography>
                      {ranking.userId === currentUser.uid && (
                        <Chip label="あなた" size="small" color="primary" />
                      )}
                    </Box>
                  }
                  secondary={
                    <Typography variant="body2" color="text.secondary">
                      正答率: {ranking.accuracy.toFixed(1)}% ({ranking.correctCount}/{ranking.totalAnswered})
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRanking(false)}>閉じる</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
