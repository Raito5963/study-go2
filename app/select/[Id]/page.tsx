'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import {
  Card,
  Typography,
  Button,
  Checkbox,
  Box,
} from '@mui/material';
import Grid from '@mui/material/Grid';

type Question = {
  problem: string;
  answer: string;
};

type SetData = {
  id: string;
  title: string;
  description: string;
  questions: Question[];
};

export default function NSelectSetPage() {
  const params = useParams();
  const id = params?.Id as string;

  const [setData, setSetData] = useState<SetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [random, setRandom] = useState(false);
  const [selectNumber, setSelectNumber] = useState(2);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [buttonsDisabled, setButtonsDisabled] = useState(false);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  const router = useRouter();

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const docRef = doc(db, 'sets', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as Omit<SetData, 'id'>;
          setSetData({ id: docSnap.id, ...data });
        }
      } catch (error) {
        console.error('データ取得エラー:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) return <p>読み込み中...</p>;
  if (!setData) return <p>データが存在しません</p>;

  const generateOptions = () => {
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

  const options = generateOptions();

  const handleAnswerClick = (option: string) => {
    if (buttonsDisabled) return;
    setButtonsDisabled(true);

    const correctAnswer = setData.questions[count].answer;
    const isCorrect = option === correctAnswer;
    setFeedback(isCorrect ? '正解' : '不正解');
    setAnsweredCount((prev) => prev + 1);
    if (isCorrect) setCorrectCount((prev) => prev + 1);

    setTimeout(() => {
      if (random) {
        setCount(Math.floor(Math.random() * setData.questions.length));
      } else {
        setCount((prev) => (prev + 1) % setData.questions.length);
      }
      setFeedback(null);
      setButtonsDisabled(false);
    }, 1000);
  };

  const handleRandom = () => {
    setRandom((prev) => !prev);
    setCount(prev => prev === 0 ? Math.floor(Math.random() * setData.questions.length) : 0);
  };

  const handleSelectNumberUp = () => {
    setSelectNumber(prev => (prev < 4 ? prev + 1 : 2));
    if(random) {
      setCount(Math.floor(Math.random() * setData.questions.length));
    }else {
      setCount(prev => (prev + 1) % setData.questions.length);
    }
  };

  const handleSelectNumberDown = () => {
    setSelectNumber(prev => (prev > 2 ? prev - 1 : 4));
    if(random) {
      setCount(Math.floor(Math.random() * setData.questions.length));
    }else {
      setCount(prev => (prev + 1) % setData.questions.length);
    }
  };

  const handleFlashCardPage = () => {
    router.push(`/flash/${setData.id}`);
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 4 } }}>
      <Typography variant="h4" gutterBottom>{setData.title}</Typography>
      <Typography variant="body1" gutterBottom>{setData.description}</Typography>

      <Card sx={{ my: 2, p: 2 }}>
        <Typography variant="h6">問題 {count + 1}</Typography>
        <Typography>{setData.questions[count].problem}</Typography>
      </Card>

      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        <Button variant="outlined" onClick={handleSelectNumberDown}>選択肢を減らす</Button>
        <Typography>{selectNumber}択問題</Typography>
        <Button variant="outlined" onClick={handleSelectNumberUp}>選択肢を増やす</Button>
        <Checkbox checked={random} onChange={handleRandom} />
        <Typography>ランダム表示</Typography>
      </Box>

      <Grid container direction="column" alignItems="center" spacing={2}>
        {options.map((option, index) => (
          <Box key={index} sx={{ width: '80%' }}>
            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={() => handleAnswerClick(option)}
              disabled={buttonsDisabled}
              sx={{ py: 2, textTransform: 'none' }}
            >
              {option}
            </Button>
          </Box>
        ))}
      </Grid>

      {/* 回答状況表示カード */}
      <Grid container justifyContent="center" sx={{ my: 3 }}>
        <Box>
          <Card sx={{ p: 2, background: '#f5f5fa', boxShadow: 3, borderRadius: 3 }}>
            <Typography variant="subtitle1" color="text.secondary" gutterBottom>
              回答状況
            </Typography>
            <Grid container spacing={2} alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h6">回答数: {answeredCount}</Typography>
              </Box>
              <Box>
                <Typography variant="h6" color="success.main">正答数: {correctCount}</Typography>
              </Box>
              <Box>
                <Typography variant="h6" color="primary.main">
                  正答率: {answeredCount === 0 ? '0%' : `${((correctCount / answeredCount) * 100).toFixed(1)}%`}
                </Typography>
              </Box>
            </Grid>
          </Card>
        </Box>
      </Grid>

      {feedback && (
        <Box sx={{ mt: 3, display: 'flex', alignItems: 'center', flexDirection: 'column' }}>
          <Typography variant="h5" sx={{ color: feedback === '正解' ? 'green' : 'red' }}>
            {feedback}
          </Typography>
          <Typography variant="h6" sx={{ mt: 1 }}>
            正解：{setData.questions[count].answer}
          </Typography>
        </Box>
      )}

      <Box sx={{ mt: 4 }}>
        <Button variant="contained" color="secondary" onClick={handleFlashCardPage}>
          フラッシュカードへ
        </Button>
        <Button variant="contained" color="error" sx={{mx:2}} onClick={() => router.push('/')}>
          やめる
        </Button>
      </Box>
    </Box>
  );
}
