import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import corpo from "../checkin/checkin-body.html?raw";
import script from "../checkin/checkin.js?raw";
import "../checkin/checkin.css";

const ASSETS = "https://uzsbtzfmctrhgsmjugkm.supabase.co/storage/v1/object/public/borbo-checkin/assets";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Check-in VIP | BorbôBlack Vitalícia" },
      { name: "description", content: "Check-in obrigatório para alunas do Clube da Borboleta: Black Antecipada dia 05/11 às 20h, ao vivo, com sorteio de um iPhone." },
      { property: "og:title", content: "Check-in VIP | BorbôBlack Vitalícia" },
      { property: "og:description", content: "Alunas do Clube da Borboleta: faça o check-in, gere seu post e concorra a um iPhone ao vivo no dia 05/11 às 20h." },
      { property: "og:image", content: `${ASSETS}/fabiola-nina.jpg` },
    ],
    links: [
      { rel: "icon", href: `${ASSETS}/logo.png` },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Archivo+Black&family=Outfit:wght@400;600;800&display=swap" },
    ],
  }),
  component: Checkin,
});

function Checkin() {
  useEffect(() => {
    // O comportamento da página (modal, envio, desenho do post) vive em checkin.js, igual à versão estática.
    const el = document.createElement("script");
    el.textContent = script;
    document.body.appendChild(el);
    return () => { el.remove(); };
  }, []);
  return <div className="checkin-borbo" dangerouslySetInnerHTML={{ __html: corpo }} />;
}
