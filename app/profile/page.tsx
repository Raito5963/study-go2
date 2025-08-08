'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Avatar,
  AppBar,
  Toolbar,
  IconButton,
  Alert,
  CircularProgress,
} from '@mui/material';
import { ArrowLeft, Camera, User } from 'lucide-react';
import Image from 'next/image';
import DefaultUserIcon from '../../components/DefaultUserIcon';

export default function ProfilePage() {
  const { currentUser, userProfile } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      router.push('/signin');
      return;
    }
    
    if (userProfile) {
      setDisplayName(userProfile.displayName);
      setAvatarUrl(userProfile.avatar || '');
    }
  }, [currentUser, userProfile, router]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentUser) return;

    // ファイルサイズチェック（5MB以下）
    if (file.size > 5 * 1024 * 1024) {
      setError('ファイルサイズは5MB以下にしてください');
      return;
    }

    // ファイル形式チェック
    if (!file.type.startsWith('image/')) {
      setError('画像ファイルを選択してください');
      return;
    }

    setUploading(true);
    setError('');

    try {
      // Firebase Storageにアップロード
      const storageRef = ref(storage, `avatars/${currentUser.uid}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      setAvatarUrl(downloadURL);
      setSuccess('画像をアップロードしました！');
    } catch (error) {
      console.error('画像アップロードエラー:', error);
      setError('画像のアップロードに失敗しました');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!currentUser || !displayName.trim()) {
      setError('表示名を入力してください');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        displayName: displayName.trim(),
        avatar: avatarUrl,
        updatedAt: new Date(),
      });

      setSuccess('プロフィールを更新しました！');
      
      // AuthContextを更新するため、少し待ってからページを再読み込み
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('プロフィール更新エラー:', error);
      setError('プロフィールの更新に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  if (!currentUser || !userProfile) {
    return null;
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <AppBar position="static" sx={{ bgcolor: '#1976d2' }}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => router.push('/dashboard')}
            sx={{ mr: 2 }}
          >
            <ArrowLeft />
          </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <Image
              src="/GO.png"
              alt="GO Logo"
              width={40}
              height={40}
              style={{ marginRight: '12px' }}
            />
            <Typography variant="h6">プロフィール設定</Typography>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 4 }}>
        <Card>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h4" gutterBottom align="center">
              プロフィール設定
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            {success && (
              <Alert severity="success" sx={{ mb: 3 }}>
                {success}
              </Alert>
            )}

            <Box sx={{ mb: 4, textAlign: 'center' }}>
              <Typography variant="h6" gutterBottom>
                現在のプロフィール
              </Typography>
              
              <Box sx={{ position: 'relative', display: 'inline-block', mb: 2 }}>
                {avatarUrl ? (
                  <Avatar
                    src={avatarUrl}
                    sx={{ width: 100, height: 100, mx: 'auto' }}
                  />
                ) : (
                  <Box sx={{ width: 100, height: 100, mx: 'auto', borderRadius: '50%', overflow: 'hidden' }}>
                    <DefaultUserIcon size={100} />
                  </Box>
                )}
                
                <IconButton
                  sx={{
                    position: 'absolute',
                    bottom: -5,
                    right: -5,
                    bgcolor: '#1976d2',
                    color: 'white',
                    '&:hover': { bgcolor: '#1565c0' },
                    width: 35,
                    height: 35,
                  }}
                  onClick={triggerFileInput}
                  disabled={uploading}
                >
                  {uploading ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    <Camera size={20} />
                  )}
                </IconButton>
              </Box>

              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />

              <Typography variant="h6">{userProfile.displayName}</Typography>
              <Typography variant="body2" color="text.secondary">
                {userProfile.email}
              </Typography>
            </Box>

            <Box sx={{ mb: 4 }}>
              <TextField
                fullWidth
                label="表示名"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                variant="outlined"
                sx={{ mb: 3 }}
              />

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                プロフィール画像のアップロード
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                ・対応形式: JPEG, PNG, GIF
                <br />
                ・最大サイズ: 5MB
                <br />
                ・推奨サイズ: 200x200px以上の正方形
              </Typography>
              
              <Button
                variant="outlined"
                startIcon={<Camera />}
                onClick={triggerFileInput}
                disabled={uploading}
                fullWidth
                sx={{ mb: 2 }}
              >
                {uploading ? '画像をアップロード中...' : '画像を選択'}
              </Button>

              {avatarUrl && (
                <Button
                  variant="text"
                  color="error"
                  onClick={() => {
                    setAvatarUrl('');
                    setSuccess('デフォルトアイコンに変更しました');
                  }}
                  fullWidth
                  sx={{ mb: 2 }}
                >
                  デフォルトアイコンに戻す
                </Button>
              )}
            </Box>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="outlined"
                onClick={() => router.push('/dashboard')}
                disabled={loading}
              >
                キャンセル
              </Button>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={loading || !displayName.trim() || uploading}
                sx={{ bgcolor: '#1976d2', '&:hover': { bgcolor: '#1565c0' } }}
              >
                {loading ? '保存中...' : '保存'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
