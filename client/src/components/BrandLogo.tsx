import { useEffect, useState } from 'react';

const API = import.meta.env.VITE_API_BASE_URL ?? '';

/** Renders the configured logo image if a logo URL is set; otherwise the text wordmark passed as children. */
export function BrandLogo({ children, className }: { children: React.ReactNode; className?: string }) {
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    fetch(`${API}/api/branding`).then(r => r.ok ? r.json() : null).then(b => { if (b?.logoUrl) setLogoUrl(b.logoUrl); }).catch(() => {});
  }, []);
  if (logoUrl && !failed) {
    return <img src={logoUrl} alt="Logo" className={className ?? 'h-7 w-auto'} onError={() => setFailed(true)} />;
  }
  return <>{children}</>;
}
