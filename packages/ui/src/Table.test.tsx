import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Table } from './Table'

type Row = { id: string; name: string }
const columns = [
  { key: 'id', header: '編號', render: (r: Row) => r.id },
  { key: 'name', header: '名稱', render: (r: Row) => <strong>{r.name}</strong> },
]

describe('Table', () => {
  it('依 columns 渲染表頭與每一列', () => {
    render(<Table columns={columns} rows={[{ id: '1', name: 'A' }, { id: '2', name: 'B' }]} rowKey={(r) => r.id} />)
    expect(screen.getAllByRole('columnheader').map((th) => th.textContent)).toEqual(['編號', '名稱'])
    expect(screen.getAllByRole('row')).toHaveLength(3)
    expect(screen.getByText('B').tagName).toBe('STRONG')
  })

  it('沒有資料時顯示 empty 內容', () => {
    render(<Table columns={columns} rows={[]} rowKey={(r) => r.id} empty="沒有資料" />)
    expect(screen.getByText('沒有資料')).toBeTruthy()
  })
})
