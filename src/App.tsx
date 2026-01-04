import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Calculadoras from './pages/Calculadoras'
import PerdidaCarga from './pages/calculadoras/PerdidaCarga'
import CaudalRociadores from './pages/calculadoras/CaudalRociadores'
import EspaciamientoDetectores from './pages/calculadoras/EspaciamientoDetectores'
import Normativas from './pages/Normativas'
import NormaViewer from './pages/normativas/NormaViewer'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="calculadoras" element={<Calculadoras />}>
            <Route path="perdida-carga" element={<PerdidaCarga />} />
            <Route path="caudal-rociadores" element={<CaudalRociadores />} />
            <Route path="espaciamiento-detectores" element={<EspaciamientoDetectores />} />
          </Route>
          <Route path="normativas" element={<Normativas />}>
            <Route path=":normaId" element={<NormaViewer />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
