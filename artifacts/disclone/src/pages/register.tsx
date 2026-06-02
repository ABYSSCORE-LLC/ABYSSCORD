import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRegister } from "@workspace/api-client-react";
import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { MessageSquare } from "lucide-react";

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  username: z.string().min(2, "Username must be at least 2 characters").max(32, "Username too long"),
  displayName: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const setToken = useStore((state) => state.setToken);
  const setCurrentUser = useStore((state) => state.setCurrentUser);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      username: "",
      displayName: "",
      password: "",
    },
  });

  const registerMutation = useRegister();

  const onSubmit = (data: RegisterFormValues) => {
    setServerError(null);
    registerMutation.mutate(
      { data },
      {
        onSuccess: (res) => {
          setToken(res.token);
          setCurrentUser(res.user);
          setLocation("/");
        },
        onError: (err: any) => {
          setServerError(err?.data?.error || "Registration failed. Please try again.");
        },
      }
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />

      <div className="w-full max-w-md bg-card border border-border shadow-2xl rounded-[16px] p-8 z-10 relative">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
            <MessageSquare className="text-white w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-foreground text-center">Create an account</h1>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Email <span className="text-destructive">*</span>
                    </Label>
                    <FormControl>
                      <Input
                        placeholder="Enter your email"
                        className="bg-background border-transparent focus-visible:ring-primary/50 rounded-md"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Display Name
                    </Label>
                    <FormControl>
                      <Input
                        placeholder="How others see you"
                        className="bg-background border-transparent focus-visible:ring-primary/50 rounded-md"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Username <span className="text-destructive">*</span>
                    </Label>
                    <FormControl>
                      <Input
                        placeholder="Unique identifier"
                        className="bg-background border-transparent focus-visible:ring-primary/50 rounded-md"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Password <span className="text-destructive">*</span>
                    </Label>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter your password"
                        className="bg-background border-transparent focus-visible:ring-primary/50 rounded-md"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            {serverError && (
              <div className="text-sm text-destructive font-medium bg-destructive/10 p-3 rounded-md border border-destructive/20">
                {serverError}
              </div>
            )}

            <Button
              type="submit"
              className="w-full font-semibold mt-2"
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? "Registering..." : "Continue"}
            </Button>
          </form>
        </Form>

        <div className="mt-6 text-sm text-muted-foreground">
          <button
            onClick={() => setLocation("/login")}
            className="text-primary hover:underline font-medium"
          >
            Already have an account?
          </button>
        </div>
      </div>
    </div>
  );
}
