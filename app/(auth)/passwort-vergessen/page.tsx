import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PasswortVergessenForm } from "@/components/auth/passwort-vergessen-form";

export default function PasswortVergessenPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="font-heading text-2xl text-primary">
            Passwort vergessen
          </CardTitle>
          <CardDescription>
            Gib deine E-Mail-Adresse ein. Du bekommst einen Link, mit dem du ein neues Passwort festlegst.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PasswortVergessenForm />
        </CardContent>
      </Card>
    </div>
  );
}
