import type { Metadata } from 'next';
import Link from 'next/link';
import {
  BarChart3,
  Camera,
  Check,
  EyeOff,
  Globe,
  Link2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  QrCode,
  Smartphone,

  UserPlus,
} from 'lucide-react';
import SiteHeader from '@/components/site/SiteHeader';
import AccessRequestForm from '@/components/site/AccessRequestForm';
import BrandMark from '@/components/BrandMark';

export const metadata: Metadata = {
  title: 'Boostov · Carte de visite NFC et QR code',
  description:
    'Une carte de visite digitale qui s’ouvre d’un tap NFC ou d’un scan de QR code. Sans application, sur iPhone et Android.',
};

const STEPS = [
  {
    title: 'Demandez votre accès',
    body: 'Envoyez votre nom et votre e-mail. Boostov valide chaque compte à la main et vous transmet votre mot de passe.',
  },
  {
    title: 'Créez vos cartes',
    body: 'Logo, bannière, téléphone, WhatsApp, réseaux, adresse, photos. Chaque carte a son lien et son QR code.',
  },
  {
    title: 'Tapez ou faites scanner',
    body: 'La puce NFC ou le QR code ouvre la carte. Un bouton enregistre le contact dans le téléphone en face.',
  },
];

const FEATURES = [
  { icon: Smartphone, title: 'Rien à installer', body: 'La carte s’ouvre dans le navigateur, sur iPhone comme sur Android.' },
  { icon: Link2, title: 'Un lien qui ne change pas', body: 'Modifiez numéro, photos ou réseaux : la puce déjà programmée reste valable.' },
  { icon: UserPlus, title: 'Enregistré en un geste', body: '« Enregistrer le contact » ajoute nom, logo, numéros et adresse au téléphone.' },
  { icon: MapPin, title: 'Facile à trouver', body: 'Itinéraire en un tap et liens vers vos avis, votre site et vos réseaux.' },
  { icon: Camera, title: 'Vos photos', body: 'Une galerie pour montrer la boutique, les produits ou les réalisations.' },
  { icon: EyeOff, title: 'Visible quand vous voulez', body: 'Désactivez une carte en un clic, sans perdre son contenu.' },
];

const METRICS = [
  { label: 'Consultations', body: 'Chaque ouverture de la carte, une fois par visiteur et par demi-heure.' },
  { label: 'Clics par bouton', body: 'Appel, WhatsApp, e-mail, site web, réseaux, itinéraire.' },
  { label: 'Contacts enregistrés', body: 'Les téléchargements du bouton « Enregistrer le contact ».' },
  { label: '7 derniers jours', body: 'L’évolution récente de chaque carte, d’un coup d’œil.' },
];

const FAQ = [
  {
    q: 'La personne en face doit-elle installer une application ?',
    a: 'Non. La carte s’ouvre dans le navigateur du téléphone après un tap NFC ou un scan du QR code.',
  },
  {
    q: 'Quels téléphones lisent la puce NFC ?',
    a: 'Les iPhone récents et la grande majorité des Android. Pour les autres, le QR code ouvre la même carte.',
  },
  {
    q: 'Que se passe-t-il si je change mes coordonnées ?',
    a: 'Vous modifiez la carte et c’est tout : le lien programmé sur la puce reste le même.',
  },
  {
    q: 'Combien de cartes puis-je créer ?',
    a: 'Jusqu’à 10 cartes par compte au départ. Contactez Boostov pour en ajouter.',
  },
  {
    q: 'Quelles données sont collectées sur les visiteurs ?',
    a: 'Seulement des compteurs : ouvertures et clics. Aucune adresse IP n’est conservée et aucun cookie publicitaire n’est utilisé.',
  },
  {
    q: 'Pourquoi faut-il demander un accès ?',
    a: 'Chaque compte est validé par Boostov pour garantir un service de qualité. Vous recevez ensuite votre e-mail et votre mot de passe.',
  },
];

function PhoneMockup() {
  const rows = [
    { icon: Phone, title: 'Appeler', sub: '+212 6 00 00 00 00' },
    { icon: MessageCircle, title: 'WhatsApp', sub: 'Envoyer un message' },
    { icon: Mail, title: 'E-mail', sub: 'contact@exemple.ma' },
    { icon: Globe, title: 'Site web', sub: 'exemple.ma' },
  ];
  return (
    <div className="relative mx-auto w-full max-w-[340px]">
      <div className="absolute -left-16 bottom-10 z-10 hidden w-44 -rotate-12 rounded-[18px] bg-gradient-to-br from-[#0b1530] to-[#1d5cff] p-4 shadow-2xl sm:block">
        <div className="flex items-center justify-between">
          <div className="rounded-[10px] bg-white p-1"><BrandMark size={28} /></div>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">NFC</span>
        </div>
        <p className="mt-8 text-[13px] font-bold text-white">Boostov Connect</p>
      </div>
      <div className="relative rounded-[42px] border-[10px] border-[#0b1530] bg-white shadow-[0_40px_80px_-30px_rgba(11,21,48,0.55)]">
        <div className="h-28 rounded-t-[32px] bg-gradient-to-br from-[#1d5cff] via-[#3d7bff] to-[#0b1530]" />
        <div className="-mt-10 flex flex-col items-center px-5 pb-6">
          <div className="grid h-20 w-20 place-items-center rounded-full border-4 border-white bg-[#0b1530] text-[24px] font-extrabold text-white shadow-lg">
            AK
          </div>
          <p className="mt-3 text-[19px] font-extrabold tracking-[-0.02em] text-[#0b1530]">Atelier Karim</p>
          <p className="text-[12.5px] text-[#5b6478]">Menuiserie sur mesure · Ifni</p>
          <div className="mt-4 grid w-full grid-cols-2 gap-2">
            {rows.map(({ icon: Icon, title, sub }) => (
              <div key={title} className="rounded-[14px] border border-[#e6eaf3] p-2.5">
                <Icon className="h-4 w-4 text-[#1d5cff]" />
                <p className="mt-1.5 text-[12px] font-bold text-[#0b1530]">{title}</p>
                <p className="truncate text-[10.5px] text-[#7a8296]">{sub}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex w-full items-center gap-2">
            <div className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[14px] bg-[#1d5cff] text-[13px] font-bold text-white">
              <UserPlus className="h-4 w-4" /> Enregistrer le contact
            </div>
            <div className="grid h-11 w-11 place-items-center rounded-[14px] border border-[#e6eaf3]">
              <QrCode className="h-5 w-5 text-[#0b1530]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Public home page: what Boostov does, and how to ask for an account. */
export default function HomePage() {
  return (
    <div className="min-h-dvh bg-white text-[#0b1530]">
      <SiteHeader />

      <section className="relative overflow-hidden bg-gradient-to-b from-[#f1f5ff] to-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 md:grid-cols-[1.1fr_1fr] md:pb-24 md:pt-20">
          <div>
            <h1 className="text-[40px] font-extrabold leading-[1.05] tracking-[-0.04em] sm:text-[56px]">
              Un tap.
              <br />
              <span className="text-[#1d5cff]">Votre contact est enregistré.</span>
            </h1>
            <p className="mt-5 max-w-[46ch] text-[16.5px] leading-relaxed text-[#3a4357]">
              Boostov réunit vos coordonnées, vos réseaux et votre adresse sur une carte digitale qui s’ouvre d’un tap
              NFC ou d’un scan de QR code. Aucune application à installer.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#acces" className="rounded-[14px] bg-[#1d5cff] px-6 py-3.5 text-[15px] font-semibold text-white shadow-[0_12px_28px_-14px_rgba(29,92,255,0.95)] hover:bg-[#164de0]">
                Demander mon accès
              </a>
              <a href="#fonctionnement" className="rounded-[14px] border border-[#d9deea] bg-white px-6 py-3.5 text-[15px] font-semibold hover:bg-[#f6f8fc]">
                Voir comment ça marche
              </a>
            </div>
            <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-[14px] font-medium text-[#3a4357]">
              {['iPhone et Android', 'Jusqu’à 10 cartes par compte', 'Modifiable à tout moment'].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#1d5cff]" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <PhoneMockup />
        </div>
      </section>

      <section id="fonctionnement" className="scroll-mt-20 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-[13px] font-bold uppercase tracking-[0.16em] text-[#1d5cff]">Fonctionnement</p>
          <h2 className="mt-2 text-[30px] font-extrabold tracking-[-0.03em] sm:text-[40px]">Trois étapes, une seule fois</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.title} className="rounded-[22px] border border-[#e6eaf3] bg-white p-6 shadow-[0_10px_30px_-24px_rgba(11,21,48,0.4)]">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-[#0b1530] text-[15px] font-bold text-white">{i + 1}</span>
                <h3 className="mt-4 text-[18px] font-bold">{s.title}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-[#5b6478]">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="avantages" className="scroll-mt-20 bg-[#0b1530] py-16 text-white sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-[13px] font-bold uppercase tracking-[0.16em] text-[#7ea4ff]">Avantages</p>
          <h2 className="mt-2 max-w-[22ch] text-[30px] font-extrabold tracking-[-0.03em] sm:text-[40px]">
            Une carte pour chaque activité
          </h2>
          <p className="mt-3 max-w-[60ch] text-[15.5px] text-white/70">
            Boutique, cabinet, profil personnel : chaque carte a son lien, son QR code et ses statistiques.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-[20px] border border-white/10 bg-white/[0.04] p-5">
                <Icon className="h-6 w-6 text-[#7ea4ff]" />
                <h3 className="mt-3 text-[16.5px] font-bold">{title}</h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-white/65">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="statistiques" className="scroll-mt-20 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-[13px] font-bold uppercase tracking-[0.16em] text-[#1d5cff]">Statistiques</p>
          <h2 className="mt-2 max-w-[24ch] text-[30px] font-extrabold tracking-[-0.03em] sm:text-[40px]">
            Ce que vos cartes produisent, sans deviner
          </h2>
          <p className="mt-3 max-w-[62ch] text-[15.5px] text-[#5b6478]">
            Boostov compte des ouvertures et des clics, pas des personnes. Un clic sur « Appeler » indique qu’un appel a
            été lancé depuis la carte.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {METRICS.map((m) => (
              <div key={m.label} className="rounded-[20px] bg-[#f1f5ff] p-5">
                <BarChart3 className="h-5 w-5 text-[#1d5cff]" />
                <p className="mt-3 text-[16px] font-bold">{m.label}</p>
                <p className="mt-1.5 text-[14px] leading-relaxed text-[#5b6478]">{m.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="questions" className="scroll-mt-20 bg-[#f6f8fc] py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-[30px] font-extrabold tracking-[-0.03em] sm:text-[40px]">Questions fréquentes</h2>
          <div className="mt-8 divide-y divide-[#e6eaf3] rounded-[22px] border border-[#e6eaf3] bg-white">
            {FAQ.map((f) => (
              <details key={f.q} className="group px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15.5px] font-semibold">
                  {f.q}
                  <span className="text-[20px] text-[#1d5cff] transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2.5 text-[14.5px] leading-relaxed text-[#5b6478]">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section id="acces" className="scroll-mt-20 py-16 sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 md:grid-cols-2 md:items-center">
          <div>
            <p className="text-[13px] font-bold uppercase tracking-[0.16em] text-[#1d5cff]">Accès</p>
            <h2 className="mt-2 text-[30px] font-extrabold tracking-[-0.03em] sm:text-[40px]">Votre accès Boostov</h2>
            <p className="mt-3 max-w-[48ch] text-[15.5px] text-[#5b6478]">
              Envoyez une demande. Dès qu’elle est acceptée, Boostov vous transmet votre e-mail de connexion et votre mot
              de passe.
            </p>
            <ul className="mt-6 space-y-3 text-[15px] font-medium">
              {[
                'Chaque accès validé à la main',
                'Connexion par e-mail et mot de passe',
                'Jusqu’à 10 cartes et leurs statistiques',
                'Lien NFC et QR code prêts pour chaque carte',
              ].map((t) => (
                <li key={t} className="flex items-center gap-2.5">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-[#e6eeff]"><Check className="h-3.5 w-3.5 text-[#1d5cff]" /></span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-[24px] border border-[#e6eaf3] bg-white p-6 shadow-[0_24px_60px_-30px_rgba(11,21,48,0.35)] sm:p-8">
            <h3 className="text-[20px] font-extrabold tracking-[-0.02em]">Demander un accès</h3>
            <div className="mt-5">
              <AccessRequestForm />
            </div>
            <p className="mt-5 text-center text-[14px] text-[#5b6478]">
              Vous avez déjà un compte ?{' '}
              <Link href="/connexion" className="font-semibold text-[#1d5cff] hover:underline">Se connecter</Link>
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#e6eaf3] py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-[13.5px] text-[#5b6478] sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <BrandMark size={22} />
            <span className="font-semibold text-[#0b1530]">Boostov</span>
            <span>© {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-5">
            <a href="https://boostov.ma" target="_blank" rel="noreferrer" className="hover:text-[#0b1530]">boostov.ma</a>
            <Link href="/connexion" className="hover:text-[#0b1530]">Se connecter</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
