import Link from "next/link";

export default function Header() {
  return (
    <header className="bg-[#5a0a0a] text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex flex-col leading-tight">
          <span className="text-2xl font-extrabold tracking-wide">
            <span className="text-[#e6b800]">QUIQ</span>LABS
          </span>
          <span className="text-[9px] font-semibold tracking-widest text-white/70">
            TECH | EDUCATION | CREATIVE STUDIO
          </span>
        </Link>

      </div>
    </header>
  );
}
