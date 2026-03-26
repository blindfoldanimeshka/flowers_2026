import Image from "next/image";
import Link from "next/link";

export default function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 select-none min-w-[140px] h-12 px-2">
      <Image src="/image/logo.svg" alt="Floramix" width={36} height={36} priority loading="eager" />
      <span className="font-bold text-xl text-neutral-700 tracking-tight">Floramix</span>
    </Link>
  );
} 
