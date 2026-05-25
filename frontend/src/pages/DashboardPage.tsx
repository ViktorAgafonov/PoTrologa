import { useEffect, useState } from 'react'
import { Grid, Card, CardContent, Typography, Box, Paper } from '@mui/material'
import WarningIcon from '@mui/icons-material/Warning'
import ErrorIcon from '@mui/icons-material/Error'
import BuildIcon from '@mui/icons-material/Build'
import DeleteIcon from '@mui/icons-material/Delete'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { instrumentApi } from '../services/api'

const COLORS = ['#1565c0', '#f57c00', '#43a047', '#7b1fa2', '#d32f2f', '#00838f', '#fbc02d', '#6d4c41']

interface DashboardStats {
  total: number
  expired: number
  verMonth: number
  ver14: number
  repair: number
  writeoff: number
  byType: { typeName: string; count: number }[]
  byOrg: { factory: string; workshop: string; count: number }[]
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)

  useEffect(() => {
    instrumentApi.dashboard().then((res) => setStats(res.data))
  }, [])

  if (!stats) return <Typography>Загрузка...</Typography>

  const widgets = [
    { label: 'Всего СИ', value: stats.total, color: '#1565c0', icon: <CheckCircleIcon /> },
    { label: 'Просрочено', value: stats.expired, color: '#d32f2f', icon: <ErrorIcon /> },
    { label: 'Поверка через 14 дн.', value: stats.ver14, color: '#f57c00', icon: <WarningIcon /> },
    { label: 'Поверка через 30 дн.', value: stats.verMonth, color: '#fbc02d', icon: <WarningIcon /> },
    { label: 'В ремонте', value: stats.repair, color: '#7b1fa2', icon: <BuildIcon /> },
    { label: 'Списано', value: stats.writeoff, color: '#616161', icon: <DeleteIcon /> },
  ]

  const typeData = (stats.byType || []).map((t) => ({
    name: t.typeName || 'Без типа',
    value: Number(t.count),
  }))

  const orgData = (stats.byOrg || []).map((o) => ({
    name: [o.factory, o.workshop].filter(Boolean).join(' / ') || 'Не указано',
    count: Number(o.count),
  }))

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Панель мониторинга</Typography>
      <Grid container spacing={2}>
        {widgets.map((w) => (
          <Grid key={w.label} size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
            <Card sx={{ borderTop: `4px solid ${w.color}` }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Box sx={{ color: w.color, mb: 1 }}>{w.icon}</Box>
                <Typography variant="h4">{w.value}</Typography>
                <Typography variant="body2" color="text.secondary">{w.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2} sx={{ mt: 2 }}>
        {/* Типы СИ — круговая диаграмма */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Типы СИ</Typography>
            {typeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {typeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Typography color="text.secondary">Нет данных</Typography>
            )}
          </Paper>
        </Grid>

        {/* По подразделениям — столбчатая */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>По подразделениям</Typography>
            {orgData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={orgData}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#1565c0" name="Кол-во СИ" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Typography color="text.secondary">Нет данных</Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}
