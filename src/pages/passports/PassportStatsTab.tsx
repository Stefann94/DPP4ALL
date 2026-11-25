import { useParams } from 'react-router-dom';
import { ScanStats } from '../_ScanStats';
import '../../styles/org.css';

export default function PassportStatsTab() {
  const { id = '' } = useParams();
  return <ScanStats passportId={id} />;
}
