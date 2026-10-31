import type { Metadata } from 'next';
import Link from 'next/link';
import {
  BarChart3,
  Check,
  CreditCard,
  GraduationCap,
  Images,
  LayoutDashboard,
  MapPin,
  MessageCircle,
  Moon,
  Nfc,
  Phone,
  QrCode,
  UserPlus,
} from 'lucide-react';
import SiteHeader from '@/components/site/SiteHeader';
import AccessRequestForm from '@/components/site/AccessRequestForm';
import BrandMark from '@/components/BrandMark';
import { BOOSTOV_SUPPORT_WHATSAPP, buildWhatsAppUrl } from '@/lib/app-url';

export const metadata: Metadata = {
  title: 'Boostov · Devenez revendeur de cartes de visite NFC',
  description:
    'Le Starter Kit Boostov : cartes NFC, plateforme et formation pour vendre des cartes de visite digitales à vos clients au Maroc.',
};

const KIT = [
  {
    icon: CreditCard,
    title: 'Des cartes NFC Boostov',
    body: 'Prêtes à programmer pour vos clients. Un tap ouvre leur carte digitale, sans application.',
  },
  {
    icon: LayoutDashboard,
    title: 'Votre espace revendeur',
    body: 'Créez, modifiez et suivez les cartes de tous vos clients depuis votre téléphone ou votre ordinateur.',
  },
  {
    icon: GraduationCap,
    title: 'Une formation pour démarrer',
    body: 'Créer une carte, programmer la puce avec NFC Tools, livrer au client : vous êtes prêt dès le premier jour.',
  },
];

const STEPS = [
  { title: 'Recevez votre kit', body: 'Vos cartes NFC, votre e-mail et votre mot de passe pour l’espace revendeur.' },
  { title: 'Créez la carte du client', body: 'Logo, bannière, couleurs, contacts, réseaux et photos. C’est en ligne tout de suite.' },
  { title: 'Programmez la puce', body: 'Copiez le lien de la carte dans NFC Tools et posez la carte sur le téléphone.' },
  { title: 'Livrez et suivez', body: 'Votre client partage son contact d’un tap. Vous suivez les taps de chaque carte.' },
];

const CLIENT_FEATURES = [
  { icon: UserPlus, title: 'Enregistrer le contact', body: 'Nom, logo, numéros et adresse ajoutés au téléphone en un geste.' },
  { icon: Phone, title: 'Appel et WhatsApp', body: 'Les boutons les plus utilisés, en haut de la carte.' },
  { icon: MapPin, title: 'Itinéraire', body: 'La localisation ouvre Google Maps directement.' },
  { icon: Images, title: 'Galerie photos', body: 'La boutique, les produits ou les réalisations du client.' },
  { icon: Moon, title: 'Aux couleurs du client', body: 'Sa couleur de marque, en mode clair ou sombre.' },
  { icon: BarChart3, title: 'Ses statistiques', body: 'Un lien privé pour voir ses ouvertures et ses clics.' },
];

const AUDIENCE = [
  'Imprimeries et studios graphiques',
  'Agences de communication',
  'Boutiques de téléphonie',
  'Fournisseurs d’objets publicitaires',
  'Freelances et commerciaux',
];

const FAQ = [
  {
    q: 'Qu’est-ce que le Starter Kit Boostov ?',
    a: 'Des cartes NFC Boostov, un accès à votre espace revendeur pour créer les cartes digitales de vos clients, et une formation pour bien démarrer.',
  },
  {
    q: 'Faut-il des compétences techniques ?',
    a: 'Non. Vous remplissez un formulaire pour chaque client, puis vous programmez la puce avec l’application gratuite NFC Tools en quelques secondes.',
  },
  {
    q: 'Combien de clients puis-je gérer ?',
    a: 'Jusqu’à 10 cartes clients pour démarrer. Contactez Boostov pour augmenter votre limite quand votre activité grandit.',
  },
  {
    q: 'Mes clients doivent-ils installer une application ?',
    a: 'Non. La carte s’ouvre dans le navigateur du téléphone, sur iPhone comme sur Android. Un QR code est aussi fourni pour chaque carte.',
  },
  {
    q: 'Et si mon client change de numéro ?',
    a: 'Vous modifiez sa carte dans votre espace. Le lien programmé sur la puce ne change pas : pas besoin de reprogrammer.',
  },
  {
    q: 'Comment je reçois mon accès ?',
    a: 'Envoyez votre demande ci-dessous. Boostov vous contacte, puis vous transmet votre e-mail de connexion et votre mot de passe.',
  },
];

/** A mini version of the real Boostov card: floating logo with orbits. */
function CardPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[330px]">
      <div className="absolute -right-6 -top-6 z-0 hidden h-28 w-44 rotate-6 rounded-[18px] bg-gradient-to-br from-[#1d5cff] to-[#0a2a8c] p-3.5 shadow-2xl sm:block">
        <div className="flex items-center justify-between">
          <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-white"><BrandMark size={22} /></span>
          <Nfc className="h-5 w-5 text-white/80" />
        </div>
        <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.18em] text-white/80">Carte NFC Boostov</p>
      </div>
      <div className="relative z-10 overflow-hidden rounded-[38px] border-[9px] border-[#0d1630] bg-[#0f1424] shadow-[0_40px_90px_-30px_rgba(29,92,255,0.6)]">
        <div className="relative h-36 overflow-hidden bg-gradient-to-br from-[#3a2a12] via-[#b07a2a] to-[#1d5cff]">
          <div className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-white/30" />
          <div className="absolute left-1/2 top-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25" />
          <div className="absolute left-1/2 top-1/2 grid h-20 w-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-[22px] font-black text-[#3a2a12] shadow-[0_0_0_6px_rgba(255,255,255,0.25),0_18px_30px_-10px_rgba(0,0,0,0.6)]">
            AK
          </div>
          <span className="absolute right-3 top-3 rounded-full bg-black/25 px-2 py-0.5 text-[10px] font-semibold text-white/90">Exemple</span>
        </div>
        <div className="-mt-4 rounded-t-[24px] bg-[#121829] px-5 pb-6 pt-5">
          <span className="rounded-full bg-[#b07a2a]/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#e2b25d]">Menuiserie</span>
          <p className="mt-3 text-[20px] font-extrabold tracking-[-0.02em] text-white">Atelier Karim</p>
          <p className="text-[12px] text-white/55">Meubles sur mesure · Sidi Ifni</p>
          <div className="mt-4 flex h-11 items-center justify-between rounded-[14px] bg-gradient-to-r from-[#c48a2c] to-[#9a6516] px-4 text-[13px] font-bold text-white">
            Enregistrer le contact <UserPlus className="h-4 w-4" />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[
              { icon: Phone, t: 'Mobile' },
              { icon: MessageCircle, t: 'WhatsApp' },
            ].map(({ icon: Icon, t }) => (
              <div key={t} className="rounded-[14px] border border-white/10 bg-white/[0.04] p-3">
                <Icon className="h-4 w-4 text-[#e2b25d]" />
                <p className="mt-2 text-[12px] font-bold text-white">{t}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-[10px] text-white/40">
            Powered by <span className="font-bold text-white/70">boostov<span className="text-[#4d8bff]">.ma</span></span>
          </p>
        </div>
      </div>
    </div>
  );
}

/** A mini version of the real reseller dashboard header. */
function DashboardPreview() {
  return (
    <div className="rounded-[26px] border border-white/10 bg-gradient-to-br from-[#12307a] via-[#0d1d4d] to-[#070d1f] p-5 shadow-2xl sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">Espace revendeur</p>
          <p className="mt-1 text-[20px] font-extrabold text-white">Votre activité</p>
        </div>
        <span className="rounded-full bg-[#1d5cff] px-3 py-1.5 text-[12px] font-semibold text-white">+ Nouvelle carte</span>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2.5">
        {['Cartes', 'Taps', '7 jours'].map((label) => (
          <div key={label} className="rounded-[14px] bg-white/10 px-3 py-2.5">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-white/55">{label}</p>
            <div className="mt-2 h-2.5 w-10 rounded-full bg-white/70" />
          </div>
        ))}
      </div>
      <div className="mt-4 space-y-2">
        {['Atelier Karim', 'Café Atlas', 'Salon Nour'].map((name, i) => (
          <div key={name} className="flex items-center gap-3 rounded-[14px] bg-white/[0.06] px-3 py-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-white text-[11px] font-black text-[#0d1d4d]">
              {name.split(' ').map((w) => w[0]).join('')}
            </span>
            <span className="flex-1 text-[13px] font-semibold text-white">{name}</span>
            <QrCode className="h-4 w-4 text-white/50" />
            <span className={`h-2 w-2 rounded-full ${i === 2 ? 'bg-white/30' : 'bg-[#34d399]'}`} />
          </div>
        ))}
      </div>
      <p className="mt-3 text-center text-[10.5px] text-white/40">Aperçu de l’interface</p>
    </div>
  );
}

/** Public home page: Boostov's reseller programme (Starter Kit). */
export default function HomePage() {
  const whatsapp = buildWhatsAppUrl(BOOSTOV_SUPPORT_WHATSAPP, 'Bonjour Boostov, je suis intéressé(e) par le Starter Kit revendeur.');

  return (
    <div className="min-h-dvh bg-white text-[#0b1530]">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden bg-[#070d1f] text-white">
        <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 h-[620px] w-[620px] rounded-full bg-[#1d5cff]/25 blur-[120px]" />
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-[900px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.05]" />
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-[640px] w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-white/[0.06]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-14 sm:px-6 md:grid-cols-[1.15fr_1fr] md:pb-28 md:pt-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[12.5px] font-semibold text-white/80">
              <Nfc className="h-4 w-4 text-[#4d8bff]" /> Programme revendeur Boostov
            </span>
            <h1 className="mt-5 text-[38px] font-extrabold leading-[1.05] tracking-[-0.04em] sm:text-[54px]">
              Vendez des cartes de visite NFC <span className="text-[#4d8bff]">à vos clients.</span>
            </h1>
            <p className="mt-5 max-w-[50ch] text-[16.5px] leading-relaxed text-white/70">
              Avec le Starter Kit Boostov, vous recevez les cartes NFC, la plateforme pour créer la carte digitale de
              chaque client et la formation pour démarrer. Vous vendez, Boostov s’occupe de la technique.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#devenir-revendeur" className="rounded-[14px] bg-[#1d5cff] px-6 py-3.5 text-[15px] font-semibold text-white shadow-[0_14px_30px_-12px_rgba(29,92,255,0.9)] hover:bg-[#3a72ff]">
                Devenir revendeur
              </a>
              <a href={whatsapp} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-[14px] border border-white/20 px-6 py-3.5 text-[15px] font-semibold text-white hover:bg-white/10">
                <MessageCircle className="h-4 w-4 text-[#25D366]" /> Parler sur WhatsApp
              </a>
            </div>
            <ul className="mt-8 grid gap-2.5 text-[14px] text-white/75 sm:grid-cols-2">
              {['Formation incluse', 'Jusqu’à 10 cartes clients pour démarrer', 'Rien à installer pour vos clients', 'Modifiable sans reprogrammer la puce'].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-[#4d8bff]" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <CardPreview />
        </div>
      </section>

      {/* KIT */}
      <section id="kit" className="scroll-mt-20 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="max-w-[22ch] text-[30px] font-extrabold tracking-[-0.03em] sm:text-[42px]">Ce que contient le Starter Kit</h2>
          <p className="mt-3 max-w-[60ch] text-[15.5px] text-[#5b6478]">Tout ce qu’il faut pour proposer la carte de visite NFC à vos clients, dès demain.</p>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {KIT.map(({ icon: Icon, title, body }) => (
              <div key={title} className="group rounded-[24px] border border-[#e6eaf3] p-6 transition hover:border-[#1d5cff]/40 hover:shadow-[0_20px_40px_-28px_rgba(29,92,255,0.6)]">
                <span className="grid h-12 w-12 place-items-center rounded-[14px] bg-[#0b1530] text-white group-hover:bg-[#1d5cff]">
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="mt-5 text-[19px] font-bold">{title}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-[#5b6478]">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STEPS */}
      <section id="etapes" className="scroll-mt-20 bg-[#f4f6fb] py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-[30px] font-extrabold tracking-[-0.03em] sm:text-[42px]">De la commande à la carte livrée</h2>
          <ol className="relative mt-12 grid gap-8 md:grid-cols-4 md:gap-6">
            <span aria-hidden className="absolute left-0 right-0 top-6 hidden h-px bg-[#c9d3ea] md:block" />
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative">
                <span className="relative z-10 grid h-12 w-12 place-items-center rounded-full bg-[#1d5cff] text-[17px] font-extrabold text-white ring-8 ring-[#f4f6fb]">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-[17px] font-bold">{s.title}</h3>
                <p className="mt-1.5 text-[14.5px] leading-relaxed text-[#5b6478]">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* WHAT CLIENTS GET */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="max-w-[24ch] text-[30px] font-extrabold tracking-[-0.03em] sm:text-[42px]">Ce que reçoivent vos clients</h2>
          <p className="mt-3 max-w-[60ch] text-[15.5px] text-[#5b6478]">
            Une carte digitale élégante, à leurs couleurs, qui s’ouvre d’un tap ou d’un scan.
          </p>
          <div className="mt-10 grid gap-x-8 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
            {CLIENT_FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#eef3ff] text-[#1d5cff]">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-[16.5px] font-bold">{title}</h3>
                  <p className="mt-1 text-[14.5px] leading-relaxed text-[#5b6478]">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RESELLER SPACE */}
      <section id="espace" className="scroll-mt-20 bg-[#070d1f] py-16 text-white sm:py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 md:grid-cols-2">
          <div>
            <h2 className="text-[30px] font-extrabold tracking-[-0.03em] sm:text-[42px]">Votre espace revendeur</h2>
            <p className="mt-3 max-w-[48ch] text-[15.5px] text-white/65">Tous vos clients au même endroit, sur téléphone comme sur ordinateur.</p>
            <ul className="mt-7 space-y-3.5 text-[15px]">
              {[
                'Créez la carte d’un client en quelques minutes',
                'Lien et QR code prêts pour chaque carte',
                'Un lien de statistiques privé à partager au client',
                'Modifiez à tout moment, sans reprogrammer la puce',
                'Votre limite de cartes, augmentable avec Boostov',
              ].map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#1d5cff]"><Check className="h-3.5 w-3.5" /></span>
                  <span className="text-white/85">{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <DashboardPreview />
        </div>
      </section>

      {/* AUDIENCE */}
      <section className="py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <h2 className="text-[26px] font-extrabold tracking-[-0.03em] sm:text-[34px]">Pour qui ?</h2>
          <div className="mt-7 flex flex-wrap justify-center gap-2.5">
            {AUDIENCE.map((a) => (
              <span key={a} className="rounded-full border border-[#dbe2f1] bg-white px-4 py-2 text-[14px] font-semibold text-[#2a3450]">
                {a}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 bg-[#f4f6fb] py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-center text-[30px] font-extrabold tracking-[-0.03em] sm:text-[40px]">Vos questions</h2>
          <div className="mt-8 space-y-3">
            {FAQ.map((f) => (
              <details key={f.q} className="group rounded-[18px] border border-[#e1e6f2] bg-white px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15.5px] font-semibold">
                  {f.q}
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#eef3ff] text-[#1d5cff] transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2.5 text-[14.5px] leading-relaxed text-[#5b6478]">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* BECOME A RESELLER */}
      <section id="devenir-revendeur" className="scroll-mt-20 py-16 sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 md:grid-cols-[1fr_1.05fr] md:items-start">
          <div className="md:pt-6">
            <h2 className="text-[30px] font-extrabold tracking-[-0.03em] sm:text-[42px]">Devenez revendeur Boostov</h2>
            <p className="mt-3 max-w-[46ch] text-[15.5px] text-[#5b6478]">
              Laissez vos coordonnées : Boostov vous contacte pour vous présenter le Starter Kit, puis vous transmet vos
              accès à l’espace revendeur.
            </p>
            <a
              href={whatsapp}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex items-center gap-2 rounded-[14px] bg-[#25D366] px-5 py-3 text-[15px] font-semibold text-white hover:brightness-95"
            >
              <MessageCircle className="h-5 w-5" /> Ou écrivez-nous sur WhatsApp
            </a>
            <p className="mt-6 text-[14px] text-[#5b6478]">
              Déjà revendeur ?{' '}
              <Link href="/connexion" className="font-semibold text-[#1d5cff] hover:underline">Accéder à mon espace</Link>
            </p>
          </div>
          <div className="rounded-[26px] border border-[#e6eaf3] bg-white p-6 shadow-[0_30px_70px_-35px_rgba(11,21,48,0.45)] sm:p-8">
            <h3 className="text-[20px] font-extrabold tracking-[-0.02em]">Demande de Starter Kit</h3>
            <div className="mt-5">
              <AccessRequestForm />
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-[#070d1f] py-9 text-white/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-[13.5px] sm:flex-row sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-white"><BrandMark size={22} /></span>
            <span className="font-semibold text-white">boostov<span className="text-[#4d8bff]">.ma</span></span>
            <span>© {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-5">
            <a href={whatsapp} target="_blank" rel="noreferrer" className="hover:text-white">WhatsApp</a>
            <a href="https://boostov.ma" target="_blank" rel="noreferrer" className="hover:text-white">boostov.ma</a>
            <Link href="/connexion" className="hover:text-white">Espace revendeur</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
