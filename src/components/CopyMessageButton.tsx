"use client";

export default function CopyMessageButton({ text }: { text: string }) {
  return (
    <button
      className="btn"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        alert("Mensagem copiada!");
      }}
    >
      Copiar mensagem
    </button>
  );
}
