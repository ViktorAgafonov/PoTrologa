import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Typography, TextField, Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, Paper, Chip, IconButton, TablePagination,
  Button, TableSortLabel, FormControl, InputLabel, Select, MenuItem,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import { instrumentApi, referenceApi } from '../services/api'

const BASE = '/api/v1'

const statusColors: Record<string, 'success' | 'error' | 'warning' | 'info' | 'default'> = {
  'Действующее': 'success',
  'Просрочено': 'error',
  'Поверка через 14 дн.': 'warning',
  'Поверка через 30 дн.': 'info',
  'В ремонте': 'default',
  'Списано': 'default',
}

// Колонки с поддержкой сортировки
const columns: { id: string; label: string; sortable: boolean }[] = [
  { id: 'inventoryNumber', label: 'Инв. №', sortable: true },
  { id: 'name', label: 'Название', sortable: true },
  { id: 'type', label: 'Тип', sortable: true },
  { id: 'organization', label: 'Участок', sortable: true },
  { id: 'status', label: 'Статус', sortable: true },
  { id: 'lastVerificationDate', label: 'Пред. поверка', sortable: true },
  { id: 'nextVerificationDate', label: 'След. поверка', sortable: true },
]

const statusOptions = ['Действующее', 'Просрочено', 'Поверка через 14 дн.', 'Поверка через 30 дн.', 'В ремонте', 'Списано']

export default function InstrumentListPage() {
  const [items, setItems] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('inventoryNumber')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  // Фильтры
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [types, setTypes] = useState<any[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    referenceApi.getTypes().then((res) => setTypes(res.data || []))
  }, [])

  const fetchData = (p: number, s: string, sb: string, so: string) => {
    const params: Record<string, string> = {
      page: String(p + 1), limit: '25',
      sortBy: sb, sortOrder: so.toUpperCase(),
    }
    if (s) params.search = s
    if (filterType) params.type = filterType
    if (filterStatus) params.status = filterStatus
    instrumentApi.getAll(params).then((res) => {
      setItems(res.items)
      setTotal(res.total)
    })
  }

  useEffect(() => { fetchData(page, search, sortBy, sortOrder) }, [page, search, sortBy, sortOrder, filterType, filterStatus])

  const handleSort = (col: string) => {
    if (sortBy === col) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(col)
      setSortOrder('asc')
    }
    setPage(0)
  }

  // Отображение значения ячейки
  const cellValue = (item: any, colId: string) => {
    switch (colId) {
      case 'inventoryNumber': return item.inventoryNumber
      case 'name': return item.name
      case 'type': return item.type?.name || '—'
      case 'organization': return item.organization
        ? [item.organization.workshop, item.organization.section].filter(Boolean).join(' → ')
        : '—'
      case 'status': return (
        <Chip label={item.status} size="small" color={statusColors[item.status] || 'default'} />
      )
      case 'lastVerificationDate': return item.lastVerificationDate || '—'
      case 'nextVerificationDate': return item.nextVerificationDate || '—'
      default: return ''
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Средства измерения</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={() => window.open(`${BASE}/instruments/export`, '_blank')}>
            Экспорт
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/instruments/new')}>
            Добавить
          </Button>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField
          label="Поиск" size="small" sx={{ flex: 1, minWidth: 200 }}
          value={search} onChange={(e) => { setSearch(e.target.value); setPage(0) }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Тип</InputLabel>
          <Select value={filterType} label="Тип" onChange={(e) => { setFilterType(e.target.value); setPage(0) }}>
            <MenuItem value="">Все</MenuItem>
            {types.map((t: any) => <MenuItem key={t.id} value={String(t.id)}>{t.name}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Статус</InputLabel>
          <Select value={filterStatus} label="Статус" onChange={(e) => { setFilterStatus(e.target.value); setPage(0) }}>
            <MenuItem value="">Все</MenuItem>
            {statusOptions.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell key={col.id}>
                  {col.sortable ? (
                    <TableSortLabel
                      active={sortBy === col.id}
                      direction={sortBy === col.id ? sortOrder : 'asc'}
                      onClick={() => handleSort(col.id)}
                    >
                      {col.label}
                    </TableSortLabel>
                  ) : col.label}
                </TableCell>
              ))}
              <TableCell align="center">Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id} hover>
                {columns.map((col) => (
                  <TableCell key={col.id}>{cellValue(item, col.id)}</TableCell>
                ))}
                <TableCell align="center">
                  <IconButton size="small" onClick={() => navigate(`/instruments/${item.id}`)}>
                    <EditIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length + 1} align="center">Нет записей</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div" count={total} page={page} rowsPerPage={25}
        onPageChange={(_, p) => setPage(p)} rowsPerPageOptions={[25]}
      />
    </Box>
  )
}
