import { createHashRouter } from 'react-router-dom'
import { Layout } from './components/Layout'
import { DisputaPage } from './features/disputa/DisputaPage'
import { AdminPage } from './features/admin/AdminPage'
import { CursoPage } from './features/curso/CursoPage'
import { CodigoPage } from './features/codigo/CodigoPage'

// HashRouter (não BrowserRouter): GitHub Pages não tem servidor para
// redirecionar /curso ou /admin para o index.html — com hash (#/curso),
// tudo é resolvido no cliente e não depende de configuração de servidor.
export const router = createHashRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <DisputaPage /> },
      { path: 'admin', element: <AdminPage /> },
      { path: 'curso', element: <CursoPage /> },
      { path: 'codigo', element: <CodigoPage /> },
    ],
  },
])
