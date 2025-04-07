"use client";
import { useState } from 'react';
import Papa from 'papaparse';
import { db } from './lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { Dialog, Button } from '@mui/material';

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
                単語帳をアップロード
            </Button>
            <Dialog open={importDialogOpen} onClose={handleCloseImportDialog}>
                <h1>単語帳をアップロード</h1>
                <input
                    type="text"
                    placeholder="タイトル"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />
                <br />
                <textarea
                    placeholder="説明"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    style={{ width: 300 }}
                />
                <br />
                <input type="file" accept=".csv" onChange={handleFileChange} />
                <br />
                <button onClick={handleUpload}>アップロード</button>
            </Dialog>
            <a href="/management">management</a>
        </div>
    );
}
