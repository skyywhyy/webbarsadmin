import { Route, Routes } from 'react-router'
import { HomePage } from '@/pages/home'
import { KnowledgePage } from '@/pages/knowledge'
import { LoginPage } from '@/pages/login'
import { NotFoundPage } from '@/pages/not-found'
import { SupportTeamPage } from '@/pages/support-team'
import { AdminLayout } from '../ui/admin-layout'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AdminLayout />}>
        <Route index element={<HomePage />} />
        <Route path="employees" element={<SupportTeamPage />} />
        <Route path="knowledge" element={<KnowledgePage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
