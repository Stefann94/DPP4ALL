import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { ToastProvider } from './components/ui';
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const Onboarding = lazy(() => import('./pages/auth/Onboarding'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const PassportList = lazy(() => import('./pages/passports/PassportList'));
const NewPassport = lazy(() => import('./pages/passports/NewPassport'));
const PassportLayout = lazy(() => import('./pages/passports/PassportLayout'));
const EditorTab = lazy(() => import('./pages/passports/EditorTab'));
const VersionsTab = lazy(() => import('./pages/passports/VersionsTab'));
const DocumentsTab = lazy(() => import('./pages/passports/DocumentsTab'));
const SettingsTab = lazy(() => import('./pages/passports/SettingsTab'));
const QrTab = lazy(() => import('./pages/passports/QrTab'));
const PassportAccessTab = lazy(() => import('./pages/passports/PassportAccessTab'));
const PassportStatsTab = lazy(() => import('./pages/passports/PassportStatsTab'));
const UnitsTab = lazy(() => import('./pages/units/UnitsTab'));
const UnitDetail = lazy(() => import('./pages/units/UnitDetail'));
const AllUnits = lazy(() => import('./pages/units/AllUnits'));
const Telemetry = lazy(() => import('./pages/units/Telemetry'));
const PublicPassport = lazy(() => import('./pages/public/PublicPassport'));
const DigitalLinkResolver = lazy(() => import('./pages/public/DigitalLinkResolver'));
const Import = lazy(() => import('./pages/data/Import'));
const Export = lazy(() => import('./pages/data/Export'));
const Labels = lazy(() => import('./pages/data/Labels'));
const Documents = lazy(() => import('./pages/data/Documents'));
const AccessAdmin = lazy(() => import('./pages/access/AccessAdmin'));
const AccessRequestForm = lazy(() => import('./pages/access/AccessRequestForm'));
const Integrations = lazy(() => import('./pages/Integrations'));
const Statistics = lazy(() => import('./pages/Statistics'));
const Activity = lazy(() => import('./pages/Activity'));
const Deadlines = lazy(() => import('./pages/Deadlines'));
const Settings = lazy(() => import('./pages/settings/Settings'));
const Guide = lazy(() => import('./pages/Guide'));
const Home = lazy(() => import('./site/Home'));
const NavbarMockups = lazy(() => import('./site/NavbarMockups'));
const HumanMockups = lazy(() => import('./site/HumanMockups'));
const BlueMockups = lazy(() => import('./site/BlueMockups'));
const ButtonMockups = lazy(() => import('./site/ButtonMockups'));
const LogoMockups = lazy(() => import('./site/LogoMockups'));
const SimpleButtonMockups = lazy(() => import('./site/SimpleButtonMockups'));
import { Empty } from './components/ui';

function NotFound() {
  return <div className="page narrow"><div className="card"><Empty icon="search" title="Pagina nu există" action={<a className="btn" href="/panou">Înapoi la panou</a>}>Verifică adresa sau folosește căutarea (Ctrl K).</Empty></div></div>;
}

const Loading = () => <div className="page"><div className="faint small">Se încarcă…</div></div>;
const s = (el: ReactNode) => <Suspense fallback={<Loading />}>{el}</Suspense>;

/**
 * Route map. Romanian paths. Public routes (no login): /login, /inregistrare, /p/:id, /01/*, /cerere-acces.
 * Passport workspace: /pasapoarte/:id/<tab> — tabs: (index)=editor, baterii, baterii/:unitId, documente, versiuni, qr, acces, statistici, setari.
 */
const router = createBrowserRouter([
  { path: '/login', element: s(<Login />) },
  { path: '/inregistrare', element: s(<Register />) },
  { path: '/bun-venit', element: s(<Onboarding />) },
  { path: '/p/:id', element: s(<PublicPassport />) },
  { path: '/01/*', element: s(<DigitalLinkResolver />) },
  { path: '/cerere-acces', element: s(<AccessRequestForm />) },
  {
    element: <AppShell />,
    children: [
      { path: '/panou', element: s(<Dashboard />) },
      { path: '/pasapoarte', element: s(<PassportList />) },
      { path: '/pasapoarte/nou', element: s(<NewPassport />) },
      {
        path: '/pasapoarte/:id', element: s(<PassportLayout />),
        children: [
          { index: true, element: s(<EditorTab />) },
          { path: 'baterii', element: s(<UnitsTab />) },
          { path: 'baterii/:unitId', element: s(<UnitDetail />) },
          { path: 'documente', element: s(<DocumentsTab />) },
          { path: 'versiuni', element: s(<VersionsTab />) },
          { path: 'qr', element: s(<QrTab />) },
          { path: 'acces', element: s(<PassportAccessTab />) },
          { path: 'statistici', element: s(<PassportStatsTab />) },
          { path: 'setari', element: s(<SettingsTab />) },
        ],
      },
      { path: '/baterii', element: s(<AllUnits />) },
      { path: '/telemetrie', element: s(<Telemetry />) },
      { path: '/import', element: s(<Import />) },
      { path: '/export', element: s(<Export />) },
      { path: '/documente', element: s(<Documents />) },
      { path: '/etichete', element: s(<Labels />) },
      { path: '/acces', element: s(<AccessAdmin />) },
      { path: '/integrari', element: s(<Integrations />) },
      { path: '/statistici', element: s(<Statistics />) },
      { path: '/activitate', element: s(<Activity />) },
      { path: '/termene', element: s(<Deadlines />) },
      { path: '/ghid', element: s(<Guide />) },
      { path: '/setari', element: s(<Settings />) },
      { path: '/setari/:section', element: s(<Settings />) },
      { path: '*', element: <NotFound /> },
    ],
  },
  { path: '/', element: s(<Home />) },
  { path: '/machete/navbar', element: s(<NavbarMockups />) },
  { path: '/machete/v3', element: s(<HumanMockups />) },
  { path: '/machete/v4', element: s(<BlueMockups />) },
  { path: '/machete/butoane', element: s(<ButtonMockups />) },
  { path: '/machete/logo', element: s(<LogoMockups />) },
  { path: '/machete/butoane-2', element: s(<SimpleButtonMockups />) },
  { path: '/home', element: <Navigate to="/" replace /> },
]);

export default function App() {
  return <ToastProvider><RouterProvider router={router} /></ToastProvider>;
}
