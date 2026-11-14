import { Route, Routes } from 'react-router'
import { HomePage } from '@/pages/home'
import { EmployeesPage } from '@/pages/employees'
import { LoginPage } from '@/pages/login'
import { NotFoundPage } from '@/pages/not-found'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/employees" element={<EmployeesPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

