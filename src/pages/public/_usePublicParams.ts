import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { access } from '../../api/actions';
import { useDB } from '../../api/store';
import type { Lang } from './_PublicView';

/** ?lang= and ?token= handling shared by the public routes. */
export function usePublicParams() {
  const [params, setParams] = useSearchParams();
  const lang: Lang = params.get('lang') === 'en' ? 'en' : 'ro';
  const token = params.get('token');
  const requests = useDB(d => d.accessRequests);
  const grant = useMemo(() => access.grantFor(token), [token, requests]); // eslint-disable-line react-hooks/exhaustive-deps
  const setLang = (l: Lang) => { const n = new URLSearchParams(params); n.set('lang', l); setParams(n, { replace: true }); };
  return { params, lang, setLang, token, grant };
}
