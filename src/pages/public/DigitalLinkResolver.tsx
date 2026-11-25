import { useLocation } from 'react-router-dom';
import { useDB } from '../../api/store';
import { parseDigitalLinkPath, toGtin14 } from '../../lib/gs1';
import { NotAvailable, PublicView } from './_PublicView';
import { usePublicParams } from './_usePublicParams';

/** GS1 Digital Link: /01/{gtin14}[/10/{lot}][/21/{serial}] → model or unit passport. */
export default function DigitalLinkResolver() {
  const loc = useLocation();
  const { lang, setLang, grant } = usePublicParams();
  const parsed = parseDigitalLinkPath(loc.pathname);
  const passport = useDB(d => parsed ? d.passports.find(p => p.status !== 'trashed' && p.gtin && toGtin14(p.gtin) === parsed.gtin14) : undefined);
  const session = useDB(d => d.session);
  const unit = useDB(d => (passport && parsed?.serial ? d.units.find(u => u.passportId === passport.id && u.serial === parsed.serial) : undefined));

  if (!parsed || !passport) return <NotAvailable lang={lang} />;
  const live = passport.status === 'published';
  if (!live && !session) return <NotAvailable lang={lang} />;
  const note = parsed.serial && !unit ? (lang === 'en' ? 'The scanned serial is not registered. Showing the model page.' : 'Seria scanată nu e înregistrată. Afișăm pagina modelului.') : undefined;
  return <PublicView passport={passport} unit={unit} grant={grant} lang={lang} onLang={setLang} preview={!live} note={note} />;
}
