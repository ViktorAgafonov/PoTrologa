import { useEffect, useState } from 'react'
import {
  Box, Typography, Table, TableHead, TableRow, TableCell, TableBody,
  Paper, Button, TextField, Dialog, DialogTitle, DialogContent,
  DialogActions, IconButton, Alert,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import DownloadIcon from '@mui/icons-material/Download'
import { templateApi } from '../services/api'

export default function TemplateEditorPage() {
  const [templates, setTemplates] = useState<any[]>([])
  const [editDlg, setEditDlg] = useState(false)
  const [editFilename, setEditFilename] = useState('')
  const [editContent, setEditContent] = useState('')
  const [error, setError] = useState('')

  const load = () => {
    templateApi.getAll().then((res) => setTemplates(res.data || []))
  }

  useEffect(() => { load() }, [])

  const handleUpload = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.txt,.html,.docx'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      await templateApi.upload(file)
      load()
    }
    input.click()
  }

  const handleEdit = async (filename: string) => {
    setError('')
    const content = await templateApi.getContent(filename)
    setEditFilename(filename)
    setEditContent(content)
    setEditDlg(true)
  }

  const handleSave = async () => {
    setError('')
    try {
      await templateApi.update(editFilename, editContent)
      setEditDlg(false)
      load()
    } catch (err: any) {
      setError(err.message || 'Ошибка сохранения')
    }
  }

  const handleDelete = async (filename: string) => {
    if (!confirm(`Удалить шаблон "${filename}"?`)) return
    await templateApi.remove(filename)
    load()
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Шаблоны актов</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleUpload}>Загрузить шаблон</Button>
      </Box>

      <Alert severity="info" sx={{ mb: 2 }}>
        Переменные шаблона: {'{{procedureNumber}}'} {'{{date}}'} {'{{reason}}'} {'{{instrumentTable}}'}
      </Alert>

      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Файл</TableCell>
              <TableCell>Размер</TableCell>
              <TableCell>Изменён</TableCell>
              <TableCell align="right">Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {templates.map((t: any) => (
              <TableRow key={t.filename}>
                <TableCell>{t.filename}</TableCell>
                <TableCell>{Math.round(t.size / 1024)} КБ</TableCell>
                <TableCell>{new Date(t.modified).toLocaleDateString('ru-RU')}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => window.open(templateApi.download(t.filename), '_blank')}>
                    <DownloadIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleEdit(t.filename)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(t.filename)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {templates.length === 0 && (
              <TableRow><TableCell colSpan={4} align="center">Нет шаблонов</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={editDlg} onClose={() => setEditDlg(false)} maxWidth="md" fullWidth>
        <DialogTitle>Редактирование: {editFilename}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
          <TextField
            fullWidth multiline rows={20} margin="dense"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            sx={{ fontFamily: 'monospace' }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDlg(false)}>Отмена</Button>
          <Button variant="contained" onClick={handleSave}>Сохранить</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
