"use client";
import { useState } from 'react';
import Papa from 'papaparse';
import { db } from './lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import {
    Dialog,
    DialogTitle,
    Button,
    TextField,
    DialogContent,
    DialogActions,
    Box,
} from '@mui/material';
import Management from './_components/management';

export default function UploadPage() {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [csvData, setCsvData] = useState<{ problem: string; answer: string }[]>([]);
    const [importDialogOpen, setImportDialogOpen] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const parsed = results.data as { answer: string; problem: string }[];
                setCsvData(parsed);
            },
        });
    };

    const handleUpload = async () => {
        if (!title || !csvData.length) {
            alert('タイトルとCSVを確認してください');
            return;
        }
        try {
            await addDoc(collection(db, 'sets'), {
                title,
                description,
                questions: csvData,
            });
            alert('アップロード成功！');
            handleCloseImportDialog();
            window.location.reload(); // アップロード成功後にページをリロード
        } catch (error) {
            console.error('アップロードエラー:', error);
            alert('アップロード失敗');
            handleCloseImportDialog();
        }
    };

    const handleOpenImportDialog = () => {
        setImportDialogOpen(true);
    };

    const handleCloseImportDialog = () => {
        setImportDialogOpen(false);
    };

    return (
        <Box sx={{ p: { xs: 2, sm: 4 } }}>
            <Button variant="outlined" onClick={handleOpenImportDialog}>
                新規作成
            </Button>
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <h1 style={{ fontSize: '6rem', fontWeight: 'bold', color: '#1976d2'}}>Study GO</h1>
            </div>
            <Dialog open={importDialogOpen} onClose={handleCloseImportDialog} fullWidth maxWidth="sm">
                <DialogTitle>単語帳を作成</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            placeholder="タイトル"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            fullWidth
                        />
                        <TextField
                            placeholder="一言で説明"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            multiline
                            rows={3}
                            fullWidth
                        />
                        <input type="file" accept=".csv" onChange={handleFileChange} />
                    </Box>
                </DialogContent>

                <DialogActions sx={{ flexDirection: { xs: 'column', sm: 'row' }, gap: 1, px: 3, pb: 2 }}>
                    <Button fullWidth={true} variant="contained" onClick={handleUpload}>
                        アップロード
                    </Button>
                    <Button fullWidth={true} variant="outlined" onClick={handleCloseImportDialog}>
                        キャンセル
                    </Button>
                </DialogActions>
            </Dialog>

            <Box mt={4}>
                <Management />
            </Box>
        </Box>
    );
}
