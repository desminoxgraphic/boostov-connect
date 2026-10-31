import Link from 'next/link';
import BrandMark from '@/components/BrandMark';

/** Top bar of the public site (home page and sign-in page). */
export default function SiteHeader({ minimal = false }: { minimal?: boolean }) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#070d1f]/85 text-white backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Boostov, accueil">
          <span className="grid h-9 w-9 place-items-center rounded-[11px] bg-white">
            <BrandMark size={28} priority />
          </span>
          <span className="text-[19px] font-extrabold tracking-[-0.03em]">
            boostov<span className="text-[#4d8bff]">.ma</span>
          </span>
        </Link>
        {!minimal && (
          <nav className="hidden items-center gap-6 whitespace-nowrap text-[14px] font-medium text-white/70 lg:flex">
            <a href="/#kit" className="hover:text-white">Le Starter Kit</a>
            <a href="/#etapes" className="hover:text-white">Comment ça marche</a>
            <a href="/#espace" className="hover:text-white">La plateforme</a>
            <a href="/#faq" className="hover:text-white">Questions</a>
          </nav>
        )}
        <div className="flex items-center gap-2">
          <Link href="/connexion" className="whitespace-nowrap rounded-full px-3.5 py-2 text-[14px] font-semibold text-white/85 hover:bg-white/10 hover:text-white">
            Espace revendeur
          </Link>
          {!minimal && (
            <a
              href="/#devenir-revendeur"
              className="hidden whitespace-nowrap rounded-full bg-[#1d5cff] px-4 py-2 text-[14px] font-semibold text-white hover:bg-[#3a72ff] sm:inline-flex"
            >
              Devenir revendeur
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
