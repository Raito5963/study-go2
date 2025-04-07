"use client";
import { useEffect, useState } from 'react';
import { collection, getDocs,deleteDoc,doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Button, Dialog, DialogTitle, Card } from '@mui/material';

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
    const [openSetId, setOpenSetId] = useState<string | null>(null);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    useEffect(() => {
        const fetchSets = async () => {
            try {
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

    const handleOpenQuestionDialog = (id: string) => {
        setOpenSetId(id);
    };
    const handleCloseQuestionDialog = () => {
        setOpenSetId(null);
    };
    const handleOpenDeleteDialog = () => {
        setOpenDeleteDialog(true);
    };
    const handleCloseDeleteDialog = () => {
        setOpenDeleteDialog(false);
    };
    const handleDeleteSet = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'sets', id));
            setSets(sets.filter(set => set.id !== id));
            handleCloseDeleteDialog();
            handleCloseQuestionDialog
        } catch (error) {
            console.error('削除エラー:', error);
        }
    };
    const selectedSet = sets.find(set => set.id === openSetId);
/*aaaa */
    return (
        <div style={{ padding: 20 }}>
            <h1>問題セット一覧</h1>
            {sets.length === 0 ? (
                <p>データがありません</p>
            ) : (
                sets.map((set) => (
                    <div key={set.id}> 
                        <Card
                            style={{ marginBottom: '2rem', padding: '1rem', cursor: 'pointer' }}
                            onClick={() => handleOpenQuestionDialog(set.id)}
                        >
                            <h2>{set.title}</h2>
                            <p>{set.description}</p>
                        </Card>
                    </div>
                ))
            )}
            {selectedSet && (
                <Dialog open={Boolean(openSetId)} onClose={handleCloseQuestionDialog}>
                    <DialogTitle>{selectedSet.title}</DialogTitle>
                    <h3>{selectedSet.description}</h3>
                    <Button onClick={handleCloseQuestionDialog}>フラッシュ</Button>
                    <Button onClick={handleCloseQuestionDialog}>n択</Button>
                    <Button onClick={handleOpenDeleteDialog}>削除</Button>
                    <Dialog open={openDeleteDialog} onClose={handleCloseQuestionDialog}>
                        <DialogTitle>削除</DialogTitle>
                        <h3>{selectedSet.title}を本当に削除しますか？</h3>
                        <Button onClick={() => handleDeleteSet(selectedSet.id)}>削除</Button>
                        <Button onClick={handleCloseDeleteDialog}>キャンセル</Button>
                    </Dialog>
                    <Button onClick={handleCloseQuestionDialog}>キャンセル</Button>
                </Dialog>
            )}
        </div>
    );
}
