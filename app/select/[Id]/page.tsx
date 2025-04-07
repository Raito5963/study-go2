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

export default function NSelectSetPage() {
  const params = useParams();
  const id = params?.Id as string;
  console.log('params:', params);
  const [setData, setSetData] = useState<SetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [random, setRandom] = useState(false);
  const [selectNumber, setSelectNumber] = useState(2);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [buttonsDisabled, setButtonsDisabled] = useState(false);

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

  // 正解とランダムな不正解選択肢を生成する関数
  const generateOptions = () => {
    const correctAnswer = setData.questions[count].answer;
    // 現在の問題以外の回答を取得
    const otherAnswers = setData.questions
      .filter((_, idx) => idx !== count)
      .map((q) => q.answer);

    // Fisher-Yates でシャッフル
    const shuffleArray = <T,>(array: T[]): T[] => {
      const arr = [...array];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    };

    // selectNumber - 1 個のランダムな不正解を選ぶ
    const needed = selectNumber - 1;
    const shuffledOthers = shuffleArray(otherAnswers);
    const randomOptions = shuffledOthers.slice(0, needed);

    // 正解と不正解を合わせた配列をシャッフル
    const options = shuffleArray([correctAnswer, ...randomOptions]);
    return options;
  };

  const options = generateOptions();

  // 選択肢をクリックした時のハンドラー
  const handleAnswerClick = (option: string) => {
    if (buttonsDisabled) return;

    setButtonsDisabled(true);
    const correctAnswer = setData.questions[count].answer;
    if (option === correctAnswer) {
      setFeedback('正解');
    } else {
      setFeedback('不正解');
    }

    if (random) {
      setTimeout(() => {
        setCount(Math.floor(Math.random() * setData.questions.length));
        setFeedback(null);
        setButtonsDisabled(false);
      }, 1000);
    } else {
      setTimeout(() => {
        setCount((prev) => (prev + 1) % setData.questions.length);
        setFeedback(null);
        setButtonsDisabled(false);
      }, 1000);
    }
  };

  const handleRandom = () => {
    setRandom((prevRandom) => !prevRandom);
    if (!random) {
      setCount(Math.floor(Math.random() * setData.questions.length));
    } else {
      setCount(0);
    }
  };

  const handleSelectNumberUp = () => {
    if (selectNumber < 4) {
      setSelectNumber((prev) => prev + 1);
    } else {
      setSelectNumber(2);
    }
  };

  const handleSelectNumberDown = () => {
    if (selectNumber > 2) {
      setSelectNumber((prev) => prev - 1);
    } else {
      setSelectNumber(4);
    }
  };

  // 新規ボタン: クリックで /flash/[Id]/page.tsx へ遷移
  const handleFlashCardPage = () => {
    router.push(`/flash/${setData.id}`);
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>{setData.title}</h1>
      <p>{setData.description}</p>
      <Card style={{ margin: '16px 0', padding: 16, cursor: 'pointer' }}>
        <Typography variant="h6">問題 {count + 1}</Typography>
        <Typography>問題: {setData.questions[count].problem}</Typography>
      </Card>
      <div>
        <Button variant="outlined" onClick={handleSelectNumberDown}>
          選択肢を減らす
        </Button>
        <Typography display="inline" style={{ margin: '0 8px' }}>
          {selectNumber}択問題
        </Typography>
        <Button variant="outlined" onClick={handleSelectNumberUp}>
          選択肢を増やす
        </Button>
        <Checkbox
          checked={random}
          onChange={handleRandom}
          style={{ marginLeft: 16 }}
        />
        <Typography display="inline">ランダム表示</Typography>
      </div>
      <div style={{ marginTop: 16 }}>
        {options.map((option, index) => (
          <Button
            key={index}
            variant="contained"
            style={{ margin: '4px' }}
            onClick={() => handleAnswerClick(option)}
            disabled={buttonsDisabled}
          >
            {option}
          </Button>
        ))}
      </div>
      {feedback && (
        <Typography variant="h5" style={{ marginTop: 16 }}>
          {feedback}
        </Typography>
      )}
      <div style={{ marginTop: 16 }}>
        <Button variant="contained" onClick={handleFlashCardPage}>
          フラッシュカードへ
        </Button>
      </div>
    </div>
  );
}
