import { AskApp } from "@/components/AskApp";
import { getHukamnama } from "@/lib/api";

export default async function Home() {
  const hukamnama = await getHukamnama();
  const today = hukamnama?.shabads[0];
  return (
    <AskApp
      hukamnama={
        today
          ? { shabadId: today.shabadId, ang: today.ang, writer: today.writer?.english ?? null, raag: today.raag?.english ?? null }
          : null
      }
    />
  );
}
