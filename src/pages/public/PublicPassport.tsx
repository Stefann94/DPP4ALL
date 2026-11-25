import { useParams } from 'react-router-dom';
import { useDB } from '../../api/store';
import { NotAvailable, PublicView } from './_PublicView';
import { usePublicParams } from './_usePublicParams';

/** /p/:id?unit=SERIAL&token=TOKEN&lang=ro|en */
export default function PublicPassport() {
  const { id } = useParams();
  const { params, lang, setLang, grant } = usePublicParams();
  const passport = useDB(d => d.passports.find(p => p.id === id));
  const session = useDB(d => d.session);
  const serial = params.get('unit');
  const unit = useDB(d => (serial ? d.units.find(u => u.passportId === id && u.serial === serial) : undefined));

  if (!passport) return <NotAvailable lang={lang} />;
  const live = passport.status === 'published';
  if (!live && !session) return <NotAvailable lang={lang} />;
  const note = serial && !unit ? (lang === 'en' ? 'The scanned serial is not registered. Showing the model page.' : 'Seria nu e înregistrată. Afișăm pagina modelului.') : undefined;
  return <PublicView passport={passport} unit={unit} grant={grant} lang={lang} onLang={setLang} preview={!live} note={note} />;
}
