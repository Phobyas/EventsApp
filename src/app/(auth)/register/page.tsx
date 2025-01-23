import { AuthForm } from "@/components/forms/auth-form";

export default function RegisterPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Create an account</h1>
        <p className="text-gray-500">Get started with Travelify</p>
      </div>
      <AuthForm mode="register" />
    </div>
  );
}
