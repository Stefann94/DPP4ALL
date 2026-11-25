import { PageHead } from '../components/ui';
import { ScanStats } from './_ScanStats';
import '../styles/org.css';

export default function Statistics() {
  return (
    <div className="page">
      <PageHead title="Statistici scanări" sub="Cine scanează codurile QR, de unde și de pe ce." />
      <ScanStats />
    </div>
  );
}
