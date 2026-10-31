import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ChangePasswordForm from '@/components/ChangePasswordForm';

export default function ResellerPasswordPage() {
  return (
    <div className="mx-auto max-w-md space-y-5">
      <Link href="/dashboard" className="ct-btn ct-btn-sm ct-btn-quiet h-9 w-fit px-3">
        <ArrowLeft className="h-4 w-4" /> Dashboard
      </Link>
      <section className="ct-card space-y-5 p-5 sm:p-6">
        <h1 className="ct-display text-[24px]">Mon mot de passe</h1>
        <ChangePasswordForm />
      </section>
    </div>
  );
}
