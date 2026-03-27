export const dynamic = 'force-dynamic';
import Footer from "./components/layout/Footer";
import SocialButton from "./components/layout/SocialButton";
import HeaderSwitcher from "./components/widget/HeaderSwitcher";
import FadeWrapper from "./components/FadeWrapper";
import TopInfoPanel from "./components/layout/TopInfoPanel";
import { getCachedSettings } from "@/lib/cache";

const defaultPublicSettings = {
    siteName: "Floramix",
    siteDescription: "",
    contactPhone: "",
    address: "",
    workingHours: "",
    socialLinks: {},
    homeCategoryCardBackgrounds: {},
    homeBannerBackground: "",
    homeBannerSlides: [],
};

export default async function ClientLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    let plainSettings = defaultPublicSettings;

    try {
        const settings = await getCachedSettings();
        if (settings) {
            plainSettings = {
                ...defaultPublicSettings,
                ...JSON.parse(JSON.stringify(settings)),
            };
        }
    } catch (error) {
        console.error("Failed to load public settings, using defaults:", error);
    }

    return (
        <div className="relative flex min-h-screen flex-col overflow-x-clip">
            <div
                className="pointer-events-none fixed inset-0 -z-10"
                style={{
                    backgroundImage: "url('/image/bg.png')",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    opacity: 0.5,
                }}
            />
            <HeaderSwitcher />
            <TopInfoPanel settings={plainSettings} />
            <main className="flex-1">
                <FadeWrapper>{children}</FadeWrapper>
            </main>
            <SocialButton settings={plainSettings} />
            <Footer settings={plainSettings} />
        </div>
    )
}
