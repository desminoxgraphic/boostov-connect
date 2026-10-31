import Link from 'next/link';
import BrandMark from '@/components/BrandMark';

/** Top bar of the public site (home page and sign-in page). */
export default function SiteHeader({ minimal = false }: { minimal?: boolean }) {
  return (
    <header className="sticky top-0 z-30 border-b border-black/[0.06] bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Boostov, accueil">
          <BrandMark size={34} priority />
          <span className="text-[19px] font-extrabold tracking-[-0.03em] text-[#0b1530]">
            Boostov<span className="text-[#1d5cff]">.ma</span>
          </span>
        </Link>
        {!minimal && (
          <nav className="hidden items-center gap-7 text-[14px] font-medium text-[#3a4357] md:flex">
            <a href="/#fonctionnement" className="hover:text-[#0b1530]">Fonctionnement</a>
            <a href="/#avantages" className="hover:text-[#0b1530]">Avantages</a>
            <a href="/#statistiques" className="hover:text-[#0b1530]">Statistiques</a>
            <a href="/#questions" className="hover:text-[#0b1530]">Questions</a>
          </nav>
        )}
        <div className="flex items-center gap-2">
          <Link href="/connexion" className="rounded-full px-3.5 py-2 text-[14px] font-semibold text-[#0b1530] hover:bg-black/[0.04]">
            Se connecter
          </Link>
          {!minimal && (
            <a
              href="/#acces"
              className="hidden rounded-full bg-[#0b1530] px-4 py-2 text-[14px] font-semibold text-white hover:bg-[#1d2a4d] sm:inline-flex"
            >
              Demander un accès
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
