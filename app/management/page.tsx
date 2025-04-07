"use client";
import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

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

export default function SetsPage() {
  const [sets, setSets] = useState<SetData[]>([]);

  useEffect(() => {
    const fetchSets = async () => {
      try {
        // Firestoreの'sets'コレクションから全ドキュメントを取得
        const querySnapshot = await getDocs(collection(db, 'sets'));
        const data = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<SetData, 'id'>),
        }));
        setSets(data);
      } catch (error) {
        console.error('データ取得エラー:', error);
      }
    };

    fetchSets();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>問題セット一覧</h1>
      {sets.length === 0 ? (
        <p>データがありません</p>
      ) : (
        sets.map((set) => (
          <div key={set.id} style={{ marginBottom: '2rem', border: '1px solid #ccc', padding: '1rem' }}>
            <h2>{set.title}</h2>
            <p>{set.description}</p>
            <h3>問題一覧</h3>
            <ul>
              {set.questions.map((q, idx) => (
                <li key={idx}>
                  <strong>問題:</strong> {q.problem} <br />
                  <strong>回答:</strong> {q.answer}
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}
