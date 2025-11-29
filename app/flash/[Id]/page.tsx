'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import imageCompression from 'browser-image-compression';
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
  imageUrl?: string;
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
  const [editImageUrl, setEditImageUrl] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState(false);
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
    setEditImageUrl(currentQuestion.imageUrl || '');
    setEditDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    try {
      setUploadingImage(true);
      
      console.log('元の画像サイズ:', (file.size / 1024 / 1024).toFixed(2), 'MB');
      
      // 画像を圧縮（Firestoreの制限に合わせて小さく）
      const options = {
        maxSizeMB: 0.3, // 300KBに制限（Base64エンコード後は約1.3倍になるため）
        maxWidthOrHeight: 800, // 解像度を下げる
        useWebWorker: false,
        initialQuality: 0.7,
      };
      
      const compressedFile = await imageCompression(file, options);
      console.log('圧縮後の画像サイズ:', (compressedFile.size / 1024).toFixed(2), 'KB');
      
      // Base64に変換
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result as string;
        const base64Size = (base64String.length * 0.75) / 1024; // KB単位
        console.log('Base64サイズ:', base64Size.toFixed(2), 'KB');
        
        if (base64Size > 400) {
          alert('画像が大きすぎます。より小さい画像を選択するか、画質を下げてください。');
          setUploadingImage(false);
          return;
        }
        
        setEditImageUrl(base64String);
        setUploadingImage(false);
      };
      
      reader.onerror = () => {
        console.error('ファイル読み込みエラー:', reader.error);
        alert('画像の読み込みに失敗しました');
        setUploadingImage(false);
      };
      
      reader.readAsDataURL(compressedFile);
    } catch (error) {
      console.error('画像処理エラー:', error);
      alert(`画像の処理に失敗しました: ${error}`);
      setUploadingImage(false);
    }
  };

  const handleImageDelete = () => {
    // Base64データなので単純にクリアするだけ
    setEditImageUrl('');
  };

  const saveEdit = async () => {
    if (!setData || !currentUser) return;

    try {
      const updatedQuestions = [...setData.questions];
      const updatedQuestion: Question = { 
        problem: editProblem, 
        answer: editAnswer,
      };
      
      // 画像URLがある場合のみ追加（undefinedを避ける）
      if (editImageUrl) {
        updatedQuestion.imageUrl = editImageUrl;
      }
      
      updatedQuestions[count] = updatedQuestion;
      
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

            <Box
              sx={{
                flexGrow: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                my: 2,
                gap: 2,
              }}
            >
              <Typography
                variant={isMobile ? 'h6' : 'h4'}
                sx={{
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
              
              {!showAnswer && !reverse && setData.questions[count]?.imageUrl && (
                <Box
                  sx={{
                    maxWidth: '100%',
                    maxHeight: '300px',
                    overflow: 'hidden',
                    borderRadius: 2,
                    boxShadow: 2,
                  }}
                >
                  <img
                    src={setData.questions[count].imageUrl}
                    alt="問題画像"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '300px',
                      objectFit: 'contain',
                    }}
                  />
                </Box>
              )}
              {showAnswer && reverse && setData.questions[count]?.imageUrl && (
                <Box
                  sx={{
                    maxWidth: '100%',
                    maxHeight: '300px',
                    overflow: 'hidden',
                    borderRadius: 2,
                    boxShadow: 2,
                  }}
                >
                  <img
                    src={setData.questions[count].imageUrl}
                    alt="問題画像"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '300px',
                      objectFit: 'contain',
                    }}
                  />
                </Box>
              )}
            </Box>

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
            sx={{ mb: 2 }}
          />
          
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              画像
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <Button
                variant="outlined"
                component="label"
                disabled={uploadingImage}
              >
                {uploadingImage ? '画像アップロード中...' : '画像を追加'}
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </Button>
              {editImageUrl && (
                <Button
                  variant="outlined"
                  color="error"
                  onClick={handleImageDelete}
                >
                  画像を削除
                </Button>
              )}
            </Stack>
            {editImageUrl && (
              <Box sx={{ mt: 2, maxWidth: '100%' }}>
                <img
                  src={editImageUrl}
                  alt="プレビュー"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '200px',
                    objectFit: 'contain',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                  }}
                />
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>キャンセル</Button>
          <Button onClick={saveEdit} variant="contained">保存</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
