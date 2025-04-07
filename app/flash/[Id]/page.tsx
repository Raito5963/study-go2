'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import {
  Box,
  Card,
  Typography,
  Button,
  Switch,
  Stack,
  Divider,
} from '@mui/material';

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

export default function FlashSetPage() {
  const params = useParams();
  const id = params?.Id as string;
  const [setData, setSetData] = useState<SetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [random, setRandom] = useState(false);

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

  if (loading) return <Typography>読み込み中...</Typography>;
  if (!setData) return <Typography>データが存在しません</Typography>;

  const handleNextQuestion = () => {
    if (random) {
      setCount(Math.floor(Math.random() * setData.questions.length));
    } else {
      setCount((prev) => (prev + 1) % setData.questions.length);
    }
    setShowAnswer(false);
  };

  const handlePrevQuestion = () => {
    if (random) {
      setCount(Math.floor(Math.random() * setData.questions.length));
    } else {
      setCount((prev) => (prev - 1 + setData.questions.length) % setData.questions.length);
    }
    setShowAnswer(false);
  };

  const toggleAnswer = () => setShowAnswer((prev) => !prev);

  const toggleRandom = () => {
    setRandom((prev) => !prev);
    setCount(prev => random ? 0 : Math.floor(Math.random() * setData.questions.length));
  };

  const handleNavigateToSelect = () => {
    router.push(`/select/${setData.id}`);
  };

  const currentQuestion = setData.questions[count];

  return (
    <Box sx={{ p: { xs: 2, sm: 4 }, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>{setData.title}</Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        {setData.description}
      </Typography>

      <Card
        sx={{
          p: 3,
          mt: 3,
          mb: 2,
          cursor: 'pointer',
          backgroundColor: showAnswer ? '#f9fbe7' : '#e3f2fd',
        }}
        onClick={toggleAnswer}
      >
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          問題 {count + 1} / {setData.questions.length}
        </Typography>
        <Typography variant="h6">
          {showAnswer ? `答え：${currentQuestion.answer}` : `問題：${currentQuestion.problem}`}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          {showAnswer ? 'クリックして答えを隠す' : 'クリックして答えを見る'}
        </Typography>
      </Card>

      <Stack direction="row" spacing={2} justifyContent="center" alignItems="center" sx={{ my: 2, flexWrap: 'wrap' }}>
        <Button variant="outlined" onClick={handlePrevQuestion}>前</Button>
        <Typography>{count + 1}/{setData.questions.length}</Typography>
        <Button variant="outlined" onClick={handleNextQuestion}>次</Button>
      </Stack>

      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Switch checked={random} onChange={toggleRandom} />
        <Typography>ランダム表示</Typography>
      </Box>

      <Divider sx={{ my: 2 }} />

      <Button
        variant="contained"
        color="primary"
        fullWidth
        onClick={handleNavigateToSelect}
      >
        N択で練習する
      </Button>
      <Button fullWidth variant="contained" color="error" sx={{ my: 2 }} onClick={() => router.push('/')}>
          やめる
        </Button>
    </Box>
  );
}
