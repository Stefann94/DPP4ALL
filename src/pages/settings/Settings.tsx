import { NavLink, useNavigate, useParams } from 'react-router-dom';
import { Icon, PageHead } from '../../components/ui';
import { BillingSection, BrandSection, DemoSection, DomainSection, LanguagesSection, ManufacturerSection, NotificationsSection, OrgSection, ProfileSection, TeamSection } from './_sections';
import '../../styles/org.css';

const SECTIONS = [
  { id: 'organizatie', label: 'Organizație', icon: 'settings', C: OrgSection },
  { id: 'producator', label: 'Producător', icon: 'passport', C: ManufacturerSection },
  { id: 'brand', label: 'Brand', icon: 'eye', C: BrandSection },
  { id: 'limbi', label: 'Limbi', icon: 'globe', C: LanguagesSection },
  { id: 'domeniu', label: 'Domeniu QR', icon: 'qr', C: DomainSection },
  { id: 'echipa', label: 'Echipă', icon: 'users', C: TeamSection },
  { id: 'plan', label: 'Plan și facturare', icon: 'chart', C: BillingSection },
  { id: 'notificari', label: 'Notificări', icon: 'bell', C: NotificationsSection },
  { id: 'profil', label: 'Profil', icon: 'users', C: ProfileSection },
  { id: 'demo', label: 'Date demo', icon: 'refresh', C: DemoSection },
] as const;

export default function Settings() {
  const { section = 'organizatie' } = useParams();
  const nav = useNavigate();
  const cur = SECTIONS.find(s => s.id === section) ?? SECTIONS[0];
  const C = cur.C;
  return (
    <div className="page">
      <PageHead title="Setări" />
      <div className="settings">
        <nav className="settings-nav" aria-label="Secțiuni setări">
          {SECTIONS.map(s => <NavLink key={s.id} to={`/setari/${s.id}`} className={() => (s.id === cur.id ? 'active' : '')}><Icon name={s.icon} />{s.label}</NavLink>)}
        </nav>
        <select className="select settings-select" aria-label="Secțiune" value={cur.id} onChange={e => nav(`/setari/${e.target.value}`)}>
          {SECTIONS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <div className="stack lg" style={{ minWidth: 0 }}>
          <h2>{cur.label}</h2>
          <C key={cur.id} />
        </div>
      </div>
    </div>
  );
}
