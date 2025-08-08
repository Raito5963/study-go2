"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  AppBar,
  Toolbar,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Fab,
  Alert,
  Chip,
  Avatar,
} from '@mui/material';
import { BookOpen, Plus, MoreVertical, User, LogOut, Share2, Trash2, HelpCircle } from 'lucide-react';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import Papa from 'papaparse';
import Image from 'next/image';
import DefaultUserIcon from '../../components/DefaultUserIcon';

interface StudySet {
  id: string;
  title: string;
  description: string;
  questions: { problem: string; answer: string }[];
  createdBy: string;
  createdAt: Date;
  sharedWith?: string[];
}

export default function DashboardPage() {
  const { currentUser, userProfile, logout } = useAuth();
  const router = useRouter();
  const [studySets, setStudySets] = useState<StudySet[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedSet, setSelectedSet] = useState<StudySet | null>(null);
  const [shareUsername, setShareUsername] = useState('');
  const [sharePassword, setSharePassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [menuSetId, setMenuSetId] = useState<string | null>(null);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  
  // 作成フォーム用の状態
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [csvData, setCsvData] = useState<{ problem: string; answer: string }[]>([]);

  useEffect(() => {
    if (!currentUser) {
      router.push('/signin');
      return;
    }
    fetchStudySets();
  }, [currentUser, router]);

  const fetchStudySets = async () => {
    if (!currentUser) return;
    
    try {
      // 自分が作成した単語帳
      const ownSetsQuery = query(
        collection(db, 'sets'),
        where('createdBy', '==', currentUser.uid)
      );
      const ownSetsSnapshot = await getDocs(ownSetsQuery);
      const ownSets = ownSetsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || '無題',
          description: data.description || '',
          questions: Array.isArray(data.questions) ? data.questions : [],
          createdBy: data.createdBy || '',
          createdAt: data.createdAt?.toDate() || new Date(),
          sharedWith: Array.isArray(data.sharedWith) ? data.sharedWith : [],
        } as StudySet;
      });

      // 共有された単語帳
      const sharedSetsQuery = query(
        collection(db, 'sets'),
        where('sharedWith', 'array-contains', currentUser.uid)
      );
      const sharedSetsSnapshot = await getDocs(sharedSetsQuery);
      const sharedSets = sharedSetsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || '無題',
          description: data.description || '',
          questions: Array.isArray(data.questions) ? data.questions : [],
          createdBy: data.createdBy || '',
          createdAt: data.createdAt?.toDate() || new Date(),
          sharedWith: Array.isArray(data.sharedWith) ? data.sharedWith : [],
        } as StudySet;
      });

      setStudySets([...ownSets, ...sharedSets]);
    } catch (error) {
      console.error('データ取得エラー:', error);
      setError('データの取得に失敗しました。再度お試しください。');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        console.log('CSVパース結果:', results.data);
        const parsed = results.data as { problem: string; answer: string }[];
        // CSVの列名を正しく読み込み：problemが問題、answerが答え
        const correctedData = parsed.map(row => ({
          problem: row.problem || '',
          answer: row.answer || ''
        }));
        console.log('修正後のCSVデータ:', correctedData);
        setCsvData(correctedData);
      },
    });
  };

  const handleCreateSet = async () => {
    if (!title || !csvData.length || !currentUser) {
      setError('タイトルとCSVを確認してください');
      return;
    }

    console.log('作成時のCSVデータ:', csvData);
    
    try {
      const docData = {
        title,
        description,
        questions: csvData,
        createdBy: currentUser.uid,
        createdAt: new Date(),
        sharedWith: [],
      };
      console.log('Firestoreに保存するデータ:', docData);
      
      await addDoc(collection(db, 'sets'), docData);
      
      setCreateDialogOpen(false);
      setTitle('');
      setDescription('');
      setCsvData([]);
      setError('');
      setSuccess('単語帳を作成しました！');
      fetchStudySets();
    } catch (error) {
      console.error('作成エラー:', error);
      setError('単語帳の作成に失敗しました');
    }
  };

  const handleDeleteSet = async (setId: string) => {
    try {
      await deleteDoc(doc(db, 'sets', setId));
      fetchStudySets();
      setSuccess('単語帳を削除しました');
    } catch (error) {
      console.error('削除エラー:', error);
      setError('削除に失敗しました');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/signin');
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };

  const openShareDialog = (studySet: StudySet) => {
    setSelectedSet(studySet);
    setShareDialogOpen(true);
    setError('');
    setSuccess('');
  };

  const handleShare = async () => {
    if (!selectedSet || !userProfile) return;

    if (sharePassword.length !== 4 || !/^\d{4}$/.test(sharePassword)) {
      setError('4桁の数字を入力してください');
      return;
    }

    try {
      // ユーザー名で検索
      const usersQuery = query(
        collection(db, 'users'),
        where('displayName', '==', shareUsername)
      );
      const usersSnapshot = await getDocs(usersQuery);

      if (usersSnapshot.empty) {
        setError('ユーザーが見つかりません');
        return;
      }

      const targetUserDoc = usersSnapshot.docs[0];
      const targetUser = targetUserDoc.data();

      // 共有コードを確認
      if (targetUser.shareCode !== sharePassword) {
        setError('共有コードが間違っています');
        return;
      }

      // 既に共有されているかチェック
      if (selectedSet.sharedWith?.includes(targetUser.uid)) {
        setError('既にこのユーザーと共有されています');
        return;
      }

      // 単語帳に共有ユーザーを追加
      await updateDoc(doc(db, 'sets', selectedSet.id), {
        sharedWith: arrayUnion(targetUser.uid)
      });

      setShareDialogOpen(false);
      setShareUsername('');
      setSharePassword('');
      setSuccess(`${targetUser.displayName}さんと単語帳を共有しました！`);
      fetchStudySets();
    } catch (error) {
      console.error('共有エラー:', error);
      setError('共有に失敗しました');
    }
  };

  const openMenu = (event: React.MouseEvent<HTMLElement>, setId: string) => {
    setMenuAnchorEl(event.currentTarget);
    setMenuSetId(setId);
  };

  const closeMenu = () => {
    setMenuAnchorEl(null);
    setMenuSetId(null);
  };

  if (!currentUser || !userProfile) {
    return null;
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
            <Image 
              src="/GO.png" 
              alt="Study GO Logo" 
              width={32} 
              height={32} 
              style={{ 
                marginRight: 8,
                borderRadius: 4
              }} 
            />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
              Study GO
            </Typography>
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {userProfile.avatar ? (
              <Avatar
                src={userProfile.avatar}
                sx={{ width: 32, height: 32 }}
              />
            ) : (
              <Box sx={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden' }}>
                <DefaultUserIcon size={32} />
              </Box>
            )}
            <Typography variant="body1" sx={{ mr: 1 }}>
              {userProfile.displayName}
            </Typography>
          </Box>
          <IconButton
            color="inherit"
            onClick={() => setHelpDialogOpen(true)}
            title="使い方"
          >
            <HelpCircle />
          </IconButton>
          <IconButton
            size="large"
            edge="end"
            color="inherit"
            onClick={(e) => setAnchorEl(e.currentTarget)}
          >
            <User />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
          >
            <MenuItem onClick={() => {
              setAnchorEl(null);
              router.push('/profile');
            }}>
              <User size={20} style={{ marginRight: 8 }} />
              プロフィール
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <LogOut size={20} style={{ marginRight: 8 }} />
              ログアウト
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {(error || success) && (
          <Alert 
            severity={error ? "error" : "success"} 
            sx={{ mb: 2 }}
            onClose={() => { setError(''); setSuccess(''); }}
          >
            {error || success}
          </Alert>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="h4" component="h1">
            単語帳一覧
          </Typography>
          <Chip 
            label={`共有コード: ${userProfile.shareCode}`} 
            variant="outlined" 
            color="primary"
          />
        </Box>

        {studySets.length === 0 ? (
          <Card sx={{ textAlign: 'center', py: 8 }}>
            <CardContent>
              <BookOpen size={64} color="#ccc" style={{ marginBottom: 16 }} />
              <Typography variant="h6" color="textSecondary" gutterBottom>
                単語帳がありません
              </Typography>
              <Typography variant="body2" color="textSecondary">
                新しい単語帳を作成して学習を始めましょう
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
            },
            gap: 3,
          }}>
            {studySets.map((set) => (
              <Box key={set.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography variant="h6" component="h2" gutterBottom sx={{ flexGrow: 1 }}>
                        {set.title}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={(e) => openMenu(e, set.id)}
                      >
                        <MoreVertical />
                      </IconButton>
                    </Box>
                    <Typography variant="body2" color="textSecondary" paragraph>
                      {set.description}
                    </Typography>
                    <Typography variant="caption" color="textSecondary" display="block">
                      問題数: {set.questions.length}
                    </Typography>
                    {set.createdBy !== currentUser.uid && (
                      <Chip 
                        label="共有" 
                        size="small" 
                        color="secondary" 
                        sx={{ mt: 1 }}
                      />
                    )}
                    {set.sharedWith && set.sharedWith.length > 0 && set.createdBy === currentUser.uid && (
                      <Chip 
                        label={`${set.sharedWith.length}人と共有中`} 
                        size="small" 
                        color="primary" 
                        sx={{ mt: 1 }}
                      />
                    )}
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => router.push(`/study-mode?setId=${set.id}`)}
                      fullWidth
                    >
                      学習を開始
                    </Button>
                  </CardActions>
                </Card>
              </Box>
            ))}
          </Box>
        )}

        <Fab
          color="primary"
          aria-label="add"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={() => setCreateDialogOpen(true)}
        >
          <Plus />
        </Fab>
      </Container>

      {/* メニュー */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={closeMenu}
      >
        <MenuItem onClick={() => {
          const set = studySets.find(s => s.id === menuSetId);
          if (set && set.createdBy === currentUser.uid) {
            openShareDialog(set);
          }
          closeMenu();
        }}>
          <Share2 size={20} style={{ marginRight: 8 }} />
          共有
        </MenuItem>
        <MenuItem onClick={() => {
          if (menuSetId) {
            handleDeleteSet(menuSetId);
          }
          closeMenu();
        }}>
          <Trash2 size={20} style={{ marginRight: 8 }} />
          削除
        </MenuItem>
      </Menu>

      {/* 単語帳作成ダイアログ */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>新しい単語帳を作成</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <TextField
            autoFocus
            margin="dense"
            label="タイトル"
            fullWidth
            variant="outlined"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="説明"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              CSVファイルを選択してください
            </Typography>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              style={{ width: '100%' }}
            />
          </Box>
          {csvData.length > 0 && (
            <Typography variant="body2" color="textSecondary">
              {csvData.length}問の問題がインポートされました
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>キャンセル</Button>
          <Button onClick={handleCreateSet} variant="contained">作成</Button>
        </DialogActions>
      </Dialog>

      {/* 共有ダイアログ */}
      <Dialog open={shareDialogOpen} onClose={() => setShareDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>単語帳を共有</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            共有したいユーザーの情報を入力してください
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="ユーザー名"
            fullWidth
            variant="outlined"
            value={shareUsername}
            onChange={(e) => setShareUsername(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="4桁の共有コード"
            fullWidth
            variant="outlined"
            type="text"
            inputProps={{ maxLength: 4, pattern: '[0-9]*' }}
            value={sharePassword}
            onChange={(e) => {
              const value = e.target.value.replace(/[^0-9]/g, '');
              setSharePassword(value);
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareDialogOpen(false)}>キャンセル</Button>
          <Button onClick={handleShare} variant="contained">共有</Button>
        </DialogActions>
      </Dialog>

      {/* 使い方ダイアログ */}
      <Dialog 
        open={helpDialogOpen} 
        onClose={() => setHelpDialogOpen(false)} 
        fullWidth 
        maxWidth="md"
        scroll="paper"
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
          color: 'white'
        }}>
          <HelpCircle size={24} />
          Study GO の使い方
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ p: 3, borderBottom: '1px solid #e0e0e0' }}>
            <Typography variant="h6" sx={{ mb: 2, color: '#1976d2', display: 'flex', alignItems: 'center', gap: 1 }}>
              <BookOpen size={20} />
              1. 単語帳の作成
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              ダッシュボードの「＋」ボタンから新しい単語帳を作成できます。
            </Typography>
            
            {/* CSVファイル形式の説明 */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 2, color: '#1976d2' }}>📋 CSVファイルの形式:</Typography>
              
              {/* 表形式での例 */}
              <Box sx={{ 
                border: '1px solid #e0e0e0', 
                borderRadius: 1, 
                overflow: 'hidden',
                mb: 2
              }}>
                <Box sx={{ 
                  backgroundColor: '#f5f5f5', 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr',
                  borderBottom: '1px solid #e0e0e0'
                }}>
                  <Box sx={{ p: 2, borderRight: '1px solid #e0e0e0', fontWeight: 'bold', textAlign: 'center' }}>
                    problem
                  </Box>
                  <Box sx={{ p: 2, fontWeight: 'bold', textAlign: 'center' }}>
                    answer
                  </Box>
                </Box>
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr',
                  borderBottom: '1px solid #e0e0e0'
                }}>
                  <Box sx={{ p: 2, borderRight: '1px solid #e0e0e0' }}>りんご</Box>
                  <Box sx={{ p: 2 }}>apple</Box>
                </Box>
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr',
                  borderBottom: '1px solid #e0e0e0'
                }}>
                  <Box sx={{ p: 2, borderRight: '1px solid #e0e0e0' }}>cat</Box>
                  <Box sx={{ p: 2 }}>ねこ</Box>
                </Box>
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr',
                  borderBottom: '1px solid #e0e0e0'
                }}>
                  <Box sx={{ p: 2, borderRight: '1px solid #e0e0e0' }}>こんにちは</Box>
                  <Box sx={{ p: 2 }}>hello</Box>
                </Box>
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr'
                }}>
                  <Box sx={{ p: 2, borderRight: '1px solid #e0e0e0' }}>beautiful</Box>
                  <Box sx={{ p: 2 }}>美しい</Box>
                </Box>
              </Box>

              {/* 重要な注意点 */}
              <Box sx={{ backgroundColor: '#fff3e0', border: '1px solid #ff9800', borderRadius: 1, p: 2, mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#f57c00', mb: 1 }}>
                  ⚠️ 重要な注意点:
                </Typography>
                <Typography variant="body2" component="div" sx={{ color: '#f57c00' }}>
                  • 1行目は必ず「problem,answer」のヘッダーを記載<br />
                  • problem列が問題文、answer列が答え<br />
                  • カンマ区切り形式（CSV）で保存してください
                </Typography>
              </Box>

              {/* Googleスプレッドシートのリンク */}
              <Box sx={{ 
                backgroundColor: '#e3f2fd', 
                border: '1px solid #1976d2', 
                borderRadius: 1, 
                p: 2,
                textAlign: 'center'
              }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#2e7d32', mb: 2 }}>
                  🚀 すぐに始められます！
                </Typography>
                <Typography variant="body2" sx={{ mb: 2, color: '#2e7d32' }}>
                  Googleスプレッドシートで簡単に作成できます
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Button
                    variant="contained"
                    size="small"
                    color="success"
                    href="https://docs.google.com/spreadsheets/d/1emtbncY5gxjAfEy7iN1EZdX265_kEKy-dAtR6J7rDBU/edit?usp=sharing"
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ mb: 1 }}
                  >
                    📊 テンプレートを作成
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    color="success"
                    href="https://docs.google.com/spreadsheets/d/14baoE5RnLpCrEz25FFXvWBalWV-oYxjt9JUuw29phpU/edit?usp=sharing"
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ mb: 1 }}
                  >
                    � サンプルを見る
                  </Button>
                </Box>
                <Typography variant="caption" display="block" sx={{ color: '#666', mt: 1 }}>
                  ※ 「ファイル」→「コピーを作成」でご利用ください
                </Typography>
              </Box>

              {/* ダウンロード手順 */}
              <Box sx={{ mt: 2, pl: 2, borderLeft: '3px solid #2196f3', backgroundColor: '#e3f2fd', p: 2, borderRadius: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1, color: '#1976d2' }}>
                  📥 作成からアップロードまでの手順:
                </Typography>
                <Box sx={{ color: '#1976d2' }}>
                  <Typography variant="body2" sx={{ mb: 1, display: 'flex', alignItems: 'flex-start' }}>
                    <span style={{ marginRight: '8px', fontWeight: 'bold' }}>1.</span>
                    <span>上のボタンで新しいGoogleスプレッドシートを作成</span>
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1, display: 'flex', alignItems: 'flex-start' }}>
                    <span style={{ marginRight: '8px', fontWeight: 'bold' }}>2.</span>
                    <span>A1セルに「problem」、B1セルに「answer」を入力</span>
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1, display: 'flex', alignItems: 'flex-start' }}>
                    <span style={{ marginRight: '8px', fontWeight: 'bold' }}>3.</span>
                    <span>A2以降に問題文、B2以降に答えを入力</span>
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1, display: 'flex', alignItems: 'flex-start' }}>
                    <span style={{ marginRight: '8px', fontWeight: 'bold' }}>4.</span>
                    <span>「ファイル」→「ダウンロード」→「カンマ区切り値（.csv, 現在のシート）」</span>
                  </Typography>
                  <Typography variant="body2" sx={{ display: 'flex', alignItems: 'flex-start' }}>
                    <span style={{ marginRight: '8px', fontWeight: 'bold' }}>5.</span>
                    <span>ダウンロードしたCSVファイルをStudy GOにアップロード</span>
                  </Typography>
                </Box>
              </Box>

              {/* 追加のヒント */}
              <Box sx={{ mt: 2, backgroundColor: '#f3e5f5', border: '1px solid #9c27b0', borderRadius: 1, p: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#7b1fa2', mb: 1 }}>
                  💡 便利なヒント:
                </Typography>
                <Typography variant="body2" component="div" sx={{ color: '#7b1fa2' }}>
                  • 問題文と答えにカンマ（,）が含まれる場合は、ダブルクォート（"）で囲んでください<br />
                  • 一度に数百問まで登録可能です<br />
                  • Excel、LibreOffice Calcでも同様に作成できます<br />
                  • 英単語、漢字、歴史問題など、どんな内容でもOK！
                </Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ p: 3, borderBottom: '1px solid #e0e0e0' }}>
            <Typography variant="h6" sx={{ mb: 2, color: '#1976d2', display: 'flex', alignItems: 'center', gap: 1 }}>
              🎯 2. フラッシュカード学習
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              カード形式で効率的に暗記学習ができます。
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ 
                flex: 1, 
                minWidth: '200px',
                border: '2px solid #f44336', 
                borderRadius: 2, 
                p: 2, 
                textAlign: 'center',
                backgroundColor: '#ffebee'
              }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#f44336' }}>
                  ⬅️ 左スワイプ
                </Typography>
                <Typography variant="body2">不正解 / 要復習</Typography>
              </Box>
              <Box sx={{ 
                flex: 1, 
                minWidth: '200px',
                border: '2px solid #1976d2', 
                borderRadius: 2, 
                p: 2, 
                textAlign: 'center',
                backgroundColor: '#e3f2fd'
              }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                  ➡️ 右スワイプ
                </Typography>
                <Typography variant="body2">正解 / 覚えた</Typography>
              </Box>
            </Box>
            <Typography variant="body2" sx={{ mt: 2, fontStyle: 'italic' }}>
              💡 ヒント: カードをタップすると答えが表示されます
            </Typography>
          </Box>

          <Box sx={{ p: 3, borderBottom: '1px solid #e0e0e0' }}>
            <Typography variant="h6" sx={{ mb: 2, color: '#1976d2', display: 'flex', alignItems: 'center', gap: 1 }}>
              📝 3. 選択問題
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              多肢選択形式で理解度をチェックできます。
            </Typography>
            <Box sx={{ pl: 2, borderLeft: '3px solid #e3f2fd', backgroundColor: '#f5f5f5', p: 2, borderRadius: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>🔧 機能:</Typography>
              <Typography variant="body2" component="div">
                • 2択〜4択まで選択可能<br />
                • 「除外」ボタンで選択肢を絞り込み<br />
                • 正答率と進捗を自動追跡<br />
                • 過去問道場風のインターフェース
              </Typography>
            </Box>
          </Box>

          <Box sx={{ p: 3, borderBottom: '1px solid #e0e0e0' }}>
            <Typography variant="h6" sx={{ mb: 2, color: '#1976d2', display: 'flex', alignItems: 'center', gap: 1 }}>
              👥 4. 共有機能
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              他のユーザーと単語帳を共有して一緒に学習できます。
            </Typography>
            <Box sx={{ pl: 2, borderLeft: '3px solid #e3f2fd', backgroundColor: '#f5f5f5', p: 2, borderRadius: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>📤 共有方法:</Typography>
              <Typography variant="body2" component="div">
                1. 単語帳の「共有」ボタンをクリック<br />
                2. 相手のユーザー名と4桁の共有コードを入力<br />
                3. 共有された単語帳はダッシュボードに表示<br />
                4. ランキング機能で競争しながら学習
              </Typography>
            </Box>
          </Box>

          <Box sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, color: '#1976d2', display: 'flex', alignItems: 'center', gap: 1 }}>
              📊 5. 学習統計
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              学習の進捗と成果を詳細に追跡できます。
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 2 }}>
              <Box sx={{ textAlign: 'center', p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                <Typography variant="h6" sx={{ color: '#1976d2' }}>📈</Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>正答率</Typography>
                <Typography variant="caption">リアルタイム計算</Typography>
              </Box>
              <Box sx={{ textAlign: 'center', p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                <Typography variant="h6" sx={{ color: '#1976d2' }}>⏱️</Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>学習時間</Typography>
                <Typography variant="caption">自動記録</Typography>
              </Box>
              <Box sx={{ textAlign: 'center', p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                <Typography variant="h6" sx={{ color: '#1976d2' }}>🏆</Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>ランキング</Typography>
                <Typography variant="caption">競争モード</Typography>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, backgroundColor: '#fafafa' }}>
          <Button 
            onClick={() => setHelpDialogOpen(false)} 
            variant="contained"
            sx={{ px: 4 }}
          >
            理解しました
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
