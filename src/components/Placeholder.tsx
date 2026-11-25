import { Empty } from './ui';
export function Placeholder({ name }: { name: string }) {
  return <div className="page"><div className="card"><Empty icon="settings" title={name}>Ecran în construcție.</Empty></div></div>;
}
