"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
    Box,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Card,
    Typography,
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

export default function SetsPage() {
    const [sets, setSets] = useState<SetData[]>([]);
    const [openSetId, setOpenSetId] = useState<string | null>(null);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const router = useRouter();

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

    const handleOpenQuestionDialog = (id: string) => setOpenSetId(id);
    const handleCloseQuestionDialog = () => setOpenSetId(null);
    const handleOpenDeleteDialog = () => setOpenDeleteDialog(true);
    const handleCloseDeleteDialog = () => setOpenDeleteDialog(false);

    const handleDeleteSet = async () => {
        if (!openSetId) return;
        try {
            await deleteDoc(doc(db, 'sets', openSetId));
            setSets(sets.filter(set => set.id !== openSetId));
            handleCloseDeleteDialog();
            handleCloseQuestionDialog();
        } catch (error) {
            console.error('削除エラー:', error);
        }
    };

    const selectedSet = sets.find(set => set.id === openSetId);

    const handleChangeFlash = () => router.push(`/flash/${openSetId}`);
    const handleChangeNSelect = () => router.push(`/select/${openSetId}`);

    return (
        <Box sx={{ p: { xs: 2, sm: 4 } }}>
            <Typography variant="h4" gutterBottom>単語帳一覧</Typography>
            {sets.length === 0 ? (
                <Typography>データがありません</Typography>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {sets.map((set) => (
                        <Card
                            key={set.id}
                            sx={{
                                p: 2,
                                cursor: 'pointer',
                                '&:hover': { backgroundColor: '#f0f0f0' },
                            }}
                            onClick={() => handleOpenQuestionDialog(set.id)}
                        >
                            <Typography variant="h6">{set.title}</Typography>
                            <Typography variant="body2">{set.description}</Typography>
                        </Card>
                    ))}
                </Box>
            )}

            {/* セット操作ダイアログ */}
            <Dialog open={Boolean(openSetId)} onClose={handleCloseQuestionDialog} fullWidth maxWidth="xs">
                <DialogTitle>{selectedSet?.title}</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ mb: 2 }}>{selectedSet?.description}</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Button variant="contained" onClick={handleChangeFlash} fullWidth>フラッシュ</Button>
                        <Button variant="contained" onClick={handleChangeNSelect} fullWidth>n択</Button>
                        <Button variant="outlined" color="error" onClick={handleOpenDeleteDialog} fullWidth>削除</Button>
                        <Button onClick={handleCloseQuestionDialog} fullWidth>キャンセル</Button>
                    </Box>
                </DialogContent>
            </Dialog>

            {/* 削除確認ダイアログ（独立） */}
            <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
                <DialogTitle>削除確認</DialogTitle>
                <DialogContent>
                    <Typography>{selectedSet?.title} を本当に削除しますか？</Typography>
                </DialogContent>
                <DialogActions sx={{ flexDirection: { xs: 'column', sm: 'row' }, gap: 1, px: 3, pb: 2 }}>
                    <Button onClick={handleDeleteSet} color="error" variant="contained" fullWidth>削除</Button>
                    <Button onClick={handleCloseDeleteDialog} variant="outlined" fullWidth>キャンセル</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
