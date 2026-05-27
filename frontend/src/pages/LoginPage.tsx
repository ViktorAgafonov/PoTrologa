import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Card, CardContent, TextField, Button, Typography, Alert } from '@mui/material'
import { useAuth } from '../hooks/useAuth'

export default function LoginPage() {
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login: doLogin } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await doLogin(login, password)
      navigate('/')
    } catch (err: any) {
      setError(err.message || 'Ошибка входа')
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
      <Card sx={{ minWidth: 360, p: 2 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom align="center">Помощник Метролога</Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            Помощник метролога
          </Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <form onSubmit={handleSubmit}>
            <TextField
              label="Логин" fullWidth margin="normal"
              value={login} onChange={(e) => setLogin(e.target.value)}
              autoFocus
            />
            <TextField
              label="Пароль" type="password" fullWidth margin="normal"
              value={password} onChange={(e) => setPassword(e.target.value)}
            />
            <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }}>
              Войти
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  )
}
