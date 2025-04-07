'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Card, Typography, Button, Checkbox } from '@mui/material';

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
  console.log('params:', params);
  const [setData, setSetData] = useState<SetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [random, setRandom] = useState(false);

  const router = useRouter();

  useEffect(() => {
    console.log('useEffect実行: id =', id);
    if (!id) {
      console.warn('IDが取得できていません');
      setLoading(false);
      return;
    }
  
    const fetchData = async () => {
      try {
        const docRef = doc(db, 'sets', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as Omit<SetData, 'id'>;
          console.log('データ取得成功:', data);
          setSetData({ id: docSnap.id, ...data });
        } else {
          console.error('データが見つかりません');
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

  const handleNextQuestion = () => {
    setCount((prevCount) => (prevCount + 1) % setData.questions.length);
    setShowAnswer(false); 
    if (random) {
      setCount(Math.floor(Math.random() * setData.questions.length));
    }
  };
  
  const handlePrevQuestion = () => {
    setCount((prevCount) => (prevCount - 1 + setData.questions.length) % setData.questions.length);
    setShowAnswer(false); 
    if (random) {
      setCount(Math.floor(Math.random() * setData.questions.length));
    }
  };

  const handleShowAnswer = () => {
    setShowAnswer((prevShowAnswer) => !prevShowAnswer);
  };

  const handleRandom = () => {
    setRandom((prevRandom) => !prevRandom);
    if (!random) {
      setCount(Math.floor(Math.random() * setData.questions.length));
    } else {
      setCount(0);
    }
  };

  // 新規ボタン押下で /select/[Id]/page.tsx に遷移するハンドラー
  const handleNavigateToSelect = () => {
    router.push(`/select/${setData.id}`);
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>{setData.title}</h1>
      <p>{setData.description}</p>
      <Card style={{ margin: '16px 0', padding: 16, cursor: 'pointer' }} onClick={handleShowAnswer}>
        <Typography variant="h6">問題 {count + 1}</Typography>
        {showAnswer ? (
          <Typography>答え: {setData.questions[count].answer}</Typography>
        ) : (
          <Typography>問題: {setData.questions[count].problem}</Typography>
        )}
        <Typography style={{ marginTop: 8, color: 'gray' }}>
          {showAnswer ? 'クリックして答えを隠す' : 'クリックして答えを見る'}
        </Typography>
      </Card>

      <Button variant="outlined" onClick={handlePrevQuestion}>
        前の問題
      </Button>
      <Typography style={{ display: 'inline', margin: '0 8px' }}>
        {count + 1}/{setData.questions.length}
      </Typography>
      <Button variant="outlined" onClick={handleNextQuestion}>
        次の問題
      </Button>
      <Checkbox checked={random} onChange={handleRandom} style={{ marginLeft: 16 }} />
      <Typography display="inline">ランダム表示</Typography>
      
      {/* /select/[Id]/page.tsx へ遷移するボタン */}
      <div style={{ marginTop: 16 }}>
        <Button variant="contained" onClick={handleNavigateToSelect}>
          N択へ
        </Button>
      </div>
    </div>
  );
}
