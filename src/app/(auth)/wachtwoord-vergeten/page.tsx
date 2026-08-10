import type { Metadata } from "next";
import AuthCard from "@/components/auth/AuthCard";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Wachtwoord vergeten",
};

export default async function WachtwoordVergetenPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <AuthCard title="Wachtwoord vergeten">
      <ForgotPasswordForm defaultEmail={email ?? ""} />
    </AuthCard>
  );
}
