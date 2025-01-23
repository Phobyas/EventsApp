"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { auth } from "@/lib/supabase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";

const authSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters" }),
});

type AuthFormData = z.infer<typeof authSchema>;

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { session } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
  });

  const onSubmit = async (data: AuthFormData) => {
    try {
      setIsLoading(true);
      setError(null);

      console.log("Attempting login...");
      const result = await auth.signIn(data.email, data.password);
      console.log("Auth result:", result);

      if (result.error) {
        console.error("Auth error:", result.error);
        setError(result.error.message);
        return;
      }

      if (result.session) {
        console.log("Session obtained:", result.session);
        router.push("/dashboard");
        router.refresh();
      } else {
        console.log("No session returned");
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("Authentication failed");
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Input
            type="email"
            placeholder="Email"
            {...register("email")}
            disabled={isLoading}
          />
          {errors.email && (
            <p className="text-sm text-red-500">{errors.email.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Input
            type="password"
            placeholder="Password"
            {...register("password")}
            disabled={isLoading}
          />
          {errors.password && (
            <p className="text-sm text-red-500">{errors.password.message}</p>
          )}
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              {mode === "login" ? "Signing in..." : "Creating account..."}
            </div>
          ) : mode === "login" ? (
            "Sign In"
          ) : (
            "Create Account"
          )}
        </Button>
      </form>
      <div className="text-center text-sm">
        {mode === "login" ? (
          <p>
            Don't have an account?{" "}
            <Link href="/register" className="text-blue-500 hover:underline">
              Sign up
            </Link>
          </p>
        ) : (
          <p>
            Already have an account?{" "}
            <Link href="/login" className="text-blue-500 hover:underline">
              Sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
