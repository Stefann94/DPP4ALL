import { useOutletContext } from 'react-router-dom';
import type { Passport } from '../../types';

/** Passport of the current /pasapoarte/:id workspace (provided by PassportLayout's <Outlet context>). */
export function usePassportCtx(): { passport: Passport } {
  return useOutletContext<{ passport: Passport }>();
}
