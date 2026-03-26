export const dynamic = 'force-dynamic';
import ClientLayout from "../client/layout";

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ClientLayout>
            {children}
        </ClientLayout>
    );
} 