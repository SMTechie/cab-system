import type { Metadata } from 'next';
import { AuthPageShell } from '@/components/auth/AuthPageShell';
import { AuthForm } from '@/components/auth/AuthForm';

export const metadata: Metadata = {
  title: 'Register'
};

export default function RegisterPage() {
  return (
    <AuthPageShell>
        <AuthForm
          mode="register"
          className="max-w-[390px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.10)]"
        />
    </AuthPageShell>
  );
}
