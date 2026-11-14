import { Navigate, Outlet } from 'react-router'
import { getToken } from '@/shared/api/client'
import { Sidebar } from '@/entities/sidebar'
import styles from './admin-layout.module.css'

export function AdminLayout() {
  if (!getToken()) return <Navigate to="/login" replace />

  return (
    <div className={styles.layout}>
      <Sidebar />
      <Outlet />
    </div>
  )
}

