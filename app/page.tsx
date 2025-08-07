"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './contexts/AuthContext';
import { Box, Container, Typography, Button, Card, CardContent } from '@mui/material';
import { BookOpen } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && currentUser) {
      router.push('/dashboard');
    }
  }, [currentUser, loading, router]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Typography>読み込み中...</Typography>
      </Box>
    );
  }

  if (currentUser) {
    return null; // リダイレクト中
  }

  return (
    <Container maxWidth="lg" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
      <Box sx={{ width: '100%', textAlign: 'center' }}>
        <Typography variant="h2" component="h1" gutterBottom fontWeight="bold" color="primary">
          Study GO
        </Typography>
        <Typography variant="h5" color="textSecondary" paragraph>
          世界一使いやすい勉強サイト！
        </Typography>
        <Typography variant="body1" color="textSecondary" paragraph sx={{ maxWidth: 600, mx: 'auto', mb: 6 }}>
          フラッシュカードと選択問題で効率的に学習できます。
          友達と単語帳を共有して、一緒に勉強しましょう。
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap', mb: 8 }}>
          <Link href="/signin" passHref>
            <Button variant="contained" size="large" sx={{ px: 4, py: 1.5 }}>
              サインイン
            </Button>
          </Link>
          <Link href="/signup" passHref>
            <Button variant="outlined" size="large" sx={{ px: 4, py: 1.5 }}>
              アカウント作成
            </Button>
          </Link>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 3, mt: 8 }}>
          <Card elevation={2}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom color="primary">
                📚 フラッシュカード
              </Typography>
              <Typography variant="body2" color="textSecondary">
                スワイプで直感的に学習。正解・不正解を記録して効率的に覚えられます。
              </Typography>
            </CardContent>
          </Card>
          <Card elevation={2}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom color="primary">
                ✅ 選択問題
              </Typography>
              <Typography variant="body2" color="textSecondary">
                選択肢から答えを選んで学習。正答率を記録して苦手分野を把握できます。
              </Typography>
            </CardContent>
          </Card>
          <Card elevation={2}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom color="primary">
                👥 共有機能
              </Typography>
              <Typography variant="body2" color="textSecondary">
                友達と単語帳を共有してランキングで競い合い。みんなで勉強をもっと楽しく。
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Container>
  );
}
