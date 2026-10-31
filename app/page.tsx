import { redirect } from 'next/navigation';

/** The app has no public home page: partners and the admin sign in here. */
export default function HomePage() {
  redirect('/login');
}
