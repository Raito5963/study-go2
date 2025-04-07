"use client";
import { useState } from 'react';
import Papa from 'papaparse';
import { db } from './lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { Dialog,DialogTitle, Button,TextField } from '@mui/material';

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
        <div style={{ padding: 20 }}>
            <Button variant="outlined" onClick={handleOpenImportDialog}>
                新規作成
            </Button>
            <Dialog open={importDialogOpen} onClose={handleCloseImportDialog}>
                <DialogTitle>単語帳を作成</DialogTitle>
                <TextField
                    placeholder="タイトル"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />
                <br />
                <TextField
                    placeholder="一言で説明"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    style={{ width: 300 }}
                />
                <br />
                <input type="file" accept=".csv" onChange={handleFileChange} />
                <br />
                <Button onClick={handleUpload}>アップロード</Button>
                <Button onClick={handleCloseImportDialog}>キャンセル</Button>
            </Dialog>
            <a href="/management">management</a>
        </div>
    );
}
