export const dynamic = 'force-dynamic';
import { getCachedSettings } from "@/lib/cache";
import SettingsForm from "./SettingsForm";

export default async function SettingsPage() {
  const settings = await getCachedSettings();
  
  // Преобразуем сложный объект Mongoose в простой, "плоский" объект,
  // безопасный для передачи в клиентский компонент.
  const plainSettings = JSON.parse(JSON.stringify(settings));

  return (
    <div className="min-h-0 bg-gray-100 p-2 sm:p-4 lg:p-6">
      <SettingsForm initialSettings={plainSettings} />
    </div>
  );
} 
