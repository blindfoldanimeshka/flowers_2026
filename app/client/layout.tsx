export const dynamic = 'force-dynamic';
import Footer from "./components/layout/Footer";
import SocialButton from "./components/layout/SocialButton";
import HeaderSwitcher from "./components/widget/HeaderSwitcher";
import FadeWrapper from "./components/FadeWrapper";
import { getCachedSettings } from "@/lib/cache";
import { productionLogger } from '@/lib/productionLogger';

const defaultPublicSettings = {
    siteName: "Floramix",
    siteDescription: "",
    contactPhone: "",
    contactPhone2: "",
    contactPhone3: "",
    address: "",
    workingHours: "",
    pickupHours: "",
    deliveryHours: "",
    deliveryInfo: "",
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
        productionLogger.error("Failed to load public settings, using defaults:", error);
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
            <main className="flex-1">
                <FadeWrapper>{children}</FadeWrapper>
            </main>
            <SocialButton settings={plainSettings} />
            <Footer settings={plainSettings} />
        </div>
    )
}
