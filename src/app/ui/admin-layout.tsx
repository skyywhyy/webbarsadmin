import { Outlet } from 'react-router'
import { Sidebar } from '@/entities/sidebar'
import styles from './admin-layout.module.css'

export function AdminLayout() {
  return (
    <div className={styles.layout}>
      <Sidebar />
      <Outlet />
    </div>
  )
}
