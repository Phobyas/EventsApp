"use client";

import { AuthForm } from "@/components/forms/AuthForm";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const handleSuccess = () => {
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Welcome back</h1>
        <p className="text-gray-500">Sign in to your account</p>
      </div>
      <AuthForm mode="login" onSuccess={handleSuccess} />
    </div>
  );
}
