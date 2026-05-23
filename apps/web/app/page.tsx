import { useTranslations } from "next-intl";

export default function HomePage() {
  const t = useTranslations("home");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="text-7xl font-medium tracking-tight text-text-primary">
        {t("title")}
      </h1>
      <div className="my-7 h-px w-10 bg-border-subtle" />
      <p className="max-w-md text-lg leading-relaxed text-text-secondary">
        {t("tagline")}
      </p>
      <p className="mt-16 text-xs tracking-wide opacity-50">{t("footer")}</p>
    </main>
  );
}
