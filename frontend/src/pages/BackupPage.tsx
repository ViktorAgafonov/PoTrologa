import { useEffect, useState } from 'react'
import {
  Box, Typography, Button, Table, TableHead, TableRow, TableCell,
  TableBody, Paper, Alert, IconButton,
} from '@mui/material'
import DownloadIcon from '@mui/icons-material/Download'
import AddIcon from '@mui/icons-material/Add'
import { backupApi } from '../services/api'

export default function BackupPage() {
  const [backups, setBackups] = useState<any[]>([])
  const [message, setMessage] = useState('')

  const fetchBackups = () => {
    backupApi.getAll().then((res) => setBackups(res.data || []))
  }

  useEffect(() => { fetchBackups() }, [])

  const handleCreate = async () => {
    setMessage('')
    try {
      await backupApi.create('manual')
      setMessage('Бэкап создан')
      fetchBackups()
    } catch (err: any) {
      setMessage(err.message)
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Резервные копии</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>
          Создать бэкап
        </Button>
      </Box>

      {message && <Alert severity="info" sx={{ mb: 2 }}>{message}</Alert>}

      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Файл</TableCell>
              <TableCell>Размер</TableCell>
              <TableCell>Дата</TableCell>
              <TableCell align="center">Скачать</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {backups.map((b: any) => (
              <TableRow key={b.filename}>
                <TableCell>{b.filename}</TableCell>
                <TableCell>{(b.size / 1024).toFixed(1)} КБ</TableCell>
                <TableCell>{b.created}</TableCell>
                <TableCell align="center">
                  <IconButton href={backupApi.download(b.filename)} size="small">
                    <DownloadIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  )
}
