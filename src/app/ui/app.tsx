import { BrowserRouter } from 'react-router'
import { AppRoutes } from '../routes'
import '@/assets/golos.css'
import '../styles/index.css'

export function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
