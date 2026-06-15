import { useState } from "react";
import { useLanguage } from "../../context/LanguageContext";

export default function Contact() {
  const { t } = useLanguage();
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    alert(`Message sent by ${form.name}`);
  };

  return (
    <div className="page-enter flex items-center justify-center min-h-screen bg-neutral-950 px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-8 flex flex-col gap-5"
      >
        <h1 className="text-3xl font-bold text-violet-400">{t("contact_title")}</h1>

        <div className="flex flex-col gap-1">
          <label className="text-sm text-neutral-400" htmlFor="name">{t("contact_name")}</label>
          <input id="name" name="name" type="text" required value={form.name} onChange={handleChange}
            className="bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
            placeholder={t("contact_name_ph")} />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm text-neutral-400" htmlFor="email">{t("email")}</label>
          <input id="email" name="email" type="email" required value={form.email} onChange={handleChange}
            className="bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
            placeholder={t("contact_email_ph")} />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm text-neutral-400" htmlFor="message">{t("contact_message")}</label>
          <textarea id="message" name="message" required rows={4} value={form.message} onChange={handleChange}
            className="bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            placeholder={t("contact_msg_ph")} />
        </div>

        <button type="submit"
          className="bg-violet-600 hover:bg-violet-500 text-white font-medium py-2.5 rounded-lg transition-colors">
          {t("contact_send")}
        </button>
      </form>
    </div>
  );
}
