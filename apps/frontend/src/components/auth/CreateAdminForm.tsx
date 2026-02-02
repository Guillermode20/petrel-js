import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CreateAdminFormProps {
	onSuccess: () => void;
}

/**
 * CreateAdminForm - First-run admin account creation form
 *
 * Allows creating the initial admin account when no admin exists.
 * Follows darkmatter aesthetic with purple accents.
 */
export function CreateAdminForm({ onSuccess }: CreateAdminFormProps) {
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const validateForm = (): boolean => {
		if (username.length < 3 || username.length > 50) {
			setError("Username must be between 3 and 50 characters");
			return false;
		}
		if (password.length < 8 || password.length > 100) {
			setError("Password must be between 8 and 100 characters");
			return false;
		}
		if (password !== confirmPassword) {
			setError("Passwords do not match");
			return false;
		}
		return true;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);

		if (!validateForm()) return;

		setIsSubmitting(true);
		try {
			const response = await fetch(`${import.meta.env.VITE_API_BASE ?? "/api"}/setup/admin`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ username, password }),
			});

			const result = await response.json();

			if (result.error) {
				setError(result.error);
			} else {
				onSuccess();
			}
		} catch (_err) {
			setError("Failed to create admin account. Please try again.");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="flex min-h-screen items-center justify-center bg-background p-4">
			<Card className="w-full max-w-md">
				<CardHeader className="space-y-3 text-center">
					<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
						<ShieldCheck className="h-6 w-6 text-primary" />
					</div>
					<CardTitle className="text-2xl">Create Admin Account</CardTitle>
					<CardDescription>
						Set up your administrator account to get started with Petrel
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="username">Username</Label>
							<Input
								id="username"
								type="text"
								placeholder="admin"
								value={username}
								onChange={(e) => setUsername(e.target.value)}
								disabled={isSubmitting}
								autoComplete="username"
								autoFocus
								required
								minLength={3}
								maxLength={50}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="password">Password</Label>
							<Input
								id="password"
								type="password"
								placeholder="••••••••"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								disabled={isSubmitting}
								autoComplete="new-password"
								required
								minLength={8}
								maxLength={100}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="confirmPassword">Confirm Password</Label>
							<Input
								id="confirmPassword"
								type="password"
								placeholder="••••••••"
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								disabled={isSubmitting}
								autoComplete="new-password"
								required
								minLength={8}
								maxLength={100}
							/>
						</div>
						{error && (
							<div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
								{error}
							</div>
						)}
						<Button
							type="submit"
							className="w-full"
							disabled={isSubmitting || !username || !password || !confirmPassword}
						>
							{isSubmitting ? (
								<>
									<span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
									Creating admin account...
								</>
							) : (
								<>
									<ShieldCheck className="mr-2 h-4 w-4" />
									Create Admin Account
								</>
							)}
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
