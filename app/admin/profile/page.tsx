export const dynamic = 'force-dynamic';
import ProfileForm from "./ProfileForm";

export default async function ProfilePage() {
  return (
    <div className="min-h-0 bg-gray-100 p-2 sm:p-4 lg:p-6">
      <ProfileForm />
    </div>
  );
}
