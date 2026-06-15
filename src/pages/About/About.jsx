import { useLanguage } from "../../context/LanguageContext";

export default function About() {
  const { t } = useLanguage();
  return (
    <div className="page-enter flex flex-col items-center justify-center min-h-screen bg-neutral-950 px-6">
      <div className="max-w-lg text-center">
        <h1 className="text-4xl font-bold text-violet-400 mb-4">{t("about_title")}</h1>
        <p className="text-neutral-400 text-lg leading-relaxed">{t("about_desc")}</p>
      </div>
    </div>
  );
}
